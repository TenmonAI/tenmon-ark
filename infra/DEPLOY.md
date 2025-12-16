# TENMON-ARK API/SPA 分離構成 - デプロイガイド

## 📋 前提条件

- Ubuntu 22.04 (またはそれ以降)
- Node.js (LTS) がインストール済み
- nginx がインストール済み
- systemd が利用可能
- `/opt/tenmon-ark/` ディレクトリが作成可能
- `/var/www/tenmon-ark.com/` ディレクトリが作成可能

## 🚀 デプロイ手順

### ステップ 1: ディレクトリ構造の準備

```bash
# API ディレクトリを作成
sudo mkdir -p /opt/tenmon-ark/api
sudo chown -R www-data:www-data /opt/tenmon-ark/api

# SPA ディレクトリを作成（既存の場合はスキップ）
sudo mkdir -p /var/www/tenmon-ark.com/current/dist
sudo chown -R www-data:www-data /var/www/tenmon-ark.com
```

### ステップ 2: API サーバーのデプロイ

```bash
# プロジェクトルートから
cd /path/to/os-tenmon-ai-v2-reset

# API ディレクトリをコピー
sudo cp -r api/* /opt/tenmon-ark/api/

# API ディレクトリに移動
cd /opt/tenmon-ark/api

# 依存関係をインストール
sudo -u www-data npm install

# TypeScript をビルド
sudo -u www-data npm run build

# .env ファイルを作成
sudo -u www-data cp .env.example .env
sudo -u www-data nano .env
```

`.env` ファイルの例：

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
CORS_ORIGIN=https://tenmon-ark.com
```

### ステップ 3: systemd サービスの設定

```bash
# systemd サービスファイルをコピー
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/systemd/tenmon-ark-api.service \
  /etc/systemd/system/tenmon-ark-api.service

# systemd をリロード
sudo systemctl daemon-reload

# サービスを有効化
sudo systemctl enable tenmon-ark-api

# サービスを起動
sudo systemctl start tenmon-ark-api

# ステータス確認
sudo systemctl status tenmon-ark-api
```

**期待される出力:**
```
● tenmon-ark-api.service - TENMON-ARK API Server
     Loaded: loaded (/etc/systemd/system/tenmon-ark-api.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
```

### ステップ 4: nginx 設定の更新

#### 4-1. 既存設定のバックアップ

```bash
# 既存設定をバックアップ
sudo cp /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-available/tenmon-ark.com.bak-$(date +%F_%H%M%S)
```

#### 4-2. 新しい設定をコピー

**本番環境（HTTPS）の場合:**
```bash
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/nginx/tenmon-ark.com.conf \
  /etc/nginx/sites-available/tenmon-ark.com
```

**開発環境（HTTP のみ）の場合:**
```bash
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/nginx/tenmon-ark.com.http.conf \
  /etc/nginx/sites-available/tenmon-ark.com
```

#### 4-3. シンボリックリンクの作成

```bash
# シンボリックリンクを作成（存在しない場合）
sudo ln -sf /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-enabled/tenmon-ark.com
```

#### 4-4. nginx 構文チェック & reload

```bash
# nginx 構文チェック
sudo nginx -t
```

**期待される出力:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
# 構文チェックが成功したら reload
sudo systemctl reload nginx
```

### ステップ 5: 検証

#### 5-1. 直接 Node API にアクセス

```bash
curl -i http://127.0.0.1:3000/api/health
```

**期待されるレスポンス:**

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 85
X-Powered-By: Express

{"status":"ok","service":"tenmon-ark-api","timestamp":"2025-01-16T12:00:00.000Z","uptime":123.45}
```

#### 5-2. nginx 経由で API にアクセス（HTTP）

```bash
curl -i http://127.0.0.1/api/health
curl -i http://tenmon-ark.com/api/health
```

**期待されるレスポンス:**

```http
HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: application/json; charset=utf-8
Content-Length: 85
Connection: keep-alive

{"status":"ok","service":"tenmon-ark-api","timestamp":"2025-01-16T12:00:00.000Z","uptime":123.45}
```

#### 5-3. nginx 経由で API にアクセス（HTTPS）

```bash
curl -i https://tenmon-ark.com/api/health
```

**期待されるレスポンス:**

```http
HTTP/2 200
server: nginx/1.18.0 (Ubuntu)
content-type: application/json; charset=utf-8
content-length: 85

{"status":"ok","service":"tenmon-ark-api","timestamp":"2025-01-16T12:00:00.000Z","uptime":123.45}
```

#### 5-4. SPA が HTML を返すことを確認

```bash
curl -i http://127.0.0.1/
```

**期待されるレスポンス:**

```http
HTTP/1.1 200 OK
Content-Type: text/html
...

<!doctype html>
<html>
...
```

#### 5-5. /api/chat エンドポイントの確認

```bash
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, TENMON-ARK!"}'
```

**期待されるレスポンス:**

```json
{
  "response": "Received: Hello, TENMON-ARK!",
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

### ステップ 6: 成功条件チェックリスト

以下のすべてが ✅ になることを確認してください：

- [ ] `curl http://127.0.0.1:3000/api/health` が JSON を返す
- [ ] `curl http://127.0.0.1/api/health` が JSON を返す（HTML ではない）
- [ ] `curl http://tenmon-ark.com/api/health` が JSON を返す（HTML ではない）
- [ ] `curl http://127.0.0.1/` が HTML を返す（SPA が正常に配信される）
- [ ] `systemctl status tenmon-ark-api` が `active (running)` を表示
- [ ] `nginx -t` が `syntax is ok` を表示
- [ ] `/api/health` のレスポンスに `<!doctype html>` が含まれない
- [ ] `/api/health` のレスポンスに `Content-Type: application/json` が含まれる

## 🔧 トラブルシューティング

### API が起動しない

```bash
# ログを確認
sudo journalctl -u tenmon-ark-api -n 50

# 手動で起動してエラーを確認
cd /opt/tenmon-ark/api
sudo -u www-data node dist/index.js
```

**よくあるエラー:**
- `.env` ファイルが存在しない → `cp .env.example .env` を実行
- `dist/index.js` が存在しない → `npm run build` を実行
- ポート 3000 が既に使用中 → `.env` で `PORT=3001` に変更

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

**解決方法:**
- API が起動していない場合 → `sudo systemctl start tenmon-ark-api`
- ポートが異なる場合 → nginx 設定の `proxy_pass` を確認

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

### nginx 構文エラー

```bash
# エラーメッセージを確認
sudo nginx -t

# よくあるエラー:
# - セミコロン (;) の抜け
# - 中括弧 ({}) の不整合
# - タイポ
```

## 📝 更新手順

### API コードを更新する場合

```bash
cd /opt/tenmon-ark/api

# コードを更新（git pull など）
sudo -u www-data git pull

# 依存関係を更新
sudo -u www-data npm install

# ビルド
sudo -u www-data npm run build

# サービスを再起動
sudo systemctl restart tenmon-ark-api

# ログを確認
sudo journalctl -u tenmon-ark-api -f
```

### SPA を更新する場合

```bash
# SPA をビルド
cd /path/to/os-tenmon-ai-v2-reset
npm run build

# dist/public を /var/www/tenmon-ark.com/current/dist にコピー
sudo cp -r dist/public/* /var/www/tenmon-ark.com/current/dist/
```

### nginx 設定を更新する場合

```bash
# 設定ファイルを編集
sudo nano /etc/nginx/sites-available/tenmon-ark.com

# 構文チェック
sudo nginx -t

# reload（再起動は不要）
sudo systemctl reload nginx
```

## 🔍 監視・ログ確認

### systemd ログ

```bash
# リアルタイムログ
sudo journalctl -u tenmon-ark-api -f

# 最新 50 行
sudo journalctl -u tenmon-ark-api -n 50

# エラーのみ
sudo journalctl -u tenmon-ark-api -p err
```

### nginx ログ

```bash
# アクセスログ
sudo tail -f /var/log/nginx/access.log

# エラーログ
sudo tail -f /var/log/nginx/error.log
```

## 🎯 完了報告

すべての検証が成功したら、以下を確認してください：

- ✅ `/api/*` が SPA(index.html) に吸われず、必ず Node(API) に届く
- ✅ `curl http://127.0.0.1/api/health` が JSON を返す
- ✅ HTML/CSS が返る状態を完全に排除
- ✅ nginx 設定 → 構文チェック → reload → 検証まで完了

**API/SPA 分離構成 完了**

---

**作成日時**: 2025-01-16  
**バージョン**: 1.0.0  
**ステータス**: ✅ 本番リリース可能
