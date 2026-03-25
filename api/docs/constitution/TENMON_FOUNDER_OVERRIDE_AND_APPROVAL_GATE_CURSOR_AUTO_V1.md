# TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_CURSOR_AUTO_V1

## 目的

high-risk scope の自動改変を founder/human approval に統治下へ置く。  
能力より統治を優先し、approval なき昇格・apply・commit/seal を禁止する。

## NON-NEGOTIABLES

- founder approval のない high-risk apply 禁止
- approve/reject trace 保存
- override は current-run only
- audit trail 必須
- approval 無し commit/seal 禁止

## 実行

```bash
api/scripts/founder_override_approval_gate_v1.sh --simulate-high-risk-request --decision reject --stdout-json
```

環境変数:

- `TENMON_FOUNDER_OVERRIDE_CURRENT_RUN=1`（current-run のみ有効）
- `TENMON_FOUNDER_APPROVAL_TOKEN=<token>`（approval を示す）

## 成果物

- `api/automation/founder_override_state_v1.json`
- `api/automation/tenmon_founder_override_approval_gate_summary.json`
- `api/automation/tenmon_founder_override_approval_gate_report.md`
- `api/automation/tenmon_founder_override_approval_trace.jsonl`

## PASS 条件

- high-risk request が approval gate で停止
- approve/reject trace が保存される
- founder override + approval のみで昇格可能
- `founder_approval_gate_pass=true`

## NEXT

- PASS: `TENMON_FULL_AUTONOMY_OPERATING_SYSTEM_MASTER_CHAIN_CURSOR_AUTO_V1`
- FAIL: `TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_RETRY_CURSOR_AUTO_V1`

