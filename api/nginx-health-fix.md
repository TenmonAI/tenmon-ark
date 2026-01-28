# nginx /health 設定修正ガイド（2026-01-27）

## 目的
`/health` が SPA (index.html) に吸われず、必ず Node API (127.0.0.1:3000/health) に到達するようにする。

## 対象ファイル
`/etc/nginx/sites-enabled/tenmon-ark`

## 修正内容

### Before（修正前）

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tenmon-ark.com;

    # SSL証明書設定（変更なし）
    ssl_certificate /etc/letsencrypt/live/tenmon-ark.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tenmon-ark.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ログ設定（変更なし）
    access_log /var/log/nginx/tenmon-ark-access.log;
    error_log /var/log/nginx/tenmon-ark-error.log;

    # SPA用の location / が先にあると /health が吸われる
    location / {
        try_files $uri $uri/ /index.html;
    }

    # /api/* の転送
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # /health の転送（location / より後にあると吸われる）
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### After（修正後）

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tenmon-ark.com;

    # SSL証明書設定（変更なし）
    ssl_certificate /etc/letsencrypt/live/tenmon-ark.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tenmon-ark.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ログ設定（変更なし）
    access_log /var/log/nginx/tenmon-ark-access.log;
    error_log /var/log/nginx/tenmon-ark-error.log;

    # /api/* の転送（最初に配置）
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # /health の転送（完全一致で優先、location / より前に配置）
    location = /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA用の location /（最後に配置）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 変更点の説明

1. **`location = /health`**: 完全一致（`=`）を使用して、`/health` のみにマッチするようにする
2. **順序**: `location /api/` → `location = /health` → `location /` の順に配置
3. **理由**: nginx は location の優先順位が以下の通り：
   - `=` 完全一致が最優先
   - プレフィックス一致は長い順
   - 正規表現は定義順
   - そのため、`location = /health` を `location /` より前に配置することで、`/health` が SPA に吸われない

## 実行手順

### Step 1: 設定ファイルのバックアップ

```bash
sudo cp /etc/nginx/sites-enabled/tenmon-ark /etc/nginx/sites-enabled/tenmon-ark.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: 設定ファイルの編集

```bash
sudo nano /etc/nginx/sites-enabled/tenmon-ark
```

**編集内容**:
- HTTPS server block (`listen 443`) 内の location を以下の順序に並べ替える：
  1. `location /api/ { ... }`
  2. `location = /health { ... }`（`location /health` を `location = /health` に変更）
  3. `location / { ... }`

### Step 3: 設定のテスト

```bash
sudo nginx -t
```

**期待される出力**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 4: nginx の再読み込み

```bash
sudo systemctl reload nginx
```

### Step 5: 動作確認

```bash
curl -i https://tenmon-ark.com/health
```

**期待される出力**:
```
HTTP/2 200
content-type: application/json
...

{"status":"ok"}
```

または

```
HTTP/2 200
content-type: application/json
...

{"ok":true,...}
```

**失敗例（HTMLが返る場合）**:
```
HTTP/2 200
content-type: text/html
...

<!DOCTYPE html>
<html>
...
```

## 検証コマンド（完全版）

```bash
# 1. 設定ファイルのバックアップ
sudo cp /etc/nginx/sites-enabled/tenmon-ark /etc/nginx/sites-enabled/tenmon-ark.backup.$(date +%Y%m%d_%H%M%S)

# 2. 設定のテスト（編集前）
sudo nginx -t

# 3. 設定ファイルの編集
sudo nano /etc/nginx/sites-enabled/tenmon-ark
# 上記の After の内容に合わせて location を並べ替える

# 4. 設定のテスト（編集後）
sudo nginx -t

# 5. nginx の再読み込み
sudo systemctl reload nginx

# 6. 動作確認
curl -i https://tenmon-ark.com/health

# 7. Content-Type の確認
curl -I https://tenmon-ark.com/health | grep -i content-type
# 期待値: content-type: application/json

# 8. レスポンス本文の確認
curl -fsS https://tenmon-ark.com/health | jq .
# 期待値: {"status":"ok"} または {"ok":true,...}
```

## トラブルシューティング

### nginx -t が失敗する場合

**エラー例**:
```
nginx: [emerg] unexpected "}" in /etc/nginx/sites-enabled/tenmon-ark:XX
```

**対策**: 設定ファイルの構文エラーを確認
```bash
sudo nginx -t 2>&1 | grep -A 5 "error"
```

### curl が HTML を返す場合

**原因**: `location = /health` が `location /` より後に配置されている、または `=` が抜けている

**確認**:
```bash
sudo nginx -T | grep -A 10 "location.*health"
# 期待値: location = /health { ... } が location / { ... } より前に表示される
```

### 502 Bad Gateway が返る場合

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

## 成功条件の確認

```bash
# 1. Content-Type が application/json
curl -I https://tenmon-ark.com/health | grep -i content-type
# 期待値: content-type: application/json

# 2. レスポンスが JSON（HTML ではない）
curl -fsS https://tenmon-ark.com/health | jq .
# 期待値: {"status":"ok"} または {"ok":true,...}

# 3. HTML が返らないことを確認
curl -fsS https://tenmon-ark.com/health | grep -q "<!DOCTYPE html>" && echo "FAIL: HTML returned" || echo "OK: JSON returned"
# 期待値: OK: JSON returned
```

