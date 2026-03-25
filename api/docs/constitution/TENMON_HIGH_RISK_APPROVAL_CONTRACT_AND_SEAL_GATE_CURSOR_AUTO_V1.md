# TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_CURSOR_AUTO_V1

## Objective

`chat.ts` / `chat_refactor/finalize.ts` / `web/src/**` 等の high-risk 領域に対し、**明示承認または seal / dangerous_patch / hardstop によるブロック**が無い限り自動改変を進めない契約を固定する。

## Non-Negotiables

- high-risk への無承認 auto apply 禁止
- dangerous_patch が false でも high-risk 自動改変は別ゲートで止める
- approval trace を `tenmon_high_risk_approval_trace_v1.json` に保存
- seal は upstream acceptance pass 後のみ

## Primary Artifacts

- `api/automation/high_risk_approval_policy_v1.json`
- `api/automation/tenmon_high_risk_approval_contract_v1.py`
- `api/scripts/tenmon_high_risk_approval_contract_v1.sh`

## Outputs

- `api/automation/tenmon_high_risk_approval_contract_summary.json`
- `api/automation/tenmon_high_risk_approval_contract_report.md`
- `api/automation/tenmon_high_risk_approval_trace_v1.json`（実行時）

## NEXT

- PASS → `TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1`
- FAIL → `TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_RETRY_CURSOR_AUTO_V1`
