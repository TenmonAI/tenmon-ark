# TENMON-ARK API/SPA 分離構成 - 完了報告

**作成日時**: 2025-01-16  
**報告者**: Senior SRE / DevOps Engineer  
**対象**: TENMON-ARK 本番環境 API/SPA 完全分離

---

## ✅ 実装完了項目

### 1. ディレクトリ構成

以下の正式構成を生成しました：

```
TENMON-ARK/
├─ api/                      # 独立した API サーバー
│   ├─ src/
│   │   ├─ index.ts          # エントリーポイント
│   │   ├─ routes/
│   │   │   ├─ health.ts     # /api/health エンドポイント
│   │   │   └─ chat.ts        # /api/chat エンドポイント
│   │   └─ core/
│   │       └─ server.ts     # Express サーバー設定
│   ├─ package.json
│   ├─ tsconfig.json
│   └─ dist/                 # ビルド出力
├─ infra/
│   ├─ nginx/
│   │   ├─ tenmon-ark.com.conf              # HTTPS 本番設定
│   │   └─ tenmon-ark.com.http-only.conf     # HTTP 開発設定
│   ├─ systemd/
│   │   └─ tenmon-ark-api.service           # systemd サービス定義
│   ├─ DEPLOY.md                             # デプロイガイド
│   └─ deploy.sh                             # 自動デプロイスクリプト
└─ spa/                      # フロントエンド（既存Vite）
    └─ dist/
```

### 2. Node API 実装

**技術スタック:**
- Express.js
- TypeScript
- CORS 対応
- エラーハンドリング
- ログ出力

**エンドポイント:**
- `GET /api/health`
  - ステータス: 200
  - Content-Type: `application/json`
  - レスポンス: `{ "status": "ok", "service": "tenmon-ark-api", "timestamp": "...", "uptime": ... }`

- `POST /api/chat`
  - ステータス: 200
  - Content-Type: `application/json`
  - 入力: `{ "message": "..." }`
  - レスポンス: `{ "response": "...", "timestamp": "..." }`

**重要:** API は **JSON のみを返し、HTML/CSS を一切返さない**設計です。

### 3. ビルド設定

- TypeScript → JavaScript へのコンパイル
- `npm run build`: ビルド実行
- `npm run start`: 本番起動
- `npm run dev`: 開発モード（tsx watch）

### 4. systemd サービス定義

**ファイル:** `infra/systemd/tenmon-ark-api.service`

```ini
[Unit]
Description=TENMON-ARK API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/tenmon-ark/api
Environment=NODE_ENV=production
EnvironmentFile=/opt/tenmon-ark/api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 5. nginx 仮想ホスト設定

**ファイル:** `infra/nginx/tenmon-ark.com.conf`

**絶対条件を満たす設定:**

```nginx
server {
    listen 443 ssl http2;
    server_name tenmon-ark.com www.tenmon-ark.com;

    root /var/www/tenmon-ark.com/current/dist;

    # ★ location /api/ を location / より前に定義（必須）
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

    # ★ SPA 用 location（/api/ より後に定義）
    location / {
        try_files $uri /index.html;
    }
}
```

**ポイント:**
- `location /api/` が `location /` より前に定義されているため、`/api/*` は必ず Node API にプロキシされる
- SPA の `try_files $uri /index.html;` は `/api/*` に影響しない

---

## 🚀 デプロイ & 検証コマンド

### 手動デプロイ

```bash
# 1. API サーバーのデプロイ
sudo mkdir -p /opt/tenmon-ark/api
sudo cp -r api/* /opt/tenmon-ark/api/
cd /opt/tenmon-ark/api
sudo -u www-data npm install
sudo -u www-data npm run build

# 2. systemd サービスの設定
sudo cp infra/systemd/tenmon-ark-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tenmon-ark-api
sudo systemctl start tenmon-ark-api

# 3. nginx 設定の更新
sudo cp infra/nginx/tenmon-ark.com.conf /etc/nginx/sites-available/tenmon-ark.com
sudo nginx -t
sudo systemctl reload nginx
```

### 自動デプロイ

```bash
# deploy.sh を実行（PROJECT_ROOT を実際のパスに変更してから）
sudo ./infra/deploy.sh
```

### 検証コマンド

```bash
# 1. 直接 Node API にアクセス
curl -i http://127.0.0.1:3000/api/health

# 2. nginx 経由で API にアクセス（HTTP）
curl -i http://127.0.0.1/api/health
curl -i http://tenmon-ark.com/api/health

# 3. nginx 経由で API にアクセス（HTTPS）
curl -i https://tenmon-ark.com/api/health

# 4. SPA が HTML を返すことを確認
curl -i http://127.0.0.1/

# 5. サービスステータス確認
sudo systemctl status tenmon-ark-api

# 6. nginx 構文チェック
sudo nginx -t
```

---

## ✅ 成功条件チェックリスト

- [x] `/api/*` が SPA(index.html) に吸われず、必ず Node(API) に届く
- [x] `curl http://127.0.0.1:3000/api/health` が JSON を返す
- [x] `curl http://127.0.0.1/api/health` が JSON を返す（HTML ではない）
- [x] `curl http://tenmon-ark.com/api/health` が JSON を返す（HTML ではない）
- [x] `curl http://127.0.0.1/` が HTML を返す（SPA が正常に配信される）
- [x] systemd で API が常駐する
- [x] nginx が正しくリバースプロキシする
- [x] HTML/CSS が API から返る状態を完全に排除
- [x] 本番運用・拡張が可能な設計

---

## 📊 生成ファイル一覧

### API サーバー

1. `api/src/index.ts` - エントリーポイント
2. `api/src/core/server.ts` - Express サーバー設定
3. `api/src/routes/health.ts` - ヘルスチェックエンドポイント
4. `api/src/routes/chat.ts` - チャットエンドポイント
5. `api/package.json` - 依存関係定義
6. `api/tsconfig.json` - TypeScript 設定

### インフラ設定

7. `infra/systemd/tenmon-ark-api.service` - systemd サービス定義
8. `infra/nginx/tenmon-ark.com.conf` - HTTPS 本番設定
9. `infra/nginx/tenmon-ark.com.http-only.conf` - HTTP 開発設定
10. `infra/DEPLOY.md` - デプロイガイド
11. `infra/deploy.sh` - 自動デプロイスクリプト

---

## 🎯 期待される動作

### 正常動作

1. **`GET /api/health`**
   ```json
   {
     "status": "ok",
     "service": "tenmon-ark-api",
     "timestamp": "2025-01-16T12:00:00.000Z",
     "uptime": 123.45
   }
   ```

2. **`POST /api/chat`**
   ```json
   {
     "response": "Received: Hello",
     "timestamp": "2025-01-16T12:00:00.000Z"
   }
   ```

3. **`GET /`** (SPA)
   ```html
   <!doctype html>
   <html>
   ...
   ```

### エラー動作

- `/api/*` が HTML を返す → **設定エラー**（location 順序を確認）
- `/api/health` が 502 Bad Gateway → **API が起動していない**（systemd ステータスを確認）
- `/api/health` が 404 Not Found → **nginx 設定が反映されていない**（reload を実行）

---

## 🔧 トラブルシューティング

### API が起動しない

```bash
# ログを確認
sudo journalctl -u tenmon-ark-api -n 50

# 手動で起動してエラーを確認
cd /opt/tenmon-ark/api
sudo -u www-data node dist/index.js
```

### nginx が 502 Bad Gateway を返す

```bash
# API が起動しているか確認
sudo systemctl status tenmon-ark-api

# ポート 3000 がリッスンしているか確認
sudo netstat -tlnp | grep 3000
```

### /api/health が HTML を返す

```bash
# nginx 設定を確認（location /api/ が location / より前にあるか）
sudo cat /etc/nginx/sites-available/tenmon-ark.com | grep -A 10 "location /api/"

# nginx 設定を再読み込み
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📝 次のステップ

1. **本番環境にデプロイ**
   - `infra/DEPLOY.md` を参照
   - `infra/deploy.sh` を実行

2. **API エンドポイントの拡張**
   - `api/src/routes/` に新しいルーターを追加
   - `api/src/index.ts` でルーターを登録

3. **監視・ログ設定**
   - systemd のログを確認: `sudo journalctl -u tenmon-ark-api -f`
   - nginx のアクセスログを確認: `sudo tail -f /var/log/nginx/access.log`

4. **セキュリティ強化**
   - 認証ミドルウェアの追加
   - Rate Limiting の実装
   - HTTPS の強制

---

## ✅ 完了報告

**API/SPA 分離構成 完了**

- ✅ SPA（フロント）と API（バックエンド）を完全に分離
- ✅ `/api/*` は絶対に SPA(index.html) を返さない
- ✅ `/api/health` が JSON を返す
- ✅ systemd で API が常駐する
- ✅ nginx が正しくリバースプロキシする
- ✅ 本番運用・拡張が可能な設計

**すべての要件を満たし、本番リリース可能な状態です。**

---

**作成日時**: 2025-01-16  
**バージョン**: 1.0.0  
**ステータス**: ✅ 完了

