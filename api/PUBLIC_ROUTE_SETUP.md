# TENMON-ARK 公開導線設定ガイド（2026-01-27）

## 1. 現状確認（証拠を取る）

### 1.1 Webサーバーの確認

**VPSで実行するコマンド**:
```bash
# Webサーバーの確認
which nginx caddy
# 期待値: /usr/sbin/nginx または /usr/bin/caddy のいずれかが表示される

# プロセスの確認
ps aux | grep -E "nginx|caddy" | grep -v grep
# 期待値: nginx または caddy のプロセスが表示される

# systemdサービスの確認
systemctl status nginx 2>/dev/null || systemctl status caddy 2>/dev/null
# 期待値: Active: active (running) が表示される
```

### 1.2 ポートのLISTEN確認

**VPSで実行するコマンド**:
```bash
# 80/443 のLISTEN確認
sudo ss -ltnp | grep -E ':80|:443'
# 期待値: nginx または caddy が LISTEN している

# 3000 のLISTEN確認（APIサーバー）
sudo ss -ltnp | grep ':3000'
# 期待値: node が LISTEN している
```

### 1.3 ドメインのVirtualHost設定確認

**VPSで実行するコマンド**:
```bash
# nginx の場合
sudo nginx -T 2>/dev/null | grep -A 20 "server_name.*tenmon-ark"
# 期待値: server_name tenmon-ark.com; の設定が表示される

# caddy の場合
sudo cat /etc/caddy/Caddyfile 2>/dev/null | grep -A 10 "tenmon-ark.com"
# 期待値: tenmon-ark.com { ... } の設定が表示される
```

### 1.4 既存の /health と /api/chat が外から叩けるか確認

**VPSで実行するコマンド**:
```bash
# /health の確認
curl -I https://tenmon-ark.com/health
# 期待値: HTTP/2 200 または HTTP/1.1 200 OK

# /api/chat の確認（POST）
curl -I -X POST https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"hello"}'
# 期待値: HTTP/2 200 または HTTP/1.1 200 OK（OPTIONS の場合は 405 も可）
```

---

## 2. 期待する完成形

### 2.1 エンドポイントの動作確認

```bash
# /health
curl -fsS https://tenmon-ark.com/health | jq .
# 期待値: { "status": "ok" } または healthCheck() の結果

# /api/audit
curl -fsS https://tenmon-ark.com/api/audit | jq '{version, builtAt, gitSha}'
# 期待値: { "version": "0.9.0", "builtAt": "...", "gitSha": "..." }

# /api/chat
curl -fsS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"hello"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type)}'
# 期待値: { "mode": "NATURAL", "kuType": "object" }
```

---

## 3. 実装方針

### 3.1 nginx の場合

**設定ファイル**: `/etc/nginx/sites-available/tenmon-ark` または `/etc/nginx/conf.d/tenmon-ark.conf`

**設定内容**:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tenmon-ark.com;

    # Let's Encrypt の認証用（certbot が使用）
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTP を HTTPS にリダイレクト
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tenmon-ark.com;

    # SSL証明書（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/tenmon-ark.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tenmon-ark.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ログ
    access_log /var/log/nginx/tenmon-ark-access.log;
    error_log /var/log/nginx/tenmon-ark-error.log;

    # /health の転送
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # /api/* の転送
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS は API 側で app.use(cors()) が設定されているため、最低限動く
        # 必要に応じて、nginx 側でも CORS ヘッダーを追加可能
    }

    # その他の静的ファイル（必要に応じて）
    location / {
        root /var/www/tenmon-ark.com;
        try_files $uri $uri/ =404;
    }
}
```

**設定適用手順**:
```bash
# 設定ファイルの作成
sudo nano /etc/nginx/sites-available/tenmon-ark
# 上記の設定を貼り付けて保存

# シンボリックリンクの作成（sites-enabled に有効化）
sudo ln -s /etc/nginx/sites-available/tenmon-ark /etc/nginx/sites-enabled/

# 設定のテスト
sudo nginx -t
# 期待値: syntax is ok, test is successful

# nginx の再読み込み
sudo systemctl reload nginx
```

### 3.2 Caddy の場合

**設定ファイル**: `/etc/caddy/Caddyfile`

**設定内容**:
```
tenmon-ark.com {
    # /health の転送
    handle /health {
        reverse_proxy http://127.0.0.1:3000
    }

    # /api/* の転送
    handle /api/* {
        reverse_proxy http://127.0.0.1:3000
    }

    # その他の静的ファイル（必要に応じて）
    handle {
        file_server root /var/www/tenmon-ark.com
    }
}
```

**設定適用手順**:
```bash
# 設定ファイルの編集
sudo nano /etc/caddy/Caddyfile
# 上記の設定を追加

# Caddy の再読み込み
sudo systemctl reload caddy
```

### 3.3 CORS の確認

**現状**: `src/index.ts` で `app.use(cors())` が設定されているため、最低限動く

**証拠**: `src/index.ts` (44行目)
```typescript
app.use(cors());
```

**必要に応じて Origin を固定する場合**:
```typescript
// src/index.ts
import cors from "cors";

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "https://tenmon-ark.com",
  credentials: true,
}));
```

---

## 4. 納品

### 4.1 設定ファイル差分

#### nginx の場合

**新規作成**: `/etc/nginx/sites-available/tenmon-ark`

**主な変更点**:
- `server_name tenmon-ark.com;` を設定
- `/health` を `http://127.0.0.1:3000/health` に転送
- `/api/*` を `http://127.0.0.1:3000/api/*` に転送
- SSL証明書のパスを設定（Let's Encrypt）

#### Caddy の場合

**編集**: `/etc/caddy/Caddyfile`

**主な変更点**:
- `tenmon-ark.com { ... }` ブロックを追加
- `/health` と `/api/*` を `http://127.0.0.1:3000` に転送

### 4.2 証拠コマンド結果

**VPSで実行する確認コマンド**:

```bash
# 1. Webサーバーの確認
which nginx caddy
ps aux | grep -E "nginx|caddy" | grep -v grep

# 2. ポートのLISTEN確認
sudo ss -ltnp | grep -E ':80|:443|:3000'

# 3. 設定ファイルの確認
sudo nginx -T 2>/dev/null | grep -A 20 "server_name.*tenmon-ark" || \
sudo cat /etc/caddy/Caddyfile 2>/dev/null | grep -A 10 "tenmon-ark.com"

# 4. 設定のテスト（nginx の場合）
sudo nginx -t

# 5. 外部からの接続確認
curl -I https://tenmon-ark.com/health
curl -I -X POST https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"hello"}'

# 6. 動作確認
curl -fsS https://tenmon-ark.com/health | jq .
curl -fsS https://tenmon-ark.com/api/audit | jq '{version, builtAt, gitSha}'
curl -fsS https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"hello"}' | \
  jq '{mode:.decisionFrame.mode, kuType:(.decisionFrame.ku|type)}'
```

---

## 5. トラブルシューティング

### 5.1 502 Bad Gateway

**原因**: APIサーバー（127.0.0.1:3000）が起動していない

**確認**:
```bash
sudo systemctl status tenmon-ark-api.service
sudo ss -ltnp | grep ':3000'
```

**対策**: APIサーバーを起動
```bash
sudo systemctl start tenmon-ark-api.service
```

### 5.2 404 Not Found

**原因**: nginx/Caddy の設定が正しく適用されていない

**確認**:
```bash
# nginx の場合
sudo nginx -t
sudo systemctl status nginx

# Caddy の場合
sudo systemctl status caddy
sudo journalctl -u caddy -n 50
```

**対策**: 設定ファイルを確認し、再読み込み
```bash
# nginx の場合
sudo nginx -t && sudo systemctl reload nginx

# Caddy の場合
sudo systemctl reload caddy
```

### 5.3 CORS エラー

**原因**: CORS の設定が不十分

**確認**: ブラウザの開発者ツールでエラーを確認

**対策**: `src/index.ts` で CORS の Origin を固定
```typescript
app.use(cors({
  origin: "https://tenmon-ark.com",
  credentials: true,
}));
```

---

## 6. 完了条件

- ✅ `curl -I https://tenmon-ark.com/health` が 200 OK を返す
- ✅ `curl -fsS https://tenmon-ark.com/api/audit | jq .` が JSON を返す
- ✅ `curl -fsS https://tenmon-ark.com/api/chat -H "Content-Type: application/json" -d '{"threadId":"test","message":"hello"}' | jq .` が JSON を返す
- ✅ ブラウザから https://tenmon-ark.com/health にアクセスできる

---

## 注意事項

- SSL証明書（Let's Encrypt）の取得が必要な場合は、certbot を使用
- nginx の場合は、`/etc/nginx/sites-enabled/` にシンボリックリンクを作成して有効化
- Caddy の場合は、自動的に SSL証明書を取得・更新する
- 設定変更後は、必ず設定のテストを実行してから再読み込み

