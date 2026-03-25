#!/usr/bin/env bash
# TENMON_FEATURE_AUTOBUILD_OS_VPS_V1 — 要求 → spec → cards → queue → gate → post → seal
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
AUTO="$API/automation"
cd "$AUTO"

OUT="${TENMON_FEATURE_AUTOBUILD_OUT_DIR:-$AUTO/out/tenmon_feature_autobuild_os_v1}"
REQ="${TENMON_FEATURE_REQUEST_FILE:-$AUTO/feature_request.txt}"

EXTRA=()
if [[ -n "${TENMON_FEATURE_AUTOBUILD_OUT_DIR:-}" ]]; then
  EXTRA+=(--out-dir "$OUT")
fi
if [[ -f "$REQ" ]]; then
  EXTRA+=(--request-file "$REQ")
fi

python3 feature_completion_seal_v1.py "${EXTRA[@]}" --stdout-json
echo "[TENMON_FEATURE_AUTOBUILD_OS_VPS_V1] bundle → $OUT"
