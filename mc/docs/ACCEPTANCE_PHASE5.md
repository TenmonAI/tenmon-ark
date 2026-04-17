# TENMON-MC Phase 5 Acceptance Criteria

## 会話品質サンプラー

- [ ] `sample_dialogues.sh` が `/var/www/tenmon-mc/quality.db` を作成する
- [ ] `quality_samples` テーブルが正しいスキーマで存在する
- [ ] `legacy_messages` テーブルが存在しない場合、エラーなくスキップする
- [ ] 直近24時間のassistant応答から最大5件をランダムサンプリングする
- [ ] UNIXタイムスタンプ(ms)とISO文字列の両方の `created_at` 形式に対応する
- [ ] 水火言霊キーワード（水火/水と火/すいか）の検出が動作する
- [ ] いろは/色葉キーワードの検出が動作する
- [ ] 古典的表現（なり/たる/べし/けり/ごとし）の検出が動作する
- [ ] `grep -c` の `|| true` パターンで改行混じりが発生しない
- [ ] SQLインジェクション対策（シングルクォートエスケープ）が実装されている

## cron 設定

- [ ] `sample_dialogues.sh` が毎日深夜2時に実行される
- [ ] `/var/log/tenmon-mc-quality.log` にログが出力される

## INSTALL.sh

- [ ] Phase 5 タイトルに更新されている
- [ ] `collect.sh` の version が `MC-P5` に更新されている

## セキュリティ

- [ ] 本体 DB (`kokuzo.sqlite`) への書き込みが一切ない
- [ ] `quality.db` は `/var/www/tenmon-mc/` 内に独立して存在する
- [ ] `sql_ro` 関数（`-readonly` フラグ）を使用している

## テスト手順

```bash
# 手動実行
sudo /opt/tenmon-mc/bin/sample_dialogues.sh

# 結果確認
sqlite3 /var/www/tenmon-mc/quality.db "SELECT count(*) FROM quality_samples;"
sqlite3 /var/www/tenmon-mc/quality.db "SELECT sample_date, source_message_id, length, has_suika_word, has_iroha_word, has_kanji2_classical FROM quality_samples ORDER BY id DESC LIMIT 5;"
```
