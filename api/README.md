# TENMON-ARK API Server

TENMON-ARK プロジェクトの独立した API サーバーです。SPA（フロントエンド）と完全に分離された構成で、JSON のみを返却します。

## 📋 概要

- **フレームワーク**: Express.js
- **言語**: TypeScript
- **ポート**: 3000 (デフォルト)
- **レスポンス形式**: JSON のみ（HTML/CSS を返さない）

## 🚀 クイックスタート

### 開発環境

```bash
# 依存関係をインストール
npm install

# 開発モードで起動（ホットリロード）
npm run dev

# ビルド
npm run build

# 本番モードで起動
npm run start
```

### 本番環境

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数を設定
cp .env.example .env
nano .env

# 3. ビルド
npm run build

# 4. 起動
npm run start
```

## 📁 ディレクトリ構成

```
api/
├── src/
│   ├── index.ts          # エントリーポイント
│   ├── core/
│   │   └── server.ts     # Express サーバー設定
│   └── routes/
│       ├── health.ts     # /api/health エンドポイント
│       └── chat.ts       # /api/chat エンドポイント
├── dist/                 # ビルド出力（生成される）
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔌 API エンドポイント

### GET /api/health

ヘルスチェックエンドポイント

**リクエスト:**
```bash
curl http://127.0.0.1:3000/api/health
```

**レスポンス:**
```json
{
  "status": "ok",
  "service": "tenmon-ark-api",
  "timestamp": "2025-01-16T12:00:00.000Z",
  "uptime": 123.45
}
```

### POST /api/chat

チャットエンドポイント

**リクエスト:**
```bash
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, TENMON-ARK!"}'
```

**レスポンス:**
```json
{
  "response": "Received: Hello, TENMON-ARK!",
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

## ⚙️ 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | サーバーポート | `3000` |
| `HOST` | サーバーホスト | `127.0.0.1` |
| `CORS_ORIGIN` | CORS 許可オリジン | `*` |

## 🔧 ビルド

```bash
# TypeScript をコンパイル
npm run build

# ビルド結果は dist/ ディレクトリに出力されます
# dist/index.js がエントリーポイントです
```

## 📦 依存関係

### 本番依存関係
- `express`: Web フレームワーク
- `cors`: CORS ミドルウェア
- `dotenv`: 環境変数管理

### 開発依存関係
- `typescript`: TypeScript コンパイラ
- `tsx`: TypeScript 実行環境（開発用）
- `@types/*`: TypeScript 型定義

## 🐛 トラブルシューティング

### ポートが既に使用されている

```bash
# ポート 3000 が使用中か確認
sudo lsof -i :3000

# 別のポートを指定
PORT=3001 npm run start
```

### ビルドエラー

```bash
# TypeScript の型チェックのみ実行
npm run check

# node_modules を再インストール
rm -rf node_modules package-lock.json
npm install
```

## 📝 開発ガイド

### 新しいエンドポイントを追加

1. `src/routes/` に新しいルーターファイルを作成
2. `src/index.ts` でルーターを登録

例: `src/routes/example.ts`

```typescript
import { Router, Request, Response } from "express";

const router = Router();

router.get("/example", (req: Request, res: Response) => {
  res.json({ message: "Example endpoint" });
});

export default router;
```

`src/index.ts` に追加:

```typescript
import exampleRouter from "./routes/example";
app.use("/api", exampleRouter);
```

## 🔒 セキュリティ

- CORS 設定を本番環境では適切に制限してください
- 環境変数に機密情報を含めないでください
- HTTPS を本番環境で使用してください

## 📚 関連ドキュメント

- [デプロイガイド](../infra/DEPLOY.md)
- [完了報告書](../infra/COMPLETION_REPORT.md)

## 📄 ライセンス

MIT

