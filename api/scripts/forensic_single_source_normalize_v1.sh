#!/usr/bin/env bash
# TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE — canonical forensic verdict + conflicts + runtime source
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
cd "$API/automation"

OUT="${TENMON_FORENSIC_SINGLE_SOURCE_OUT_DIR:-$API/automation/out/forensic_single_source_normalize_v1}"
EXTRA=()
if [[ -n "${TENMON_FORENSIC_SINGLE_SOURCE_OUT_DIR:-}" ]]; then
  EXTRA+=(--out-dir "$OUT")
fi

python3 forensic_single_source_normalizer_v1.py "${EXTRA[@]}" --stdout-json
echo "[TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_VPS_V1] → $OUT"
