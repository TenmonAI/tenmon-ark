# Nginx ボット/スキャナー対策設定

## 実装完了 ✅

### 追加内容

`/etc/nginx/sites-enabled/tenmon-ark.com` の HTTPS サーバーブロック（443）に、以下のボット/スキャナー対策を追加しました。

### 追加された設定（28-38行目）

```nginx
# --- bot/scanner即死（upstreamに絶対流さない） ---
location ~* \.(env|git|svn|bak|old|swp)$ { return 444; }

location ~* ^/(?:\.env|vendor/|tests?/|testing/|demo/|cms/|crm/|admin/|backup/|blog/|panel/|public/|app/|apps/|workspace/|containers/json) {
    return 444;
}

location ~* phpunit/phpunit/src/Util/PHP/eval-stdin\.php$ { return 444; }

# ThinkPHPっぽいRCEパターンも落とす（雑に狙い撃ち）
location ~* ^/index\.php.*think\\app { return 444; }
```

### ブロックされるパターン

1. **ファイル拡張子ベース**
   - `.env`, `.git`, `.svn`, `.bak`, `.old`, `.swp` で終わるファイル

2. **パスベース**
   - `/.env`
   - `/vendor/`, `/test/`, `/tests/`, `/testing/`
   - `/demo/`, `/cms/`, `/crm/`, `/admin/`
   - `/backup/`, `/blog/`, `/panel/`
   - `/public/`, `/app/`, `/apps/`
   - `/workspace/`, `/containers/json`

3. **PHPUnit RCE パターン**
   - `phpunit/phpunit/src/Util/PHP/eval-stdin.php`

4. **ThinkPHP RCE パターン**
   - `/index.php` で始まり、`think\app` を含むパス

### 効果

- ✅ ボット/スキャナーの攻撃パスを upstream（Node.js）に流さない
- ✅ 444 で即座に切断（ログも軽くなる）
- ✅ Node.js サーバーの負荷軽減
- ✅ セキュリティリスクの低減

### VPSで実行するコマンド列

```bash
# 1. Nginx設定ファイルの構文チェック
sudo nginx -t

# 2. 構文チェックが成功したら、Nginxをリロード
sudo systemctl reload nginx

# 3. Nginxの状態を確認
sudo systemctl status nginx

# 4. 動作確認: ブロックされるパスをテスト（444が返ることを確認）
curl -v https://tenmon-ark.com/.env
curl -v https://tenmon-ark.com/vendor/
curl -v https://tenmon-ark.com/admin/
curl -v https://tenmon-ark.com/test.php

# 5. 正常なパスが動作することを確認
curl -v https://tenmon-ark.com/
curl -v https://tenmon-ark.com/api/health
curl -v https://tenmon-ark.com/stg/

# 6. ログを確認（444で切断されたリクエストが記録されているか）
sudo tail -f /var/log/nginx/access.log | grep " 444 "
```

### 注意事項

- `return 444;` は接続を即座に切断するため、クライアントには何も返さない
- ログには `444` ステータスコードとして記録される
- 正規表現の優先順位により、`/_expo/` などの正常なパスは影響を受けない

### トラブルシューティング

#### Nginx設定テストが失敗する場合

```bash
# エラーメッセージを確認
sudo nginx -t 2>&1 | grep -i error

# 設定ファイルの該当箇所を確認
sudo grep -n "bot/scanner" /etc/nginx/sites-enabled/tenmon-ark.com
```

#### 正常なパスがブロックされる場合

```bash
# 正規表現を確認
sudo nginx -T | grep -A 5 "bot/scanner"

# 必要に応じて、除外パスを追加
# 例: /api/ は既に location /api/ で処理されるため、ブロックされない
```

### 関連ドキュメント

- `infra/nginx/tenmon-ark.com.conf`: Nginx設定ファイル
- `infra/SETUP_SYSTEMD_NGINX.md`: Nginx設定の詳細
