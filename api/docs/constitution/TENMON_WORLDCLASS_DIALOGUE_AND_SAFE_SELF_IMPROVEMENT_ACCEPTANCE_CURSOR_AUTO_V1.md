# TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_CURSOR_AUTO_V1

## Objective

会話品質の詰め（dialogue quality finish）と安全自己改善 PDCA の両方が揃った状態を **最終 acceptance** として判定する。理論上の可否ではなく、**いま operable かつ自己改善可能か** の総合門。

## Precondition

- `TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1` の `pdca_cycle_pass == true`（`tenmon_safe_self_improvement_pdca_summary.json`）

開発時のみ `--skip-pdca-precondition` で前提を省略可能。

## Non-Negotiables

- stale truth / fixture / mixed-run を success にしない
- current-run evidence 必須（入力 summary にタイムスタンプ）
- dialogue と PDCA を **統合判定**（別々の PASS を足し合わせない）
- high-risk approval 未整備なら PASS にしない
- スコア上昇だけでは safety 崩壊を許容しない

## Acceptance Axes

### A — Dialogue quality

`tenmon_worldclass_dialogue_quality_finish_summary.json` 由来: `mandatory_pass` / `pass`、および `meta_leak_count`、`technical_misroute_count`、`k1_short_or_fragment_count`、`greeting_generic_drift_count`、`threadid_surface_consistent`。

### B — Closed loop autonomy

`tenmon_real_closed_loop_current_run_acceptance_summary.json` の `real_closed_loop_proven`、および `tenmon_autonomy_final_operable_acceptance_summary.json` または `tenmon_overnight_resume_summary.json` による `overnight_cycle_alive`。

### C — Safe self-improvement

`tenmon_safe_self_improvement_pdca_summary.json`: `pdca_cycle_pass`、`one_change_one_verify_enforced`、`ledger_append_ok`、`rejudge_after_each_cycle`、`high_risk_auto_patch_blocked`、`tenmon_high_risk_approval_contract_summary.json` の `approval_contract_pass`。

### D — Operability（overall の一部）

`tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`: health / audit / audit_build / env / product_failure / continuity。  
`tenmon_latest_truth_rebase_summary.json`: `stale_sources_count == 0`（contained）。

## Flags

- **dialogue_ready** — A 軸
- **autonomy_ready** — B 軸
- **safe_self_improvement_ready** — C 軸
- **operability_ready** — D 軸（サービス・連続性）
- **overall_worldclass_operable_ready** — operability + stale 封じ + HR 承認ゲート

## 必須 PASS

- `dialogue_ready`
- `autonomy_ready`
- `safe_self_improvement_ready`
- `overall_worldclass_operable_ready`
- 入力 `sources_current_run_evidence_ok`

## Primary

- `api/automation/tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_v1.py`
- `api/scripts/tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_v1.sh`

## Outputs

- `api/automation/tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_summary.json`
- `api/automation/tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_report.md`

## NEXT

- PASS → `TENMON_AUTONOMY_CONTINUOUS_OPERATION_MODE_CURSOR_AUTO_V1`
- FAIL → `TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_RETRY_CURSOR_AUTO_V1`
