#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo/api"
BASE="http://127.0.0.1:3000"
LOG_DIR="/var/log/tenmon/release_gates/${TS}"
LOG_FILE="${LOG_DIR}/run.log"

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

run_with_retry() {
  local max_tries="$1"
  shift
  local n=1
  while true; do
    echo "[RETRY] try=${n}/${max_tries}"
    if "$@"; then
      echo "[RETRY_PASS] try=${n}"
      return 0
    fi
    if [[ "${n}" -ge "${max_tries}" ]]; then
      echo "[RETRY_FAIL] exhausted=${max_tries}"
      return 1
    fi
    n=$((n+1))
    sleep 2
  done
}

echo "[RELEASE_GATES]"
echo "[TIME_UTC] ${TS}"
echo "[LOG_DIR] ${LOG_DIR}"
echo

cd "${ROOT}"

echo "== PRE-AUDIT =="
curl -fsS --max-time 20 "${BASE}/api/audit" | jq '{ok,stage:.readiness.stage,gitSha}'
echo

echo "== CARD RUNNER =="
"${ROOT}/scripts/card_runner.sh" OPS_RELEASE_GATES_V1
echo

echo "== FINAL PROBE MATRIX =="
run_probe_matrix() {
  local try_no="$1"
  "${ROOT}/scripts/probe_matrix.sh" "${LOG_DIR}/probe_matrix_final_try${try_no}"
}
run_with_retry 3 bash -lc '
  try_no=1
  for d in "'"${LOG_DIR}"'/probe_matrix_final_try"*; do :; done
  existing=$(find "'"${LOG_DIR}"'" -maxdepth 1 -type d -name "probe_matrix_final_try*" | wc -l)
  try_no=$((existing + 1))
  "'"${ROOT}"'/scripts/probe_matrix.sh" "'"${LOG_DIR}"'/probe_matrix_final_try${try_no}"
'
echo

echo "== LOG =="
echo "${LOG_FILE}"
find "${LOG_DIR}" -maxdepth 1 -type d -name 'probe_matrix_final_try*' | sort
