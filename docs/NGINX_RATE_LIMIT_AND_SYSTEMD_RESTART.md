# Nginx レート制限と systemd 自動再起動設定

## 実装完了 ✅

### 1. Nginx レート制限設定

#### `/etc/nginx/nginx.conf` の `http{}` ブロックに追加

`limit_req_zone` は `http{}` ブロックにのみ配置可能です。`/etc/nginx/nginx.conf` の `http{}` ブロック内に以下を追加してください：

```nginx
http {
    # ... 既存の設定 ...
    
    # API レート制限ゾーン（10r/s、10MBメモリ）
    limit_req_zone $binary_remote_addr zone=api_zone:10m rate=10r/s;
    
    # ... その他の設定 ...
    
    include /etc/nginx/sites-enabled/*;
}
```

#### `/etc/nginx/sites-enabled/tenmon-ark.com` の `/api/` location に追加

既に `location ^~ /api/` に `limit_req` を追加済み：

```nginx
location ^~ /api/ {
    # レート制限（Node再起動中の雪崩を防ぐ）
    limit_req zone=api_zone burst=30 nodelay;
    
    proxy_pass http://127.0.0.1:3000/api/;
    # ... その他の設定 ...
}
```

### 2. systemd 自動再起動設定

#### `/etc/systemd/system/tenmon-ark-api.service` に設定

既に `Restart=always` と `RestartSec=1` を設定済み：

```ini
[Service]
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=1
```

### 効果

#### Nginx レート制限
- ✅ `/api/` へのリクエストを10r/sに制限
- ✅ burst=30で一時的なトラフィック増加に対応
- ✅ Node再起動中の「connect failed」雪崩を防止
- ✅ サーバー負荷の軽減

#### systemd 自動再起動
- ✅ プロセスが落ちたら1秒後に自動再起動
- ✅ サービス可用性の向上
- ✅ 手動介入不要

### VPSで実行するコマンド列

```bash
# 1. /etc/nginx/nginx.conf の http{} ブロックに limit_req_zone を追加
sudo nano /etc/nginx/nginx.conf
# http {} ブロック内に以下を追加:
# limit_req_zone $binary_remote_addr zone=api_zone:10m rate=10r/s;

# 2. Nginx設定ファイルの構文チェック
sudo nginx -t

# 3. 構文チェックが成功したら、Nginxをリロード
sudo systemctl reload nginx

# 4. systemdサービスファイルを更新（既に更新済みの場合はスキップ）
sudo cp /opt/tenmon-ark-repo/infra/systemd/tenmon-ark-api.service /etc/systemd/system/tenmon-ark-api.service

# 5. systemd設定をリロード
sudo systemctl daemon-reload

# 6. サービスを再起動
sudo systemctl restart tenmon-ark-api

# 7. サービス状態を確認
sudo systemctl status tenmon-ark-api

# 8. 動作確認: レート制限が効いているか確認
# 10回/秒を超えるリクエストを送信すると503エラーが返る
for i in {1..20}; do
    curl -s -o /dev/null -w "%{http_code}\n" https://tenmon-ark.com/api/health
    sleep 0.1
done

# 9. ログを確認（レート制限が発動しているか）
sudo tail -f /var/log/nginx/access.log | grep " 503 "

# 10. systemd自動再起動をテスト（プロセスをkillして1秒後に再起動されるか確認）
sudo kill -9 $(pgrep -f "node dist/index.js")
sleep 2
sudo systemctl status tenmon-ark-api
```

### 設定の詳細

#### limit_req_zone パラメータ
- `$binary_remote_addr`: クライアントIPアドレスで制限
- `zone=api_zone:10m`: ゾーン名とメモリサイズ（10MB）
- `rate=10r/s`: 1秒あたり10リクエスト

#### limit_req パラメータ
- `zone=api_zone`: 使用するゾーン
- `burst=30`: 一時的なバーストを30リクエストまで許可
- `nodelay`: バースト時に即座に処理（待機しない）

#### systemd Restart パラメータ
- `Restart=always`: 常に再起動（正常終了時も含む）
- `RestartSec=1`: 再起動までの待機時間（1秒）

### トラブルシューティング

#### Nginx設定テストが失敗する場合

```bash
# エラーメッセージを確認
sudo nginx -t 2>&1 | grep -i error

# limit_req_zone が http{} ブロック内にあるか確認
sudo grep -A 5 "limit_req_zone" /etc/nginx/nginx.conf
```

#### レート制限が効かない場合

```bash
# limit_req が location /api/ に設定されているか確認
sudo nginx -T | grep -A 10 "location.*/api/"

# ログでレート制限の発動を確認
sudo tail -f /var/log/nginx/error.log | grep "limiting requests"
```

#### systemdが再起動しない場合

```bash
# サービス設定を確認
sudo systemctl cat tenmon-ark-api

# ログを確認
sudo journalctl -u tenmon-ark-api -n 50
```

### 関連ドキュメント

- `infra/nginx/tenmon-ark.com.conf`: Nginx設定ファイル
- `infra/systemd/tenmon-ark-api.service`: systemdサービスファイル
- `docs/NGINX_BOT_SCANNER_PROTECTION.md`: ボット/スキャナー対策
