# TENMON_OVERNIGHT_FULL_AUTONOMY_COMPLETION_LOOP_CURSOR_AUTO_V1

## Objective

Cursor 上で unattended に overnight loop を起動し、解析・修復・再検証・再裁定を fail-fast かつ current-run evidence 必須で繰り返す。
完成宣言そのものではなく、朝時点で最短収束へ進む安全な自動 PDCA を実運用状態にする。

## Non-Negotiables

- fail-fast
- 1 cycle = 1 change group + 1 verify
- stale truth を success 根拠に使わない
- queue/result の直書き禁止
- fixture 注入禁止
- hard gate green まで high-risk 改変禁止
- PASS 以外 seal/commit 禁止
- retry は 1 枚のみ

## Scope Policy

- safe_scope: `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**`
- medium_scope: `api/src/core/**`, `api/src/kokuzo/**`, `api/src/routes/chat_refactor/**`
- high_risk_scope: `api/src/routes/chat.ts`, `api/src/routes/chat_refactor/finalize.ts`, `web/src/**`

## Stop Policy

次のいずれかで停止する。

- consecutive_fail >= 3
- founder/runtime bind 不成立
- queue/result/ingest 契約崩壊
- stale truth が current-run で解消不能
- safe/medium で改善不能

## Outputs

- `api/automation/tenmon_overnight_autonomy_policy_v1.json`
- `api/automation/tenmon_overnight_autonomy_state_v1.json`
- `api/automation/tenmon_overnight_autonomy_queue_v1.json`
- `api/automation/tenmon_overnight_full_autonomy_summary.json`
- `api/automation/tenmon_overnight_full_autonomy_report.md`
- `api/automation/out/overnight_autonomy/<RUN_ID>/cycle_<N>_summary.json`
- `api/automation/out/overnight_autonomy/<RUN_ID>/cycle_<N>_report.md`

## Pass Condition For This Card

completed は必須ではない。以下を満たせば本カードは PASS:

- overnight loop started
- cycle_count >= 1
- safe_scope_enforced == true
- current_run_evidence_ok == true

