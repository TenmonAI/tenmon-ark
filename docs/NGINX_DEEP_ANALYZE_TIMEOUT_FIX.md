# nginx Deep Analyze タイムアウト修正ガイド

**問題**: Deep Analyze（全文チャンク解析）が途中でタイムアウトして502/504エラーになる

**原因**: nginxのデフォルトタイムアウト（60秒）が短すぎる。Deep Analyzeは複数チャンクを順次処理するため、1時間程度かかる場合がある。

---

## 修正手順

### STEP 1: 現在のnginx設定を確認

```bash
# VPSにSSH接続
ssh user@tenmon-ark.com

# 現在のnginx設定を確認
sudo cat /etc/nginx/sites-enabled/tenmon-ark
# または
sudo cat /etc/nginx/sites-available/tenmon-ark.com
```

### STEP 2: バックアップ

```bash
# 現在の設定をバックアップ
sudo cp /etc/nginx/sites-enabled/tenmon-ark \
  /etc/nginx/sites-enabled/tenmon-ark.backup.$(date +%Y%m%d_%H%M%S)
```

### STEP 3: location /api/ にタイムアウト設定を追加

`/etc/nginx/sites-enabled/tenmon-ark` または `/etc/nginx/sites-available/tenmon-ark.com` の `location /api/` セクションを以下のように修正：

**修正前**:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**修正後**:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    # Deep Analyze用のタイムアウト設定（1時間）
    proxy_read_timeout 3600;
    proxy_send_timeout 3600;
    proxy_connect_timeout 60;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**設定の説明**:
- `proxy_read_timeout 3600;`: バックエンドからのレスポンス読み込みタイムアウト（3600秒 = 1時間）
- `proxy_send_timeout 3600;`: バックエンドへのリクエスト送信タイムアウト（3600秒 = 1時間）
- `proxy_connect_timeout 60;`: バックエンドへの接続タイムアウト（60秒）

### STEP 4: nginx設定をテスト

```bash
# 設定ファイルの構文チェック
sudo nginx -t
```

**期待される出力**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### STEP 5: nginxをリロード

```bash
# nginxをリロード（ダウンタイムなし）
sudo systemctl reload nginx
```

### STEP 6: 動作確認

```bash
# ヘルスチェック（即座に返ることを確認）
curl https://tenmon-ark.com/api/health

# Deep Analyzeを実行してタイムアウトしないことを確認
# （ブラウザの研究コンソールから実行）
```

---

## 完全な設定例

以下は、Deep Analyze対応を含む完全なnginx設定例です：

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

        # Deep Analyze用のタイムアウト設定（1時間）
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_connect_timeout 60;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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

---

## トラブルシューティング

### 問題1: nginx -t でエラーが出る

**エラー例**:
```
nginx: [emerg] unexpected end of file, expecting ";" or "}" in /etc/nginx/sites-enabled/tenmon-ark:XX
```

**解決策**:
- セミコロン（`;`）が抜けていないか確認
- 波括弧（`}`）が正しく閉じられているか確認
- `sudo nginx -t` でエラーの行番号を確認

### 問題2: まだタイムアウトする

**確認ポイント**:
1. nginx設定が正しくリロードされているか
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

2. Node.js側のタイムアウト設定も確認
   - Expressのタイムアウト設定
   - `OPENAI_TIMEOUT_MS_RESEARCH` 環境変数

3. ブラウザ側のタイムアウト
   - ブラウザ自体のタイムアウト（通常は長い）
   - ネットワーク接続の安定性

### 問題3: 他のAPIが遅くなる

**対策**:
- 特定のエンドポイント（`/api/research/analyze-deep`）だけタイムアウトを長くする設定も可能
- ただし、現状の設定（全APIに3600秒）でも通常のAPIは即座に返るため問題なし

---

## 修正完了確認チェックリスト

- [ ] nginx設定ファイルをバックアップした
- [ ] `location /api/` に `proxy_read_timeout 3600;` を追加した
- [ ] `location /api/` に `proxy_send_timeout 3600;` を追加した
- [ ] `location /api/` に `proxy_connect_timeout 60;` を追加した
- [ ] `sudo nginx -t` で構文エラーがない
- [ ] `sudo systemctl reload nginx` が成功した
- [ ] Deep Analyzeがタイムアウトせずに完了する

---

## 実行コマンド一覧（コピペ用）

```bash
# STEP 1: バックアップ
sudo cp /etc/nginx/sites-enabled/tenmon-ark \
  /etc/nginx/sites-enabled/tenmon-ark.backup.$(date +%Y%m%d_%H%M%S)

# STEP 2: 設定を編集（nanoを使用）
sudo nano /etc/nginx/sites-enabled/tenmon-ark
# または
sudo nano /etc/nginx/sites-available/tenmon-ark.com

# STEP 3: 構文チェック
sudo nginx -t

# STEP 4: リロード
sudo systemctl reload nginx

# STEP 5: 動作確認
curl https://tenmon-ark.com/api/health
```

---

**修正ガイド完了**

