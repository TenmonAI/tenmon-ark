# PWA Staging Deployment Guide

## 概要

本番URLでPWAテストを行うための安全な手順。まず `/stg/` で検証し、問題なければ `/` へ昇格する。

## 方針

### ✅ 推奨アプローチ

**PWAは "サイト直下 /" で動かす（`/pwa/` 配下は避ける）**

理由：
- PWAの `scope` / `service worker` / `manifest` が素直に効く
- "インストールして使う" の本命はここ

### ✅ 安全な検証手順

本番 `/` は維持しつつ、`/stg/` で"同一ドメインPWA"をまず検証

1. `https://tenmon-ark.com/stg/` を PWA化してインストールテスト
2. 問題なければ `/` へ昇格（Founder公開）

**理由**: いきなり `/` で上書きすると、キャッシュ（SW）が絡んで切り戻しが面倒になる。まず `/stg/` が安全。

## サーバ側設定

### Nginx設定の追加

`/etc/nginx/sites-enabled/tenmon-ark` の同じ `server { ... }`（443側）に、SPAの `location /` より前に挿入：

```nginx
# --- STAGING PWA ---
location ^~ /stg/ {
  alias /var/www/tenmon-pwa-dist/;
  try_files $uri $uri/ /stg/index.html;

  # PWAの更新検証をしやすく（最初はno-store推奨）
  add_header Cache-Control "no-store";
}

# service worker はキャッシュ挙動が肝なので明示（生成物に合わせて調整）
location = /stg/service-worker.js {
  alias /var/www/tenmon-pwa-dist/service-worker.js;
  add_header Cache-Control "no-cache";
}

location = /stg/manifest.json {
  alias /var/www/tenmon-pwa-dist/manifest.json;
  add_header Cache-Control "no-cache";
}
```

### 設定ファイルの適用

```bash
# バックアップ
sudo cp /etc/nginx/sites-available/tenmon-ark.com \
  /etc/nginx/sites-available/tenmon-ark.com.bak-$(date +%F_%H%M%S)

# 新しい設定をコピー（stg-pwa版を使用）
sudo cp /path/to/os-tenmon-ai-v2-reset/infra/nginx/tenmon-ark.com.conf.stg-pwa \
  /etc/nginx/sites-available/tenmon-ark.com

# 構文チェック
sudo nginx -t

# 反映
sudo systemctl reload nginx
```

### ディレクトリ準備

```bash
# PWAビルド成果物を配置
sudo mkdir -p /var/www/tenmon-pwa-dist
sudo chown -R www-data:www-data /var/www/tenmon-pwa-dist

# ビルド成果物をコピー（例：ローカルから）
# scp -r dist/* user@server:/var/www/tenmon-pwa-dist/
```

## 検証手順

### 1. `/stg/` へのアクセス確認

```bash
curl -I https://tenmon-ark.com/stg/
```

期待されるレスポンス：
- HTTP 200 OK
- `Cache-Control: no-store` ヘッダーが含まれる

### 2. Service Worker の確認

```bash
curl -I https://tenmon-ark.com/stg/service-worker.js
```

期待されるレスポンス：
- HTTP 200 OK
- `Cache-Control: no-cache` ヘッダーが含まれる

### 3. Manifest の確認

```bash
curl -I https://tenmon-ark.com/stg/manifest.json
```

期待されるレスポンス：
- HTTP 200 OK
- `Cache-Control: no-cache` ヘッダーが含まれる

### 4. PWAインストールテスト

1. ブラウザで `https://tenmon-ark.com/stg/` を開く
2. インストールプロンプトが表示されることを確認
3. インストール後、アプリとして起動できることを確認
4. Service Worker が正しく登録されていることを確認（DevTools > Application > Service Workers）

## 本番昇格手順

`/stg/` での検証が完了し、問題がない場合：

### 1. ビルド成果物を本番ディレクトリへコピー

```bash
# バックアップ
sudo cp -r /var/www/tenmon-ark-frontend /var/www/tenmon-ark-frontend.bak-$(date +%F_%H%M%S)

# 新しいビルドを配置
sudo cp -r /var/www/tenmon-pwa-dist/* /var/www/tenmon-ark-frontend/
sudo chown -R www-data:www-data /var/www/tenmon-ark-frontend
```

### 2. 本番用キャッシュ設定に変更

Nginx設定の `location /` を更新：

```nginx
location / {
    root /var/www/tenmon-ark-frontend;
    try_files $uri $uri/ /index.html;
    
    # Production caching
    add_header Cache-Control "public, max-age=3600";
}

location = /service-worker.js {
    root /var/www/tenmon-ark-frontend;
    add_header Cache-Control "no-cache";
}

location = /manifest.json {
    root /var/www/tenmon-ark-frontend;
    add_header Cache-Control "no-cache";
}
```

### 3. 反映

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## トラブルシューティング

### Service Worker が更新されない

1. ブラウザの DevTools > Application > Service Workers で "Unregister" を実行
2. ページをリロード
3. 新しい Service Worker が登録されることを確認

### キャッシュが残る

1. ブラウザのキャッシュをクリア
2. ハードリロード（Ctrl+Shift+R / Cmd+Shift+R）
3. Service Worker を再登録

### 404エラーが発生する

1. `try_files` ディレクティブが正しく設定されているか確認
2. `alias` パスが正しいか確認
3. ファイルのパーミッションを確認

## 注意事項

- **Service Worker のキャッシュ**: 一度登録されると、ブラウザがキャッシュを保持するため、更新が反映されない場合がある
- **本番昇格時の注意**: 既存ユーザーの Service Worker が古いバージョンを保持している可能性があるため、段階的なロールアウトを推奨
- **バックアップ**: 本番昇格前に必ずバックアップを取ること
