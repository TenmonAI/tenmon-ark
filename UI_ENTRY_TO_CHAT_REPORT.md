# TENMON-ARK UI 入口〜チャット画面 ファイル一覧

## 調査方法

1. `find client/src -maxdepth 3 -type f | sort` で構造を列挙
2. `ls client/src/main.* client/src/index.*` でエントリポイントを特定
3. `grep -R -n "Routes\|createBrowserRouter\|BrowserRouter\|Route" client/src` でルーティングを特定
4. `grep -R -n "ChatRoom" client/src` でChatRoomの呼び出し元を特定
5. `grep -R -n "/api/chat\|/api/law" client/src` でAPI呼び出し層を特定

## UI入口ファイル

### 1. エントリポイント

- **client/src/main.tsx**
  - React アプリケーションのエントリポイント
  - tRPC クライアントの初期化
  - QueryClient の設定
  - App コンポーネントのレンダリング

- **client/src/index.css**
  - グローバルスタイル定義

### 2. ルートコンポーネント

- **client/src/App.tsx**
  - アプリケーションのルートコンポーネント
  - wouter を使用したルーティング定義
  - EnhancedErrorBoundary、ThemeProvider、TooltipProvider の設定
  - ChatRoom は `/` と `/chat` パスでマウントされる

## チャット画面ファイル

### 3. メインチャット画面

- **client/src/pages/ChatRoom.tsx**
  - チャット画面のメインコンポーネント
  - メッセージ送受信、ストリーミング表示
  - 深層解析トグル、candidates表示、学習機能
  - ファイルアップロード、音声入力
  - 学習一覧の表示

## APIクライアント層

### 4. ストリーミングAPI

- **client/src/hooks/useChatStreaming.ts**
  - Server-Sent Events (SSE) ベースのチャットストリーミングフック
  - `/api/chat/stream` エンドポイントを使用
  - 再接続ロジックと中断防止処理を実装

### 5. 通常API呼び出し

- **client/src/pages/ChatRoom.tsx** (内蔵)
  - `/api/chat` エンドポイント（深層解析時）
  - `/api/law/commit` エンドポイント（学習保存）
  - `/api/law/list` エンドポイント（学習一覧取得）

### 6. tRPCクライアント

- **client/src/lib/trpc.ts**
  - tRPC React クライアントの定義
  - AppRouter 型のインポート

## チャット関連コンポーネント

### 7. チャットUIコンポーネント

- **client/src/components/chat/PersonaChatBubble.tsx**
  - パーソナ別のチャットバブル表示

- **client/src/components/chat/PersonaBadge.tsx**
  - パーソナバッジ表示

- **client/src/components/chat/ReasoningStepsViewer.tsx**
  - 推論ステップの可視化

- **client/src/components/chat/ChatLayout.tsx**
  - チャットレイアウト（ChatRoomList を使用）

- **client/src/components/chat/ChatRoomList.tsx**
  - チャットルーム一覧表示

### 8. ストリーミング表示コンポーネント

- **client/src/components/StreamingMessage.tsx**
  - ストリーミングメッセージの表示

- **client/src/components/MessageProgressBar.tsx**
  - メッセージ送信プログレスバー

- **client/src/components/ThinkingPhases.tsx**
  - 思考フェーズの表示

### 9. モバイル対応コンポーネント

- **client/src/components/mobile/ChatMenuSheet.tsx**
  - モバイル用チャットメニューシート

### 10. プロジェクト関連コンポーネント

- **client/src/components/project/ProjectList.tsx**
  - プロジェクト一覧表示（ChatRoom 左サイドバーに表示）

## その他の関連ファイル

### 11. 認証・状態管理

- **client/src/_core/hooks/useAuth.ts**
  - 認証フック（ChatRoom で使用）

- **client/src/state/persona/usePersonaState.ts**
  - パーソナ状態管理（ChatRoom で使用）

### 12. フック

- **client/src/hooks/useImeGuard.ts**
  - IME変換ガード（ChatRoom で使用）

- **client/src/hooks/useSpeechInput.ts**
  - 音声入力フック（ChatRoom で使用）

- **client/src/hooks/useAutoScroll.ts**
  - 自動スクロールフック

### 13. スタイル

- **client/src/styles/chatgpt-ui.css**
  - ChatGPT UI スタイル（ChatRoom で使用）

- **client/src/styles/chatgpt-mobile-ui.css**
  - モバイルUI スタイル

## ファイル一覧（役割別）

### エントリポイント
- `client/src/main.tsx` - React アプリケーションのエントリポイント、tRPC クライアント初期化
- `client/src/index.css` - グローバルスタイル定義

### ルーティング
- `client/src/App.tsx` - ルートコンポーネント、wouter ルーティング定義、ChatRoom を `/` と `/chat` でマウント

### チャット画面
- `client/src/pages/ChatRoom.tsx` - チャット画面のメインコンポーネント、メッセージ送受信、深層解析、学習機能

### APIクライアント層
- `client/src/hooks/useChatStreaming.ts` - SSE ベースのチャットストリーミングフック、`/api/chat/stream` を使用
- `client/src/pages/ChatRoom.tsx` (内蔵) - `/api/chat`、`/api/law/commit`、`/api/law/list` を直接 fetch で呼び出し
- `client/src/lib/trpc.ts` - tRPC React クライアント定義

### チャットUIコンポーネント
- `client/src/components/chat/PersonaChatBubble.tsx` - パーソナ別のチャットバブル表示
- `client/src/components/chat/PersonaBadge.tsx` - パーソナバッジ表示
- `client/src/components/chat/ReasoningStepsViewer.tsx` - 推論ステップの可視化
- `client/src/components/chat/ChatLayout.tsx` - チャットレイアウト
- `client/src/components/chat/ChatRoomList.tsx` - チャットルーム一覧表示

### ストリーミング表示コンポーネント
- `client/src/components/StreamingMessage.tsx` - ストリーミングメッセージの表示
- `client/src/components/MessageProgressBar.tsx` - メッセージ送信プログレスバー
- `client/src/components/ThinkingPhases.tsx` - 思考フェーズの表示

### モバイル対応
- `client/src/components/mobile/ChatMenuSheet.tsx` - モバイル用チャットメニューシート

### プロジェクト関連
- `client/src/components/project/ProjectList.tsx` - プロジェクト一覧表示（ChatRoom 左サイドバー）

### 認証・状態管理
- `client/src/_core/hooks/useAuth.ts` - 認証フック
- `client/src/state/persona/usePersonaState.ts` - パーソナ状態管理

### フック
- `client/src/hooks/useImeGuard.ts` - IME変換ガード
- `client/src/hooks/useSpeechInput.ts` - 音声入力フック
- `client/src/hooks/useAutoScroll.ts` - 自動スクロールフック

### スタイル
- `client/src/styles/chatgpt-ui.css` - ChatGPT UI スタイル
- `client/src/styles/chatgpt-mobile-ui.css` - モバイルUI スタイル

## データフロー

1. **エントリポイント**: `main.tsx` → `App.tsx`
2. **ルーティング**: `App.tsx` の `Router` 関数で `/` または `/chat` パスを `ChatRoom` コンポーネントにマッピング
3. **チャット画面**: `ChatRoom.tsx` がメインコンポーネント
4. **API呼び出し**:
   - ストリーミング: `useChatStreaming` フック → `/api/chat/stream`
   - 通常API: `ChatRoom.tsx` 内で直接 fetch → `/api/chat`、`/api/law/commit`、`/api/law/list`
   - tRPC: `trpc` クライアント → `/api/trpc` (チャットルーム一覧、メッセージ取得など)
