# TENMON-ARK systemd + nginx 一括構築手順

## 📋 前提条件

- Ubuntu 22.04
- Node.js v22 がインストール済み
- nginx がインストール済み
- `/opt/tenmon-ark/api` に API がデプロイ済み
- `npm run build` が成功している
- `node dist/index.js` で API 起動確認済み

## 🟢 STEP 1: systemd サービス定義を生成

```bash
# systemd サービスファイルをコピー
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/systemd/tenmon-ark-api.service \
  /etc/systemd/system/tenmon-ark-api.service

# ファイルの内容を確認
sudo cat /etc/systemd/system/tenmon-ark-api.service
```

**生成ファイル:**
- `/etc/systemd/system/tenmon-ark-api.service`

## 🟢 STEP 2: systemd を有効化・起動

**順番厳守で実行:**

```bash
# 1. systemd をリロード
sudo systemctl daemon-reload

# 2. サービスを有効化（起動時に自動起動）
sudo systemctl enable tenmon-ark-api

# 3. サービスを起動
sudo systemctl start tenmon-ark-api

# 4. ステータス確認
sudo systemctl status tenmon-ark-api
```

**成功条件:**
- `Active: active (running)`
- `Main PID: <数値>` が表示される
- `node dist/index.js` が実行中

**エラーが発生した場合:**
```bash
# ログを確認
sudo journalctl -u tenmon-ark-api -n 50

# 手動で起動してエラーを確認
cd /opt/tenmon-ark/api
sudo -u www-data node dist/index.js
```

## 🟢 STEP 3: nginx 仮想ホストを修正（最重要）

### 3-1. 事前バックアップ（必須）

```bash
# 既存設定をバックアップ
sudo cp /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-available/tenmon-ark.com.bak-$(date +%F_%H%M%S)
```

### 3-2. 新しい設定をコピー

```bash
# 新しい設定をコピー
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/nginx/tenmon-ark.com.conf \
  /etc/nginx/sites-available/tenmon-ark.com

# シンボリックリンクを作成（存在しない場合）
sudo ln -sf /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-enabled/tenmon-ark.com
```

**生成ファイル:**
- `/etc/nginx/sites-available/tenmon-ark.com`

**絶対ルール:**
- `location /api/` は `location /` より前
- `proxy_pass http://127.0.0.1:3000;`（末尾スラッシュなし）

## 🟢 STEP 4: nginx 構文チェック & 反映

```bash
# 構文チェック
sudo nginx -t
```

**成功条件:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
# 構文チェックが成功したら reload
sudo systemctl reload nginx
```

**エラーが発生した場合:**
- エラーメッセージの行番号を確認
- セミコロン (`;`) の抜け、中括弧の不整合を確認
- 設定ファイルを再確認

## 🟢 STEP 5: 最終検証（これがゴール）

### ① Node 直叩き

```bash
curl -i http://127.0.0.1:3000/api/health
```

**期待されるレスポンス:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 102

{"status":"ok","service":"tenmon-ark-api","timestamp":"2025-12-16T...","uptime":...}
```

### ② nginx 経由（ローカル）

```bash
curl -i http://127.0.0.1/api/health
```

**期待されるレスポンス:**
```http
HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: application/json; charset=utf-8
Content-Length: 102
Connection: keep-alive

{"status":"ok","service":"tenmon-ark-api","timestamp":"2025-12-16T...","uptime":...}
```

### ③ nginx 経由（本番ドメイン）

```bash
curl -i http://tenmon-ark.com/api/health
```

**期待されるレスポンス:**
```http
HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: application/json; charset=utf-8
Content-Length: 102
Connection: keep-alive

{"status":"ok","service":"tenmon-ark-api","timestamp":"2025-12-16T...","uptime":...}
```

## ✅ 成功条件チェックリスト

すべての curl コマンドで以下を満たすこと:

- [ ] HTTP ステータスコードが 200 系
- [ ] `Content-Type: application/json` が含まれる
- [ ] レスポンスが JSON 形式
- [ ] `<!doctype html>` が含まれない
- [ ] CSS (`<style>`, `.class { ... }`) が含まれない
- [ ] HTML タグ (`<html>`, `<head>`, `<body>`) が含まれない

## 🔧 トラブルシューティング

### systemd サービスが起動しない

```bash
# ログを確認
sudo journalctl -u tenmon-ark-api -n 50

# 手動で起動してエラーを確認
cd /opt/tenmon-ark/api
sudo -u www-data node dist/index.js
```

**よくある原因:**
- `.env` ファイルが存在しない
- `dist/index.js` が存在しない（`npm run build` を実行）
- ポート 3000 が既に使用中

### nginx が 502 Bad Gateway を返す

```bash
# API が起動しているか確認
sudo systemctl status tenmon-ark-api

# ポート 3000 がリッスンしているか確認
sudo netstat -tlnp | grep 3000
# または
sudo ss -tlnp | grep 3000

# API に直接アクセスできるか確認
curl http://127.0.0.1:3000/api/health
```

### /api/health が HTML を返す

これは **重大な設定エラー** です。`/api/*` が SPA に吸われています。

```bash
# nginx 設定を確認（location /api/ が location / より前にあるか）
sudo cat /etc/nginx/sites-available/tenmon-ark.com | grep -A 10 "location /api/"

# nginx 設定を再読み込み
sudo nginx -t && sudo systemctl reload nginx
```

**確認ポイント:**
- `location /api/` が `location /` より前に定義されているか
- `proxy_pass http://127.0.0.1:3000;` が正しく設定されているか

## 📝 実行コマンド一覧（コピペ用）

```bash
# STEP 1: systemd サービス定義
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/systemd/tenmon-ark-api.service \
  /etc/systemd/system/tenmon-ark-api.service

# STEP 2: systemd を有効化・起動
sudo systemctl daemon-reload
sudo systemctl enable tenmon-ark-api
sudo systemctl start tenmon-ark-api
sudo systemctl status tenmon-ark-api

# STEP 3: nginx 設定（バックアップ）
sudo cp /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-available/tenmon-ark.com.bak-$(date +%F_%H%M%S)

# STEP 3: nginx 設定（コピー）
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/nginx/tenmon-ark.com.conf \
  /etc/nginx/sites-available/tenmon-ark.com
sudo ln -sf /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-enabled/tenmon-ark.com

# STEP 4: nginx 構文チェック & 反映
sudo nginx -t
sudo systemctl reload nginx

# STEP 5: 最終検証
curl -i http://127.0.0.1:3000/api/health
curl -i http://127.0.0.1/api/health
curl -i http://tenmon-ark.com/api/health
```

---

**API/SPA 分離・systemd 常駐・nginx プロキシ設定 完了**

