#!/usr/bin/env bash
# TENMON_REMOTE_CURSOR_COMMAND_CENTER — キュー正規化・ガード・Mac manifest・seal・VPS bundle
set -euo pipefail
ROOT="${ROOT:-${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}}"
API="$ROOT/api"
cd "$API/automation"

OUT="${TENMON_REMOTE_CURSOR_CC_OUT_DIR:-$API/automation/out/tenmon_remote_cursor_command_center_v1}"
EXTRA=()
if [[ -n "${TENMON_REMOTE_CURSOR_CC_OUT_DIR:-}" ]]; then
  EXTRA+=(--out-dir "$OUT")
fi

python3 remote_cursor_command_center_v1.py "${EXTRA[@]}" --stdout-json
echo "[TENMON_REMOTE_CURSOR_COMMAND_CENTER_VPS_V1] bundle → $OUT"
