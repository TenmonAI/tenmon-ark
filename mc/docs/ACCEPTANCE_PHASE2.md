# TENMON-MC Phase 2 — Acceptance Criteria

## 新規スクリプト (§7-12)

- [ ] `collect_llm_routing.sh` — synapse_log から24hルート分布を収集
- [ ] `collect_dialogue_quality.sh` — legacy_messages / ark_thread_seeds から対話品質指標を収集
- [ ] `collect_notion_sync.sh` — kokuzo_pages / reflection_queue_v1 からNotion同期状況を収集
- [ ] `collect_persona.sh` — persona_profiles / memory_units / thread_persona_links / persona_deployments から収集
- [ ] `collect_sacred_corpus.sh` — sacred_corpus_registry / sacred_segments / philology_units / truth_axes_bindings / comparative_sacred_links から収集
- [ ] `collect_feedback.sh` — feedback ディレクトリからファイルベースで収集

## 防御的テーブル確認

- [ ] 全6スクリプトで `sql_ro "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='...';"` パターンを使用
- [ ] テーブル不在時は 0 / null を返し、スクリプトは exit 0 で正常終了

## スキーマ差分検出

- [ ] `collect_data_integrity.sh` に24テーブルの期待テーブルリストを追加
- [ ] `expected_tables_missing` フィールドに欠損テーブル名を出力
- [ ] `expected_tables_total` / `expected_tables_found` で数値サマリー

## collect.sh 更新

- [ ] 12セクション全てを収集
- [ ] `version: "MC-P2"` に更新
- [ ] snapshot.json が `jq empty` を通過

## assemble_report.sh 更新

- [ ] §7-12 のテキスト表示を追加
- [ ] ALERTS セクションに Phase 2 追加アラート（テーブル欠損、Notion pending、フィードバック急増）

## INSTALL.sh 更新

- [ ] Phase 2 タイトルに更新
- [ ] 新規スクリプトが `/opt/tenmon-mc/bin/` に配置される

## VPS 検証

- [ ] `sudo bash INSTALL.sh` が正常完了
- [ ] `jq empty /var/www/tenmon-mc/data/snapshot.json` が成功
- [ ] `cat /var/www/tenmon-mc/data/report.txt` に §7-12 が表示
- [ ] `https://tenmon-ark.com/mc/` で12セクションのレポートが閲覧可能
