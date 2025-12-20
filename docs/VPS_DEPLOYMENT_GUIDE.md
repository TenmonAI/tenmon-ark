# TENMON-ARK VPS本番デプロイガイド
**対象**: VPS上でのバックエンドAPIサーバー起動手順

---

## 前提条件

- VPS: Xserver VPS（Ubuntu + nginx）
- ドメイン: https://tenmon-ark.com
- HTTPS: certbot により正常発行・自動更新設定済み

---

## Phase 2-A: 手動起動確認（最初・必須）

### STEP 1: VPSにSSH接続

```bash
ssh user@tenmon-ark.com
```

### STEP 2: プロジェクトディレクトリに移動

```bash
cd /opt/tenmon-ark/tenmon-ark
```

### STEP 3: 最新コードを取得

```bash
git pull origin main
```

### STEP 4: 依存関係をインストール

```bash
pnpm install
```

### STEP 5: ビルド

```bash
pnpm run build
```

**確認**:
- `dist/public/` にフロントエンドがビルドされる
- `dist/index.js` にバックエンドがビルドされる

### STEP 6: 環境変数を設定

```bash
# .env ファイルを作成
nano .env
```

**必須環境変数**:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@localhost:3306/tenmon_ark
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key-here
OAUTH_SERVER_URL=https://oauth-server-url
OWNER_OPEN_ID=your-owner-open-id
```

**ファイル権限を保護**:
```bash
chmod 600 .env
```

### STEP 7: 手動でAPIサーバーを起動

```bash
node dist/index.js
```

**確認**:
- ログに `Server running on http://localhost:3000/` が表示される
- エラーがないことを確認

### STEP 8: 別ターミナルで動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/api/health

# 期待されるレスポンス:
# {"status":"ok","timestamp":...,"uptime":...,"environment":"production"}
```

### STEP 9: ブラウザで確認

- `https://tenmon-ark.com/api/health` にアクセス
- レスポンスが返ることを確認（nginxプロキシが設定されていない場合は404）

**完了条件**:
- ✅ APIサーバーが起動する
- ✅ `/api/health` が動作する
- ✅ ログにエラーがない

---

## Phase 2-B: systemdサービス化（次・必須）

### STEP 1: systemdサービスファイルを作成

```bash
sudo nano /etc/systemd/system/tenmon-ark-api.service
```

**内容**（`server/systemd/tenmon-ark-api.service` を参照）:
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

### STEP 2: systemdを再読み込み

```bash
sudo systemctl daemon-reload
```

### STEP 3: サービスを有効化

```bash
sudo systemctl enable tenmon-ark-api
```

### STEP 4: サービスを起動

```bash
sudo systemctl start tenmon-ark-api
```

### STEP 5: ステータス確認

```bash
sudo systemctl status tenmon-ark-api
```

**期待される出力**:
- `Active: active (running)`
- エラーがない

### STEP 6: ログ確認

```bash
sudo journalctl -u tenmon-ark-api -f
```

**完了条件**:
- ✅ サービスが起動する
- ✅ 自動再起動が有効
- ✅ ログにエラーがない

---

## Phase 2-C: nginx APIプロキシ設定（最後・必須）

### STEP 1: nginx設定ファイルをバックアップ

```bash
sudo cp /etc/nginx/sites-available/tenmon-ark.com /etc/nginx/sites-available/tenmon-ark.com.backup
```

### STEP 2: nginx設定を編集

```bash
sudo nano /etc/nginx/sites-available/tenmon-ark.com
```

**追加内容**（`server/nginx/tenmon-ark.com.conf` を参照）:
```nginx
# APIプロキシ
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
```

**注意**: 既存の `location /` 設定は変更しない（静的ファイル配信を維持）

### STEP 3: 設定をテスト

```bash
sudo nginx -t
```

**期待される出力**:
- `syntax is ok`
- `test is successful`

### STEP 4: nginxをリロード

```bash
sudo systemctl reload nginx
```

### STEP 5: 動作確認

```bash
# ヘルスチェック
curl https://tenmon-ark.com/api/health

# 期待されるレスポンス:
# {"status":"ok","timestamp":...,"uptime":...,"environment":"production"}
```

**完了条件**:
- ✅ nginx設定が正しい
- ✅ `/api/*` がバックエンドにプロキシされる
- ✅ 既存の静的ファイル配信が壊れていない

---

## Phase 2-D: チャット動作確認（最終確認）

### STEP 1: ブラウザでアクセス

- `https://tenmon-ark.com/chat` にアクセス

### STEP 2: チャットが動作することを確認

- メッセージを送信
- AI応答が返ることを確認

**完了条件**:
- ✅ チャットが動作する
- ✅ AI応答が正常に返る
- ✅ エラーがない

---

## トラブルシューティング

### APIサーバーが起動しない

**確認事項**:
1. 環境変数が正しく設定されているか
2. ポート3000が使用されていないか
3. ログにエラーがないか

**コマンド**:
```bash
# ポート確認
sudo lsof -i :3000

# ログ確認
sudo journalctl -u tenmon-ark-api -n 50
```

### nginxがプロキシしない

**確認事項**:
1. nginx設定が正しいか
2. APIサーバーが起動しているか
3. ファイアウォールがポート3000をブロックしていないか

**コマンド**:
```bash
# nginx設定テスト
sudo nginx -t

# APIサーバー確認
curl http://localhost:3000/api/health
```

### データベース接続エラー

**確認事項**:
1. `DATABASE_URL` が正しいか
2. MySQLが起動しているか
3. データベースが存在するか

**コマンド**:
```bash
# MySQL確認
sudo systemctl status mysql

# データベース接続テスト
mysql -u user -p -h localhost tenmon_ark
```

---

## 完了条件（最終確認）

- ✅ `https://tenmon-ark.com/api/health` が動作する
- ✅ `https://tenmon-ark.com/chat` でチャットが動作する
- ✅ APIサーバーが常駐起動している
- ✅ 再起動後も自動で起動する

---

**ガイド完了**

