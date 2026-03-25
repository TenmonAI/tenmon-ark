# TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1

## Objective

first live bootstrap と real current-run closed loop acceptance の PASS 後に、overnight autonomy loop を **再開可能な実運用状態** へ昇格させる。completed 宣言は目的に含めない。

実証するもの:

- overnight state が current-run で更新される
- cycle が 1 回以上進む
- safe scope が守られる
- current-run evidence が残る
- stop しても reason が残る
- resume 可能な state が保存される

## Preconditions (Phase A)

以下が揃うまで resume は **FAIL-fast**（`tenmon_overnight_full_autonomy_summary.json` に理由を書いて exit 非 0）。

- `tenmon_autonomy_first_live_summary.json` が存在し、`current_run_evidence_ok`、`bootstrap_validation_pass`、`first_live_cycle_pass` が真
- `tenmon_real_closed_loop_current_run_acceptance_summary.json` が存在し、`real_closed_loop_proven` が真
- `tenmon_execution_gate_hardstop_verdict.json` で `must_block` がアクティブでない
- `tenmon_latest_truth_rebase_summary.json` で `stale_sources_count == 0`
- `tenmon_latest_state_rejudge_summary.json` の `remaining_blockers` に stale 系が含まれない
- `dangerous_patch_blocker_report.json` で `blocked` が真でない
- `tenmon_stale_evidence_invalidation_verdict.json` に `fatal` が真でない（フィールドがある場合のみ）

参照（読み取り専用の文脈確認）:

- `tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`
- `tenmon_stale_evidence_invalidation_verdict.json`

## Invocation

- CLI: `python3 api/automation/tenmon_overnight_full_autonomy_completion_loop_v1.py --resume-after-first-live`
- または環境変数: `TENMON_OVERNIGHT_RESUME_AFTER_FIRST_LIVE=1`（`true` / `yes` 可）
- シェル: `api/scripts/tenmon_overnight_full_autonomy_completion_loop_v1.sh` に上記と同じ引数をそのまま渡す

キューを resume 用シードに差し替える場合: `TENMON_OVERNIGHT_RESET_QUEUE=1`

## Non-Negotiables

- fail-fast
- current-run evidence 必須
- stale truth を success 根拠に使わない
- safe scope 優先
- high-risk product core 自動改変禁止
- 1 cycle = 1 choose + 1 verify
- overlap 禁止
- lock 必須
- state persist 必須
- stop reason 必須
- queue empty を PASS 扱いにしない
- retry は 1 系統のみ

## Scope Policy

- **safe_scope**: `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**`
- **medium_scope**: 原則禁止（report / acceptance 上の明示 green 後のみ検討）
- **high_risk_scope**: `api/src/routes/chat.ts`, `api/src/routes/chat_refactor/finalize.ts`, `web/src/**` — 本カードでは禁止

## State & Outputs

- Policy: `api/automation/tenmon_overnight_autonomy_policy_v1.json`（`resume_master_card` / `resume_cli_flag` を参照）
- State: `api/automation/tenmon_overnight_autonomy_state_v1.json`（`run_id`, `started_at`, `last_updated` / `updated_at`, `cycle_count`, `stop_reason`, `resume_possible`, など）
- Summary / report: `api/automation/tenmon_overnight_full_autonomy_summary.json`, `api/automation/tenmon_overnight_full_autonomy_report.md`
- Per cycle: `api/automation/out/overnight_autonomy/<RUN_ID>/cycle_<N>_summary.json`, `cycle_<N>_report.md`

## Mandatory PASS (acceptance)

- precondition gate が通る
- overnight state が current-run で更新される
- `last_updated` が入る
- `cycle_count >= 1`
- `safe_scope_enforced == true`
- `current_run_evidence_ok == true`
- `resume_possible == true`
- summary / report が current-run で生成される

## Strong PASS

- `cycle_count >= 2`
- `dispatch_pass` / `delivery_observed` / `result_returned` / `ingest_pass` / `rejudge_pass`（RCL summary 由来のフラグが真）
