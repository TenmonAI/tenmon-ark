# TENMON-ARK 自動復旧スクリプト

## 📋 概要

このスクリプトは、TENMON-ARK API の systemd サービスと nginx 設定を自動で構築・復旧します。

## 🚀 使用方法

### 本番サーバー（Ubuntu 22.04）で実行

```bash
# スクリプトをサーバーにコピー
scp infra/auto-recovery.sh user@server:/tmp/

# サーバーに SSH 接続
ssh user@server

# sudo で実行（root 権限が必要）
sudo bash /tmp/auto-recovery.sh
```

または、直接サーバー上で：

```bash
# スクリプトをダウンロード
curl -O https://raw.githubusercontent.com/.../infra/auto-recovery.sh

# 実行権限を付与
chmod +x auto-recovery.sh

# sudo で実行
sudo ./auto-recovery.sh
```

## ⚠️ 注意事項

1. **root 権限が必要**: このスクリプトは `sudo` で実行する必要があります
2. **既存設定のバックアップ**: nginx 設定は自動でバックアップされます
3. **サービス再起動**: systemd サービスは自動で再起動されます
4. **nginx リロード**: nginx は `reload` で再読み込みされます（ダウンタイムなし）

## 📝 スクリプトの動作内容

### 1. systemd サービス定義

- `/etc/systemd/system/tenmon-ark-api.service` を生成
- サービス定義を書き込み

### 2. systemd 反映

- `systemctl daemon-reload` - systemd をリロード
- `systemctl enable tenmon-ark-api` - 自動起動を有効化
- `systemctl restart tenmon-ark-api` - サービスを再起動
- `systemctl status tenmon-ark-api` - ステータスを表示

### 3. nginx バックアップ

- 既存の設定を `tenmon-ark.com.bak-YYYY-MM-DD_HHMMSS` としてバックアップ

### 4. nginx 設定

- `/etc/nginx/sites-available/tenmon-ark.com` を生成
- `location /api/` を `location /` より前に定義
- シンボリックリンクを作成

### 5. nginx 反映

- `nginx -t` - 構文チェック
- `systemctl reload nginx` - 設定を再読み込み

### 6. 検証

以下の 3 つのエンドポイントをテスト：

1. `curl -i http://127.0.0.1:3000/api/health` - Node 直接アクセス
2. `curl -i http://127.0.0.1/api/health` - nginx 経由（ローカル）
3. `curl -i http://tenmon-ark.com/api/health` - nginx 経由（本番ドメイン）

## ✅ 成功条件

すべての curl コマンドで以下を満たすこと:

- HTTP ステータスコードが 200 系
- `Content-Type: application/json` が含まれる
- レスポンスが JSON 形式
- `<!doctype html>` が含まれない
- CSS (`<style>`, `.class { ... }`) が含まれない
- HTML タグ (`<html>`, `<head>`, `<body>`) が含まれない

## 🔧 トラブルシューティング

### systemd サービスが起動しない

```bash
# ログを確認
sudo journalctl -u tenmon-ark-api -n 50

# 手動で起動してエラーを確認
cd /opt/tenmon-ark/api
sudo -u www-data node dist/index.js
```

### nginx 構文エラー

```bash
# エラーメッセージを確認
sudo nginx -t

# バックアップから復元
sudo cp /etc/nginx/sites-available/tenmon-ark.com.bak-* \
  /etc/nginx/sites-available/tenmon-ark.com
sudo systemctl reload nginx
```

### /api/health が HTML を返す

```bash
# nginx 設定を確認
sudo cat /etc/nginx/sites-available/tenmon-ark.com | grep -A 10 "location /api/"

# location /api/ が location / より前にあるか確認
```

## 📊 実行例

```bash
$ sudo ./auto-recovery.sh

=== TENMON-ARK AUTO RECOVERY START ===
=== systemd status ===
● tenmon-ark-api.service - TENMON-ARK API Server
     Loaded: loaded (/etc/systemd/system/tenmon-ark-api.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
   Main PID: 12345 (node)
      Tasks: 1 (limit: 4915)
     Memory: 45.2M
        CPU: 123ms

nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful

=== HEALTH CHECKS ===
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{"status":"ok","service":"tenmon-ark-api",...}

HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: application/json; charset=utf-8
{"status":"ok","service":"tenmon-ark-api",...}

HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: application/json; charset=utf-8
{"status":"ok","service":"tenmon-ark-api",...}

=== TENMON-ARK AUTO RECOVERY COMPLETE ===
```

## 🔒 セキュリティ

- このスクリプトは root 権限で実行されます
- 本番環境で実行する前に、必ず内容を確認してください
- バックアップは自動で作成されますが、重要な設定は事前に手動でバックアップすることを推奨します

---

**作成日時**: 2025-12-16  
**バージョン**: 1.0.0  
**ステータス**: ✅ 本番環境で使用可能

