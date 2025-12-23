# リッチなUIフロントエンド（client）セットアップガイド

## 1. フロントエンドの場所

**`client/` フォルダ** にリッチなUIのチャットルームとダッシュボードが実装されています。

### 主要なファイル
- `client/src/pages/ChatRoom.tsx` - ChatGPT風のリッチなチャットルームUI
- `client/src/pages/DashboardV3.tsx` - ダッシュボード画面（Founder-grade）
- `client/src/pages/Dashboard.tsx` - ダッシュボード画面
- `client/src/pages/ChatDivine.tsx` - 黒×金神装UIテーマのチャット

## 2. 起動コマンド

### 開発環境での起動

```bash
# ルートディレクトリで実行
npm run dev
```

または、Viteを直接起動する場合：

```bash
# フロントエンドのみ起動（開発サーバー）
npx vite

# または、ポートを指定
npx vite --port 5173
```

### ビルドコマンド

```bash
# 本番用ビルド
npm run build
```

## 3. VPS接続設定の変更手順

### 方法1: 環境変数を使用（推奨）

#### ステップ1: `.env` ファイルを作成

ルートディレクトリに `.env` ファイルを作成：

```bash
# .env
VITE_API_BASE_URL=http://162.43.90.247:3000
```

#### ステップ2: `client/src/main.tsx` を修正

`client/src/main.tsx` の tRPC クライアント設定を環境変数を使用するように変更：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,  // 環境変数を使用
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});
```

### 方法2: Vite プロキシ設定を使用

`vite.config.ts` にプロキシ設定を追加：

```typescript
export default defineConfig({
  // ... 既存の設定 ...
  server: {
    host: true,
    allowedHosts: [
      // ... 既存の設定 ...
    ],
    proxy: {
      "/api": {
        target: "http://162.43.90.247:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

この方法の場合、開発環境では相対パス `/api/trpc` のままで、Viteが自動的にプロキシします。

## 4. 推奨される設定方法

**本番環境（VPS）に接続する場合**:
- 方法1（環境変数）を使用
- `.env` ファイルに `VITE_API_BASE_URL=http://162.43.90.247:3000` を設定

**開発環境（ローカル）で接続する場合**:
- 方法2（プロキシ設定）を使用
- または、`.env.local` ファイルに `VITE_API_BASE_URL=http://localhost:3000` を設定

## 5. 確認方法

1. `.env` ファイルを作成・設定
2. `client/src/main.tsx` を修正（方法1の場合）
3. `npm run dev` で起動
4. ブラウザの開発者ツール（Network タブ）で、APIリクエストが `http://162.43.90.247:3000/api/trpc` に送信されていることを確認

