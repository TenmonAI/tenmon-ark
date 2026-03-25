# TENMON_EXECUTION_GATE_HARDSTOP_CURSOR_AUTO_V1

## 目的

`TENMON_CURSOR_FULL_AUTOPILOT_EXECUTION_FABRIC` 等の自動実行の **直前** に置く **正中 hard stop**。  
危険 patch・契約破壊・巨大 diff・dist 直撃を機械的に遮断する。

## 原則

- **Non‑Negotiables** — `dangerous_patch_blocker_v1` + パス / diff ヒューリスティック。
- **FAIL** — `tenmon_execution_gate_hardstop_verdict.json` + `*_report.md` + `exit != 0`。
- **fabric 接続** — `allowed_to_continue=false` なら autopilot は継続しない（`exit 3`）。

## 実行

```bash
bash api/scripts/tenmon_execution_gate_hardstop_v1.sh --stdout-json
```

## 出力

- `api/automation/tenmon_execution_gate_hardstop_verdict.json`
- `api/automation/tenmon_execution_gate_hardstop_report.md`

## Fabric

`tenmon_full_autopilot_fabric_v1.py` の `--phase full` / `step` は既定で hardstop 後にのみ進む。緊急時のみ `--skip-hardstop`。
