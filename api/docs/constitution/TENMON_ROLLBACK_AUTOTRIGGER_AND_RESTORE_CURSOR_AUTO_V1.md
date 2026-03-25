# TENMON_ROLLBACK_AUTOTRIGGER_AND_RESTORE_CURSOR_AUTO_V1

## 目的

runtime / audit / acceptance / lived 等の FAIL を統合し、**rollback 要否・復旧案・retry** を verdict 化する。  
既定は **assess のみ**（git 破壊的操作なし）。限定 restore は `TENMON_ROLLBACK_APPROVED=1` + `--execute-restore`。

## Fabric

`tenmon_full_autopilot_fabric_v1.py` が `campaign_pass=false` のとき **rollback assess** を実行し、state を更新する。

## 実行

```bash
bash api/scripts/tenmon_rollback_autotrigger_and_restore_v1.sh --stdout-json
```
