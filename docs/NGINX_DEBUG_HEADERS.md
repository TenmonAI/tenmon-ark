# Nginx デバッグヘッダー診断手順

## 問題

`/stg/` が正しく動作せず、旧Vite/SPAの `index.html` (463 bytes)を返している。

## 診断方法

HTTPヘッダーで、どのserverブロックとlocationが使われているかを確認。

## 設定

### 1. 443 serverブロックにデバッグヘッダーを追加

`/etc/nginx/sites-enabled/tenmon-ark` の最初の `server { ... listen 443 ssl; ... }` の中に：

```nginx
add_header X-TENMON-SERVER "main-443" always;
```

### 2. `/stg/` locationにデバッグヘッダーを追加

`/stg/` の locationブロック内に：

```nginx
add_header X-TENMON-STG "HIT" always;
```

## 確認コマンド

```bash
# 設定を反映
sudo nginx -t && sudo systemctl reload nginx

# /stg/ へのリクエストでヘッダーを確認
curl -I https://tenmon-ark.com/stg/

# 期待されるヘッダー:
# X-TENMON-SERVER: main-443
# X-TENMON-STG: HIT
```

## 診断結果の解釈

### ケース1: 両方のヘッダーが返る

```
X-TENMON-SERVER: main-443
X-TENMON-STG: HIT
```

→ 正しい443 serverブロックと `/stg/` locationが使われている。
問題は別の原因（aliasパス、ファイル権限など）。

### ケース2: `X-TENMON-SERVER` だけ返る

```
X-TENMON-SERVER: main-443
（X-TENMON-STG がない）
```

→ 443 serverブロックは使われているが、`/stg/` locationがマッチしていない。
- `location ^~ /stg/` の前に別のlocationがマッチしている可能性
- 設定の順序を確認

### ケース3: どちらも返らない

→ 別のserverブロックが使われている可能性。
- Certbotの設定が混ざっている
- 別のserverブロックが優先されている

## 次のステップ

診断結果に応じて：

1. **両方のヘッダーが返る場合**:
   - `/var/www/tenmon-pwa-dist/` の内容を確認
   - ファイル権限を確認
   - `index.html` が正しく配置されているか確認

2. **`X-TENMON-STG` が返らない場合**:
   - locationブロックの順序を確認
   - `^~` の優先度が正しく機能しているか確認
   - 他のlocationブロックが先にマッチしていないか確認

3. **どちらも返らない場合**:
   - すべてのserverブロックを確認
   - Certbotの設定を確認
   - `nginx -T` で全体の設定を確認
