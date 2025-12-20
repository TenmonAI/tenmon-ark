# TENMON-ARK nginx設定修正ガイド
**障害対応**: APIがHTMLを返す問題の修正

---

## 問題の原因

**現象**:
- `curl http://127.0.0.1:3000/api/health` が JSONではなく SPA の index.html を返す
- systemd の tenmon-ark-api.service は active (running)
- Node は「Server running on http://localhost:3000/」と出力している

**原因**:
- nginx の `location /api/` 設定が存在しない、または誤っている
- nginx が `/api/*` を Node にプロキシせず、静的ファイル（`/var/www/html/index.html`）を返している

---

## 修正手順

### STEP 1: 現在のnginx設定を確認

```bash
# VPSにSSH接続
ssh user@tenmon-ark.com

# 現在のnginx設定を確認
sudo cat /etc/nginx/sites-available/tenmon-ark.com
```

### STEP 2: 問題点の特定

**確認項目**:
1. `location /api/` が存在するか
2. `proxy_pass http://127.0.0.1:3000;` が正しく設定されているか
3. `location /` が `location /api/` より前に定義されていないか（優先順位の問題）

**よくある問題**:
- `location /api/` が存在しない
- `location /api/` が `location /` より後に定義されている（`location /` が先にマッチしてしまう）
- `proxy_pass` のURLが間違っている

### STEP 3: 正しいnginx設定を適用

**修正後の設定**（`/etc/nginx/sites-available/tenmon-ark.com`）:

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

    # ★重要: location /api/ は location / より前に定義する
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

    # 静的ファイル（SPA）- location / は最後に定義
    location / {
        try_files $uri $uri/ /index.html;
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**重要なポイント**:
- `location /api/` は `location /` より**前に**定義する（nginxは最初にマッチしたlocationを使用する）
- `proxy_pass` のURLは `http://127.0.0.1:3000`（末尾にスラッシュなし）
- `proxy_set_header` で適切なヘッダーを設定

### STEP 4: nginx設定をバックアップ

```bash
# 現在の設定をバックアップ
sudo cp /etc/nginx/sites-available/tenmon-ark.com /etc/nginx/sites-available/tenmon-ark.com.backup.$(date +%Y%m%d_%H%M%S)
```

### STEP 5: nginx設定を編集

```bash
# nginx設定を編集
sudo nano /etc/nginx/sites-available/tenmon-ark.com
```

上記の修正後の設定を適用してください。

### STEP 6: nginx設定をテスト

```bash
# 設定ファイルの構文チェック
sudo nginx -t
```

**期待される出力**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### STEP 7: nginxをリロード

```bash
# nginxをリロード（ダウンタイムなし）
sudo systemctl reload nginx
```

### STEP 8: 動作確認

```bash
# ヘルスチェック（JSONが返ることを確認）
curl http://127.0.0.1:3000/api/health

# 期待されるレスポンス:
# {"status":"ok","timestamp":...,"uptime":...,"environment":"production"}

# HTTPS経由でも確認
curl https://tenmon-ark.com/api/health

# 期待されるレスポンス:
# {"status":"ok","timestamp":...,"uptime":...,"environment":"production"}
```

---

## トラブルシューティング

### 問題1: nginx -t でエラーが出る

**エラー例**:
```
nginx: [emerg] unexpected end of file, expecting ";" or "}" in /etc/nginx/sites-available/tenmon-ark.com:XX
```

**解決策**:
- 設定ファイルの構文エラーを確認
- セミコロン（`;`）や波括弧（`}`）が正しく閉じられているか確認
- `sudo nginx -t` でエラーの行番号を確認

### 問題2: nginx reload 後に502 Bad Gateway

**原因**:
- Node サーバーが起動していない
- `proxy_pass` のURLが間違っている

**解決策**:
```bash
# Node サーバーのステータス確認
sudo systemctl status tenmon-ark-api

# Node サーバーが起動していない場合
sudo systemctl start tenmon-ark-api

# ポート3000でリスニングしているか確認
sudo lsof -i :3000
```

### 問題3: まだHTMLが返る

**原因**:
- `location /api/` が `location /` より後に定義されている
- nginx設定が正しくリロードされていない

**解決策**:
```bash
# nginx設定の順序を確認
sudo cat /etc/nginx/sites-available/tenmon-ark.com | grep -A 5 "location"

# location /api/ が location / より前に定義されているか確認
# もし後にある場合は、順序を入れ替える

# nginxを再起動（reloadではなくrestart）
sudo systemctl restart nginx
```

---

## 修正完了確認チェックリスト

- [ ] nginx設定ファイルをバックアップした
- [ ] `location /api/` を `location /` より前に定義した
- [ ] `proxy_pass http://127.0.0.1:3000;` が正しく設定されている
- [ ] `sudo nginx -t` で構文エラーがない
- [ ] `sudo systemctl reload nginx` が成功した
- [ ] `curl http://127.0.0.1:3000/api/health` が JSON を返す
- [ ] `curl https://tenmon-ark.com/api/health` が JSON を返す
- [ ] HTMLが返らなくなった

---

## 自動修正スクリプト（参考）

以下のスクリプトを実行すると、自動で修正できます：

```bash
#!/bin/bash
# TENMON-ARK nginx設定自動修正スクリプト

set -e

echo "[1/7] nginx設定をバックアップ..."
sudo cp /etc/nginx/sites-available/tenmon-ark.com /etc/nginx/sites-available/tenmon-ark.com.backup.$(date +%Y%m%d_%H%M%S)

echo "[2/7] 現在の設定を確認..."
if grep -q "location /api/" /etc/nginx/sites-available/tenmon-ark.com; then
    echo "  ✓ location /api/ は存在します"
else
    echo "  ✗ location /api/ が存在しません"
fi

echo "[3/7] 正しい設定を適用..."
# ここで正しい設定を適用（手動で編集するか、sed/awkで自動化）

echo "[4/7] nginx設定をテスト..."
sudo nginx -t

echo "[5/7] nginxをリロード..."
sudo systemctl reload nginx

echo "[6/7] 動作確認..."
if curl -s http://127.0.0.1:3000/api/health | grep -q '"status":"ok"'; then
    echo "  ✓ APIが正常に動作しています"
else
    echo "  ✗ APIが正常に動作していません"
    exit 1
fi

echo "[7/7] 完了！"
```

---

**修正ガイド完了**


