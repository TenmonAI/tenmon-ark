# TENMON-ARK 本番稼働レポート & 次フェーズ実装指示
**作成日**: 2025-01-XX  
**目的**: バックエンド本番化のための完全実装計画

---

## 0. 目的（この指示のゴール）

TENMON-ARK を「世界観デモ」ではなく「実際に稼働するAIプロダクト」として完成させる。

現状はトップUI（静的SPA）までが本番稼働済み。  
次フェーズとしてバックエンド・チャット・ブラウザ機能を含む"実動AI"をVPS上で稼働させる。

---

## 1. 現在の確定状況（事実ベース）

### ✅ インフラ・デプロイ

- **本番ドメイン**: https://tenmon-ark.com
- **VPS**: Xserver VPS（Ubuntu + nginx）
- **HTTPS**: certbot により正常発行・自動更新設定済み
- **nginx**:
  - `root: /var/www/html`
  - `index.html` 正常配信
- **GitHub Actions**:
  - `main` ブランチ push → 自動ビルド → `/var/www/html` 配置
  - 手動デプロイ不要

### ✅ フロントエンド（本番反映済）

- `client/src/pages/Home.tsx`
- `client/src/components/HinomizuCore.tsx`
- `client/src/lib/drone.ts`
- HinomizuCore（天津金木・火水運動UI）
- 低周波ドローン音（ユーザー操作トリガー）
- Vite build → `dist/public` → VPS反映確認済み

### ✅ 運用ルール（確定）

- 本番反映は `git push origin main` のみ
- `/var/www/html` を手動で触らない
- nginx を手動で編集・再起動しない
- `deploy.yml` は固定（変更は設計相談後）

---

## 2. 現在の問題点（重要）

### ❌ チャット機能がエラーになる

- `/chat` にアクセスすると「アプリケーションエラー」
- **原因**: バックエンドAPIが本番VPSで稼働していない

### ❌ ブラウザ機能が動かない

- フロントは存在するが API / セッション / 実行系が存在しない

---

## 3. 原因の正確な切り分け

### 🔴 現状は「静的SPAのみ本番稼働」

以下は VPS上で未実装 or 未起動：

- APIサーバー（例）
  - `/api/chat`
  - `/api/session`
  - `/api/concierge`
- AI推論処理（OpenAI API連携）
- WebSocket / SSE
- 常駐プロセス（uvicorn / node / pm2 / systemd）

👉 Cursor / Manus / ローカル環境では動いていたが  
👉 VPSでは起動されていない

これは設計ミスではなく、フェーズ未到達。

---

## 4. バックエンド技術の確定（調査結果）

### 4.1 技術スタック

**確認結果**:
- **言語**: TypeScript / Node.js
- **フレームワーク**: Express 4.21.2
- **API**: tRPC 11.6.0（型安全なAPI）
- **WebSocket**: Socket.IO 4.8.1
- **データベース**: MySQL2 3.15.0 + Drizzle ORM 0.44.5
- **ビルドツール**: Vite（フロントエンド）

**エントリーポイント**:
- `server/_core/index.ts`: Expressサーバーの起動スクリプト
- ポート: `process.env.PORT || 3000`（デフォルト3000）

**起動コマンド**:
```bash
# 開発環境
pnpm dev

# 本番環境（推奨）
node dist/server/_core/index.js
# または
pnpm start
```

### 4.2 必要な環境変数

**必須環境変数**（`server/_core/env.ts`より）:
- `DATABASE_URL`: MySQL接続文字列
- `OPENAI_API_KEY`: OpenAI APIキー（推論用）
- `PORT`: サーバーポート（デフォルト: 3000）
- `NODE_ENV`: `production`（本番環境）

**オプション環境変数**:
- `STRIPE_SECRET_KEY`: Stripe課金処理用
- `STRIPE_WEBHOOK_SECRET`: Stripe Webhook署名検証用
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: S3ファイルストレージ用
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`: OAuth認証用

### 4.3 ビルドプロセス

**フロントエンド**:
```bash
pnpm run build
# → dist/public/ に出力
```

**バックエンド**:
- TypeScriptをJavaScriptにコンパイル
- `tsconfig.json` で設定
- 出力先: `dist/server/`

**統合ビルド**:
- `package.json` の `build` スクリプトで両方をビルド

---

## 5. 本番APIサーバー構成設計（確定案）

### 5.1 選定案: **Node.js + Express + systemd**

**選定理由**:
1. **既存コードとの互換性**: 既にExpressで実装済み
2. **TypeScript対応**: 既存コードがTypeScript
3. **シンプルな運用**: systemdで常駐管理が容易
4. **VPS環境との親和性**: Ubuntu標準のsystemdで管理可能
5. **再起動耐性**: systemdの自動再起動機能

**代替案との比較**:
- ❌ FastAPI（Python）: 既存コードがNode.jsのため移行コストが高い
- ❌ pm2: systemdの方が標準的で管理しやすい
- ❌ Bun: まだ実験的、既存コードとの互換性が不明

### 5.2 実装構成

```
VPS構成:
├── nginx (ポート80/443)
│   ├── / → /var/www/html (静的SPA)
│   └── /api/* → proxy_pass http://127.0.0.1:3000
│
└── TENMON-ARK API Server (systemd service)
    ├── ポート: 3000
    ├── プロセス: node dist/server/_core/index.js
    ├── 自動再起動: 有効
    └── ログ: /var/log/tenmon-ark/api.log
```

### 5.3 systemdサービス定義

**ファイル**: `/etc/systemd/system/tenmon-ark-api.service`

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
ExecStart=/usr/bin/node dist/server/_core/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

---

## 6. nginx 連携設計

### 6.1 設定ファイル

**ファイル**: `/etc/nginx/sites-available/tenmon-ark.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tenmon-ark.com www.tenmon-ark.com;

    # HTTPSリダイレクト
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

### 6.2 既存フロントエンドへの影響

**影響なし**:
- 静的ファイル配信は既存のまま（`/var/www/html`）
- SPAルーティングは既存のまま（`try_files`）
- フロントエンドコード変更不要

**追加機能**:
- `/api/*` がバックエンドAPIにプロキシされる
- `/api/socket.io/*` がWebSocket接続にプロキシされる

---

## 7. GitHub Actions との関係整理

### 7.1 フロントエンド（現状維持）

**ワークフロー**: `.github/workflows/deploy.yml`
- `main` ブランチ push → 自動ビルド → `/var/www/html` 配置
- **変更不要**

### 7.2 バックエンド（新規追加）

**方針**: **段階的導入（事故防止）**

**Phase 2-A: 手動起動確認（最初）**
1. VPS上で手動でAPIサーバーを起動
2. nginx設定を手動で適用
3. 動作確認

**Phase 2-B: systemdサービス化（次）**
1. systemdサービスファイルを作成
2. 手動でサービスを起動・確認
3. 再起動耐性を確認

**Phase 2-C: GitHub Actions統合（最後）**
1. `deploy.yml` にバックエンド再起動を追加
2. 自動デプロイ時にAPIサーバーを再起動

**推奨順序**:
1. まず手動で動作確認（Phase 2-A）
2. systemdサービス化（Phase 2-B）
3. GitHub Actions統合は動作確認後に検討（Phase 2-C）

---

## 8. 未実装部分の洗い出し

### 8.1 バックエンド本番化（未実装）

#### ❌ VPS上でのAPIサーバー起動
- **現状**: ローカル環境でのみ動作
- **必要**: VPS上で常駐プロセスとして起動

#### ❌ systemdサービス定義
- **現状**: 存在しない
- **必要**: `/etc/systemd/system/tenmon-ark-api.service` 作成

#### ❌ nginx APIプロキシ設定
- **現状**: 静的ファイル配信のみ
- **必要**: `/api/*` をバックエンドにプロキシ

#### ❌ 環境変数管理
- **現状**: ローカル `.env` のみ
- **必要**: VPS上で `.env` または systemd `EnvironmentFile` 設定

#### ❌ ビルドプロセス
- **現状**: フロントエンドのみビルド
- **必要**: バックエンドもビルド（TypeScript → JavaScript）

#### ❌ ログ管理
- **現状**: 未定義
- **必要**: systemd journal またはファイルログ

### 8.2 セキュリティ（未実装）

#### ❌ 環境変数の保護
- **現状**: `.env` がGitに含まれる可能性
- **必要**: `.env` を `.gitignore` に追加、VPS上で手動配置

#### ❌ セキュリティヘッダー
- **現状**: nginx設定に未実装
- **必要**: CSP、HSTS等のセキュリティヘッダー

### 8.3 監視・運用（未実装）

#### ❌ ヘルスチェック
- **現状**: 存在しない
- **必要**: `/api/health` エンドポイント

#### ❌ ログローテーション
- **現状**: 未定義
- **必要**: systemd journal または logrotate 設定

---

## 9. Phase 2 の具体的タスク一覧

### 9.1 P0（最優先・必須）

#### TASK 2-1: バックエンドビルド確認
**目的**: VPS上でバックエンドがビルドできることを確認

**手順**:
1. `package.json` の `build` スクリプトを確認
2. バックエンドビルドが含まれているか確認
3. 必要に応じて `build` スクリプトを修正

**成果物**:
- `dist/server/_core/index.js` が生成される

**推定工数**: 0.5人日

---

#### TASK 2-2: 環境変数ファイル作成
**目的**: VPS上で必要な環境変数を設定

**手順**:
1. `.env.example` を作成（テンプレート）
2. VPS上で `.env` を作成（実際の値）
3. `.env` を `.gitignore` に追加（既にあるか確認）

**成果物**:
- `/opt/tenmon-ark/tenmon-ark/.env`（VPS上）

**推定工数**: 0.5人日

---

#### TASK 2-3: systemdサービス定義作成
**目的**: APIサーバーを常駐プロセスとして起動

**手順**:
1. `server/systemd/tenmon-ark-api.service` を作成（テンプレート）
2. VPS上で `/etc/systemd/system/tenmon-ark-api.service` に配置
3. `systemctl daemon-reload`
4. `systemctl enable tenmon-ark-api`
5. `systemctl start tenmon-ark-api`
6. `systemctl status tenmon-ark-api` で確認

**成果物**:
- systemdサービスファイル
- APIサーバーが常駐起動

**推定工数**: 1人日

---

#### TASK 2-4: nginx APIプロキシ設定
**目的**: `/api/*` をバックエンドにプロキシ

**手順**:
1. `server/nginx/tenmon-ark.com.conf` を作成（テンプレート）
2. VPS上で `/etc/nginx/sites-available/tenmon-ark.com` に配置
3. `ln -s /etc/nginx/sites-available/tenmon-ark.com /etc/nginx/sites-enabled/`
4. `nginx -t` で設定確認
5. `systemctl reload nginx`

**成果物**:
- nginx設定ファイル
- `/api/*` がバックエンドにプロキシされる

**推定工数**: 1人日

---

#### TASK 2-5: 手動起動・動作確認
**目的**: VPS上でAPIサーバーが正常に動作することを確認

**手順**:
1. VPSにSSH接続
2. `/opt/tenmon-ark/tenmon-ark` に移動
3. `git pull origin main`
4. `pnpm install`
5. `pnpm run build`
6. `node dist/server/_core/index.js` で手動起動
7. `curl http://localhost:3000/api/health` で確認
8. ブラウザで `https://tenmon-ark.com/api/health` にアクセスして確認

**成果物**:
- APIサーバーが正常に動作することを確認

**推定工数**: 1人日

---

### 9.2 P1（重要・次フェーズ）

#### TASK 2-6: ヘルスチェックエンドポイント追加
**目的**: APIサーバーの稼働状態を確認

**手順**:
1. `server/_core/index.ts` に `/api/health` エンドポイントを追加
2. レスポンス: `{ status: "ok", timestamp: Date.now() }`

**成果物**:
- `/api/health` エンドポイント

**推定工数**: 0.5人日

---

#### TASK 2-7: ログ管理設定
**目的**: ログを適切に管理

**手順**:
1. systemd journal を使用（デフォルト）
2. `journalctl -u tenmon-ark-api -f` でログ確認
3. 必要に応じてログローテーション設定

**成果物**:
- ログ確認方法のドキュメント

**推定工数**: 0.5人日

---

#### TASK 2-8: GitHub Actions統合（オプション）
**目的**: 自動デプロイ時にAPIサーバーを再起動

**手順**:
1. `.github/workflows/deploy.yml` にバックエンド再起動を追加
2. SSH経由で `systemctl restart tenmon-ark-api` を実行

**成果物**:
- 更新された `deploy.yml`

**推定工数**: 1人日

**注意**: TASK 2-5（手動起動確認）が成功してから実施

---

### 9.3 P2（改善・将来）

#### TASK 2-9: セキュリティヘッダー強化
**目的**: セキュリティを強化

**手順**:
1. nginx設定にCSP、HSTS等を追加
2. Express側でもセキュリティヘッダーを設定

**成果物**:
- 強化されたセキュリティ設定

**推定工数**: 1人日

---

#### TASK 2-10: 監視・アラート設定
**目的**: APIサーバーの異常を検知

**手順**:
1. Prometheusメトリクスエンドポイント（既存: `/api/metrics`）を活用
2. 必要に応じてアラート設定

**成果物**:
- 監視設定

**推定工数**: 2人日

---

## 10. 今すぐ着手する最小実装（MVP）

### 10.1 MVPの定義

**ゴール**: `https://tenmon-ark.com/chat` でチャットが動作する

**最小要件**:
1. APIサーバーがVPS上で起動している
2. nginxが `/api/*` をバックエンドにプロキシしている
3. チャットAPI（`/api/chat/stream`）が動作している

### 10.2 MVP実装順序（厳守）

#### STEP 1: バックエンドビルド確認（TASK 2-1）
- `package.json` の `build` スクリプトを確認
- 必要に応じて修正

#### STEP 2: 環境変数ファイル作成（TASK 2-2）
- `.env.example` を作成
- VPS上で `.env` を作成（手動）

#### STEP 3: 手動起動・動作確認（TASK 2-5）
- VPS上で手動でAPIサーバーを起動
- 動作確認

#### STEP 4: systemdサービス化（TASK 2-3）
- systemdサービスファイルを作成
- サービスを起動・確認

#### STEP 5: nginx APIプロキシ設定（TASK 2-4）
- nginx設定を追加
- プロキシ動作確認

#### STEP 6: チャット動作確認
- `https://tenmon-ark.com/chat` にアクセス
- チャットが動作することを確認

---

## 11. 実装順序（人間が迷わないレベルで明示）

### Phase 2-A: 手動起動確認（最初・必須）

**目的**: VPS上でAPIサーバーが動作することを確認

**手順**:
1. **VPSにSSH接続**
   ```bash
   ssh user@tenmon-ark.com
   ```

2. **プロジェクトディレクトリに移動**
   ```bash
   cd /opt/tenmon-ark/tenmon-ark
   ```

3. **最新コードを取得**
   ```bash
   git pull origin main
   ```

4. **依存関係をインストール**
   ```bash
   pnpm install
   ```

5. **ビルド**
   ```bash
   pnpm run build
   ```

6. **環境変数を設定**
   ```bash
   # .env ファイルを作成（手動）
   nano .env
   # 以下を設定:
   # DATABASE_URL=mysql://...
   # OPENAI_API_KEY=sk-...
   # PORT=3000
   # NODE_ENV=production
   ```

7. **手動でAPIサーバーを起動**
   ```bash
   node dist/server/_core/index.js
   ```

8. **別ターミナルで動作確認**
   ```bash
   curl http://localhost:3000/api/health
   ```

9. **ブラウザで確認**
   - `https://tenmon-ark.com/api/health` にアクセス
   - レスポンスが返ることを確認

**完了条件**:
- ✅ APIサーバーが起動する
- ✅ `/api/health` が動作する
- ✅ ログにエラーがない

---

### Phase 2-B: systemdサービス化（次・必須）

**目的**: APIサーバーを常駐プロセスとして起動

**手順**:
1. **systemdサービスファイルを作成**
   ```bash
   sudo nano /etc/systemd/system/tenmon-ark-api.service
   ```
   （内容は上記「5.3 systemdサービス定義」を参照）

2. **systemdを再読み込み**
   ```bash
   sudo systemctl daemon-reload
   ```

3. **サービスを有効化**
   ```bash
   sudo systemctl enable tenmon-ark-api
   ```

4. **サービスを起動**
   ```bash
   sudo systemctl start tenmon-ark-api
   ```

5. **ステータス確認**
   ```bash
   sudo systemctl status tenmon-ark-api
   ```

6. **ログ確認**
   ```bash
   sudo journalctl -u tenmon-ark-api -f
   ```

**完了条件**:
- ✅ サービスが起動する
- ✅ 自動再起動が有効
- ✅ ログにエラーがない

---

### Phase 2-C: nginx APIプロキシ設定（最後・必須）

**目的**: `/api/*` をバックエンドにプロキシ

**手順**:
1. **nginx設定ファイルをバックアップ**
   ```bash
   sudo cp /etc/nginx/sites-available/tenmon-ark.com /etc/nginx/sites-available/tenmon-ark.com.backup
   ```

2. **nginx設定を編集**
   ```bash
   sudo nano /etc/nginx/sites-available/tenmon-ark.com
   ```
   （内容は上記「6.1 設定ファイル」を参照）

3. **設定をテスト**
   ```bash
   sudo nginx -t
   ```

4. **nginxをリロード**
   ```bash
   sudo systemctl reload nginx
   ```

5. **動作確認**
   ```bash
   curl https://tenmon-ark.com/api/health
   ```

**完了条件**:
- ✅ nginx設定が正しい
- ✅ `/api/*` がバックエンドにプロキシされる
- ✅ 既存の静的ファイル配信が壊れていない

---

## 12. 制約・注意事項

### 12.1 既存フロントコードは破壊しない

- 静的ファイル配信（`/var/www/html`）は変更しない
- SPAルーティング（`try_files`）は変更しない
- フロントエンドコード変更不要

### 12.2 main ブランチ運用を維持

- 本番反映は `git push origin main` のみ
- バックエンドコードも `main` ブランチにコミット
- ブランチ戦略は変更しない

### 12.3 思想・世界観（天津金木・火水構文）は尊重

- Twin-Core推論エンジンは変更禁止
- 言霊ロジックは変更禁止
- Event Sourcing構造は変更禁止

---

## 13. 最終ゴール定義

### 13.1 本番稼働状態

**URL**: https://tenmon-ark.com

**機能**:
- ✅ トップUI：Hinomizu Core（維持）
- ✅ チャット：`/chat` でAI応答が動作
- ✅ ブラウザ：`/browser` で動作（将来）
- ✅ 認証：OAuth認証が動作
- ✅ ファイルアップロード：動作

**技術要件**:
- ✅ APIサーバーが常駐起動
- ✅ nginxがAPIをプロキシ
- ✅ データベース接続が正常
- ✅ OpenAI API連携が正常
- ✅ WebSocket接続が正常

---

## 14. 実装ファイル一覧（新規作成）

### 14.1 テンプレートファイル（リポジトリに含める）

1. **`server/systemd/tenmon-ark-api.service`**
   - systemdサービス定義（テンプレート）

2. **`server/nginx/tenmon-ark.com.conf`**
   - nginx設定（テンプレート）

3. **`.env.example`**
   - 環境変数テンプレート

4. **`server/_core/health.ts`**
   - ヘルスチェックエンドポイント（新規）

### 14.2 VPS上で手動作成するファイル

1. **`/etc/systemd/system/tenmon-ark-api.service`**
   - systemdサービス定義（実際のファイル）

2. **`/opt/tenmon-ark/tenmon-ark/.env`**
   - 環境変数（実際の値）

3. **`/etc/nginx/sites-available/tenmon-ark.com`**
   - nginx設定（実際のファイル）

---

## 15. 次のアクション（Cursorへの指示）

### 15.1 今すぐ実行すべきこと

1. **バックエンドビルド確認**
   - `package.json` の `build` スクリプトを確認
   - バックエンドビルドが含まれているか確認

2. **テンプレートファイル作成**
   - `server/systemd/tenmon-ark-api.service` を作成
   - `server/nginx/tenmon-ark.com.conf` を作成
   - `.env.example` を作成

3. **ヘルスチェックエンドポイント追加**
   - `server/_core/index.ts` に `/api/health` を追加

4. **ドキュメント作成**
   - VPS上での手動起動手順書を作成

### 15.2 実装順序（厳守）

1. **Phase 2-A: 手動起動確認**（最初・必須）
2. **Phase 2-B: systemdサービス化**（次・必須）
3. **Phase 2-C: nginx APIプロキシ設定**（最後・必須）

### 15.3 完了条件

- ✅ `https://tenmon-ark.com/api/health` が動作する
- ✅ `https://tenmon-ark.com/chat` でチャットが動作する
- ✅ APIサーバーが常駐起動している
- ✅ 再起動後も自動で起動する

---

## 16. 補足：技術的詳細

### 16.1 ポート番号

- **APIサーバー**: 3000（内部）
- **nginx**: 80（HTTP）、443（HTTPS）

### 16.2 プロセス管理

- **systemd**: 標準的なLinuxサービス管理
- **自動再起動**: `Restart=always` で設定
- **ログ**: systemd journal を使用

### 16.3 セキュリティ

- **環境変数**: `.env` を `.gitignore` に追加
- **ファイル権限**: `.env` は `chmod 600` で保護
- **nginx**: セキュリティヘッダーを設定

---

**レポート完了**

