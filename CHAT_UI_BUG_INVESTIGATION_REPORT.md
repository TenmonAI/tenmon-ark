# TENMON-ARK Chat UI / LP Chat 総合不具合調査レポート

**調査日時**: 2025-02-01 00:00 JST  
**調査対象**: TENMON-ARK Chat UI (`/chat`) および LP Embedded Chat (`/embed/qa`)  
**調査者**: Manus AI  
**プロジェクト**: os-tenmon-ai-v2  
**バージョン**: bc632d4b

---

## エグゼクティブサマリー

TENMON-ARK Chat UI および LP Embedded Chat において、以下の4つの重大な不具合が報告されました。本レポートでは、各不具合の根本原因を特定し、技術的背景を詳細に分析しました。

**発見された根本原因:**

1. **React の key に `index` を使用** → メッセージの再描画が壊れ、"TENMON-ARK" バナーが重複表示される
2. **Layout 構造の問題** → `flex-1` + `min-h-screen` の組み合わせにより、チャット画面の高さが異常に拡張される
3. **LP Widget の API payload は正常** → "エラーが発生しました" の原因は Cloudflare cache または バックエンド API のエラー
4. **GPT 仕様の履歴パネルが未実装** → 会話が散乱し、ユーザビリティが低下

---

## 不具合①: 大量の "TENMON-ARK" バナーが表示される

### 症状

チャット画面で、ユーザーメッセージと AI メッセージが正しく表示されず、"TENMON-ARK" というバナーが大量に表示される。

### 根本原因

**React の key に `index` を使用していることが原因。**

#### 該当コード: ChatRoom.tsx (Line 253-255)

```tsx
{messages?.map((msg, index) => (
  <div
    key={index}  // ← 問題: index を key に使用
    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
  >
```

#### 該当コード: LpQaWidget.tsx (Line 232-234)

```tsx
{conversationHistory.map((msg, index) => (
  <div
    key={index}  // ← 問題: index を key に使用
    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
```

### 技術的背景

React の `key` prop は、配列の要素を一意に識別するために使用されます。`key={index}` を使用すると、以下の問題が発生します：

1. **配列の順序が変わった時に React の再利用が壊れる**
   - 新しいメッセージが追加されると、既存メッセージの `index` が変わる
   - React が誤って DOM 要素を再利用する
   - `msg.role` の判定が壊れ、"user" メッセージが "assistant" として表示される

2. **空メッセージの混入**
   - `conversationHistory` に空の要素が混入している可能性
   - これにより "TENMON-ARK" が大量に表示される

### 正しい実装

```tsx
{messages?.map((msg) => (
  <div
    key={msg.id}  // ← 正しい: 一意な ID を key に使用
    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
  >
```

### 影響範囲

| コンポーネント | ファイル | 問題箇所 |
|---|---|---|
| ChatRoom | `/client/src/pages/ChatRoom.tsx` | Line 255 |
| LP QA Widget | `/client/src/pages/embed/LpQaWidget.tsx` | Line 234 |

---

## 不具合②: LPで "エラーが発生しました" が再発する

### 症状

LP Embedded Chat (`/embed/qa`) で、メッセージを送信すると "エラーが発生しました。もう一度お試しください。" というエラーメッセージが表示される。

### 調査結果

#### ✅ API Payload は正常

LP Widget の API call payload を確認したところ、すべての必須パラメータが正しく送信されています。

**API 仕様（lpQaRouterV4.ts Line 42-56）:**

```ts
.input(
  z.object({
    question: z.string().min(1).max(1000),
    conversationHistory: z.array(z.string()).optional().default([]),
    depth: z.enum(['surface', 'middle', 'deep', 'specialized']).optional().default('middle'),
    fireWaterBalance: z.enum(['fire', 'water', 'balanced']).optional().default('balanced'),
    userTemperature: z.enum(['fire', 'water', 'balanced']).optional(),
    enableIfe: z.boolean().optional().default(true),
    enableGuidance: z.boolean().optional().default(true),
    enableLinks: z.boolean().optional().default(true),
    enableMemorySync: z.boolean().optional().default(false),
    language: z.string().optional().default('ja'),
    apiKey: z.string().min(1), // API Key 必須
    userId: z.number().optional().default(0),
    sessionId: z.string().optional(),
  })
)
```

**LP Widget の実装（LpQaWidget.tsx Line 178-191）:**

```tsx
chatMutation.mutate({ 
  question: message,
  conversationHistory: historyStrings,
  sessionId: sessionId,
  apiKey: getApiKey(),
  language: getLocale(),
  userId: 0,
  depth: 'middle',
  fireWaterBalance: 'balanced',
  enableIfe: true,
  enableGuidance: true,
  enableLinks: true,
  enableMemorySync: false,
});
```

#### 原因候補

1. **Cloudflare cache の stale bundle**
   - `/embed/qa` の JavaScript bundle が古い
   - 最新のフロントエンドビルドが反映されていない

2. **バックエンド API のエラー**
   - `lpQaRouterV4.chat` の mutation でエラーが発生している
   - サーバーログを確認する必要がある

3. **CORS エラー**
   - `futomani88.com` からのリクエストが CORS エラーになっている可能性
   - ただし、`lpQaRouterV4.ts` には CORS 許可が記載されている

### 推奨される調査手順

1. ブラウザの Network タブで API request を確認
2. Response の status code と error message を確認
3. サーバーログで `lpQaRouterV4.chat` のエラーを確認
4. Cloudflare cache を purge して最新の bundle を配信

---

## 不具合③: チャット画面の高さが異常に拡張される

### 症状

チャット画面のメッセージ履歴エリアが、画面の高さを超えて異常に拡張される。スクロールが正しく機能しない。

### 根本原因

**Layout 構造の問題: `flex-1` + `min-h-screen` の組み合わせ**

#### 該当コード: ChatRoom.tsx (Line 180, 248, 252)

```tsx
<div className="chat-page-container min-h-screen flex bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-100">
  {/* サイドバー */}
  <div className="hidden md:flex w-64 border-r border-slate-700 bg-slate-900/50 backdrop-blur-sm flex-col">
    ...
  </div>

  {/* メインエリア */}
  <div className="flex-1 flex flex-col">
    {/* メッセージ履歴 */}
    <div className="chat-content-centered flex-1 overflow-y-auto p-6 space-y-6">
      ...
    </div>
  </div>
</div>
```

### 技術的背景

**Layout 構造:**

```
親 (min-h-screen flex)
├── サイドバー (w-64)
└── メインエリア (flex-1 flex flex-col)
    ├── メッセージ履歴 (flex-1 overflow-y-auto)
    ├── プログレスバー
    ├── エラーメッセージ
    └── 入力欄 (固定高さ)
```

**問題点:**

1. **`min-h-screen` により、画面の高さを超えた場合に拡張される**
   - 親コンテナが `min-h-screen` を使用しているため、コンテンツが画面の高さを超えると、親コンテナが拡張される
   - メッセージ履歴エリアが `flex-1` で無限に拡張される

2. **`chat-content-centered` という custom class が height を壊している可能性**
   - この class が `height: auto` や `min-height` を設定している可能性
   - スクロールが発生しない

### 正しい実装（LP Widget の例）

LP Widget は正しい実装を採用しています：

```tsx
<div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
  {conversationHistory.map((msg, index) => (
    ...
  ))}
</div>
```

**正しい実装のポイント:**

- `max-h-[500px]` で最大高さを制限
- `overflow-y-auto` でスクロール可能
- これが GPT 仕様の正しい実装

### 推奨される修正

```tsx
{/* メインエリア */}
<div className="flex-1 flex flex-col h-screen">
  {/* メッセージ履歴 */}
  <div className="flex-1 overflow-y-auto p-6 space-y-6">
    ...
  </div>
</div>
```

**修正のポイント:**

- メインエリアに `h-screen` を追加して高さを固定
- メッセージ履歴エリアから `chat-content-centered` を削除
- `flex-1` + `overflow-y-auto` でスクロール可能にする

---

## 不具合④: GPTのような「履歴パネル」が存在せず会話が散乱する

### 症状

ChatGPT のような「会話履歴パネル」が存在せず、会話が散乱している。ユーザビリティが低下している。

### 現状の実装

ChatRoom.tsx には、左サイドバーに「チャットルーム一覧」が表示されていますが、以下の機能が不足しています：

1. **チャット履歴の詳細表示**
   - 各チャットの最初のメッセージのプレビュー
   - メッセージ数の表示

2. **チャット検索機能**
   - チャットタイトルやメッセージ内容での検索

3. **フォルダ分類機能**
   - チャットをフォルダで分類

4. **GPT 仕様の MessageList**
   - メッセージは昇順（古→新）で整列
   - ユーザー右・AI左の気泡構造
   - スクロール領域は1箇所のみ

### 推奨される改善

1. **ChatHistoryPane の UX 改善**
   - チャットの最初のメッセージをプレビュー表示
   - メッセージ数を表示
   - チャット検索機能を追加

2. **GPT 仕様の MessageList 実装**
   - メッセージは昇順（古→新）で整列
   - ユーザー右・AI左の気泡構造
   - スクロール領域は1箇所のみ
   - streamingMessage は末尾1個だけ
   - 空メッセージ禁止
   - エラー時の UI 崩壊を防ぐ

3. **/chat と LP のコンポーネント共通化**
   - MessageBubble コンポーネントを共通化
   - ChatContainer コンポーネントを共通化

---

## 修正方針: GPT 仕様のチャット UI へ統一

### 必須要件

1. **メッセージは昇順（古→新）で整列**
   - 現在の実装は正しい（`messages?.map()` で順番通り）

2. **ユーザー右・AI左の気泡構造**
   - 現在の実装は正しい（`msg.role === "user" ? "justify-end" : "justify-start"`）

3. **スクロール領域は1箇所のみ**
   - 現在の実装は正しい（メッセージ履歴エリアのみスクロール可能）

4. **streamingMessage は末尾1個だけ**
   - 現在の実装は正しい（`isStreaming && streamingContent` で1個だけ表示）

5. **空メッセージ禁止**
   - **要修正**: messages 配列に空メッセージが混入していないか確認が必要

6. **エラー時の UI 崩壊を防ぐ**
   - 現在の実装は正しい（エラーメッセージを表示）

### 修正タスク

| タスク | 優先度 | 影響範囲 |
|---|---|---|
| `key={index}` を `key={msg.id}` に修正 | 🔥 CRITICAL | ChatRoom, LP Widget |
| Layout 構造を修正（`h-screen` 追加） | 🔥 CRITICAL | ChatRoom |
| `chat-content-centered` class を削除 | 🔥 CRITICAL | ChatRoom |
| 空メッセージの混入を防ぐ | 🔴 HIGH | ChatRoom, LP Widget |
| ChatHistoryPane の UX 改善 | 🟡 MEDIUM | ChatRoom |
| /chat と LP のコンポーネント共通化 | 🟡 MEDIUM | ChatRoom, LP Widget |

---

## 調査結果サマリー

### 発見された問題

| 不具合 | 根本原因 | 優先度 |
|---|---|---|
| ① "TENMON-ARK" バナー重複 | `key={index}` 使用 | 🔥 CRITICAL |
| ② LP エラー | Cloudflare cache または バックエンド API エラー | 🔴 HIGH |
| ③ 高さ異常拡張 | `flex-1` + `min-h-screen` の組み合わせ | 🔥 CRITICAL |
| ④ 履歴パネル未実装 | GPT 仕様の MessageList 未実装 | 🟡 MEDIUM |

### 推奨される修正手順

1. **Phase 1: Critical Fixes (1-2 hours)**
   - `key={index}` を `key={msg.id}` に修正
   - Layout 構造を修正（`h-screen` 追加）
   - `chat-content-centered` class を削除

2. **Phase 2: High Priority Fixes (1-2 hours)**
   - 空メッセージの混入を防ぐ
   - LP Widget のエラー原因を特定（Cloudflare cache purge）

3. **Phase 3: Medium Priority Improvements (2-3 hours)**
   - ChatHistoryPane の UX 改善
   - /chat と LP のコンポーネント共通化

---

## 次のステップ

1. **修正の実装**
   - Phase 1 の Critical Fixes を実装
   - Phase 2 の High Priority Fixes を実装

2. **テストと検証**
   - `/chat` での動作確認
   - `/embed/qa` での動作確認
   - スクリーンショット取得（修正前/修正後）

3. **完成報告**
   - CHAT_UI_FIX_COMPLETE_REPORT.md 作成
   - スクリーンショット添付
   - checkpoint 保存

---

**調査完了日時**: 2025-02-01 00:30 JST  
**次のアクション**: Phase 1 Critical Fixes の実装開始
