#!/usr/bin/env bash
# TENMON_REMOTE_BUILD_RUNTIME_PROOF_VPS_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="${TENMON_REMOTE_BUILD_RUNTIME_PROOF_OUT_DIR:-$API/automation/out/remote_build_runtime_proof_v1}"

mkdir -p "$OUT"
exec python3 "$API/automation/remote_build_runtime_proof_v1.py" --out-dir "$OUT" "$@"

