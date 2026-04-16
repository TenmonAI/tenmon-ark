# TENMON_AUTONOMY_TO_OPERABLE_6CARD_MASTER_CHAIN_CURSOR_AUTO_V1

## Objective

TENMON-ARKを **実際に自動運転へ入れる** までの 6 カードを順に実行し、前カード PASS 前に次へ進まない fail-fast チェーンとする。

## Master Policy

- fail-fast
- 前カード PASS（exit 0）前に次カードへ進まない
- single retry only（失敗時は retry カード名を 1 枚だけ master summary に記録）
- stale truth / fixture / queue 手編集の禁止は各カードに従う
- current-run evidence 必須（最終は `TENMON_OPERABLE_6CARD_MODE=1` で final operable が厳格化）

## Chain Order

1. `TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1`
2. `TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_AND_SAFE_RUN_CURSOR_AUTO_V1`
3. `TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1`
4. `TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1`（`tenmon_overnight_full_autonomy_resume_after_first_live_pass_v1.py`）
5. `TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_CURSOR_AUTO_V1`
6. `TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1`（6 カードモード）

## Primary Scripts

- `api/automation/tenmon_autonomy_to_operable_6card_master_chain_v1.py`
- `api/scripts/tenmon_autonomy_to_operable_6card_master_chain_v1.sh`

## Master Outputs

- `api/automation/tenmon_autonomy_to_operable_6card_master_chain_summary.json`
- `api/automation/tenmon_autonomy_to_operable_6card_master_chain_report.md`

## NEXT

- master PASS → `TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_PDCA_CURSOR_AUTO_V1`
