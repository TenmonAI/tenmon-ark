#!/usr/bin/env bash
# TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_VPS_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="${TENMON_REPO_HYGIENE_GUARD_OUT_DIR:-$API/automation/out/repo_hygiene_guard_v1}"

mkdir -p "$OUT"
exec python3 "$API/automation/repo_hygiene_guard_v1.py" --out-dir "$OUT" "$@"

