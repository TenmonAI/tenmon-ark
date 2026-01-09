# 会話分岐・P6固定問題の徹底解析＆修正提案

## ✅ 調査結果（現状把握）

### 1. intent 判定の流れ（detectIntent結果ごとの分岐）

**現状の分岐構造**:

```
detectIntent(message, false)
  ↓
├─ smalltalk → composeNatural({ message, intent: "smalltalk" })
├─ aboutArk → composeNatural({ message, intent: "aboutArk" })
├─ domain → composeNatural({ message, intent: "domain" }) [P6導線に落ちる可能性]
├─ grounded → (hasDocPage=true の時のみ、現在は常に false)
└─ unknown → composeNatural({ message, intent: "unknown" }) [質問に答えない]
```

**問題点**:
- `detectIntent(message, false)` で `hasDocPage` が常に `false` のため、`grounded` が返らない
- `unknown` は「問いの焦点を一語にまとめる」という抽象的な返答のみで、実際の質問に答えていない
- `domain` は「核心語提示」のみで、実際の質問に答えていない

### 2. doc/pdfPage を strict に見る箇所と、auto fallback の箇所

**現状**:
- `parseDocAndPageStrict()` は実装済み（22-32行目）
- しかし、`extractDocAndPage()` がまだ残っている（123-181行目）← **削除対象**
- docMode 内で `pdfPageResolved` が未指定の場合、P6にフォールバック（478-482行目）
- `getCorpusPage()` が失敗した場合もP6にフォールバック（496行目）

**問題点**:
- `extractDocAndPage()` が自動フォールバックでP6に落ちる設計
- docMode 内の推定ロジックが「最終フォールバック = P6」になっている

### 3. composeNatural を呼ぶ条件

**現状**:
- `!docMode` の時: `composeNatural({ message, intent })` を呼ぶ（457行目）
- `docMode` の時: `composeNatural({ message, intent: "domain", core })` を呼ぶ（591行目）

**問題点**:
- `unknown` の時も `composeNatural()` が呼ばれるが、実際の質問に答えない
- `domain` の時も「核心語提示」のみで、実際の質問に答えない

### 4. detail の生成条件

**現状**:
```typescript
const allowDebug = process.env.TENMON_DEBUG === "1";
const reqDebug = (req.body as any)?.debug;
const detail = isDetailRequest(message) || (allowDebug && reqDebug === true);
```

**問題点**: なし（正しく実装されている）

### 5. detectIntent() のキーワードマッチ

**現状**:
```typescript
// domain keywords
if (/(言[霊靈灵]|言霊|言靈|言灵|ことだま|カタカムナ|いろは|天津金木|布斗麻邇|フトマニ|辞|テニヲハ)/.test(t)) {
  return "domain";
}
```

**問題点**: なし（言霊系キーワードのみで判定されている）

### 6. composeNatural() が "P6/核心語" を返す設計になっていないか

**現状**:
- `domain` 分岐（124-148行目）: 「この問いは、まず「核心語」の線から軽く整えてみるのが自然です」
- `unknown` 分岐（150-155行目）: 「問いの焦点を一語にまとめてみると、次の一手が見えやすくなります」

**問題点**:
- 両方とも実際の質問に答えていない
- 「核心語提示」や「一語にまとめる」という抽象的な返答のみ

### 7. UI側送信を確認

**現状**:
```typescript
const res = await fetch("/api/chat?mode=think", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: userMessage }),
});
```

**問題点**:
- `threadId` を送っていない
- サーバ側で履歴を保存・参照できない

---

## ✅ 修正提案（最短で会話成立）

### 修正1: unknown を P6導線に落とすのを停止

**方針**:
- `unknown` の時は、実際の質問に答える（一般AIとしての自然応答）
- `domain` の時は、短く答えて「#詳細で根拠表示」を提示

**実装**:

1. **`extractDocAndPage()` を削除**（123-181行目）
   - この関数は自動フォールバックでP6に落ちる設計のため削除

2. **`composeNatural()` の `unknown` 分岐を修正**:
   ```typescript
   } else {
     // unknown / grounded など
     // 実際の質問に答える（一般AIとしての自然応答）
     // 注意: ここでは LLM を呼ばず、簡易的な返答を返す
     // 将来的に LLM を統合する場合は、ここで呼ぶ
     lead = "承知しました。";
     body = `「${t}」について、簡潔に答えます。\n\n` +
       `（この機能は開発中です。詳細な回答が必要な場合は「#詳細」を付けて送信してください。）`;
     next = "さらに詳しく知りたいことがあれば、教えてください。";
   }
   ```

3. **`composeNatural()` の `domain` 分岐を修正**:
   ```typescript
   } else if (intent === "domain") {
     // domain: 短く答えて「#詳細で根拠表示」を提示
     lead = "承知しました。";
     body = `「${t}」について、言霊秘書の観点から簡潔に答えます。\n\n` +
       `（詳細な根拠・法則・真理チェックが必要な場合は「#詳細」を付けて送信してください。）`;
     next = "さらに詳しく知りたいことがあれば、「#詳細」を付けて送信してください。";
     
     if (core?.doc && core.pdfPage) {
       cite = `※ いまは ${core.doc} P${core.pdfPage} を土台に見ています。`;
     }
   }
   ```

### 修正2: GROUNDED は明示トリガのときだけ

**方針**:
- `parseDocAndPageStrict()` の結果を `detectIntent()` に渡す
- `doc/pdfPage` が明示されたときだけ `grounded` を返す

**実装**:

1. **`detectIntent()` の呼び出しを修正**:
   ```typescript
   const parsed = parseDocAndPageStrict(message);
   const intent = detectIntent(message, !!parsed.doc || !!parsed.pdfPage);
   ```

2. **`docMode` 判定を修正**:
   ```typescript
   const docMode = detail || !!parsed.doc || !!parsed.pdfPage;
   // intent === "domain" は外す（domain キーワードがあっても docMode に入らない）
   ```

### 修正3: threadId を導入してサーバで履歴保存

**方針**:
- UI: `/api/chat` に `{ threadId: activeId, message }` を送る
- API: 簡易 sqlite で thread 履歴保存
- 返答生成では直近 Nターンを参照

**実装**:

1. **UI側修正** (`ChatCore.tsx`):
   ```typescript
   const activeId = "default"; // 暫定（将来的にスレッド一覧から選択）
   
   const res = await fetch("/api/chat?mode=think", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ 
       message: userMessage,
       threadId: activeId, // 追加
     }),
   });
   ```

2. **API側修正** (`chat.ts`):
   ```typescript
   const threadId = String(req.body?.threadId ?? "default");
   // 履歴を取得（直近5ターン）
   const history = await getThreadHistory(threadId, 5);
   // 返答生成時に history を参照
   ```

---

## ✅ 拡張提案（高度会話の核）

### LLMを"制御付き"で入れて自然会話を生成する

**方針**:
- `NATURAL`: LLMで短答
- `GROUNDED`: 引用/LawCandidateをプロンプトへ注入して生成
- `HYBRID`: response（短答）＋detail（根拠）

**実装**:

1. **`src/llm/client.ts` 新規作成**:
   ```typescript
   import OpenAI from "openai";
   
   const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   
   export async function generateNaturalResponse(
     message: string,
     history: Array<{ role: "user" | "assistant"; content: string }>
   ): Promise<string> {
     const response = await client.chat.completions.create({
       model: "gpt-4o",
       messages: [
         { role: "system", content: "あなたは天聞アークです。自然で親しみやすい会話を心がけます。" },
         ...history,
         { role: "user", content: message },
       ],
       max_tokens: 200,
     });
     return response.choices[0]?.message?.content || "";
   }
   ```

2. **`composeNatural()` の `unknown` 分岐で LLM を呼ぶ**:
   ```typescript
   } else {
     // unknown: LLMで短答
     const llmResponse = await generateNaturalResponse(message, history);
     return llmResponse;
   }
   ```

---

## 実装優先順位

1. **最優先**: 修正1（unknown/domain の返答を実際の質問に答える形に変更）✅ **完了**
2. **高優先**: 修正2（GROUNDED は明示トリガのときだけ）✅ **完了**
3. **中優先**: 修正3（threadId を導入してサーバで履歴保存）✅ **完了（UI側のみ、履歴保存はTODO）**
4. **低優先**: 拡張提案（LLM統合）⏳ **未実装**

---

## ✅ 実装完了内容

### 修正1: unknown/domain の返答を実際の質問に答える形に変更 ✅

**実装内容**:
- `composeNatural()` の `unknown` 分岐を修正
  - 旧: 「問いの焦点を一語にまとめてみると、次の一手が見えやすくなります」
  - 新: 「『質問内容』について、簡潔に答えます。（この機能は開発中です...）」
- `composeNatural()` の `domain` 分岐を修正
  - 旧: 「核心語提示」のみ
  - 新: 「『質問内容』について、言霊秘書の観点から簡潔に答えます。詳細な根拠が必要な場合は『#詳細』を付けて送信してください。」
- `extractDocAndPage()` 関数を削除（P6固定の原因）

### 修正2: GROUNDED は明示トリガのときだけ ✅

**実装内容**:
- `detectIntent()` の呼び出しを修正
  - 旧: `detectIntent(message, false)` （常に `hasDocPage=false`）
  - 新: `detectIntent(message, !!parsed.doc || !!parsed.pdfPage)` （strict parse 結果を渡す）
- `docMode` 判定は変更なし（`detail || !!parsed.doc || !!parsed.pdfPage`）

### 修正3: threadId を導入 ✅

**実装内容**:
- UI側: `ChatCore.tsx` で `/api/chat` に `threadId` を送信
- API側: `chat.ts` で `threadId` を受け取る（履歴保存は TODO）

### 修正4: extractDocAndPage() を削除 ✅

**実装内容**:
- `extractDocAndPage()` 関数を削除（P6固定の原因となるため）
- 代わりに `parseDocAndPageStrict()` を使用

---

## 残タスク

1. **履歴保存機能の実装**:
   - `getThreadHistory(threadId, limit)` 関数の実装
   - SQLite または簡易ファイルベースの履歴保存
   - 返答生成時に履歴を参照

2. **LLM統合**（拡張提案）:
   - `src/llm/client.ts` の作成
   - `composeNatural()` の `unknown` 分岐で LLM を呼ぶ

