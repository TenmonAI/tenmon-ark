#!/usr/bin/env bash
# TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_KG2_KHS_CANDIDATE_RETURN_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
OUT_DIR="${KG2_OUT_DIR:-$API/automation/out/tenmon_kg2_khs_candidate_return_v1}"

echo "[$CARD] api=$API"

cd "$API"
npm run build

if [[ -n "${TENMON_API_BASE:-}" ]]; then
  export KG2_AUDIT_URL="${TENMON_API_BASE%/}/api/audit"
fi

export KG2_OUT_DIR="$OUT_DIR"
set +e
node automation/kg2_hybrid_detailplan_probe_v1.mjs
RC=$?
set -e

if [[ "${KG2_EXIT_ZERO:-}" == "1" ]]; then
  exit 0
fi
exit "$RC"
