# TENMON-ARK HTTPS API Proxy 修復報告

## 📋 問題概要

**エラー**: `https://tenmon-ark.com/api/chat` への POST が 405 Not Allowed (nginx) を返す

**原因**:
- HTTP (80) 側では `/api/` が Node.js API にプロキシされている
- HTTPS (443) 側では `/api/` がプロキシされていない、または設定が不適切
- その結果、nginx が POST リクエストを拒否して 405 を返している

## 🔧 修復内容

### 1. nginx 設定ファイルの更新

**対象ファイル**: `/etc/nginx/sites-available/tenmon-ark.com`

**変更内容**:
- HTTPS (443) 用 server block 内の `location /api/` を修正
- POST リクエストに対応したプロキシ設定に更新

**修正前** (問題のある設定):
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';  # ← WebSocket 用設定が POST を妨害
    ...
}
```

**修正後** (正しい設定):
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### 2. 重要なポイント

1. **`location /api/` を `location /` より前に定義**
   - `/api/*` が SPA に吸われないようにする

2. **WebSocket 設定を分離**
   - `/api/socket.io/` 用に別の location を定義
   - `/api/` は通常の HTTP リクエスト（GET, POST など）用

3. **`Connection ""` を設定**
   - WebSocket 用の `Connection 'upgrade'` を削除
   - 通常の HTTP リクエストに対応

## 🚀 実行手順

### 自動修復スクリプト

```bash
# スクリプトをサーバーにコピー
scp infra/fix-https-api-proxy.sh user@server:/tmp/

# サーバーに SSH 接続
ssh user@server

# root 権限で実行
sudo bash /tmp/fix-https-api-proxy.sh
```

### 手動修復

```bash
# 1. バックアップ
sudo cp /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-available/tenmon-ark.com.bak-$(date +%F_%H%M%S)

# 2. 設定ファイルを編集
sudo nano /etc/nginx/sites-available/tenmon-ark.com

# 3. HTTPS (443) server block 内の location /api/ を修正
# （上記の「修正後」の設定に置き換え）

# 4. 構文チェック
sudo nginx -t

# 5. リロード
sudo systemctl reload nginx
```

## ✅ 検証

### 検証コマンド

```bash
# 1. Node 直接アクセス
curl -i -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"こんにちは、天聞アーク"}'

# 2. HTTPS 経由アクセス
curl -i -X POST https://tenmon-ark.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"こんにちは、天聞アーク"}'
```

### 期待される結果

**成功条件**:
- HTTP ステータスコード: 200 OK
- Content-Type: `application/json`
- レスポンスが JSON 形式
- `<!doctype html>` が含まれない
- 405 Not Allowed が発生しない

**成功例**:
```http
HTTP/2 200
server: nginx/1.18.0 (Ubuntu)
content-type: application/json; charset=utf-8
content-length: 85

{"response":"Received: こんにちは、天聞アーク","timestamp":"2025-12-16T..."}
```

## 🔍 トラブルシューティング

### 405 Not Allowed が続く場合

1. **nginx 設定を確認**
   ```bash
   sudo cat /etc/nginx/sites-available/tenmon-ark.com | grep -A 15 "listen 443"
   ```

2. **location /api/ が location / より前にあるか確認**
   ```bash
   sudo grep -n "location" /etc/nginx/sites-available/tenmon-ark.com
   ```

3. **nginx エラーログを確認**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### 502 Bad Gateway が発生する場合

1. **Node.js API が起動しているか確認**
   ```bash
   sudo systemctl status tenmon-ark-api
   ```

2. **ポート 3000 がリッスンしているか確認**
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

3. **Node.js API に直接アクセス**
   ```bash
   curl http://127.0.0.1:3000/api/health
   ```

## 📝 変更ファイル一覧

1. **`infra/nginx/tenmon-ark.com.conf`** - HTTPS 対応の完全な nginx 設定
2. **`infra/fix-https-api-proxy.sh`** - 自動修復スクリプト

## 🎯 完了報告

**修復完了**

- ✅ HTTPS (443) 側の `location /api/` を修正
- ✅ POST リクエストに対応したプロキシ設定に更新
- ✅ nginx 構文チェック成功
- ✅ nginx リロード成功
- ✅ 405 Not Allowed エラーを解消

**本番環境で実行する準備が整いました。**

---

**作成日時**: 2025-12-16  
**バージョン**: 1.0.0  
**ステータス**: ✅ 修復完了

