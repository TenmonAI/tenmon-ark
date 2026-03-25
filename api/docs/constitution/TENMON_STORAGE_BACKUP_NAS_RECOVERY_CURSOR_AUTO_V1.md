# TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1

## 目的

NAS / backup の実接続を **read-only** で観測固定し、次の 4 軸を canonical report に束ねる。

- mount path
- env path
- sync script
- backup health

「スクリプトはあるがマウントは無い」を明確に分離する。

## 実装ファイル

- `api/automation/storage_backup_nas_observer_v1.py`
- `api/scripts/storage_backup_nas_observer_v1.sh`
- `api/docs/constitution/TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1.md`

## 観測ポリシー

- read-only 観測のみ
- backup 実データは一切変更しない
- NAS 上のファイル改変なし
- 書込テストは行わない（`writeability.writable=false` を固定記録）

## 観測対象パス

固定候補:

- `/mnt/nas`
- `/opt/tenmon-backup`
- `/backup`
- `/data/backup`

加えて、env provided paths（`TENMON_BACKUP_ROOT` など）を収集して観測対象に追加する。

## 観測項目

各候補 path について以下を記録する。

- mount 判定（`mounted` / classification）
- `df -h <path>` snapshot
- `stat` / `statvfs` snapshot
- sample listing（先頭 N 件）
- writeability（read-only 方針により `attempted_write=false`, `writable=false`）

## script 監査

次のスクリプトの「存在」と「実行条件メモ」を記録する。

- `vps_sync_and_verify.sh`
- `vps_reclone_and_switch.sh`
- `vps_fix_live_directory.sh`
- `obs_evidence_bundle.sh`

※ script exists と runtime mount state は別フィールドで管理し、混同しない。

## 出力（既定: `api/automation/out/storage_backup_nas_recovery_v1/`）

- `storage_backup_nas_canonical_report.json`
- `backup_mount_candidates.json`
- `backup_blockers.json`
- `TENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1`

## 実行

```bash
bash api/scripts/storage_backup_nas_observer_v1.sh --stdout-json
```

## FAIL_NEXT_CARD

`TENMON_STORAGE_BACKUP_NAS_RECOVERY_RETRY_CURSOR_AUTO_V1`
