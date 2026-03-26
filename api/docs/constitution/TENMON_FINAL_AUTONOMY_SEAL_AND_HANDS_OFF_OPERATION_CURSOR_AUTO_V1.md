# TENMON_FINAL_AUTONOMY_SEAL_AND_HANDS_OFF_OPERATION_CURSOR_AUTO_V1

## 目的

TENMON-ARK 自律 OS を **hands-off 運用可能**と見なせるかを、既存サマリの証跡だけで判定し、`final_autonomy_seal_summary.json` と `hands_off_operation_runbook.md` に集約する。成功の捏造はしない。

## 実行

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
python3 api/automation/final_autonomy_seal_and_hands_off_operation_v1.py
```

## 入力（既定パス）

| 種別 | ファイル |
|------|-----------|
| autonomy | `tenmon_continuous_self_improvement_os_summary.json`、overnight daemon summary |
| scorecard | `tenmon_worldclass_acceptance_scorecard.json` |
| final ascent | `tenmon_pwa_dialogue_final_ascent_summary.json` |
| stall recovery | `autonomy_stall_recovery_summary.json` |
| morning chain | `morning_approval_execution_chain_summary.json` |
| self-commit | `out/acceptance_commit_requeue/acceptance_commit_requeue_summary.json`、`out/true_self_commit/true_self_commit_summary.json` |
| 補助 | `tenmon_autonomy_current_state_forensic.json`、`tenmon_final_autonomy_last_mile_parent_summary.json`、`tenmon_browser_ai_operator_runtime_summary.json`、`cursor_patch_plan.json` または `out/**/browser_ai_patchplan_mainline_summary.json`、最新 `out/**/build_probe_rollback_result.json` |

## ゲート（すべて true で `hands_off_ready`）

1. watch loop real execution（forensic `watch_loop_stable`、Darwin は last mile watch one-shot 等）
2. browser consult（runtime pass、または非 Mac で patch plan bridge が成立する場合の限定代替）
3. patch plan bridge（`cursor_patch_plan.ok` または mainline patchplan summary）
4. build / probe / rollback（最新 build_probe `overall_pass`）
5. acceptance gated commit（self-commit summaries）
6. morning approval execution chain（失敗なし・順序 OK・pending なし・鎖上カードすべて executed）
7. PWA dialogue ascent（`dialogue_final_ascent_ready`）
8. stall recovery（`stall_detected` false、stop ファイルによる skip でない）

## 出力

- `api/automation/final_autonomy_seal_summary.json`
- `api/automation/hands_off_operation_runbook.md`

## next

- **nextOnPass**: `TENMON_FINAL_AUTONOMY_LAST_MILE_PARENT_CURSOR_AUTO_V1` 完了
- **nextOnFail**: 停止。seal retry 1 枚のみ生成。
