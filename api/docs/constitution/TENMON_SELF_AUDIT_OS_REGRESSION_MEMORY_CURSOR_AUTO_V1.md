# TENMON_SELF_AUDIT_OS_REGRESSION_MEMORY_CURSOR_AUTO_V1

## 目的

`tenmon_system_verdict.json` を一回限りの report で終わらせず、**前回比較・悪化検知・停止判断** を regression memory として固定する。completion 後の静かな退行を OS 側で観測する。

## D

- **self-audit verdict**（`tenmon_system_verdict.json`）が生成済みであること
- regression memory は **append/update** 契約（`history` + `last_snapshot`）
- 悪化検知時に **`continue: false`** を出せる
- 監査の記憶は **verdict 本体から分離**（`tenmon_regression_memory.json`）
- **PASS した前回値**（`last_pass_snapshot`）を baseline として優先比較
- FAIL（悪化で停止推奨）時はスクリプト **`exit 1`**（`--soft-exit-ok` で緩和可能）

## 成果物

| ファイル | 役割 |
|----------|------|
| `api/automation/tenmon_regression_memory_v1.py` | 比較ロジック |
| `api/automation/tenmon_regression_memory.json` | snapshot / history / **last_run**（比較結果） |
| `api/automation/regression_report.json` | 既存を維持しつつ `system_audit_regression` を mirror |

## 実行

前提: `python3 api/automation/tenmon_system_verdict_integrator_v1.py`

```bash
python3 api/automation/tenmon_regression_memory_v1.py
cat api/automation/tenmon_regression_memory.json
```

## 参照

- `TENMON_SELF_AUDIT_OS_SINGLE_VERDICT_CURSOR_AUTO_V1`
- `anti_regression_memory.json` / `improvement_ledger_v1.jsonl`（別系統・本カードは system verdict と結合）
