#!/usr/bin/env bash
# TENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1 - read-only NAS/backup observer
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="${TENMON_STORAGE_BACKUP_NAS_OUT:-$API/automation/out/storage_backup_nas_recovery_v1}"

mkdir -p "$OUT"
exec python3 "$API/automation/storage_backup_nas_observer_v1.py" --out-dir "$OUT" "$@"

