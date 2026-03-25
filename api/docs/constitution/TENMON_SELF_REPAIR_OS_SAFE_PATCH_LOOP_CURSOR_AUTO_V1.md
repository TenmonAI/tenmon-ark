# TENMON_SELF_REPAIR_OS_SAFE_PATCH_LOOP_CURSOR_AUTO_V1

## 目的

自己修復を **dangerous patch blocker / diff minimizer / rollback / execution gate** 付きの **safe patch loop** に限定し、運用可能な形で固定する。

## D

- **self-audit verdict** / **regression memory** が先行していること（`tenmon_system_verdict.json` / `tenmon_regression_memory.json`）
- **dangerous patch** は execution 不可（`dangerous_patch_blocker_report.json` の `blocked`）
- **rollback plan** なき patch は通さない（`rollback_plan.json` に revert 候補等）
- patch は **最小 diff**（`patch_diff_minimizer_report.json` を参照）
- **auto-apply は safe class のみ**
- **product 破壊禁止**（パス分類で `unsafe_*` をゲート外へ）
- FAIL 時は **`exit 1`**（`--soft-exit-ok` で緩和）

## patch class

| class | 扱い |
|-------|------|
| `safe_surface` | execution gate 対象候補（例: `web/`） |
| `safe_runner` | 同上（例: `api/scripts/`） |
| `safe_hygiene` | 同上（例: `api/automation/`） |
| `unsafe_contract` | **ゲートに入れない**（routes/chat, chat_refactor, types 等） |
| `unsafe_schema` | **ゲートに入れない**（DB schema） |
| `unsafe_runtime_core` | **ゲートに入れない**（core/planning 等） |

## 成果物

- `api/automation/tenmon_self_repair_safe_loop_v1.py`
- `api/automation/tenmon_self_repair_safe_loop_verdict.json`

## 入力（読み取り）

- `tenmon_system_verdict.json`
- `tenmon_regression_memory.json`（`last_run.continue`）
- `dangerous_patch_blocker_report.json`
- `patch_diff_minimizer_report.json`
- `rollback_plan.json`
- （任意）`execution_gate_v1.json`

## 実行

前提: system verdict + regression memory を生成済み。

```bash
python3 api/automation/tenmon_self_repair_safe_loop_v1.py
cat api/automation/tenmon_self_repair_safe_loop_verdict.json
```
