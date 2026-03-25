# TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1

## 目的

分裂している acceptance ソース（build/gate/lived/conversation/scripture）を単一 verdict に統合し、  
autonomy が参照する acceptance truth を一意化する。

## NON-NEGOTIABLES

- single source of acceptance truth
- stale artifact は acceptance source から除外
- current-run evidence 優先
- acceptance pass なし seal 禁止

## 統合対象

- build acceptance: hygiene build
- gate acceptance: hygiene gates
- lived acceptance: health/audit/audit.build
- conversation acceptance: chat stopbleed
- scripture acceptance: scripture naturalizer

## 実行

```bash
api/scripts/acceptance_orchestration_single_source_v1.sh --stdout-json
```

## 出力

- `api/automation/acceptance_orchestration_summary.json`

## PASS 条件

- singleton verdict が生成される
- 5 acceptance dimension を1つに統合
- stale truth exclusion が verdict に反映
- autonomy/scope/planner が同一ファイルを参照可能
- `acceptance_singleton_pass=true`

## NEXT

- PASS: `TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1`
- FAIL: `TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_RETRY_CURSOR_AUTO_V1`

