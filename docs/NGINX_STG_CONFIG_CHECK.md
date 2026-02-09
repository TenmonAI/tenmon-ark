# Nginx /stg/ 設定チェックリスト

## 重複チェック

`/stg/` の location ブロックが1つだけであることを確認：

```bash
# 設定ファイル内の /stg/ location を検索
grep -n "location.*/stg/" /etc/nginx/sites-available/tenmon-ark.com

# 期待される結果: 1行だけ
# 26:    location ^~ /stg/ {
```

## Include チェック

include で読み込まれている場合、snippet 側も確認：

```bash
# include ディレクティブを検索
grep -n "include" /etc/nginx/sites-available/tenmon-ark.com

# もし include があれば、そのファイルも確認
grep -n "location.*/stg/" /etc/nginx/snippets/*.conf 2>/dev/null
```

## 正しい設定（これ1つだけ）

```nginx
# --- STAGING PWA (https://tenmon-ark.com/stg/) ---
location ^~ /stg/ {
    alias /var/www/tenmon-pwa-dist/;
    try_files $uri $uri/ /stg/index.html;
    add_header Cache-Control "no-store";
}
```

## 配置順序

1. `/stg/` location（最優先）
2. `/api/` location（API プロキシ）
3. `/` location（既存SPA）

## 検証コマンド

```bash
# 構文チェック
sudo nginx -t

# 設定を再読み込み
sudo systemctl reload nginx

# /stg/ へのアクセステスト
curl -I https://tenmon-ark.com/stg/

# 期待されるレスポンス:
# HTTP/1.1 200 OK
# Cache-Control: no-store
```

## トラブルシューティング

### 重複がある場合

1. 2つ目の `location ^~ /stg/` を削除
2. include で読み込まれている場合は、snippet 側の `/stg/` 設定を削除

### Include で読み込まれている場合

```bash
# snippet ファイルを確認
cat /etc/nginx/snippets/*.conf | grep -A 5 "location.*/stg/"

# もし snippet 側に /stg/ があれば削除
# または include ディレクティブを削除
```
