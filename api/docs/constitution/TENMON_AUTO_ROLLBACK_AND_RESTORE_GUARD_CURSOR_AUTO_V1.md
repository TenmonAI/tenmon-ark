# TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1

## 目的

自動改善が product scope で FAIL を検出した際に、  
rollback trigger / restore target / evidence capture / retry suppression を自動実行する。

## NON-NEGOTIABLES

- FAIL 時 evidence 採取
- rollback point 無し実行禁止
- product core 失敗時の auto retry 暴走禁止
- restore 後に build / acceptance 再確認
- rollback 成功前に次カードへ進まない

## 実行

```bash
api/scripts/auto_rollback_restore_guard_v1.sh --simulate-failure --stdout-json
```

`--simulate-failure` は受け入れ試験用。  
本ガードは既定で非破壊モード（restore ガード判定と再確認のみ）で動作する。

## 成果物

- `api/automation/rollback_restore_state_v1.json`
- `api/automation/tenmon_auto_rollback_restore_guard_summary.json`
- `api/automation/tenmon_auto_rollback_restore_guard_report.md`
- `api/automation/tenmon_auto_rollback_restore_guard_evidence_bundle.json`

## PASS 条件

- failure simulation で rollback trigger が立つ
- evidence bundle が生成される
- restore 完了後に build / acceptance 再確認を実施
- retry suppression が機能する
- `rollback_restore_guard_pass=true`

## NEXT

- PASS: `TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_CURSOR_AUTO_V1`
- FAIL: `TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_RETRY_CURSOR_AUTO_V1`

