# TENMON-ARK Chat Core + Ark-Browser アーキテクチャ設計書

**作成日**: 2025年11月30日  
**作成者**: Manus AI  
**バージョン**: 1.0  
**プロトコル**: SAFE SELF-BUILD PROTOCOL vΩ-SAFE

---

## 目次

1. [概要](#概要)
2. [TENMON-ARK Chat Core アーキテクチャ](#tenmon-ark-chat-core-アーキテクチャ)
3. [TENMON-ARK Ark-Browser アーキテクチャ](#tenmon-ark-ark-browser-アーキテクチャ)
4. [ブラウザ×チャット連動設計](#ブラウザチャット連動設計)
5. [データフロー設計](#データフロー設計)
6. [コンポーネント構造設計](#コンポーネント構造設計)
7. [API設計](#api設計)
8. [技術スタック](#技術スタック)
9. [セキュリティ設計](#セキュリティ設計)
10. [パフォーマンス設計](#パフォーマンス設計)

---

## 概要

TENMON-ARK Chat Core + Ark-Browser は、GPT・Manusを超える"世界最高の使用感OS"を実現するための統合プラットフォームである。Chat Coreは会話OS、Ark-BrowserはChrome互換ブラウザとして機能し、両者が連動することで、ユーザーは「検索→理解→会話→行動」の一連の流れをシームレスに体験できる。

### 設計思想

1. **Twin-Core人格統合**: すべての応答にTwin-Core人格（宿曜・天津金木・いろは構文）を反映
2. **世界言語対応**: 日本語・英語・中国語などの多言語対応
3. **意図翻訳検索**: ユーザーの意図を理解し、最適な検索クエリに翻訳
4. **ブラウザ×チャット連動**: ブラウザで見つけた情報をチャットで解析・要約
5. **安全な自己拡張**: 自己書き換え禁止・自己拡張のみ許可

---

## TENMON-ARK Chat Core アーキテクチャ

### 概要

TENMON-ARK Chat Coreは、Twin-Core人格を統合した会話OSである。ユーザーの質問に対して、宿曜・天津金木・いろは構文に基づいた個性的な応答を生成する。

### コンポーネント構成

```
client/src/pages/ChatCore/
├── ChatCoreHome.tsx              # Chat Coreホームページ
├── ChatInterface.tsx             # チャットインターフェース
├── MessageList.tsx               # メッセージリスト
├── MessageInput.tsx              # メッセージ入力
├── TwinCorePersonaSelector.tsx   # Twin-Core人格選択
├── ConversationModeSelector.tsx  # 会話モード選択
└── ChatSettings.tsx              # チャット設定
```

### 機能要件

#### 1. メッセージ送受信
- ユーザーがメッセージを入力
- Twin-Core人格反映エンジンが応答を生成
- ストリーミング応答でリアルタイム表示

#### 2. Twin-Core人格統合
- 宿曜27宿から火水バランスを計算
- 天津金木パターン（左右旋・内外・陰陽）を決定
- いろは構文で文にリズムを宿す
- 会話モード（一般/中級/専門）に応じて文体を調整

#### 3. メッセージ履歴管理
- メッセージ履歴をデータベースに保存
- 会話のコンテキストを維持
- 過去の会話を検索・参照

#### 4. 多言語対応
- 日本語・英語・中国語などの多言語対応
- 自動言語検出
- 翻訳機能

### データモデル

```typescript
// メッセージ
interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  twinCorePersona?: TwinCorePersonaProfile;
  createdAt: Date;
}

// 会話
interface Conversation {
  id: number;
  userId: number;
  title: string;
  shukuyo: string;
  conversationMode: "general" | "intermediate" | "expert";
  createdAt: Date;
  updatedAt: Date;
}
```

### API設計

```typescript
// tRPCルーター
chatCore: router({
  // メッセージ送信
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Twin-Core人格反映エンジンで応答生成
      // メッセージをデータベースに保存
      // ストリーミング応答を返す
    }),
  
  // 会話一覧取得
  getConversations: protectedProcedure
    .query(async ({ ctx }) => {
      // ユーザーの会話一覧を取得
    }),
  
  // 会話作成
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string(),
      shukuyo: z.string(),
      conversationMode: z.enum(["general", "intermediate", "expert"]),
    }))
    .mutation(async ({ input, ctx }) => {
      // 新しい会話を作成
    }),
  
  // メッセージ履歴取得
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // 会話のメッセージ履歴を取得
    }),
}),
```

---

## TENMON-ARK Ark-Browser アーキテクチャ

### 概要

TENMON-ARK Ark-Browserは、Chrome互換のブラウザUIを提供し、世界検索（Google/Reddit/Bing）、意図翻訳検索、HTML段落解析、翻訳×解読エンジンを統合する。

### コンポーネント構成

```
client/src/pages/ArkBrowser/
├── ArkBrowserHome.tsx            # Ark-Browserホームページ
├── BrowserInterface.tsx          # ブラウザインターフェース
├── AddressBar.tsx                # アドレスバー
├── NavigationButtons.tsx         # ナビゲーションボタン
├── TabManager.tsx                # タブ管理
├── SearchBar.tsx                 # 検索バー
├── SearchResults.tsx             # 検索結果表示
├── PageViewer.tsx                # ページビューア
├── BookmarkManager.tsx           # ブックマーク管理
└── BrowserSettings.tsx           # ブラウザ設定
```

### 機能要件

#### 1. Chrome互換UI
- アドレスバー
- ナビゲーションボタン（戻る・進む・更新）
- タブ管理
- ブックマーク管理

#### 2. 世界検索（Google/Reddit/Bing）
- Google検索API統合
- Reddit検索API統合
- Bing検索API統合
- 検索結果の統合表示

#### 3. 意図翻訳検索
- ユーザーの意図を理解
- 最適な検索クエリに翻訳
- 検索結果を意図に基づいてフィルタリング

#### 4. HTML段落解析
- HTMLページを段落単位で解析
- 重要な段落を抽出
- 段落の要約を生成

#### 5. 翻訳×解読エンジン
- ページ全体を翻訳
- 専門用語を解読
- 文脈に基づいた翻訳

### データモデル

```typescript
// 検索結果
interface SearchResult {
  id: number;
  source: "google" | "reddit" | "bing";
  title: string;
  url: string;
  snippet: string;
  createdAt: Date;
}

// ブックマーク
interface Bookmark {
  id: number;
  userId: number;
  title: string;
  url: string;
  createdAt: Date;
}

// ブラウザタブ
interface BrowserTab {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  isActive: boolean;
}
```

### API設計

```typescript
// tRPCルーター
arkBrowser: router({
  // 検索
  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      sources: z.array(z.enum(["google", "reddit", "bing"])),
    }))
    .mutation(async ({ input, ctx }) => {
      // 意図翻訳検索を実行
      // 各検索エンジンから結果を取得
      // 結果を統合して返す
    }),
  
  // ページ解析
  analyzePage: protectedProcedure
    .input(z.object({
      url: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // HTMLページを取得
      // 段落単位で解析
      // 重要な段落を抽出
      // 要約を生成
    }),
  
  // ページ翻訳
  translatePage: protectedProcedure
    .input(z.object({
      url: z.string(),
      targetLanguage: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // HTMLページを取得
      // 翻訳×解読エンジンで翻訳
      // 翻訳されたページを返す
    }),
  
  // ブックマーク追加
  addBookmark: protectedProcedure
    .input(z.object({
      title: z.string(),
      url: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // ブックマークを追加
    }),
  
  // ブックマーク一覧取得
  getBookmarks: protectedProcedure
    .query(async ({ ctx }) => {
      // ユーザーのブックマーク一覧を取得
    }),
}),
```

---

## ブラウザ×チャット連動設計

### 概要

ブラウザ×チャット連動は、Ark-BrowserとChat Coreを統合し、ユーザーが「検索→理解→会話→行動」の一連の流れをシームレスに体験できるようにする。

### 連動パターン

#### 1. ブラウザ→チャット
- ブラウザで見つけた情報をチャットに送信
- ページの要約をチャットで生成
- ページの内容について質問

#### 2. チャット→ブラウザ
- チャットから検索指示を送信
- チャットで生成したURLをブラウザで開く
- チャットで推奨されたページをブラウザで表示

#### 3. 双方向連動
- ブラウザで見ているページの内容をチャットで解析
- チャットで生成した情報をブラウザで検証
- ブラウザとチャットの履歴を統合

### UI設計

#### パターン1: サイドバイサイド
```
┌─────────────────────────────────────────┐
│  Ark-Browser      │  Chat Core          │
│                   │                     │
│  ┌─────────────┐  │  ┌───────────────┐ │
│  │ Address Bar │  │  │ Message List  │ │
│  └─────────────┘  │  └───────────────┘ │
│  ┌─────────────┐  │  ┌───────────────┐ │
│  │ Page Viewer │  │  │ Message Input │ │
│  │             │  │  └───────────────┘ │
│  │             │  │                     │
│  └─────────────┘  │                     │
└─────────────────────────────────────────┘
```

#### パターン2: タブ切替
```
┌─────────────────────────────────────────┐
│  [ Browser ]  [ Chat ]                  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Active Tab Content                │  │
│  │                                   │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### データフロー

```
User Input (Browser)
  ↓
Ark-Browser (Search/Navigate)
  ↓
Search Results / Page Content
  ↓
Send to Chat Core
  ↓
Twin-Core Persona Engine (Analyze/Summarize)
  ↓
Chat Response
  ↓
Display in Chat Core
  ↓
User Action (Continue Search / Ask Question)
  ↓
Loop
```

---

## データフロー設計

### 全体データフロー

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ├─────────────────────────────┐
       │                             │
       ↓                             ↓
┌─────────────┐              ┌─────────────┐
│ Chat Core   │←────────────→│ Ark-Browser │
└──────┬──────┘              └──────┬──────┘
       │                             │
       ├─────────────┬───────────────┤
       │             │               │
       ↓             ↓               ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Twin-Core   │ │ Search API  │ │ Translation │
│ Persona     │ │ (G/R/B)     │ │ Engine      │
│ Engine      │ └─────────────┘ └─────────────┘
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Database    │
└─────────────┘
```

### Chat Core データフロー

```
User Message
  ↓
Message Input Component
  ↓
tRPC: chatCore.sendMessage
  ↓
Twin-Core Persona Engine
  ↓
LLM (invokeLLM)
  ↓
Response Generation
  ↓
Save to Database
  ↓
Stream Response to Client
  ↓
Display in Message List
```

### Ark-Browser データフロー

```
Search Query
  ↓
Search Bar Component
  ↓
tRPC: arkBrowser.search
  ↓
Intent Translation
  ↓
Search APIs (Google/Reddit/Bing)
  ↓
Aggregate Results
  ↓
Display in Search Results
  ↓
User Clicks Result
  ↓
tRPC: arkBrowser.analyzePage
  ↓
HTML Parsing
  ↓
Translation Engine
  ↓
Display in Page Viewer
```

---

## コンポーネント構造設計

### Chat Core コンポーネント階層

```
ChatCoreHome
├── ChatInterface
│   ├── TwinCorePersonaSelector
│   ├── ConversationModeSelector
│   ├── MessageList
│   │   └── MessageItem
│   │       ├── UserMessage
│   │       └── AssistantMessage
│   ├── MessageInput
│   │   ├── TextArea
│   │   └── SendButton
│   └── ChatSettings
└── ConversationList
    └── ConversationItem
```

### Ark-Browser コンポーネント階層

```
ArkBrowserHome
├── BrowserInterface
│   ├── TabManager
│   │   └── TabItem
│   ├── NavigationButtons
│   │   ├── BackButton
│   │   ├── ForwardButton
│   │   └── RefreshButton
│   ├── AddressBar
│   ├── SearchBar
│   ├── PageViewer
│   │   ├── HTMLRenderer
│   │   └── TranslationOverlay
│   ├── SearchResults
│   │   └── SearchResultItem
│   └── BookmarkManager
│       └── BookmarkItem
└── BrowserSettings
```

### 統合コンポーネント階層

```
IntegratedWorkspace
├── LayoutSelector (SideBySide / Tabs)
├── ArkBrowserPanel
│   └── ArkBrowserHome
└── ChatCorePanel
    └── ChatCoreHome
```

---

## API設計

### tRPCルーター構造

```typescript
export const appRouter = router({
  // 既存のルーター
  system: systemRouter,
  auth: authRouter,
  twinCorePersona: twinCorePersonaRouter,
  
  // 新規ルーター
  chatCore: chatCoreRouter,
  arkBrowser: arkBrowserRouter,
  integration: integrationRouter,
});
```

### Chat Core API

```typescript
chatCore: router({
  // メッセージ送信
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // 会話一覧取得
  getConversations: protectedProcedure
    .query(async ({ ctx }) => { /* ... */ }),
  
  // 会話作成
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string(),
      shukuyo: z.string(),
      conversationMode: z.enum(["general", "intermediate", "expert"]),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // メッセージ履歴取得
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
    }))
    .query(async ({ input, ctx }) => { /* ... */ }),
  
  // 会話削除
  deleteConversation: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
}),
```

### Ark-Browser API

```typescript
arkBrowser: router({
  // 検索
  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      sources: z.array(z.enum(["google", "reddit", "bing"])),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // ページ解析
  analyzePage: protectedProcedure
    .input(z.object({
      url: z.string(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // ページ翻訳
  translatePage: protectedProcedure
    .input(z.object({
      url: z.string(),
      targetLanguage: z.string(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // ブックマーク追加
  addBookmark: protectedProcedure
    .input(z.object({
      title: z.string(),
      url: z.string(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // ブックマーク一覧取得
  getBookmarks: protectedProcedure
    .query(async ({ ctx }) => { /* ... */ }),
  
  // ブックマーク削除
  deleteBookmark: protectedProcedure
    .input(z.object({
      bookmarkId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
}),
```

### Integration API

```typescript
integration: router({
  // ブラウザからチャットへコンテキスト送信
  sendBrowserContextToChat: protectedProcedure
    .input(z.object({
      url: z.string(),
      content: z.string(),
      conversationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // チャットからブラウザへ検索指示
  sendSearchFromChat: protectedProcedure
    .input(z.object({
      query: z.string(),
    }))
    .mutation(async ({ input, ctx }) => { /* ... */ }),
  
  // ブラウザとチャットの履歴統合
  getIntegratedHistory: protectedProcedure
    .query(async ({ ctx }) => { /* ... */ }),
}),
```

---

## 技術スタック

### フロントエンド
- **React 19**: UIコンポーネント
- **TypeScript**: 型安全性
- **Tailwind CSS 4**: スタイリング
- **Framer Motion**: アニメーション
- **tRPC**: 型安全なAPI通信
- **React Query**: データフェッチング・キャッシング
- **Wouter**: ルーティング

### バックエンド
- **Node.js 22**: サーバーランタイム
- **Express 4**: Webフレームワーク
- **tRPC 11**: API層
- **Drizzle ORM**: データベースORM
- **MySQL/TiDB**: データベース
- **Zod**: バリデーション

### 統合サービス
- **Twin-Core Persona Engine**: 人格反映エンジン
- **LLM (invokeLLM)**: テキスト生成
- **Search APIs**: Google/Reddit/Bing
- **Translation Engine**: 翻訳×解読エンジン

---

## セキュリティ設計

### 認証・認可
- **Manus OAuth**: ユーザー認証
- **JWT**: セッション管理
- **protectedProcedure**: API認可

### データ保護
- **暗号化**: パスワード・APIキーの暗号化
- **HTTPS**: 通信の暗号化
- **CSRF対策**: トークンベースの保護

### 入力検証
- **Zod**: 入力バリデーション
- **サニタイゼーション**: XSS対策
- **レート制限**: DDoS対策

---

## パフォーマンス設計

### フロントエンド最適化
- **React Query キャッシング**: APIレスポンスのキャッシュ
- **仮想スクロール**: 大量メッセージの表示最適化
- **遅延ローディング**: コンポーネントの遅延読み込み
- **メモ化**: 不要な再レンダリングの防止

### バックエンド最適化
- **データベースインデックス**: クエリ最適化
- **接続プーリング**: データベース接続の再利用
- **キャッシング**: Redis等のキャッシュ層
- **ストリーミング**: 大量データの効率的な転送

### ネットワーク最適化
- **CDN**: 静的ファイルの配信
- **圧縮**: gzip/brotli圧縮
- **HTTP/2**: 多重化通信

---

## まとめ

TENMON-ARK Chat Core + Ark-Browser アーキテクチャは、GPT・Manusを超える"世界最高の使用感OS"を実現するための統合プラットフォームである。Twin-Core人格統合、世界言語対応、意図翻訳検索、ブラウザ×チャット連動を実現し、ユーザーが「検索→理解→会話→行動」の一連の流れをシームレスに体験できる。

安全な自己拡張（自己書き換え禁止・自己拡張のみ許可）の原則に基づき、3日間でプロトタイプを完成させる。

---

**作成者**: Manus AI  
**バージョン**: 1.0  
**作成日**: 2025年11月30日
