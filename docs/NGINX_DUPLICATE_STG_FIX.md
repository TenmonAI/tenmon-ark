# Nginx /stg/ 重複削除手順

## 問題

`/etc/nginx/sites-available/tenmon-ark.com` に `/stg/` の location ブロックが2回書かれている（9行目と37行目など）。

## 解決方法

**下の方（36〜41行目あたり）の `/stg/` location を削除し、上の方（9〜13行目あたり）を残す。**

## 手順

### 1. 重複を確認

```bash
# /stg/ location の行番号を確認
grep -n "location.*/stg/" /etc/nginx/sites-available/tenmon-ark.com

# 期待される結果: 1行だけ（例: 26:    location ^~ /stg/ {）
# もし2行以上出たら重複あり
```

### 2. 下の方の重複を削除

```bash
# ファイルを編集
sudo nano /etc/nginx/sites-available/tenmon-ark.com

# または
sudo vi /etc/nginx/sites-available/tenmon-ark.com
```

**削除する内容（下の方、36〜41行目あたり）:**
```nginx
    # --- STAGING PWA (https://tenmon-ark.com/stg/) ---
    location ^~ /stg/ {
        alias /var/www/tenmon-pwa-dist/;
        try_files $uri $uri/ /stg/index.html;
        add_header Cache-Control "no-store";
    }
```

**残す内容（上の方、9〜13行目あたり）:**
```nginx
    # --- STAGING PWA (https://tenmon-ark.com/stg/) ---
    location ^~ /stg/ {
        alias /var/www/tenmon-pwa-dist/;
        try_files $uri $uri/ /stg/index.html;
        add_header Cache-Control "no-store";
    }
```

### 3. 構文チェック

```bash
sudo nginx -t
```

**期待される結果:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4. 反映

```bash
sudo systemctl reload nginx
```

## 正しい設定（最終形）

`/stg/` location は1つだけ、`location /` より前に配置:

```nginx
    # --- STAGING PWA (https://tenmon-ark.com/stg/) ---
    location ^~ /stg/ {
        alias /var/www/tenmon-pwa-dist/;
        try_files $uri $uri/ /stg/index.html;
        add_header Cache-Control "no-store";
    }

    # ★ API プロキシ（location / より前に定義することが必須）
    location /api/ {
        ...
    }

    # ★ SPA 用 location（/api/ より後に定義）
    location / {
        ...
    }
```

## 確認コマンド

```bash
# 重複がないことを確認（1行だけ出るべき）
grep -c "location.*/stg/" /etc/nginx/sites-available/tenmon-ark.com

# 構文チェック
sudo nginx -t

# 設定を再読み込み
sudo systemctl reload nginx
```
