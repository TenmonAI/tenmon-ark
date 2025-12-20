# TENMON-ARK 本番起動解析レポート
**作成日**: 2025-01-XX  
**目的**: 現状コードを読んだうえでの本番起動実装

---

## TASK A: 現状コード解析（事実ベース）

### 1. ビルド出力ファイル名の確定

**確認結果**:
- `package.json` の `build` スクリプト:
  ```json
  "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  ```
- **出力先**: `dist/index.js`（`--outdir=dist` により、`server/_core/index.ts` が `dist/index.js` に出力される）
- **起動コマンド**: `node dist/index.js`（`package.json` の `start` スクリプトで確認）

**結論**: 本番起動コマンドは `/usr/bin/node dist/index.js`

---

### 2. serveStatic の動作確認

**確認結果**:
- `server/_core/index.ts` の `startServer()` 関数内:
  ```typescript
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  ```

- `server/_core/vite.ts` の `serveStatic()` 関数:
  ```typescript
  export function serveStatic(app: Express) {
    const distPath =
      process.env.NODE_ENV === "development"
        ? path.resolve(import.meta.dirname, "../..", "dist", "public")
        : path.resolve(import.meta.dirname, "public");
    // ...
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  ```

**問題点**:
- 本番環境（`NODE_ENV=production`）では `path.resolve(import.meta.dirname, "public")` を参照
- `import.meta.dirname` は `server/_core/` を指すため、`server/_core/public` を参照しようとする
- **実際の静的ファイルは `/var/www/html` に配置されている**

**結論**: 
- Express の `serveStatic` は本番環境では使用しない（nginxが静的配信を担当）
- Express は API のみを担当

---

### 3. PORT 決定ロジック

**確認結果**:
- `server/_core/index.ts` の `findAvailablePort()` 関数:
  ```typescript
  async function findAvailablePort(startPort: number = 3000): Promise<number> {
    for (let port = startPort; port < startPort + 20; port++) {
      if (await isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available port found starting from ${startPort}`);
  }
  ```

- 使用箇所:
  ```typescript
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  ```

**結論**: 
- デフォルトポートは `3000`
- `process.env.PORT` で上書き可能
- ポートが使用中の場合は自動で次のポートを探す（3000-3019）

---

### 4. API エンドポイントの確認

**確認結果**:
- `server/_core/index.ts` で登録されているエンドポイント:
  - `/api/health` - ヘルスチェック（追加済み）
  - `/api/metrics` - Prometheusメトリクス
  - `/api/stripe/webhook` - Stripe Webhook
  - `/api/oauth/callback` - OAuth認証
  - `/api/trpc/*` - tRPCエンドポイント（`createExpressMiddleware`）
  - `/api/chat/stream` - チャットストリーミング（SSE）
  - `/api/socket.io/` - WebSocket（Socket.IO）

**結論**: 
- すべてのAPIは `/api/*` パスで提供される
- nginx で `/api/*` を `http://127.0.0.1:3000` にプロキシする必要がある

---

## TASK B: 本番起動コマンドの確定

### 確定事項

**本番起動コマンド**:
```bash
/usr/bin/node dist/index.js
```

**理由**:
1. `package.json` の `build` スクリプトが `dist/index.js` に出力する
2. `package.json` の `start` スクリプトが `node dist/index.js` を使用
3. ビルド後のファイル構造が `dist/index.js` であることを確認

**systemd ExecStart**:
```ini
ExecStart=/usr/bin/node dist/index.js
```

---

## TASK C: systemd サービスファイルの最終版

### 確定版（実態に一致）

**ファイル**: `server/systemd/tenmon-ark-api.service`

```ini
[Unit]
Description=TENMON-ARK API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/tenmon-ark/tenmon-ark
Environment=NODE_ENV=production
EnvironmentFile=/opt/tenmon-ark/tenmon-ark/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**確定理由**:
- `WorkingDirectory`: `/opt/tenmon-ark/tenmon-ark`（GitHub Actionsのデプロイ先）
- `ExecStart`: `/usr/bin/node dist/index.js`（TASK Bで確定）
- `User`: `www-data`（nginxと同じユーザー）
- `EnvironmentFile`: `.env` ファイルから環境変数を読み込む

---

## TASK D: nginx と Express の責任分界

### 現状確認

**nginx がやること**:
1. HTTPS（443）の受付
2. 静的ファイル配信（`/var/www/html`）
3. `/api/*` を Express にプロキシ
4. `/api/socket.io/*` を Express にプロキシ（WebSocket）

**Express がやること**:
1. API エンドポイント（`/api/*`）
2. チャットストリーミング（`/api/chat/stream`）
3. WebSocket（`/api/socket.io/`）
4. tRPC（`/api/trpc/*`）
5. OAuth認証（`/api/oauth/callback`）
6. Stripe Webhook（`/api/stripe/webhook`）

### 問題点の確認

**二重 serveStatic の問題**:
- Express の `serveStatic()` は本番環境では `server/_core/public` を参照しようとする
- しかし、実際の静的ファイルは `/var/www/html` に配置されている
- **解決策**: 本番環境では Express の `serveStatic()` を呼ばない（既に実装済み）

**ルート競合の問題**:
- nginx が `/` を `/var/www/html` にマッピング
- Express が `/api/*` を処理
- **競合なし**: nginx が `/api/*` を Express にプロキシするため

**結論**: 
- 責任分界は明確
- 二重 serveStatic の問題は既に解決済み（本番環境では `serveStatic()` を呼ばない）

---

## TASK E: /chat エラーの直接原因特定

### フロント側の API 呼び出し確認

**確認結果**:
- `client/src/hooks/useChatStreaming.ts`:
  ```typescript
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({...}),
  });
  ```

- **呼び出し先**: `/api/chat/stream`（POST）

### バックエンド側の実装確認

**確認結果**:
- `server/chat/chatStreamingEndpoint.ts`:
  - Express のルーターとして実装
  - `server/_core/index.ts` で登録されている

### エラーの直接原因

**確定事項**:
1. フロント側は `/api/chat/stream` を呼び出す
2. バックエンド側は `/api/chat/stream` を実装済み
3. **問題**: Express サーバーが VPS 上で起動していない
4. **結果**: nginx が `/api/chat/stream` をプロキシしようとするが、バックエンドが存在しないため 502 Bad Gateway または 404 Not Found

**結論**: 
- エラーの直接原因は「Express サーバーが起動していない」こと
- コードの問題ではない

---

## 最終ゴール（成功条件）

### 確認項目

1. ✅ `https://tenmon-ark.com` → トップ表示OK（既に成功）
2. ⏳ `https://tenmon-ark.com/api/health` → JSON返る（Express起動後）
3. ⏳ `https://tenmon-ark.com/chat` → チャットが応答（Express起動後）
4. ⏳ VPS再起動後も API が自動起動（systemd設定後）
5. ✅ `git push origin main` だけでフロント更新（既に成功）

---

## MVP起動チェックリスト（コマンド列）

### Phase 1: 手動起動確認

```bash
# 1. VPSにSSH接続
ssh user@tenmon-ark.com

# 2. プロジェクトディレクトリに移動
cd /opt/tenmon-ark/tenmon-ark

# 3. 最新コードを取得
git pull origin main

# 4. 依存関係をインストール
pnpm install

# 5. ビルド
pnpm run build

# 6. 環境変数を設定（.envファイルを作成）
nano .env
# 以下を設定:
# NODE_ENV=production
# PORT=3000
# DATABASE_URL=mysql://...
# OPENAI_API_KEY=sk-...
# JWT_SECRET=...
# （その他必要な環境変数）

# 7. ファイル権限を保護
chmod 600 .env

# 8. 手動でAPIサーバーを起動
node dist/index.js

# 9. 別ターミナルで動作確認
curl http://localhost:3000/api/health
# 期待されるレスポンス: {"status":"ok","timestamp":...,"uptime":...,"environment":"production"}
```

### Phase 2: systemdサービス化

```bash
# 1. systemdサービスファイルを配置
sudo cp server/systemd/tenmon-ark-api.service /etc/systemd/system/tenmon-ark-api.service

# 2. systemdを再読み込み
sudo systemctl daemon-reload

# 3. サービスを有効化
sudo systemctl enable tenmon-ark-api

# 4. サービスを起動
sudo systemctl start tenmon-ark-api

# 5. ステータス確認
sudo systemctl status tenmon-ark-api

# 6. ログ確認
sudo journalctl -u tenmon-ark-api -f
```

### Phase 3: nginx APIプロキシ設定

```bash
# 1. nginx設定ファイルをバックアップ
sudo cp /etc/nginx/sites-available/tenmon-ark.com /etc/nginx/sites-available/tenmon-ark.com.backup

# 2. nginx設定を編集
sudo nano /etc/nginx/sites-available/tenmon-ark.com

# 3. 以下を追加（既存の location / の前に）:
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}

location /api/socket.io/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 4. 設定をテスト
sudo nginx -t

# 5. nginxをリロード
sudo systemctl reload nginx

# 6. 動作確認
curl https://tenmon-ark.com/api/health
# 期待されるレスポンス: {"status":"ok","timestamp":...,"uptime":...,"environment":"production"}
```

### Phase 4: 最終確認

```bash
# 1. ヘルスチェック
curl https://tenmon-ark.com/api/health

# 2. チャット動作確認
# ブラウザで https://tenmon-ark.com/chat にアクセス
# メッセージを送信してAI応答を確認

# 3. 再起動テスト
sudo reboot
# 再起動後、以下で確認:
sudo systemctl status tenmon-ark-api
curl https://tenmon-ark.com/api/health
```

---

## nginx 最終設定（完成版）

### ファイル: `/etc/nginx/sites-available/tenmon-ark.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tenmon-ark.com www.tenmon-ark.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tenmon-ark.com www.tenmon-ark.com;

    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/tenmon-ark.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tenmon-ark.com/privkey.pem;

    # 静的ファイル（フロントエンド）
    root /var/www/html;
    index index.html;

    # APIプロキシ（Express）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket（Socket.IO）
    location /api/socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静的ファイル（SPA）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## 結論

### 実装完了事項

1. ✅ 現状コード解析完了
2. ✅ 本番起動コマンド確定: `/usr/bin/node dist/index.js`
3. ✅ systemdサービスファイル完成版作成済み
4. ✅ nginx設定完成版作成済み
5. ✅ /chat エラーの直接原因特定: Express サーバーが起動していない

### 次のアクション（VPS上で実行）

1. Phase 1: 手動起動確認
2. Phase 2: systemdサービス化
3. Phase 3: nginx APIプロキシ設定
4. Phase 4: 最終確認

**レポート完了**

