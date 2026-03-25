# TENMON_SELF_REPAIR_OS_ACCEPTANCE_SEAL_CURSOR_AUTO_V1

## 目的

safe patch loop で許可された候補を **build 成功だけで採用せず**、**acceptance / audit / regression が揃ったときだけ**封印する契約を固定する。

## D

- **safe patch loop verdict**（`tenmon_self_repair_safe_loop_verdict.json`）が先行
- **dangerous patch** は対象外（`dangerous_patch_blocker_report.json` の `blocked` は rollback 判断に使用）
- **build success = 採用ではない**
- **acceptance / audit / regression PASS** でのみ `sealed=true`
- FAIL 時は **rollback 候補**（`rollback_required`）を返し、`self_repair_seal.json` は **PASS 時のみ**更新
- `exit 1`（`--soft-exit-ok` で緩和）

## ゲート

| 項目 | 主な参照 |
|------|----------|
| build_ok | `integrated_acceptance_seal.json` axes.static（なければ `vps_acceptance_report.build_rc`） |
| audit_ok | `integrated_acceptance_seal.json` axes.runtime（なければ vps overall/seal） |
| acceptance_ok | `learning_acceptance_audit` + `integrated_acceptance_seal` + `vps_acceptance_report` の overall |
| regression_ok | `regression_report.json`（system_audit_regression + comparison） |

`sealed=true` は **safe loop `pass` + 上記すべて OK + `recommended_candidate` あり** のときのみ。

## 成果物

- `api/automation/tenmon_self_repair_acceptance_seal_v1.py`
- `api/automation/tenmon_self_repair_acceptance_seal_verdict.json`

## 実行

```bash
python3 api/automation/tenmon_self_repair_safe_loop_v1.py
python3 api/automation/tenmon_self_repair_acceptance_seal_v1.py
cat api/automation/tenmon_self_repair_acceptance_seal_verdict.json
```
