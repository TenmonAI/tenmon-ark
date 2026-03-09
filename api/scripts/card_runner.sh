#!/usr/bin/env bash
set -euo pipefail

CARD="${1:-CARD_UNSET}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo/api"
BASE="http://127.0.0.1:3000"
LOG_DIR="/var/log/tenmon/card_${CARD}/${TS}"
LOG_FILE="${LOG_DIR}/run.log"

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

on_error() {
  local exit_code=$?
  echo
  echo "== ERROR EVIDENCE BUNDLE =="
  echo "[EXIT_CODE] ${exit_code}"

  (
    curl -fsS --max-time 20 "${BASE}/api/audit" > "${LOG_DIR}/audit.json"
  ) || true

  (
    sudo systemctl status tenmon-ark-api.service --no-pager > "${LOG_DIR}/systemctl_status.txt"
  ) || true

  (
    sudo journalctl -u tenmon-ark-api.service --no-pager -n 200 > "${LOG_DIR}/journal.txt"
  ) || true

  (
    ss -ltnp > "${LOG_DIR}/ss_ltnp.txt"
  ) || true

  (
    git -C "${ROOT}" status --short > "${LOG_DIR}/git_status.txt"
  ) || true

  (
    git -C "${ROOT}" rev-parse HEAD > "${LOG_DIR}/git_head.txt"
  ) || true

  echo "[EVIDENCE_DIR] ${LOG_DIR}"
  exit "${exit_code}"
}
trap on_error ERR

echo "[CARD] ${CARD}"
echo "[TIME_UTC] ${TS}"
echo

cd "${ROOT}"

echo "== BUILD =="
npm -s run build
echo

echo "== RESTART =="
sudo systemctl restart tenmon-ark-api.service
sleep 2
echo

echo "== AUDIT =="
curl -fsS --max-time 20 "${BASE}/api/audit" | tee "${LOG_DIR}/audit.pretty.json" | jq '{ok,stage:.readiness.stage,gitSha}'
echo

echo "== PROBE fire-ish =="
curl -fsS --max-time 20 "${BASE}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"どうしてうまくいかないんだ！","threadId":"probe_card_runner_fire"}' \
| jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}'
echo

echo "== PROBE inward-ish =="
curl -fsS --max-time 20 "${BASE}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"少し落ち込んでいます…","threadId":"probe_card_runner_inward"}' \
| jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}'
echo

echo "== PROBE katakamuna =="
curl -fsS --max-time 20 "${BASE}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"カタカムナとは何ですか？","threadId":"probe_card_runner_kata"}' \
| jq '{rr:.decisionFrame.ku.routeReason, resp:.response}'
echo

echo "== PROBE MATRIX =="
MATRIX_DIR="${LOG_DIR}/probe_matrix"
"${ROOT}/scripts/probe_matrix.sh" "${MATRIX_DIR}"
echo

echo "== LOG =="
echo "${LOG_FILE}"
echo "[MATRIX_LOG] ${MATRIX_DIR}/run.log"
