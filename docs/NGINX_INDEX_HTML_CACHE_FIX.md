# Nginx設定：index.html キャッシュ対策

## 目的

Viteでビルドしたアプリケーションの更新が確実に反映されるように、`index.html` は常に最新を取得し、ハッシュ付きアセット（`/assets/*.js` など）は長期キャッシュを許可する設定を追加します。

## 設定内容

`/etc/nginx/sites-enabled/tenmon-ark` の `server { ... listen 443 ... }` ブロック内に以下を追加：

```nginx
# index.html は常に最新を取りに行く
location = /index.html {
    add_header Cache-Control "no-store" always;
    try_files $uri =404;
}

# Vite のハッシュ付き資産は長期キャッシュOK
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    try_files $uri =404;
}
```

## 適用手順

### 1. VPSにSSH接続

```bash
ssh user@vps
```

### 2. Nginx設定ファイルを編集

```bash
sudo nano /etc/nginx/sites-enabled/tenmon-ark
```

### 3. `server { ... listen 443 ... }` ブロック内に追加

既存の設定例：

```nginx
server {
    listen 443 ssl http2;
    server_name tenmon-ark.com;
    
    # ... 既存の設定 ...
    
    # ★ ここに追加
    # index.html は常に最新を取りに行く
    location = /index.html {
        add_header Cache-Control "no-store" always;
        try_files $uri =404;
    }

    # Vite のハッシュ付き資産は長期キャッシュOK
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }
    
    # ... 既存の設定 ...
}
```

### 4. 設定ファイルの構文チェック

```bash
sudo nginx -t
```

### 5. Nginxをリロード

```bash
sudo systemctl reload nginx
```

## 動作確認

### ブラウザで確認

1. 開発者ツールを開く（F12）
2. Networkタブを開く
3. ページをリロード（Cmd+Shift+R / Ctrl+Shift+R）
4. `index.html` のレスポンスヘッダーを確認
   - `Cache-Control: no-store` が設定されていることを確認
5. `/assets/*.js` のレスポンスヘッダーを確認
   - `Cache-Control: public, max-age=31536000, immutable` が設定されていることを確認

### コマンドで確認

```bash
curl -I https://tenmon-ark.com/index.html
# Cache-Control: no-store が表示されることを確認

curl -I https://tenmon-ark.com/assets/index-abc123.js
# Cache-Control: public, max-age=31536000, immutable が表示されることを確認
```

## 効果

- **index.html**: 常に最新版を取得（更新が即座に反映）
- **/assets/*.js**: 1年間キャッシュ（パフォーマンス向上）
- **ハッシュ付きファイル名**: Viteが自動的にハッシュを付与するため、ファイル内容が変わればファイル名も変わり、自動的に新しいファイルが取得される

## トラブルシューティング

### 設定が反映されない場合

1. Nginxの設定ファイルの構文エラーを確認
   ```bash
   sudo nginx -t
   ```

2. Nginxのエラーログを確認
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. ブラウザのキャッシュを完全にクリア
   - Chrome: Cmd+Shift+Delete (Mac) / Ctrl+Shift+Delete (Windows)
   - 開発者ツールで「Disable cache」を有効化

### 既存の location ブロックと競合する場合

既存の `location /` ブロックがある場合、より具体的な `location = /index.html` が優先されます。

## 参考

- [Vite: Static Asset Handling](https://vitejs.dev/guide/assets.html)
- [Nginx: add_header Directive](http://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header)


