# TENMON-ARK Web UI 改修レポート

## 概要

`/opt/tenmon-ark/web` パッケージのUIをChatGPT風に完全再現しました。

## 変更ファイル一覧

### 新規作成
1. `web/src/components/Sidebar.tsx` - 左サイドバー（ChatGPT風）
2. `web/src/components/ChatMessage.tsx` - チャットメッセージ表示
3. `web/src/components/Composer.tsx` - 入力欄（下固定）
4. `web/src/pages/Chat.tsx` - チャットページ（メイン）
5. `web/src/pages/GPTsList.tsx` - カスタムGPT一覧
6. `web/src/pages/GPTDetail.tsx` - カスタムGPT詳細
7. `web/src/pages/GPTData.tsx` - データ導入（Drag&Drop）

### 修正
1. `web/src/App.tsx` - ルーティング追加（/gpts系）
2. `web/src/api/chat.ts` - API接続（POST /api/chat）
3. `web/src/types/chat.ts` - 型定義更新
4. `web/src/index.css` - ベーススタイル追加

## 主要コンポーネント

### 1. Layout（App.tsx）

```typescript
<div className="flex h-screen bg-gray-100 text-gray-900">
  <Sidebar />
  <div className="flex-1 flex flex-col">
    <Chat />
  </div>
</div>
```

- 3カラム構成（左サイドバー + メインエリア）
- 画面全高（`h-screen`）
- 背景色で区切り（線なし）

### 2. Sidebar.tsx

- ロゴ表示
- 「新しい会話」ボタン
- 履歴リスト
- ユーザー情報
- 背景色: `bg-gray-50`

### 3. Chat.tsx

- ヘッダー（`shadow-sm`）
- メッセージエリア（`bg-gray-100`、自動スクロール）
- 入力欄（`Composer`コンポーネント）
- エラー表示（画面内）

### 4. Composer.tsx

- テキストエリア（自動リサイズ）
- 送信ボタン（Enterキー対応）
- 送信中表示
- 下固定（`shadow-[0_-1px_4px_rgba(0,0,0,0.05)]`）

### 5. ChatMessage.tsx

- `role` に応じて背景色を変更（`user`: `bg-gray-200`, `assistant`: `bg-white`）
- 線なし、背景色で区切り
- `rounded-xl` で角丸

## ルーティング

### 実装済みルート

1. `/` - チャットページ（デフォルト）
2. `/gpts` - カスタムGPT一覧
3. `/gpts/:id` - カスタムGPT詳細
4. `/gpts/:id/data` - データ導入（Drag&Drop + アップロード）

### ルーティング実装

簡易的なルーティングを実装（`window.location.pathname`を使用）。
本格的なルーティングが必要な場合は、`wouter` や `react-router` を導入してください。

## API接続

### POST /api/chat

**リクエスト形式:**
```typescript
{
  message: string;
  sessionId: string;
  meta: Record<string, any>;
}
```

**レスポンス形式:**
```typescript
{
  response: string;
  timestamp?: string;
}
```

### エラーハンドリング

- エラー時は画面内に表示（toast不要）
- エラーメッセージをユーザーに表示

## UIテーマ（ChatGPT風）

### 配色
- 全体背景: `bg-gray-100`
- メイン: `bg-white`
- サイドバー: `bg-gray-50`
- ユーザーメッセージ: `bg-gray-200`
- アシスタントメッセージ: `bg-white`

### デザインルール
- **境界線**: 基本使わず、背景色の差で区切り
- **角丸**: `rounded-xl`（控えめ）
- **影**: `shadow-sm`（控えめ）
- **カード**: 使わない（背景色で区切り）

### Tailwind CSS
- Tailwind CSS v4 を使用（`@tailwindcss/vite` プラグイン）
- 既に導入済み

## 動作確認手順

### 1. 依存関係のインストール

```bash
cd /opt/tenmon-ark/web
pnpm install
```

### 2. ビルド

```bash
pnpm build
```

### 3. 開発サーバー起動（オプション）

```bash
pnpm dev
```

### 4. デプロイ

```bash
# ビルド結果をデプロイ先にコピー
rsync -av --delete dist/ /var/www/tenmon-ark/web/
```

## ビルド結果

```
dist/index.html                   0.40 kB │ gzip:  0.27 kB
dist/assets/index-t8ybeMxP.css   15.05 kB │ gzip:  3.83 kB
dist/assets/index-DIfF1XIc.js   202.46 kB │ gzip: 63.37 kB
```

ビルド成功（446ms）

## 次のステップ

1. **ルーティングライブラリ導入**（オプション）
   - `wouter` または `react-router` を導入して、より堅牢なルーティングを実装

2. **履歴機能実装**
   - 会話履歴の永続化（LocalStorage / API）
   - 履歴の読み込み・削除

3. **GPTsページ実装**
   - GPT一覧のAPI接続
   - GPT詳細の表示
   - データ導入の実装（アップロード処理）

4. **API接続の詳細実装**
   - ストリーミング対応
   - エラーハンドリングの改善
   - リトライ機能

## 注意事項

- 現在のルーティングは簡易実装です。本格的なSPAルーティングが必要な場合は、ルーティングライブラリを導入してください。
- 会話履歴は現在メモリ上のみです。永続化が必要な場合は、LocalStorageまたはAPIを実装してください。
- GPTsページは現在プレースホルダーです。API接続と実装が必要です。

