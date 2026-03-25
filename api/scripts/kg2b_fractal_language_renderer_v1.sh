#!/usr/bin/env bash
# TENMON_KG2B_FRACTAL_LANGUAGE_RENDERER_VPS_V1
set -euo pipefail
set +H
set +o histexpand

ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
OUT_DIR="${KG2B_OUT_DIR:-$API/automation/out/tenmon_kg2b_fractal_language_renderer_v1}"

cd "$API"
npm run build

if [[ -n "${TENMON_API_BASE:-}" ]]; then
  export KG2B_AUDIT_URL="${TENMON_API_BASE%/}/api/audit"
fi
export KG2B_OUT_DIR="$OUT_DIR"

set +e
node automation/kg2b_fractal_surface_probe_v1.mjs
RC=$?
set -e

if [[ "${KG2B_EXIT_ZERO:-}" == "1" ]]; then
  exit 0
fi
exit "$RC"
