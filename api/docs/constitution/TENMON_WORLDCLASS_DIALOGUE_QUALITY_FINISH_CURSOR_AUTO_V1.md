# TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1

## Objective

会話品質を worldclass claim 直前まで詰める。対象は既知の残差（K1 短文、軽微な重複、greeting drift、kanagi 固定文脈、sessionId 表面、PWA/API 差）に限定する。

## Precondition

- `TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1` が `pass` または `operable_autonomy_ready`（`tenmon_autonomy_final_operable_acceptance_summary.json`）

開発時のみ `--skip-operable-precondition` で集計のみ可能。

## Non-Negotiables

- 1 変更 = 1 検証
- 最小 diff
- stale truth を success 根拠にしない
- current-run probe 必須（scripture naturalizer / stopbleed 等の generated 成果物）
- high-risk は approval contract 下のみ
- routeReason を品質目的で壊さない

## Primary

- `api/automation/tenmon_worldclass_dialogue_quality_finish_v1.py`
- `api/scripts/tenmon_worldclass_dialogue_quality_finish_v1.sh`

## Outputs

- `api/automation/tenmon_worldclass_dialogue_quality_finish_summary.json`
- `api/automation/tenmon_worldclass_dialogue_quality_finish_report.md`

## Mandatory PASS（集計）

- `meta_leak_count == 0`（`tenmon_chat_surface_stopbleed_summary.json` 優先）
- `scripture_raw_count <= 1`（`tenmon_scripture_naturalizer_summary.json`）
- `technical_misroute_count == 0`
- `k1_short_or_fragment_count == 0`（K1 かつ `natural_length` &lt; 100）
- `greeting_generic_drift_count == 0`（ヒューリスティック）
- `threadid_surface_consistent == true`（scorecard `must_fix` に sessionId 本線参照が無いこと）

## NEXT

- PASS → `TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1`
- FAIL → `TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_RETRY_CURSOR_AUTO_V1`
