# TENMON_SELF_REPAIR_OS_CURSOR_AUTO_V1

## 目的

acceptance FAIL 後の振る舞いを **決定論的** にし、**最小 diff・1 変更=1 検証**で再試行できる自己修復 OS（自動ロールバックは既定禁止）。

## モジュール

| モジュール | 出力 / 役割 |
|------------|-------------|
| `fail_classifier_v1.py` | `fail_classification.json` |
| `rollback_trigger_v1.py` | `rollback_trigger_report.json`（実行候補 + 条件） |
| `alternate_strategy_generator_v1.py` | `alternate_strategy.json`（代替 + rollback 要約） |
| `retry_queue_orchestrator_v1.py` | `retry_queue.json` |
| `patch_diff_minimizer_v1.py` | `patch_diff_minimizer_report.json` |
| `dangerous_patch_blocker_v1.py` | `dangerous_patch_blocker_report.json` |
| `anti_regression_memory_v1.py` | `anti_regression_memory.json`（追記） |
| `self_repair_seal_v1.py` | `self_repair_seal.json` + `TENMON_SELF_REPAIR_OS_VPS_V1` |

## 実行

```bash
cd api
python3 automation/self_repair_seal_v1.py --stdout-json
```

前提: `integrated_acceptance_seal.json`（VPS acceptance）があると分類が安定。

## 失敗型（minimum）

`build_fail`, `restart_fail`, `health_fail`, `audit_fail`, `route_probe_fail`, `surface_regression`, `runtime_regression`, `dangerous_patch`

## self_repair_seal

- **`self_repair_complete` は既定 `false`**
- **`TENMON_SELF_REPAIR_CYCLE_COMPLETE=1`** を VPS で検証後に付与したときのみ `true`

## 方針

- `chat.ts` 無差別改変禁止、`/api/chat` 契約維持
- dangerous patch は high-risk パス・大 diff・パターンで `blocked`

## 失敗時

`TENMON_SELF_REPAIR_OS_CURSOR_AUTO_RETRY_V1`
