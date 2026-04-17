# TENMON-MC Phase 1 — トラブルシューティング

## 1. collect.sh が失敗する

### 症状
```
/opt/tenmon-mc/bin/collect.sh: line X: command not found
```

### 対処
```bash
# 必要パッケージの確認
which jq sqlite3 bc htpasswd

# 不足パッケージのインストール
sudo apt-get install -y jq sqlite3 bc apache2-utils
```

### 症状: Permission denied
```bash
# 実行権限の確認
ls -la /opt/tenmon-mc/bin/
# 修正
sudo chmod +x /opt/tenmon-mc/bin/*.sh
```

## 2. snapshot.json が無効なJSON

### 原因
収集スクリプトの一つがJSON以外の出力を返している。

### 診断
```bash
# 各スクリプトを個別に実行して出力を確認
sudo /opt/tenmon-mc/bin/collect_infra.sh | jq .
sudo /opt/tenmon-mc/bin/collect_sukuyou.sh | jq .
sudo /opt/tenmon-mc/bin/collect_kotodama.sh | jq .
sudo /opt/tenmon-mc/bin/collect_founder.sh | jq .
sudo /opt/tenmon-mc/bin/collect_learning.sh | jq .
sudo /opt/tenmon-mc/bin/collect_data_integrity.sh | jq .
```

### 対処
エラーを出しているスクリプトを特定し、出力を確認する。
よくある原因は `DB_PATH` の誤りや `REPO_PATH` の不一致。

```bash
# 設定確認
cat /opt/tenmon-mc/config/mc.env
```

## 3. ゴールデンサンプルが失敗する

### 症状
`golden_sample_pass: false` または `golden_sample_result: "ERROR"`

### 診断
```bash
# API の dist ディレクトリが存在するか
ls /opt/tenmon-ark-repo/api/dist/sukuyou/sukuyouEngine.js

# Node.js で直接テスト
cd /opt/tenmon-ark-repo/api
node -e "
const { calculateHonmeiShuku } = require('./dist/sukuyou/sukuyouEngine.js');
console.log(calculateHonmeiShuku(new Date('1990-09-26T00:00:00+09:00')));
"
```

### 対処
```bash
# API をリビルド
cd /opt/tenmon-ark-repo/api
npm run build
```

## 4. nginx で 502 Bad Gateway / 403 Forbidden

### 診断
```bash
# nginx エラーログ
sudo tail -20 /var/log/nginx/error.log

# nginx 設定テスト
sudo nginx -t

# ファイル権限確認
ls -la /var/www/tenmon-mc/
ls -la /var/www/tenmon-mc/.htpasswd
```

### 対処: 権限問題
```bash
sudo chown -R www-data:www-data /var/www/tenmon-mc/
sudo chown root:www-data /var/www/tenmon-mc/.htpasswd
sudo chmod 640 /var/www/tenmon-mc/.htpasswd
```

### 対処: 設定問題
```bash
# MC ブロックが正しく挿入されているか確認
grep -A 20 "TENMON-MC" /etc/nginx/sites-enabled/tenmon-ark*

# nginx 設定を復元
sudo cp /etc/nginx/sites-enabled/tenmon-ark.com.bak_mc_* /etc/nginx/sites-enabled/tenmon-ark.com
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Basic Auth が表示されない

### 原因
`.htpasswd` ファイルが存在しないか、nginx 設定が正しくない。

### 対処
```bash
# .htpasswd の存在確認
ls -la /var/www/tenmon-mc/.htpasswd

# 再作成
sudo htpasswd -c /var/www/tenmon-mc/.htpasswd tenmon
sudo chown root:www-data /var/www/tenmon-mc/.htpasswd
sudo chmod 640 /var/www/tenmon-mc/.htpasswd
sudo systemctl reload nginx
```

## 6. cron が動かない

### 診断
```bash
# cron ファイルの確認
cat /etc/cron.d/tenmon-mc

# cron ログ
grep tenmon-mc /var/log/syslog | tail -10

# 手動テスト
sudo /opt/tenmon-mc/bin/collect.sh
echo $?
```

### 対処
```bash
# cron ファイルの改行コード確認（LF必須）
file /etc/cron.d/tenmon-mc

# 権限確認（644, root:root 必須）
ls -la /etc/cron.d/tenmon-mc
sudo chmod 644 /etc/cron.d/tenmon-mc
sudo chown root:root /etc/cron.d/tenmon-mc

# cron 再読み込み
sudo systemctl reload cron
```

## 7. SQLite エラー

### 症状
`collect_founder.sh` や `collect_learning.sh` が `"error": "db not found"` を返す。

### 対処
```bash
# DB ファイルの存在確認
ls -la /opt/tenmon-ark-data/kokuzo.sqlite

# mc.env の DB_PATH を確認
grep DB_PATH /opt/tenmon-mc/config/mc.env

# 読み取り権限確認
sudo -u www-data sqlite3 -readonly /opt/tenmon-ark-data/kokuzo.sqlite "SELECT COUNT(*) FROM auth_users;"
```

## 8. INSTALL.sh を再実行したい

INSTALL.sh は冪等設計です。何度実行しても安全です。

```bash
cd /path/to/tenmon-ark/mc
sudo bash INSTALL.sh
```

既存の `.htpasswd` と `mc.env` は上書き確認が入ります。
nginx 設定は既に TENMON-MC ブロックが存在する場合はスキップされます。

## 9. 完全アンインストール

```bash
# cron 削除
sudo rm /etc/cron.d/tenmon-mc

# nginx 設定から MC ブロックを削除
sudo vim /etc/nginx/sites-enabled/tenmon-ark.com
# "--- BEGIN TENMON-MC ---" から "--- END TENMON-MC ---" を削除
sudo nginx -t && sudo systemctl reload nginx

# ファイル削除
sudo rm -rf /opt/tenmon-mc
sudo rm -rf /var/www/tenmon-mc
sudo rm -f /var/log/tenmon-mc.log
```
