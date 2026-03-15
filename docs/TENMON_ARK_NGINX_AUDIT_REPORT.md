# TENMON-ARK 公開配信構造監査レポート（観測のみ・修正なし）

**実施日**: 観測実行日時点  
**目的**: 「/api は生きているのに /pwa が 404 の理由」を nginx 観点で可視化する。  
**方針**: 修正・再起動は行わず、観測と証拠に基づく判定のみ。

---

# 1. 概要

| 項目 | 内容 |
|------|------|
| **nginx 設定の読み込み元** | メイン: `/etc/nginx/nginx.conf`。仮想ホスト: `include /etc/nginx/conf.d/*.conf;` および `include /etc/nginx/sites-enabled/*;`。 |
| **sites-enabled の実体** | `tenmon-ark` → `/etc/nginx/sites-available/tenmon-ark`、`tenmon-localhost` → `/etc/nginx/sites-available/tenmon-localhost`（いずれもシンボリックリンク）。 |
| **server block 数** | **3 個**（tenmon-ark: 80 用 1 + 443 用 1、tenmon-localhost: 80 用 1）。 |
| **TENMON-ARK 関連 block 一覧** | (1) 80・tenmon-ark.com → 301 で https へ (2) 443・tenmon-ark.com → PWA + API (3) 80 default_server・localhost → PWA + API。 |
| **80 番** | `tenmon-ark`（tenmon-ark.com）: 301 → https。`tenmon-localhost`（localhost/127.0.0.1）: **default_server**、PWA/API を提供。 |
| **443 番** | `tenmon-ark` のみ。tenmon-ark.com 用。default_server 指定なし。 |
| **default_server** | **80 番のみ**。`tenmon-localhost` の `listen 80 default_server`。443 には default_server なし。 |

---

# 2. TENMON-ARK 関連 server block 抽出

## Block 1: tenmon-ark（HTTP → HTTPS リダイレクト）

| 項目 | 値 |
|------|-----|
| file path | `/etc/nginx/sites-available/tenmon-ark`（sites-enabled からリンク） |
| listen | `80` |
| server_name | `tenmon-ark.com www.tenmon-ark.com` |
| root | なし |
| index | なし |
| SSL | なし（この block は 301 のみ） |
| 本番候補 | 本番ドメインの 80 受け口。 |

## Block 2: tenmon-ark（HTTPS 本番）

| 項目 | 値 |
|------|-----|
| file path | 同上 |
| listen | `443 ssl http2` |
| server_name | `tenmon-ark.com www.tenmon-ark.com` |
| root | なし（location で alias のみ） |
| index | なし（location /pwa/ に index 指定なし；try_files で /pwa/index.html にフォールバック） |
| SSL | あり。`/etc/letsencrypt/live/tenmon-ark.com/fullchain.pem` / `privkey.pem` |
| 本番候補 | **本番候補。** tenmon-ark.com の 443 を処理。 |

## Block 3: tenmon-localhost（ローカル・default_server）

| 項目 | 値 |
|------|-----|
| file path | `/etc/nginx/sites-available/tenmon-localhost` |
| listen | `80 default_server` |
| server_name | `localhost 127.0.0.1 _` |
| root | なし（location で alias のみ） |
| index | なし |
| SSL | なし |
| 本番候補 | 本番ではなく、localhost/127.0.0.1 用。80 の default_server。 |

---

# 3. location 経路解析

## tenmon-ark（443）および tenmon-localhost（80）共通

| location | 設定内容 | 要約 |
|----------|----------|------|
| **location /pwa/** | `alias /var/www/tenmon-pwa/pwa/;`<br>`try_files $uri $uri/ /pwa/index.html;` | 静的配信。リクエストの /pwa/ 以降を alias 先にマッピング。ファイルが無い場合は内部リダイレクトで `/pwa/index.html` を返す。 |
| **location /api/** | `proxy_pass http://127.0.0.1:3000;`<br>proxy_http_version 1.1 と各種ヘッダ設定 | /api/* を Node（ポート 3000）にプロキシ。 |
| **location = /** | `return 302 /pwa/;` | ルートのみ 302 で /pwa/ へ。 |

## その他

- **正規表現 location**（`location ~` など）: なし。
- **try_files**: `/pwa/` 内の `try_files $uri $uri/ /pwa/index.html;` のみ。
- **proxy_pass**: `/api/` のみ。`http://127.0.0.1:3000`（末尾スラッシュなし）。
- **alias**: `/pwa/` のみ。`/var/www/tenmon-pwa/pwa/`。
- **rewrite**: なし。
- **return**: `location = /` の `return 302 /pwa/;`、tenmon-ark 80 の `return 301 https://$host$request_uri;` のみ。404/502 の return はなし。

---

# 4. 実体パス照合

| パス | exists / missing | index.html | register-local.html | brand |
|------|------------------|------------|---------------------|-------|
| **/var/www/tenmon-pwa** | exists | - | - | - |
| **/var/www/tenmon-pwa/pwa** | exists | - | - | - |
| /var/www/tenmon-pwa/pwa/index.html | - | **exists** | - | - |
| /var/www/tenmon-pwa/pwa/register-local.html | - | - | **missing** | - |
| /var/www/tenmon-pwa/pwa/brand | - | - | - | **exists** |
| **/opt/tenmon-ark-repo/web/dist** | exists | exists | **missing**（SPA のため単一 index.html のみ） | exists |
| **/opt/tenmon-ark-repo/site/dist** | exists | exists | - | - |
| **/opt/tenmon-ark-repo/client/dist** | missing | - | - | - |
| **/opt/tenmon-ark-repo/client/index.html** | exists | - | - | - |

- **register-local.html**: リポジトリの web ビルド成果物（web/dist）にも存在しない。PWA は SPA であり、`/pwa/register-local.html` はクライアントルーティングで処理され、静的には `try_files` のフォールバックで index.html が返る想定。
- **/var/www/tenmon-pwa/pwa/** には index.html / assets / brand が存在し、本監査時点では /pwa/ 用の静的実体は揃っている。

---

# 5. curl 経路照合

## 127.0.0.1（80・tenmon-localhost default_server）

| URL | HTTP コード | 備考 |
|-----|-------------|------|
| http://127.0.0.1/ | **302** | Location: http://127.0.0.1/pwa/ |
| http://127.0.0.1/pwa/ | **200** | text/html、Content-Length: 777、index.html 内容（TENMON-ARK Web）。 |
| http://127.0.0.1/pwa/register-local.html | **200** | 同上（index.html をフォールバックで返却）。 |
| http://127.0.0.1/api/audit | **200** | application/json、Express の audit API。 |
| http://127.0.0.1/api/me | **200** | application/json、{ "ok": true, "user": null, "founder": false }。 |

## tenmon-ark.com（443）

| URL | HTTP コード | 備考 |
|-----|-------------|------|
| https://tenmon-ark.com/ | **302** | Location: https://tenmon-ark.com/pwa/ |
| https://tenmon-ark.com/pwa/ | **200** | text/html、777 バイト、index.html 内容。 |
| https://tenmon-ark.com/pwa/register-local.html | **200** | 同上（index.html フォールバック）。 |
| https://tenmon-ark.com/api/audit | **200** | application/json、audit API。 |

**証拠**: 本監査時点では、いずれの経路でも **/pwa/ は 404 ではなく 200** を返している。

---

# 6. 判定

| 問い | 証拠に基づく答え |
|------|------------------|
| **現在 /api を返しているのは何か** | **nginx の location /api/ の proxy_pass**。バックエンドは `http://127.0.0.1:3000`（Node/Express）。80（tenmon-localhost）と 443（tenmon-ark）の両方で有効。 |
| **現在 /pwa を返しているのは何か** | **nginx の location /pwa/**。`alias /var/www/tenmon-pwa/pwa/` と `try_files $uri $uri/ /pwa/index.html` により、実ファイルが無い場合は index.html を返している。 |
| **/pwa 404 の直接原因** | **本監査の実行時点では /pwa は 404 を返していない**（127.0.0.1 および tenmon-ark.com で 200 を確認）。過去や他環境で 404 が出る場合に考えられるのは、(1) `/var/www/tenmon-pwa/pwa/` または `index.html` が存在しない（未デプロイ・誤削除）、(2) **alias と try_files の組み合わせ**で、nginx のバージョンや解釈によりパス解決が失敗している可能性。 |
| **最も怪しい設定箇所** | **location /pwa/ の `alias` + `try_files $uri $uri/ /pwa/index.html`**。alias と try_files を併用する場合、`$uri` の解釈と実際のファイルパスがずれることがあり、環境によっては「ファイルなし」と判断され 404 になり得る。 |
| **修正が必要な層** | 現時点で「必須」の修正は断定できない。404 が再現する場合の候補は次のいずれか（または組み合わせ）。<br>・**nginx**: location /pwa/ の書き方（例: root + try_files に変更、または alias と try_files の組み合わせの見直し）。<br>・**deploy**: デプロイ先が `/var/www/tenmon-pwa/pwa/` と一致しているか、index.html が必ず配置されるか。<br>・**static asset 配置**: 上記パスに index.html と assets/brand が確実に存在するか。<br>・**API**: /pwa 404 の直接原因としては関係薄（/api は別 location で動作している）。 |

---

# 7. 結論（次の一手を 1 つだけ）

**「証拠に基づく次の一手」**:  
**404 の再現条件を確定するため、意図的に `/var/www/tenmon-pwa/pwa/index.html` を一時退避し、`curl -i http://127.0.0.1/pwa/` および `curl -k -i https://tenmon-ark.com/pwa/` を実行する。**  
→ その状態で 404 が返れば、「index.html が無い場合に nginx が 404 を返す」ことが証拠として確認できる。その後、index.html を元に戻せば、現状の「200 になる条件」も再確認できる。  
（本レポートは観測のみで、修正・再起動は行っていない。）
