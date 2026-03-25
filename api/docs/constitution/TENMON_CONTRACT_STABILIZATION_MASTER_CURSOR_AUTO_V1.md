# TENMON_CONTRACT_STABILIZATION_MASTER_CURSOR_AUTO_V1

## 目的

収束整流カードとして、以下 3 系統を一括で観測・補修・検証する。

- `/api/audit.build` の復旧または正規接続
- output contract path の正規化
- general → scripture projector bleed 条件の制御

## 実装

- `api/automation/contract_stabilization_master_v1.py`
- `api/scripts/contract_stabilization_master_v1.sh`
- `api/src/routes/audit.ts`（`/api/audit.build` 追加）
- `api/src/core/responseComposer.ts`（general scripture bleed guard）
- `api/src/planning/responsePlanCore.ts`（general 表面主権の補強）

## 実行順序（固定）

1. audit.build route restore
2. output contract path normalize
3. general-scripture bleed guard

## 出力

- `api/automation/contract_stabilization_master_report.json`
- `api/automation/audit_build_contract.json`
- `api/automation/output_contracts_normalized.json`
- `api/automation/output_contract_path_mismatch.json`
- `api/automation/projector_bleed_guard_report.json`
- `api/automation/state_convergence_summary.json`
- `api/automation/state_convergence_next_cards.json`
- `api/automation/TENMON_CONTRACT_STABILIZATION_MASTER_VPS_V1`

## 実行

```bash
bash api/scripts/contract_stabilization_master_v1.sh --stdout-json
```

## FAIL_NEXT_CARD

`TENMON_CONTRACT_STABILIZATION_MASTER_RETRY_CURSOR_AUTO_V1`

