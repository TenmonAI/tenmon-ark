# TENMON-MC Phase 1 MVP — 完了条件チェックリスト

INSTALL.sh 実行後、以下の全項目を確認してください。

## Acceptance Criteria

- [ ] `sudo /opt/tenmon-mc/bin/collect.sh` が20秒以内に成功終了する
- [ ] `/var/www/tenmon-mc/data/snapshot.json` が生成され、有効なJSONである
- [ ] `/var/www/tenmon-mc/data/report.txt` にテキストレポートが出力されている
- [ ] `jq '.sections.sukuyou.golden_sample_result' /var/www/tenmon-mc/data/snapshot.json` が `"斗"` を返す
- [ ] `https://tenmon-ark.com/mc/` にアクセスすると Basic Auth が表示される
- [ ] 認証後、テキストレポートが表示される
- [ ] 5分後に自動で内容が更新されている（`generated_at_jst` が新しくなっている）
- [ ] cron ログ `/var/log/tenmon-mc.log` にエラーが出ていない
- [ ] 天聞アーク本体 (`tenmon-ark-api`) のCPU/メモリ使用量に有意な変化がない

## 追加確認項目

- [ ] `docs/ACCEPTANCE.md` にチェックリスト形式で記載されている（本ファイル）
- [ ] `docs/TROUBLESHOOTING.md` にエラー時の対応が記載されている
- [ ] ブランチ `feature/mc-phase1` が `github.com/TenmonAI/tenmon-ark` にpushされている

## 検証コマンド

```bash
# 1. 手動実行テスト
time sudo /opt/tenmon-mc/bin/collect.sh

# 2. JSON 妥当性
jq empty /var/www/tenmon-mc/data/snapshot.json && echo "VALID JSON"

# 3. レポート確認
cat /var/www/tenmon-mc/data/report.txt

# 4. ゴールデンサンプル
jq '.sections.sukuyou.golden_sample_result' /var/www/tenmon-mc/data/snapshot.json

# 5. ブラウザアクセス
curl -u tenmon:PASSWORD https://tenmon-ark.com/mc/

# 6. 5分後の更新確認
sleep 310 && jq '.generated_at_jst' /var/www/tenmon-mc/data/snapshot.json

# 7. cron ログ確認
tail -20 /var/log/tenmon-mc.log

# 8. 本体への影響確認
systemctl status tenmon-ark-api
```
