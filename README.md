# TENMON-ARK

## 開発環境の起動

### フロントエンド（client/）の起動

**重要**: フロントエンドは `client/` ディレクトリで起動してください。

```bash
# ルートディレクトリから
npm run dev:client

# または、client/ ディレクトリに移動して
cd client
npm run dev
```

**注意**: 
- `web/` ディレクトリは別の最小UIプロジェクトです。通常は使用しません。
- ポート5173で起動します。
- Vite proxy設定により、`/api` は自動的に `http://localhost:3000` にプロキシされます。

### バックエンド（api/）の起動

```bash
# ルートディレクトリから
npm run dev:api

# または、api/ ディレクトリに移動して
cd api
npm run dev
```

**注意**: 
- ポート3000で起動します。
- Kanagi思考回路が有効です。

## 主要なルート

- `/` - ChatRoom（メインチャット画面）
- `/dashboard` - DashboardV3
- `/home` - Home（五十音火水霊核マップ）
- `/chat/divine` - ChatDivine

## トラブルシューティング

### 最小UIが表示される場合

`web/` ディレクトリのViteが起動している可能性があります。以下を確認してください：

1. 起動中のプロセスを確認:
   ```bash
   ps aux | grep vite
   ```

2. `web/` のViteを停止:
   ```bash
   # web/ のViteプロセスを終了
   pkill -f "web/node_modules.*vite"
   ```

3. `client/` のViteを起動:
   ```bash
   npm run dev:client
   ```

### API接続エラーの場合

1. バックエンドが起動しているか確認:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Vite proxy設定を確認:
   - `client/vite.config.ts` に `server.proxy` 設定があるか確認
   - バックエンドのポート（デフォルト: 3000）が正しいか確認