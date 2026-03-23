# CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL

主線カード: trunk 分割主線完了後の **runtime acceptance ロック**（FINAL スコープ）。

運用・PASS 条件は `CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1.md` に準拠し、replay / execution_gate の `--target-card` / `--card` は本 FINAL 名を用いる。

## CHAT_TRUNK_FINAL_4CARD_CAMPAIGN_V1 後

- support_selfdiag / general conversational preempt / infra threadCore mirror の trunk 分離を反映済み。
- 検証コマンド例: `python3 api/automation/replay_audit_v1.py --repo-root . --card CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL --emit-report --check-json`
