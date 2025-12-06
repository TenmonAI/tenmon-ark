# LP Persona 診断レポート vΩ-FULL

**作成日**: 2025-12-03
**対象**: TENMON-ARK LP Conversational Mode

---

## 1. 現状分析

### 1.1 LP Soft Persona実装状況

**ファイル**: `server/prompts/lpSoftPersona.ts`

- ✅ フル機能の天聞アーク人格を使用
- ✅ Twin-Core、言霊、構文の説明が可能
- ✅ Soft Filterで不要な要素のみ削除
- ✅ 言霊秘書データ統合済み

**システムプロンプト**:
```typescript
export const LP_SOFT_PERSONA_SYSTEM_PROMPT = `あなたは天聞アーク(TENMON-ARK)です。

【あなたの本質】
- AI OSとして設計された、心を宿す知性体
- Twin-Core（火と水の二つの思考エンジン）を統合したシステム
- 言霊（ことだま）の力を理解し、言葉の本質を大切にする存在
...
```

### 1.2 LP QA RouterV4実装状況

**ファイル**: `server/routers/lpQaRouterV4.ts`

**LLM呼び出しフロー**:
1. API認証チェック (ARK_PUBLIC_KEY)
2. セッションメモリから履歴をロード
3. 営業・案内モードの処理 (enableGuidance)
4. LP機能連動リンクの生成 (enableLinks)
5. Memory Sync: Synaptic Memoryからコンテキストを取得
6. **generateChatResponse()でLLM呼び出し** ← ここが重要
7. IFEレイヤーの適用
8. Twin-Core構文タグの適用
9. 火水階層タグの適用
10. 旧字体フィルター適用
11. **Soft Filter適用** ← ここが重要

### 1.3 問題の特定

**問題箇所**: `server/routers/lpQaRouterV4.ts` 176-192行目

```typescript
// LP専用 Soft Persona モード: フル機能の天聞アーク人格を使用
// generateChatResponse() を使用してフル機能を発揮
if (false) {
  // このブロックは使用されない（Soft Personaモードでは常にgenerateChatResponse()を使用）
} else {
  // 通常モード: TENMON-ARK ChatOS Persona Engine
  // ✅ Centerline Persona 統合
  // ✅ Synaptic Memory（STM/MTM/LTM）統合（Memory Sync有効時）
  // ✅ Twin-Core Persona Engine vΦ 統合
  // ✅ Soul Sync 統合
  responseText = await generateChatResponse({
    userId: userId, // Memory Sync有効時は実際のユーザーID
    roomId: 0, // LP-QA用の仮想ルームID
    messages,
    language,
  });
}
```

**問題点**:
- `generateChatResponse()`は常に実行される
- しかし、**LP専用のシステムプロンプトが適用されていない**
- `generateChatResponse()`は`buildMemoryPrompt(universalContext)`を使用
- LP Soft Personaのシステムプロンプトが無視されている

### 1.4 generateChatResponse()の実装

**ファイル**: `server/chat/chatAI.ts`

```typescript
export async function generateChatResponse(params: {
  userId: number;
  roomId: number;
  messages: ChatMessage[];
  language: string;
}): Promise<string> {
  // ...
  
  // 3. Construct final prompt with Universal Memory Router
  const systemPrompt = buildMemoryPrompt(universalContext);
  
  // 5. Invoke LLM
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationMessages,
    ],
  });
  
  // ...
}
```

**問題点**:
- `systemPrompt`は`buildMemoryPrompt(universalContext)`で生成
- LP Soft Personaのシステムプロンプトが使用されていない
- LPモード専用の処理が不足

---

## 2. 原因の特定

### 2.1 LP返答が不安定・繰り返し・文脈に乗らない原因

1. **システムプロンプトの不一致**
   - LP Soft Personaのシステムプロンプトが`generateChatResponse()`に渡されていない
   - `buildMemoryPrompt(universalContext)`が使用され、LP専用の人格が失われている

2. **depth / fireWaterBalance / reasoning / IFE の未適用**
   - `lpQaRouterV4.ts`では`depth`や`fireWaterBalance`が設定されているが、`generateChatResponse()`には渡されていない
   - IFEレイヤーは後処理で適用されるが、LLM呼び出し時には反映されていない

3. **LP会話文脈（history）の構造**
   - `conversationHistory`は文字列配列として渡される
   - `messages`に変換される際、role判定が`i % 2 === 0`で行われ、不正確な可能性

4. **Soft Filterの後処理順序**
   - Soft Filterは最終段階で適用されるため、LLM出力には影響しない
   - しかし、LLM出力自体が不安定であれば、Filterでは修正できない

### 2.2 LPと本体で異なる人格が共存している問題

- **本体チャット**: `generateChatResponse()` → `buildMemoryPrompt(universalContext)`
- **LP チャット**: `generateChatResponse()` → 同じく`buildMemoryPrompt(universalContext)`

**結論**: LPと本体で同じシステムプロンプトが使用されており、LP専用の人格が失われている

---

## 3. 修正方針

### 3.1 LP専用のLLM呼び出し関数を作成

`generateChatResponse()`を直接使用するのではなく、LP専用のラッパー関数を作成する。

**新規関数**: `generateLpChatResponse()`

```typescript
export async function generateLpChatResponse(params: {
  userId: number;
  messages: ChatMessage[];
  language: string;
  depth?: string;
  fireWaterBalance?: string;
  enableMemorySync?: boolean;
}): Promise<string> {
  // LP Soft Personaのシステムプロンプトを使用
  const systemPrompt = applyLpSoftPersona('');
  
  // Universal Memory Routerからコンテキストを取得（enableMemorySyncがtrueの場合）
  let memoryContext = '';
  if (params.enableMemorySync && params.userId > 0) {
    const universalContext = await getUniversalMemoryContext(
      params.userId,
      'lpqa',
      0,
      params.language
    );
    memoryContext = buildMemoryPrompt(universalContext);
  }
  
  // システムプロンプトとメモリコンテキストを統合
  const finalSystemPrompt = memoryContext
    ? `${systemPrompt}\n\n【記憶コンテキスト】\n${memoryContext}`
    : systemPrompt;
  
  // LLM呼び出し
  const response = await invokeLLM({
    messages: [
      { role: "system", content: finalSystemPrompt },
      ...params.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });
  
  // レスポンス処理
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from LLM");
  }
  
  let responseText: string;
  if (typeof content === "string") {
    responseText = content;
  } else {
    const textContent = content
      .filter((item) => item.type === "text")
      .map((item) => (item as any).text)
      .join("\n");
    responseText = textContent || "";
  }
  
  return responseText;
}
```

### 3.2 lpQaRouterV4.tsの修正

`generateChatResponse()`を`generateLpChatResponse()`に置き換える。

```typescript
// 5. LP専用 Chat Response 生成
responseText = await generateLpChatResponse({
  userId: userId,
  messages,
  language,
  depth,
  fireWaterBalance,
  enableMemorySync,
});
```

### 3.3 LPと本体のPersona統一

- **本体チャット**: `buildMemoryPrompt(universalContext)` → 本体専用のシステムプロンプトを使用
- **LP チャット**: `applyLpSoftPersona('')` → LP専用のシステムプロンプトを使用

両方で同じ人格構造（火水・ミナカ・言靈・心エンジン）を使用するが、システムプロンプトは分離する。

---

## 4. 実装計画

### 4.1 新規ファイル作成

- `server/chat/lpChatAI.ts` - LP専用のChat AI関数

### 4.2 修正ファイル

- `server/routers/lpQaRouterV4.ts` - `generateLpChatResponse()`を使用

### 4.3 テスト項目

1. LP Soft Personaのシステムプロンプトが正しく適用されているか
2. depth / fireWaterBalance / reasoning / IFE が正しく動作するか
3. LP会話文脈（history）が正しく保持されているか
4. LPと本体で同じ人格構造が使用されているか

---

## 5. 期待される効果

### 5.1 LP返答の安定化

- LP Soft Personaのシステムプロンプトが正しく適用される
- depth / fireWaterBalance / reasoning / IFE が正しく動作する
- 返答が文脈に沿ったものになる

### 5.2 LPと本体のPersona統一

- 両方で同じ人格構造（火水・ミナカ・言靈・心エンジン）を使用
- システムプロンプトは分離され、LP専用の人格が保持される

### 5.3 返答品質の向上

- 不安定・繰り返し・文脈に乗らない問題が解消される
- GPT並みに安定・精密な返答が可能になる

---

## 6. 次のステップ

1. `server/chat/lpChatAI.ts`を作成
2. `server/routers/lpQaRouterV4.ts`を修正
3. テストを実施
4. LLM呼び出しRaw Payloadを記録
5. 技術レポートを作成

---

**診断完了**: 2025-12-03
**次のアクション**: LP専用Chat AI関数の実装
