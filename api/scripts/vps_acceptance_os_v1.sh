#!/usr/bin/env bash
# TENMON_VPS_ACCEPTANCE_OS_VPS_V1 — VPS 統合 acceptance（Python オーケストレータ）
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_VPS_ACCEPTANCE_OS_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"

cd "$API" || exit 1
mkdir -p automation/out

EXTRA=()
if [[ "${VPS_ACCEPTANCE_SKIP_SEAL_SCRIPT:-0}" == "1" ]]; then
  EXTRA+=(--skip-seal-script)
fi
if [[ -n "${TENMON_VPS_ACCEPTANCE_OUT_DIR:-}" ]]; then
  EXTRA+=(--out-dir "$TENMON_VPS_ACCEPTANCE_OUT_DIR")
fi

echo "[$CARD] running vps_acceptance_os_v1.py"

set +e
python3 automation/vps_acceptance_os_v1.py "${EXTRA[@]}" --stdout-json | tee automation/out/vps_acceptance_os_last_run.json
RC=$?
set -e

echo "[$CARD] exit=$RC"
echo "[$CARD] artifacts → api/automation/vps_acceptance_report.json , integrated_acceptance_seal.json , ..."

exit "$RC"
