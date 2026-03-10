#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BASE_URL="http://127.0.0.1:3000"

echo "[AUTOPILOT_CYCLE]"

cd "${API_ROOT}"

echo "[STEP] build"
npm -s run build

echo "[STEP] restart"
sudo systemctl restart tenmon-ark-api.service
sleep 2

echo "[STEP] audit"
AUDIT_JSON="$(curl -fsS --max-time 20 "${BASE_URL}/api/audit" || echo "")"
echo "${AUDIT_JSON}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"

echo "[STEP] probe_matrix"
PROBE_DIR="/var/log/tenmon/probe_matrix_autopilot_${TS}"
bash "${API_ROOT}/scripts/probe_matrix.sh" "${PROBE_DIR}"
PROBE_LOG="${PROBE_DIR}/run.log"

echo "[STEP] stability_sweep"
bash "${API_ROOT}/scripts/stability_sweep.sh" 3

LATEST_SWEEP_DIR="$(ls -td /var/log/tenmon/stability_sweep/* 2>/dev/null | head -1 || echo "")"
LATEST_SWEEP_SUMMARY=""
STATUS="UNKNOWN"
NEXT_CARD=""
FAILURE_CLASS=""
LAST_FAILED_LOG=""

if [[ -n "${LATEST_SWEEP_DIR}" ]] && [[ -d "${LATEST_SWEEP_DIR}" ]]; then
  LATEST_SWEEP_SUMMARY="${LATEST_SWEEP_DIR}/summary.txt"
  if [[ -f "${LATEST_SWEEP_SUMMARY}" ]]; then
    STATUS="$(grep -E '^status=' "${LATEST_SWEEP_SUMMARY}" | head -1 | cut -d= -f2 || echo "UNKNOWN")"
    NEXT_CARD="$(grep -E '^next_card=' "${LATEST_SWEEP_SUMMARY}" | head -1 | cut -d= -f2 || echo "")"
    FAILURE_CLASS="$(grep -E '^failure_class=' "${LATEST_SWEEP_SUMMARY}" | head -1 | cut -d= -f2 || echo "")"
    LAST_FAILED_LOG="$(grep -E '^last_failed_log=' "${LATEST_SWEEP_SUMMARY}" | head -1 | cut -d= -f2 || echo "")"
  fi
fi

echo
echo "audit:"
echo "${AUDIT_JSON}"
echo
echo "latest_probe:"
echo "${PROBE_LOG:-N/A}"
echo
echo "latest_sweep:"
echo "${LATEST_SWEEP_SUMMARY:-N/A}"
echo
echo "status:"
echo "${STATUS}"
echo
echo "next_card:"
echo "${NEXT_CARD}"

if [[ "${STATUS}" == "STABLE" ]]; then
  CYCLE_TS="$(date -u +%Y%m%dT%H%M%SZ)"
  CYCLE_DIR="/var/log/tenmon/autopilot_cycle/${CYCLE_TS}"
  mkdir -p "${CYCLE_DIR}"
  {
    echo "[AUTOPILOT_CYCLE]"
    echo "time_utc=${CYCLE_TS}"
    echo "audit=${AUDIT_JSON}"
    echo "latest_probe=${PROBE_LOG:-N/A}"
    echo "latest_sweep=${LATEST_SWEEP_SUMMARY:-N/A}"
    echo "status=${STATUS}"
    echo "next_card=${NEXT_CARD}"
  } > "${CYCLE_DIR}/summary.txt"
  exit 0
fi

if [[ -n "${LAST_FAILED_LOG}" ]] && [[ -f "${LAST_FAILED_LOG}" ]]; then
  echo
  echo "[FAILED_LOG]"
  cat "${LAST_FAILED_LOG}"
fi

echo
echo "failure_class:"
echo "${FAILURE_CLASS}"
echo "next_card:"
echo "${NEXT_CARD}"

exit 1

