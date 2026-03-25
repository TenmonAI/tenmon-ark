# TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1

## 目的

product failure 検出時に、直接パッチ適用せず「最小差分プラン」へ分解する。  
1プラン=1変更群として、原因候補・対象・検証・巻き戻しを先に固定し、unsafe 改変を遮断する。

## NON-NEGOTIABLES

- 1 planner output = 1 change group
- multi-file 大改修禁止
- cause 未断定 patch 禁止
- acceptance probe なし禁止
- rollback point なし禁止
- planner は提案のみ。直接 apply しない

## 入力

- `tenmon_latest_state_rejudge_summary.json` の `remaining_blockers`
- `tenmon_system_verdict.json`（補助）

## 出力

- `api/automation/product_patch_plan_queue.json`
- `api/automation/tenmon_product_patch_planner_min_diff_summary.json`
- `api/automation/tenmon_product_patch_planner_min_diff_report.md`

## 実行

```bash
api/scripts/product_patch_planner_min_diff_v1.sh --stdout-json
```

## PASS 条件

- blocker から patch plan が生成される
- 各 plan が `target_files / minimal_diff_unit / acceptance_probe / rollback_point` を保持
- unsafe patch を直接 apply せず planner queue に送る
- `patch_planner_pass=true`

## NEXT

- PASS: `TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1`
- FAIL: `TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_RETRY_CURSOR_AUTO_V1`

