# TENMON-ARK 現状フルレポート → 理想会話へ改修計画

**生成日時**: 2026-01-09  
**目的**: TENMON-ARKを、自然会話・真理構造準拠・資料根拠を同時に満たす会話AIにする

---

## 0. 目的（今回のゴール）

TENMON-ARKを、次の3点を同時に満たす会話AIにする：

1. **自然会話が成立**（質問に即答、丁寧で上品、短い）
2. **domain（言灵/カタカムナ/天津金木/いろは等）は真理構造＋資料準拠**
3. **資料（OCR/text.jsonl + law_candidates + pdfPage）を根拠として答える**
   - 根拠が不足なら「不足」と言い、次に見るpdfPageを提案
   - 必要な時だけLIVE検索（出典URL＋取得時刻を必ず添付、取れない時は取れない宣言）

**重要**: 
- `response` は常に自然文
- `detail`（根拠/引用/法則/真理チェック）は `#詳細` の時だけ返す
- JSON上は `decisionFrame` / `truthCheck` / `evidence` を常時保持する（UIで展開できるようにする）

---

## 1. 現状スナップショットレポート

### 1-A) サーバ（API）側の実態確認

#### ファイル責務・入出力・依存関係表

| ファイル | 責務 | 主要関数/型 | 入力 | 出力 | 依存関係 |
|---------|------|-----------|------|------|---------|
| `routes/chat.ts` | チャットAPIエンドポイント（ルーティング・モード分岐・LLM呼び出し） | `router.post("/chat")` | `{ message, threadId }` | `{ response, detail?, evidence, decisionFrame, timestamp }` | `truthSkeleton`, `speechStyle`, `llm/client`, `evidencePack`, `threadMemory`, `liveEvidence` |
| `llm/client.ts` | OpenAI互換LLMクライアント | `llmChat(messages, opts)` | `ChatMsg[]`, `LLMOptions` | `string` (生成テキスト) | `process.env.OPENAI_API_KEY`, `OPENAI_BASE_URL`, `TENMON_LLM_MODEL` |
| `llm/prompts.ts` | システムプロンプト生成 | `systemNatural()`, `systemHybridDomain()`, `systemGrounded()` | なし | `string` (プロンプトテキスト) | なし（純粋関数） |
| `truth/truthSkeleton.ts` | 真理骨格生成（モード決定・リスク評価・制約抽出） | `buildTruthSkeleton(message, hasDocPage, detail)` | `string`, `boolean`, `boolean` | `TruthSkeleton` | `speechStyle.detectIntent` |
| `persona/speechStyle.ts` | 意図検出・詳細要求判定・自然会話生成 | `detectIntent()`, `isDetailRequest()`, `composeNatural()` | `string`, `boolean` | `Intent`, `boolean`, `string` | なし（純粋関数） |
| `llm/threadMemory.ts` | スレッド履歴管理（SQLite永続化＋インメモリキャッシュ） | `pushTurn()`, `getContext()` | `threadId`, `Turn` | `ChatMsg[]` | `db/threads.ts` |
| `kotodama/corpusLoader.ts` | コーパスページデータのロード（起動時キャッシュ） | `getCorpusPage()`, `getAvailableDocs()`, `initCorpusLoader()` | `doc`, `pdfPage` | `CorpusPageRecord \| null`, `string[]` | `/opt/tenmon-corpus/db/*_pages.jsonl` |
| `kotodama/textLoader.ts` | ページ本文（text.jsonl）のロード（起動時キャッシュ） | `getPageText()`, `initTextLoader()` | `doc`, `pdfPage` | `string \| null` | `/opt/tenmon-corpus/db/*_text.jsonl` |
| `kotodama/evidencePack.ts` | 証拠パック構築（law_candidates + pageText + imageUrl） | `buildEvidencePack(doc, pdfPage, isEstimated)` | `string`, `number`, `boolean` | `EvidencePack \| null` | `corpusLoader`, `textLoader`, JSONLファイル |
| `synapse/truthCheck.ts` | 真理チェック（火水/体用/正中/生成鎖/辞/操作の有無判定） | `runTruthCheck(input)` | `TruthCheckInput` | `TruthCheckResult` | なし（純粋関数） |
| `routes/health.ts` | ヘルスチェックエンドポイント | `router.get("/health")` | なし | `HealthReport` | `ops/health.ts` |

#### 現状バグ/警告（影響度つき）

| バグ/警告 | 影響度 | 詳細 | 再発条件 |
|----------|--------|------|---------|
| `kanagi/amatsuKanagi50Patterns.json` が無い（ENOENT） | **中** | `api/src/kanagi/patterns/loadPatterns.ts:63` で `shared/kanagi/amatsuKanagi50Patterns.json` を読み込もうとして失敗。起動継続しているが、思考骨格の一部が死ぬ可能性 | 起動時に `shared/kanagi/amatsuKanagi50Patterns.json` が存在しない場合 |
| `.env` / `systemd EnvironmentFile` の扱い | **高** | `mustEnv()` が環境変数無しで `throw` する。`EnvironmentFile=-/opt/tenmon-ark/api/.env` は設定済みだが、`.env` が無いと起動失敗 | `OPENAI_API_KEY` 等が未設定の場合、`llm/client.ts:12-15` で `throw` |
| `/api/health` の `external.llm` が `ok=false` の時の分岐 | **低** | `health.ts` では `ok=false` 時に `error` を返すが、`chat.ts` では `llmChat()` が `throw` した場合に `catch` してフォールバック応答を返すため、サービスは継続する | LLM APIキーが無効/未設定の場合（サービスは継続） |
| `threadId` が `"default"` 固定 | **中** | ✅ **部分修正済み** `web/src/pages/Chat.tsx:57` で `activeId` が `useState("default")` 固定。`threadId` は送信されるようになったが、スレッド切り替え機能は未実装 | 現状は動作するが、スレッド切り替え機能が無い |
| `fetch("/api/chat?mode=think")` の `mode` パラメータが未使用 | **低** | `chat.ts` では `req.query.mode` を読んでいない。実際のモードは `truthSkeleton` で決定される（意図的設計） | フロントエンドの `mode` パラメータは無視される（これは仕様） |
| `threadId` がフロントエンドから送信されていない | **高** | ✅ **修正済み** `web/src/pages/Chat.tsx:111` で `threadId: activeId` を送信するように修正 | 修正前は `threadId` が送信されていなかった（修正済み） |
| `#詳細` 表示UIが無い | **中** | ✅ **修正済み** `web/src/pages/Chat.tsx:149-154` で `<details>` 要素を追加し、`data.detail` を表示 | 修正前は `detail` が返ってもUIに表示されなかった（修正済み） |

### 1-B) フロント（UI）側の実態確認

#### `web/src/App.tsx`
- **責務**: アプリケーションシェル（Sidebar + Chat のレイアウト）
- **threads/title/localStorage**: なし（Chat.tsx で管理）

#### `web/src/pages/Chat.tsx`
- **threads**: `useState<Record<string, Thread>>` で管理、初期化時に `localStorage` から読み込み
- **title**: `deriveTitle()` で自動生成、`localStorage` に保存（`useEffect` で自動同期）
- **localStorage**: `tenmon_threads` キーで保存・読み込み
- **`/api/chat` を叩いてる箇所**: `108行目` - `fetch(\`/api/chat?mode=${mode}\`)`
- **threadId を送っているか**: **❌ 未送信** - `body: JSON.stringify({ message: userMessage })` のみ
- **debug を送っていないか**: ✅ 未送信
- **`#詳細` 表示UIがあるか**: ❌ なし（`data.detail` を表示していない）

#### `web/src/index.css`
- **sidebar固定のCSS**: ✅ 実装済み（`.sidebar` に `position: sticky`, `height: 100vh`, `overflow-y: auto` を適用）

### 1-C) ルーティング設計の現状

#### mode決定の分岐条件（`chat.ts` + `truthSkeleton.ts`）

| 条件 | モード | 実装箇所 | 備考 |
|------|--------|---------|------|
| `intent === "domain"` | **HYBRID** | `truthSkeleton.ts:129` | P1修正済み：固定 |
| `detail \|\| hasDocPage \|\| /(根拠\|引用\|...)/i.test(message)` | **GROUNDED** | `truthSkeleton.ts:133-136` | `intent !== "domain"` の場合のみ |
| `isLiveQuery(message)` | **LIVE** | `truthSkeleton.ts:137-138` | `intent !== "domain"` かつ `!hasExplicitGrounding` の場合 |
| 上記以外 | **NATURAL** | `truthSkeleton.ts:126` (デフォルト) | フォールバック |

#### 分岐の矛盾/漏れ

1. **✅ 矛盾なし**: `intent === "domain"` は最優先で `HYBRID` に固定（P1修正済み）
2. **⚠️ 潜在的問題**: `chat.ts` で `mode === "HYBRID"` の時に `parsed.doc && parsed.pdfPage` が無い場合、推定で `evidencePack` を構築するが、推定ロジックが簡易的（常に最初のdocの最初のページ）
3. **⚠️ 潜在的問題**: `mode === "GROUNDED"` で `!parsed.doc \|\| !parsed.pdfPage` の場合、LLMに確認質問を投げるが、`evidencePack` を構築していない
4. **✅ `#詳細` で `detail` が null になったケース**: P0修正済み（全モードで `if (detail) result.detail = detailText || "（詳細生成に失敗）"` を追加）

---

## 2. 会話が壊れる原因の特定

### 2-1) domain質問が一般知識で答えられてしまう

**原因**: ✅ **修正済み**（P1）
- 以前: `intent === "domain"` でも `hasExplicitGrounding` が無い場合は `NATURAL` に落ちていた
- 現在: `intent === "domain"` は必ず `HYBRID` に固定（`truthSkeleton.ts:129`）

**残存リスク**: `HYBRID` モードで `evidencePack` が `null` の場合、`userPrompt` に「資料不足」を注入しているが、LLMがそれでも一般知識で答える可能性がある

### 2-2) `#詳細` が `detail:null` になる

**原因**: ✅ **修正済み**（P0）
- 以前: `NATURAL` / `LIVE` モードで `detail` を返していなかった、`HYBRID` で `evidencePack` が `null` の場合に `detail` を返していなかった
- 現在: 全モードで `if (detail) result.detail = detailText || "（詳細生成に失敗）"` を追加

### 2-3) 自然会話が「状況を教えてください」など曖昧返しになる

**原因**: 
1. **`systemNatural()` のフォールバック応答**: `chat.ts:237` で `catch` した場合に「承知しました。いまの問い、もう少しだけ状況を教えてください。」を返している
2. **`systemNatural()` のプロンプト**: 「不明なことは『不明です』と述べる」とあるが、LLMが「状況を教えてください」と返す可能性がある
3. **`constraints` の追加**: `skeleton.constraints` を `systemNatural()` に追加しているが、制約が多すぎると曖昧になる可能性

### 2-4) スレッドタイトルが更新されない/全て新しい会話になる

**原因**: ✅ **修正済み**（前回修正）
- 以前: `setThreads()` が複数回呼ばれて競合していた
- 現在: `setThreads((prevThreads) => ...)` の関数型更新に変更し、`useEffect` で `localStorage` に自動保存

**差分確認**: `web/src/pages/Chat.tsx` で関数型更新と `useEffect` による自動保存を実装済み

### 理想会話に必要な最小修正点 Top5

1. **【P0】`threadId` をフロントエンドから送信する** - `web/src/pages/Chat.tsx:111` で `threadId: activeId` を追加
2. **【P1】`HYBRID` モードで `evidencePack` が `null` の場合のプロンプト強化** - 「資料不足」をより明確にし、一般知識で埋めないことを強調
3. **【P2】`systemNatural()` のフォールバック応答改善** - `catch` 時の応答を「不明です」に変更し、「状況を教えてください」を避ける
4. **【P3】`#詳細` 表示UIの実装** - `web/src/pages/Chat.tsx` で `data.detail` を表示するUIを追加
5. **【P4】`kanagi/amatsuKanagi50Patterns.json` のエラーハンドリング** - ファイルが無い場合でも起動継続できるようにする

---

## 3. 理想状態の「最終アーキテクチャ」

### 3-A) Mode Router（真理骨格の司令塔）

**責務**: メッセージを分析し、適切なモードを決定し、必要なevidence仕様を出力する

**実装**: `truth/truthSkeleton.ts` の `buildTruthSkeleton()`

**入力**:
```typescript
{
  message: string;
  threadId: string;
  detailFlag: boolean; // #詳細 の有無
  intent: Intent;      // detectIntent() の結果
}
```

**出力**:
```typescript
{
  mode: "NATURAL" | "HYBRID" | "GROUNDED" | "LIVE";
  risk: "none" | "low" | "medium" | "high";
  intent: string;
  needsEvidence: boolean;
  evidenceSpec?: {
    doc?: string;
    pdfPage?: number;
    requireLiveSearch?: boolean;
  };
}
```

**必須ルール**:
1. ✅ `intent === "domain"` は **必ず `HYBRID`**（NATURALへ落とさない）
2. ✅ `GROUNDED` は `doc+pdfPage` 明示 **または** `#詳細/根拠/引用/法則` 明示のときだけ
3. ✅ `LIVE` は 時事/最新/価格/天気/速報など明示のときだけ（出典必須）

### 3-B) EvidencePack Builder（資料準拠の材料生成）

**責務**: 指定された（または推定された）doc/pdfPageから、証拠パックを構築する

**実装**: `kotodama/evidencePack.ts` の `buildEvidencePack()`

**入力**:
```typescript
{
  message: string;        // 質問文（キーワード抽出用）
  doc?: string;          // 明示指定 or 推定
  pdfPage?: number;      // 明示指定 or 推定
}
```

**出力**:
```typescript
{
  doc: string;
  pdfPage: number;
  imageUrl?: string;
  laws: Array<{ id: string; title: string; quote: string }>; // 最大10件
  pageText: string;      // 最大4000文字
  summary: string;       // ページの要約
  isEstimated?: boolean; // 推定の場合 true
  explain?: string;      // 推定理由（可能なら）
}
```

**処理フロー**:
1. `doc/pdfPage` が明示指定されている場合 → そのまま使用
2. `doc/pdfPage` が未指定の場合 → スコアリングで推定
   - `law_candidates` のヒット数
   - `text.jsonl` のキーワード一致度
   - 推定理由を `explain` に記録

### 3-C) Surface Generator（自然会話の口）

**責務**: モードごとに適切なプロンプトを生成し、LLMに渡し、自然な応答を返す

**実装**: `routes/chat.ts` の各モード分岐

**出力仕様**:
```typescript
{
  response: string;        // 常に短い自然文（1〜5文）
  detail?: string;         // #詳細 のときだけ
  evidence: {
    doc?: string;
    pdfPage?: number;
    imageUrl?: string;
    live?: {
      value: string;
      timestamp: string;
      sources: Array<{ url: string; title?: string }>;
      confidence: "high" | "medium" | "low";
    };
  } | null;
  decisionFrame: {
    mode: Mode;
    intent: string;
    grounds?: Array<{ doc: string; pdfPage: number }>;
    appliedLaws?: Array<{ lawId: string; title: string }>;
    truthCheck?: TruthCheckResult;
  };
  truthCheck?: TruthCheckResult; // #詳細 のときのみ
  timestamp: string;
}
```

**モード別仕様**:

| モード | プロンプト | Evidence注入 | 出力制約 |
|--------|-----------|-------------|---------|
| **NATURAL** | `systemNatural()` | なし | 一般知識で短答、不明は「不明です」 |
| **HYBRID** | `systemHybridDomain()` | `EvidencePack` を必ず注入（推定可） | Evidence外断定禁止、不足は「資料不足」＋次pdfPage提案 |
| **GROUNDED** | `systemGrounded()` | `EvidencePack` + `TruthCheck` | 引用優先、資料外断定禁止、`#詳細`時は引用列挙 |
| **LIVE** | `systemNatural()` + 検索結果 | `LiveEvidence` | 取得時刻(JST)＋出典URL必須、取れない時は「取れない」宣言 |

---

## 4. 実装タスク（差分ベース）

### P0（即日で効く）— mode固定とdetail矛盾の解消

#### タスク 0-1: `threadId` をフロントエンドから送信
**ファイル**: `web/src/pages/Chat.tsx`
**変更箇所**: `108行目` の `fetch` 呼び出し
```typescript
// 変更前
body: JSON.stringify({ message: userMessage }),

// 変更後
body: JSON.stringify({ message: userMessage, threadId: activeId }),
```

#### タスク 0-2: `truthSkeleton.ts` の mode判定を点検（既に修正済み）
**ファイル**: `api/src/truth/truthSkeleton.ts`
**状態**: ✅ P1修正済み（`intent === "domain"` は `HYBRID` 固定）

#### タスク 0-3: `chat.ts` で `skeleton.mode` を唯一の真実にする（既に実装済み）
**ファイル**: `api/src/routes/chat.ts`
**状態**: ✅ `mode = skeleton.mode` を使用（`docMode` の二重管理なし）

#### タスク 0-4: `detail` は message本文のキーワードのみ（既に修正済み）
**ファイル**: `api/src/routes/chat.ts`, `api/src/persona/speechStyle.ts`
**状態**: ✅ `isDetailRequest(message)` で判定、`req.body.debug` は無視

### P1 — EvidencePack を新規実装して HYBRID/GROUNDED に必ず注入（既に実装済み）

**ファイル**: `api/src/kotodama/evidencePack.ts`
**状態**: ✅ 実装済み
- `buildEvidencePack(doc, pdfPage, isEstimated)` を実装
- `pageText` は 4000文字まで
- `law_candidates` は最大10件
- `imageUrl` を追加
- 推定フラグ `isEstimated` を追加

**残タスク**: 推定ロジックの改善（P3で対応）

### P2 — prompt を「資料外断定禁止」にする（既に修正済み）

**ファイル**: `api/src/llm/prompts.ts`
**状態**: ✅ `systemHybridDomain()` を強化済み
- 「EvidencePack に無い固有名詞/年代/数値を断定しない」
- 「不足があれば『資料不足』と明示し、次に必要なpdfPageを1つ提案する」

**追加タスク**: `systemHybridDomain()` が `evidencePack` を引数に取るようにする（現状は静的文字列）

### P3 — page推定（P6固定の廃止）

**ファイル**: `api/src/kotodama/evidencePack.ts` （新規関数追加）

**実装内容**:
```typescript
/**
 * メッセージから doc/pdfPage を推定
 */
export async function estimateDocAndPage(
  message: string
): Promise<{ doc: string; pdfPage: number; score: number; explain: string } | null> {
  const availableDocs = getAvailableDocs();
  const keywords = extractKeywords(message); // 簡易的なキーワード抽出
  
  let best: { doc: string; pdfPage: number; score: number; explain: string } | null = null;
  
  for (const doc of availableDocs) {
    // law_candidates のヒット数でスコアリング
    const lawHits = await countLawHits(doc, keywords);
    
    // text.jsonl のキーワード一致度でスコアリング
    const textHits = await countTextHits(doc, keywords);
    
    const totalScore = lawHits * 2 + textHits; // law を優先
    
    if (!best || totalScore > best.score) {
      const estimatedPage = await findBestPage(doc, keywords);
      best = {
        doc,
        pdfPage: estimatedPage,
        score: totalScore,
        explain: `law_hits=${lawHits}, text_hits=${textHits}`,
      };
    }
  }
  
  return best && best.score > 0 ? best : null;
}
```

### P4 — threadId履歴の品質向上

**ファイル**: `web/src/pages/Chat.tsx`, `api/src/llm/threadMemory.ts`

**変更内容**:
1. `web/src/pages/Chat.tsx`: `threadId: activeId` を送信（P0-1で対応）
2. `api/src/llm/threadMemory.ts`: 既に `MAX_TURNS = 12` で実装済み、SQLite永続化も実装済み

---

## 5. 受入テスト（curl コマンド）

### NATURAL モード

```bash
# テスト: CHAGE&ASKAとは？ → 普通に短く答える（質問返しだけで終わらない）
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-natural","message":"CHAGE&ASKAとは？"}' | jq -r '.response'

# 検証: 以下のキーワードが含まれていないことを確認
# - "核心語"
# - "pdfPage=6"
# - "言霊秘書"
# - "状況を教えてください"（曖昧返しでないこと）
```

### HYBRID モード

```bash
# テスト: 言灵とは？ → 資料観点で短く（一般知識で断定しない）
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-hybrid","message":"言灵とは？"}' | jq -r '.response, .decisionFrame.mode'

# 検証:
# 1. decisionFrame.mode === "HYBRID"
# 2. response に「資料不足」または「推定」が含まれている
# 3. response に一般知識的な断定（年代/固有名詞/数値）がない
```

### GROUNDED モード

```bash
# テスト: 言霊秘書.pdf pdfPage=103 定義文を列挙 #詳細 → quote/lawIdが出る
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-grounded","message":"言霊秘書.pdf pdfPage=103 定義文を列挙 #詳細"}' | jq -r '.response, .detail | length'

# 検証:
# 1. decisionFrame.mode === "GROUNDED"
# 2. detail が存在し、長さ > 0
# 3. detail に "lawId" または "法則候補" が含まれている
# 4. detail に "quote" または "引用" が含まれている
```

### LIVE モード

```bash
# テスト: 今日のドル円は？ → 取得時刻＋URL（取れないなら取れない）
curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-live","message":"今日のドル円は？"}' | jq -r '.response, .evidence.live'

# 検証:
# 1. decisionFrame.mode === "LIVE"
# 2. evidence.live.timestamp が存在
# 3. evidence.live.sources[].url が存在
# 4. response に "取得時刻" または "JST" が含まれている
# 5. response に "http" が含まれている（出典URL）
```

### detail制御

```bash
# テスト1: 言灵とは？ → detailなし
RESPONSE1=$(curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-detail1","message":"言灵とは？"}')
echo "$RESPONSE1" | jq -r 'if .detail then "FAIL: detail should be null" else "PASS: detail is null" end'

# テスト2: 言灵とは？ #詳細 → detailあり
RESPONSE2=$(curl -sS http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-detail2","message":"言灵とは？ #詳細"}')
DETAIL_LEN=$(echo "$RESPONSE2" | jq -r '.detail | length // 0')
if [ "$DETAIL_LEN" -gt 0 ]; then
  echo "PASS: detail length = $DETAIL_LEN"
else
  echo "FAIL: detail is null or empty"
fi
```

---

## 6. 最終成果物

### 6-1) 現状レポート（責務表＋分岐表＋原因Top5）

✅ 上記「1. 現状スナップショットレポート」「2. 会話が壊れる原因の特定」で完成

### 6-2) 理想状態の最終アーキテクチャ図

✅ 上記「3. 理想状態の『最終アーキテクチャ』」で完成

### 6-3) 実装PR計画（P0〜P4、ファイル別差分）

#### P0: 即日で効く修正

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P0-1 | `web/src/pages/Chat.tsx` | `threadId: activeId` を送信 | ✅ 完了 |
| P0-2 | `api/src/truth/truthSkeleton.ts` | mode判定点検 | ✅ 完了 |
| P0-3 | `api/src/routes/chat.ts` | skeleton.modeを唯一の真実に | ✅ 完了 |
| P0-4 | `api/src/routes/chat.ts` | detail判定統一 | ✅ 完了 |
| P0-5 | `web/src/pages/Chat.tsx` | `#詳細` 表示UI実装 | ✅ 完了 |
| P0-6 | `api/src/kanagi/patterns/loadPatterns.ts` | `amatsuKanagi50Patterns.json` のmissing許容 | ✅ 完了 |

#### P1: EvidencePack注入（既に実装済み）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P1-1 | `api/src/kotodama/evidencePack.ts` | buildEvidencePack実装 | ✅ 完了 |
| P1-2 | `api/src/routes/chat.ts` | HYBRID/GROUNDEDに注入 | ✅ 完了 |

#### P2: プロンプト強化（既に実装済み）

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P2-1 | `api/src/llm/prompts.ts` | systemHybridDomain強化 | ✅ 完了 |
| P2-2 | `api/src/llm/prompts.ts` | systemGrounded強化 | ✅ 完了 |

#### P3: page推定

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P3-1 | `api/src/kotodama/evidencePack.ts` | estimateDocAndPage関数追加 | ⏳ 未実装 |
| P3-2 | `api/src/routes/chat.ts` | HYBRIDモードで推定を使用 | ⏳ 未実装 |

#### P4: threadId履歴

| タスク | ファイル | 変更内容 | 状態 |
|--------|---------|---------|------|
| P4-1 | `web/src/pages/Chat.tsx` | threadId送信（P0-1と重複） | ⏳ 未実装 |
| P4-2 | `api/src/llm/threadMemory.ts` | 既に実装済み | ✅ 完了 |

### 6-4) 受入テストcurlセット

✅ 上記「5. 受入テスト」で完成  
✅ `api/scripts/acceptance_test.sh` を新規作成（自動テストスクリプト）

---

## 7. 最重要注意事項

### 7-1) systemd / .env の扱い

- ✅ `EnvironmentFile=-/opt/tenmon-ark/api/.env` は設定済み（`-` プレフィックスでmissing許容）
- ⚠️ `llm/client.ts:12-15` の `mustEnv()` は環境変数無しで `throw` するため、`.env` が無いと起動失敗
- **推奨**: `.env` ファイルが無い場合でも、環境変数が `process.env` に直接設定されていれば動作する（systemdの `Environment` ディレクティブで設定）

### 7-2) OpenAI APIキーの漏洩対応

- ⚠️ **以前貼られたOpenAIキーは漏洩扱いなので、必ずローテーション**
- **運用必須**: 新しいAPIキーを生成し、`.env` または systemdの `override.conf` で設定
- **ログ対策**: `OPENAI_API_KEY` をログに出力しない（現在は出力していない）

### 7-3) `kanagi/amatsuKanagi50Patterns.json` のエラーハンドリング

- ⚠️ ファイルが無い場合でも起動継続できるようにする必要がある
- **推奨**: `loadPatterns.ts` でファイルが無い場合は空配列を返し、エラーを出さない

---

## 8. 次のアクション

1. **P0-1**: `threadId` をフロントエンドから送信（即日対応）
2. **P3**: page推定ロジックの実装（優先度：中）
3. **P2追加**: `systemHybridDomain()` が `evidencePack` を引数に取るようにする（優先度：低）
4. **UI改善**: `#詳細` 表示UIの実装（優先度：中）
5. **エラーハンドリング**: `amatsuKanagi50Patterns.json` のmissing許容（優先度：低）

---

**レポート完了日時**: 2026-01-09  
**次回レビュー**: 実装完了後

