#!/usr/bin/env bash
set -euo pipefail

ROOT="/opt/tenmon-ark-repo/api"
BASE="http://127.0.0.1:3000"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="/var/log/tenmon/autopilot_cycle/${TS}"
SUMMARY="${LOG_DIR}/summary.txt"

mkdir -p "${LOG_DIR}"

echo "[AUTOPILOT_CYCLE]" | tee "${SUMMARY}"
echo "[TIME_UTC] ${TS}" | tee -a "${SUMMARY}"
echo "[LOG_DIR] ${LOG_DIR}" | tee -a "${SUMMARY}"
echo | tee -a "${SUMMARY}"

cd "${ROOT}"

echo "== BUILD ==" | tee -a "${SUMMARY}"
npm -s run build >> "${SUMMARY}" 2>&1

echo "== RESTART ==" | tee -a "${SUMMARY}"
sudo systemctl restart tenmon-ark-api.service
sleep 2

echo "== AUDIT ==" | tee -a "${SUMMARY}"
AUDIT_JSON="$(curl -fsS --max-time 20 "${BASE}/api/audit")"
echo "${AUDIT_JSON}" | jq '{ok,stage:.readiness.stage,gitSha}' | tee -a "${SUMMARY}"
echo | tee -a "${SUMMARY}"

echo "== PROBE MATRIX ==" | tee -a "${SUMMARY}"
PROBE_DIR="/var/log/tenmon/probe_matrix_autopilot_${TS}"
bash "${ROOT}/scripts/probe_matrix.sh" "${PROBE_DIR}" >> "${SUMMARY}" 2>&1
echo "[LATEST_PROBE] ${PROBE_DIR}/run.log" | tee -a "${SUMMARY}"
echo | tee -a "${SUMMARY}"

echo "== STABILITY SWEEP ==" | tee -a "${SUMMARY}"
bash "${ROOT}/scripts/stability_sweep.sh" 3 >> "${SUMMARY}" 2>&1 || true
LATEST_SWEEP="$(find /var/log/tenmon/stability_sweep -type f -name summary.txt | sort | tail -n 1)"
echo "[LATEST_SWEEP] ${LATEST_SWEEP}" | tee -a "${SUMMARY}"
echo | tee -a "${SUMMARY}"

STATUS="$(grep '^status=' "${LATEST_SWEEP}" | tail -n 1 | cut -d= -f2- || true)"
NEXT_CARD="$(grep '^next_card=' "${LATEST_SWEEP}" | tail -n 1 | cut -d= -f2- || true)"
FAILURE_CLASS="$(grep '^failure_class=' "${LATEST_SWEEP}" | tail -n 1 | cut -d= -f2- || true)"

# OPS_AUTOPILOT_PHASE_AWARE_V1: STABLE のときだけ phase 観測
PHASE_DETECTED=""
PROBE1_SUMMARY=""
PROBE2_SUMMARY=""

if [[ "${STATUS}" == "STABLE" ]]; then
  PHASE_THREAD_ID="autopilot_phase_${TS}"
  MSG_ORG="この件をどう整理すればいい？"

  # same-thread 1st
  P1="$(curl -fsS --max-time 20 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"${MSG_ORG}\",\"threadId\":\"${PHASE_THREAD_ID}\"}" || echo "{}")"
  # same-thread 2nd
  P2="$(curl -fsS --max-time 20 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"${MSG_ORG}\",\"threadId\":\"${PHASE_THREAD_ID}\"}" || echo "{}")"

  PROBE1_SUMMARY="$(echo "${P1}" | jq -c '{lookup:.decisionFrame.ku.seedLookup, hint:.decisionFrame.ku.seedHint, surface:.decisionFrame.ku.seedSurface, policy:.decisionFrame.ku.seedPolicy}' 2>/dev/null || echo '{}')"
  PROBE2_SUMMARY="$(echo "${P2}" | jq -c '{lookup:.decisionFrame.ku.seedLookup, hint:.decisionFrame.ku.seedHint, surface:.decisionFrame.ku.seedSurface, policy:.decisionFrame.ku.seedPolicy}' 2>/dev/null || echo '{}')"

  SL1="$(echo "${P1}" | jq -r 'if .decisionFrame.ku.seedLookup == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SL2="$(echo "${P2}" | jq -r 'if .decisionFrame.ku.seedLookup == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SH1="$(echo "${P1}" | jq -r 'if .decisionFrame.ku.seedHint == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SH2="$(echo "${P2}" | jq -r 'if .decisionFrame.ku.seedHint == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SS1="$(echo "${P1}" | jq -r 'if .decisionFrame.ku.seedSurface == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SS2="$(echo "${P2}" | jq -r 'if .decisionFrame.ku.seedSurface == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SP1="$(echo "${P1}" | jq -r 'if .decisionFrame.ku.seedPolicy == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"
  SP2="$(echo "${P2}" | jq -r 'if .decisionFrame.ku.seedPolicy == null then "null" else "nonnull" end' 2>/dev/null || echo "null")"

  # phase detection
  if [[ "${SL1}" == "null" && "${SL2}" == "nonnull" ]]; then
    PHASE_DETECTED="KZ3"
    if [[ "${SH2}" == "nonnull" ]]; then
      PHASE_DETECTED="KZ4"
    fi
    if [[ "${SS2}" == "nonnull" ]]; then
      PHASE_DETECTED="KZ5"
    fi
    if [[ "${SP2}" == "nonnull" ]]; then
      PHASE_DETECTED="KZ6"
    fi
    # KZ7: 初回 null、2回目で hint/surface/policy がすべて non-null
    if [[ "${SP2}" == "nonnull" && "${SH1}" == "null" && "${SS1}" == "null" && "${SP1}" == "null" && "${SH2}" == "nonnull" && "${SS2}" == "nonnull" ]]; then
      PHASE_DETECTED="KZ7"
    fi
  fi

  # next_card 上書きポリシー
  case "${PHASE_DETECTED}" in
    KZ7)
      NEXT_CARD="R3_CONCEPT_CANON_SCHEMA_V1"
      ;;
    KZ6)
      NEXT_CARD="KZ7_FIRST_SEEN_BOUNDARY_LOCK_V1"
      ;;
    KZ5)
      NEXT_CARD="KZ6_SEED_SURFACE_POLICY_V1"
      ;;
    KZ4)
      NEXT_CARD="KZ5_SEED_HINT_SURFACE_MIN_V1"
      ;;
    KZ3)
      NEXT_CARD="KZ4_SEED_HINT_WIRE_V1"
      ;;
  esac
fi

if [[ -n "${PHASE_DETECTED}" ]]; then
  echo "== PHASE_DETECT ==" | tee -a "${SUMMARY}"
  echo "phase_detected=${PHASE_DETECTED}" | tee -a "${SUMMARY}"
  echo "probe_same_thread_1=${PROBE1_SUMMARY}" | tee -a "${SUMMARY}"
  echo "probe_same_thread_2=${PROBE2_SUMMARY}" | tee -a "${SUMMARY}"
  echo | tee -a "${SUMMARY}"
fi

echo "== RESULT ==" | tee -a "${SUMMARY}"
echo "status=${STATUS}" | tee -a "${SUMMARY}"
echo "failure_class=${FAILURE_CLASS}" | tee -a "${SUMMARY}"
echo "next_card=${NEXT_CARD}" | tee -a "${SUMMARY}"

if [[ "${STATUS}" == "STABLE" ]]; then
  exit 0
fi

LAST_FAILED_LOG="$(grep '^last_failed_log=' "${LATEST_SWEEP}" | tail -n 1 | cut -d= -f2- || true)"
echo | tee -a "${SUMMARY}"
echo "== LAST FAILED LOG ==" | tee -a "${SUMMARY}"
if [[ -n "${LAST_FAILED_LOG}" && -f "${LAST_FAILED_LOG}" ]]; then
  tail -n 80 "${LAST_FAILED_LOG}" | tee -a "${SUMMARY}"
fi

exit 1
