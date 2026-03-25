# TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1

## Objective

自己改善を **安全ゲート付き PDCA** として回す。自動での危険改変ではなく、観測 → ランキング → **1 サイクル 1 検証** → rejudge → ledger であること。

## Precondition

- `TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1` が `pass` / `mandatory_pass`（`tenmon_worldclass_dialogue_quality_finish_summary.json`）

開発時のみ `--skip-dialogue-precondition` で前提を省略可能。

## Non-Negotiables

- 1 cycle = 1 change group + 1 verify
- high-risk への無承認自動変更禁止
- stale truth / fixture / mixed-run を success にしない
- PASS 以外 seal / commit 禁止
- 失敗時は rollback または stop（ledger に記録）
- ledger に current-run 根拠を残す

## Primary Artifacts

- `api/automation/tenmon_safe_self_improvement_pdca_loop_v1.py`
- `api/scripts/tenmon_safe_self_improvement_pdca_loop_v1.sh`
- `api/automation/safe_self_improvement_policy_v1.json`
- `api/automation/safe_self_improvement_state_v1.json`
- `api/automation/safe_self_improvement_ledger_v1.jsonl`

## Cycle（実装）

1. 読み取り: system verdict / scorecard / dialogue quality / stale truth / next_cards / retry_queue / remote（キューは観測のみ）
2. 候補をランキング（policy の `acceptance_priority`）
3. **先頭 1 件のみ**を当該サイクルの対象とする
4. 検証: `tenmon_latest_state_rejudge_and_seal_refresh_v1.sh` を実行（`--dry-run` ではスキップ）
5. ledger に 1 行 append、state 更新

## Outputs

- `api/automation/tenmon_safe_self_improvement_pdca_summary.json`
- `api/automation/tenmon_safe_self_improvement_pdca_report.md`

## Mandatory PASS（summary）

- `pdca_cycle_pass`
- `one_change_one_verify_enforced`
- `safe_scope_enforced`
- `high_risk_auto_patch_blocked`
- `ledger_append_ok`
- `rejudge_after_each_cycle`

## NEXT

- PASS → `TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_CURSOR_AUTO_V1`
- FAIL → `TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_RETRY_CURSOR_AUTO_V1`
