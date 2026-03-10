#!/usr/bin/env bash
set -euo pipefail

TRIES="${1:-5}"
ROOT="/opt/tenmon-ark-repo/api"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/stability_sweep/${TS}"
SUMMARY="${LOG_DIR}/summary.txt"

mkdir -p "${LOG_DIR}"

pass_count=0
fail_count=0
last_passed=""
last_failed=""

echo "[STABILITY_SWEEP]" | tee "${SUMMARY}"
echo "[TIME_UTC] ${TS}" | tee -a "${SUMMARY}"
echo "[TRIES] ${TRIES}" | tee -a "${SUMMARY}"
echo "[LOG_DIR] ${LOG_DIR}" | tee -a "${SUMMARY}"
echo | tee -a "${SUMMARY}"

for i in $(seq 1 "${TRIES}"); do
  TRY_LOG="${LOG_DIR}/try_${i}.log"
  echo "== TRY ${i}/${TRIES} ==" | tee -a "${SUMMARY}"
  if (
    set +e
    "${ROOT}/scripts/release_gates.sh"
  ) > "${TRY_LOG}" 2>&1; then
    rc=0
  else
    rc=$?
  fi

  if [[ "${rc}" -eq 0 ]]; then
    pass_count=$((pass_count + 1))
    last_passed="${TRY_LOG}"
    echo "[TRY_PASS] ${i}" | tee -a "${SUMMARY}"
  else
    fail_count=$((fail_count + 1))
    last_failed="${TRY_LOG}"
    echo "[TRY_FAIL] ${i}" | tee -a "${SUMMARY}"
  fi
  echo "[TRY_LOG] ${TRY_LOG}" | tee -a "${SUMMARY}"
  echo | tee -a "${SUMMARY}"
done

echo "== RESULT ==" | tee -a "${SUMMARY}"
echo "total=${TRIES}" | tee -a "${SUMMARY}"
echo "pass=${pass_count}" | tee -a "${SUMMARY}"
echo "fail=${fail_count}" | tee -a "${SUMMARY}"
echo "last_passed_log=${last_passed}" | tee -a "${SUMMARY}"
echo "last_failed_log=${last_failed}" | tee -a "${SUMMARY}"

failure_class=""
next_card=""

if [[ "${fail_count}" -gt 0 && -n "${last_failed}" && -f "${last_failed}" ]]; then
  if grep -q 'phase-prefix: does not start with' "${last_failed}"; then
    failure_class="GENERAL_PREFIX_RECUR"
    next_card="R3_GENERAL_TEMPLATE_LOCK_V1"
  elif grep -q 'no-makoko' "${last_failed}"; then
    failure_class="FIRSTLINE_DROP"
    next_card="R3_GENERAL_BODY_SLOT_LOCK_V1"
  elif grep -q 'rr: got=' "${last_failed}"; then
    failure_class="ROUTE_MISMATCH"
    next_card="R3_ROUTE_REASON_LOCK_V1"
  elif grep -q 'heart' "${last_failed}" && grep -q 'ASSERT_FAIL' "${last_failed}"; then
    failure_class="HEART_MISMATCH"
    next_card="R2_HEART_GENERAL_ROUTE_SOURCE_FIX_V1"
  else
    failure_class="SPECIAL_ROUTE_REGRESSION"
    next_card="R3_SPECIAL_ROUTE_REGRESSION_FIX_V1"
  fi
  echo "status=UNSTABLE" | tee -a "${SUMMARY}"
  echo "failure_class=${failure_class}" | tee -a "${SUMMARY}"
  echo "next_card=${next_card}" | tee -a "${SUMMARY}"
  exit 1
fi

echo "status=STABLE" | tee -a "${SUMMARY}"
echo "failure_class=" | tee -a "${SUMMARY}"
echo "next_card=R3_FREEZE_COMMIT_V1" | tee -a "${SUMMARY}"
exit 0
