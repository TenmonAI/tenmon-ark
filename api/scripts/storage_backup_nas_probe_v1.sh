#!/usr/bin/env bash
# TENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1 — NAS / backup / sync read-only 診断
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$API"

OUT="${TENMON_STORAGE_BACKUP_NAS_OUT:-$API/automation/out/storage_backup_nas_recovery_v1}"
mkdir -p "$OUT"

python3 automation/storage_backup_nas_probe_v1.py --out-dir "$OUT" --stdout-json

echo "[DONE] TENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1"
echo "out: $OUT"
