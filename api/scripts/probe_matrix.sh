#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:3000"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="${1:-/var/log/tenmon/probe_matrix/${TS}}"
LOG_FILE="${LOG_DIR}/run.log"

mkdir -p "${LOG_DIR}"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "[PROBE_MATRIX]"
echo "[TIME_UTC] ${TS}"
echo "[LOG_DIR] ${LOG_DIR}"
echo

assert_contains_not() {
  local value="$1"
  local bad="$2"
  local name="$3"
  if [[ "${value}" == *"${bad}"* ]]; then
    echo "[ASSERT_FAIL] ${name}: contains forbidden text => ${bad}"
    exit 1
  fi
  echo "[ASSERT_PASS] ${name}"
}

assert_startswith() {
  local value="$1"
  local prefix="$2"
  local name="$3"
  if [[ "${value}" != "${prefix}"* ]]; then
    echo "[ASSERT_FAIL] ${name}: does not start with => ${prefix}"
    exit 1
  fi
  echo "[ASSERT_PASS] ${name}"
}

assert_equals() {
  local value="$1"
  local want="$2"
  local name="$3"
  if [[ "${value}" != "${want}" ]]; then
    echo "[ASSERT_FAIL] ${name}: got=${value} want=${want}"
    exit 1
  fi
  echo "[ASSERT_PASS] ${name}"
}

run_probe() {
  local file="$1"
  local payload="$2"
  curl -fsS --max-time 20 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "${payload}" > "${LOG_DIR}/${file}"
}

echo "== AUDIT =="
curl -fsS --max-time 20 "${BASE}/api/audit" | tee "${LOG_DIR}/audit.json" | jq '{ok,stage:.readiness.stage,gitSha}'
echo

run_probe "general_tired.json" \
  '{"message":"今日は少し疲れています","threadId":"probe_matrix_tired"}'
echo "== general tired ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}' "${LOG_DIR}/general_tired.json"
general_tired_resp="$(jq -r '.response' "${LOG_DIR}/general_tired.json")"
assert_contains_not "${general_tired_resp}" "受容：" "general tired no-label"
echo

run_probe "general_organize.json" \
  '{"message":"この件をどう整理すればいい？","threadId":"probe_matrix_organize"}'
echo "== general organize ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}' "${LOG_DIR}/general_organize.json"
general_organize_resp="$(jq -r '.response' "${LOG_DIR}/general_organize.json")"
assert_startswith "${general_organize_resp}" "いまは少し内側を整える段階です。" "general organize phase-prefix"
echo

run_probe "fire_ish.json" \
  '{"message":"どうしてうまくいかないんだ！","threadId":"probe_matrix_fire"}'
echo "== fire-ish ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}' "${LOG_DIR}/fire_ish.json"
fire_resp="$(jq -r '.response' "${LOG_DIR}/fire_ish.json")"
assert_contains_not "${fire_resp}" "いまの言葉を“次の一歩”に落とします。" "fire-ish no-bridge-prefix"
echo

run_probe "inward_ish.json" \
  '{"message":"少し落ち込んでいます…","threadId":"probe_matrix_inward"}'
echo "== inward-ish ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}' "${LOG_DIR}/inward_ish.json"
inward_resp="$(jq -r '.response' "${LOG_DIR}/inward_ish.json")"
assert_startswith "${inward_resp}" "いまは少し内側を整える段階です。" "inward-ish phase-prefix"
assert_contains_not "${inward_resp}" "まここ" "inward-ish no-makoko"
echo

run_probe "kotodama.json" \
  '{"message":"言霊とは何ですか？","threadId":"probe_matrix_kotodama"}'
echo "== kotodama ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}' "${LOG_DIR}/kotodama.json"
kotodama_rr="$(jq -r '.decisionFrame.ku.routeReason' "${LOG_DIR}/kotodama.json")"
assert_equals "${kotodama_rr}" "DEF_FASTPATH_VERIFIED_V1" "kotodama rr"
echo

run_probe "soul.json" \
  '{"message":"魂とは何ですか？","threadId":"probe_matrix_soul"}'
echo "== soul ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:.response}' "${LOG_DIR}/soul.json"
soul_rr="$(jq -r '.decisionFrame.ku.routeReason' "${LOG_DIR}/soul.json")"
assert_equals "${soul_rr}" "SOUL_FASTPATH_VERIFIED_V1" "soul rr"
echo

run_probe "katakamuna.json" \
  '{"message":"カタカムナとは何ですか？","threadId":"probe_matrix_kata"}'
echo "== katakamuna canon ==" && \
jq '{rr:.decisionFrame.ku.routeReason, resp:.response}' "${LOG_DIR}/katakamuna.json"
kata_rr="$(jq -r '.decisionFrame.ku.routeReason' "${LOG_DIR}/katakamuna.json")"
assert_equals "${kata_rr}" "KATAKAMUNA_CANON_ROUTE_V1" "katakamuna rr"
echo

run_probe "proposed_fallback.json" \
  '{"message":"未検証の言霊候補を整理して","threadId":"probe_matrix_proposed"}'
echo "== proposed fallback ==" && \
jq '{rr:.decisionFrame.ku.routeReason, mf:.decisionFrame.ku.meaningFrame, resp:.response}' "${LOG_DIR}/proposed_fallback.json"
proposed_resp="$(jq -r '.response' "${LOG_DIR}/proposed_fallback.json")"
assert_contains_not "${proposed_resp}" "いまの言葉を“次の一歩”に落とします。" "proposed fallback no-bridge-prefix"
echo

echo "== LOG =="
echo "${LOG_FILE}"
