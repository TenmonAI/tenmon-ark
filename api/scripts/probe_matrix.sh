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

assert_contains() {
  local value="$1"
  local needle="$2"
  local name="$3"
  if [[ "${value}" != *"${needle}"* ]]; then
    echo "[ASSERT_FAIL] ${name}: response missing expected substring => ${needle}"
    exit 1
  fi
  echo "[ASSERT_PASS] ${name}"
}

run_probe() {
  local file="$1"
  local payload="$2"
  local out="${LOG_DIR}/${file}"
  local http
  http="$(curl -sS --max-time 20 -o "${out}" -w "%{http_code}" "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "${payload}")" || {
    echo "[CURL_FAIL] ${file}"
    exit 1
  }
  if [[ "${http}" != "200" ]]; then
    echo "[HTTP_FAIL] ${file} code=${http}"
    cat "${out}" || true
    exit 1
  fi
  jq -e . >/dev/null 2>&1 <"${out}" || {
    echo "[JSON_FAIL] ${file}"
    cat "${out}" || true
    exit 1
  }
  jq -e 'has("response") and (.response|type=="string")' >/dev/null 2>&1 <"${out}" || {
    echo "[SCHEMA_FAIL] ${file}: missing string .response"
    cat "${out}" || true
    exit 1
  }
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
assert_contains "${general_organize_resp}" "いまは少し内側を整える段階です。" "general organize phase-line"
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
assert_contains "${inward_resp}" "いまは少し内側を整える段階です。" "inward-ish phase-line"
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

run_probe "soul_exists.json" \
  '{"message":"魂はあるのか？","threadId":"probe_matrix_soul_exists"}'
echo "== soul exists ==" && \
jq '{rr:.decisionFrame.ku.routeReason, resp:(.response|tostring|.[0:120])}' "${LOG_DIR}/soul_exists.json"
soul_ex_resp="$(jq -r '.response' "${LOG_DIR}/soul_exists.json")"
if [[ "${#soul_ex_resp}" -lt 40 ]]; then
  echo "[ASSERT_FAIL] soul exists: response too short"
  exit 1
fi
assert_contains "${soul_ex_resp}" "魂" "soul exists mentions 魂"
echo

run_probe "secretary.json" \
  '{"message":"言霊秘書とは何ですか？","threadId":"probe_matrix_secretary"}'
echo "== kotodama secretary ==" && \
jq '{rr:.decisionFrame.ku.routeReason, resp:(.response|tostring|.[0:120])}' "${LOG_DIR}/secretary.json"
sec_resp="$(jq -r '.response' "${LOG_DIR}/secretary.json")"
if [[ "${#sec_resp}" -lt 40 ]]; then
  echo "[ASSERT_FAIL] secretary: response too short"
  exit 1
fi
echo "[ASSERT_PASS] secretary non-trivial length"
echo

run_probe "utahi.json" \
  '{"message":"ウタヒとは？","threadId":"probe_matrix_utahi"}'
echo "== utahi ==" && \
jq '{rr:.decisionFrame.ku.routeReason, resp:(.response|tostring|.[0:120])}' "${LOG_DIR}/utahi.json"
utahi_resp="$(jq -r '.response' "${LOG_DIR}/utahi.json")"
if [[ "${#utahi_resp}" -lt 40 ]]; then
  echo "[ASSERT_FAIL] utahi: response too short"
  exit 1
fi
echo "[ASSERT_PASS] utahi non-trivial length"
echo

run_probe "collapse.json" \
  '{"message":"会話が崩れるのはなぜ？","threadId":"probe_matrix_collapse"}'
echo "== collapse why ==" && \
jq '{rr:.decisionFrame.ku.routeReason, heart:.decisionFrame.ku.heart, resp:(.response|tostring|.[0:160])}' "${LOG_DIR}/collapse.json"
collapse_resp="$(jq -r '.response' "${LOG_DIR}/collapse.json")"
if [[ "${#collapse_resp}" -lt 20 ]]; then
  echo "[ASSERT_FAIL] collapse: response too short"
  exit 1
fi
echo "[ASSERT_PASS] collapse non-trivial length"
echo

run_probe "longform.json" \
  '{"message":"3000字で説明して","threadId":"probe_matrix_longform"}'
echo "== longform ==" && \
jq '{rr:.decisionFrame.ku.routeReason, len:(.response|tostring|length)}' "${LOG_DIR}/longform.json"
long_len="$(jq -r '.response|tostring|length' "${LOG_DIR}/longform.json")"
if [[ "${long_len}" -lt 400 ]]; then
  echo "[ASSERT_FAIL] longform: expected substantial length, got=${long_len}"
  exit 1
fi
echo "[ASSERT_PASS] longform length"
echo

PROPOSED_TERM="$(sqlite3 -readonly /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT p.termKey
   FROM khs_laws p
   WHERE p.status='proposed'
     AND p.lawType='DEF'
     AND IFNULL(p.termKey,'')<>''
     AND NOT EXISTS (
       SELECT 1
       FROM khs_laws v
       WHERE v.status='verified'
         AND v.lawType='DEF'
         AND v.termKey = p.termKey
     )
   ORDER BY p.confidence DESC, p.updatedAt DESC
   LIMIT 1;")"
if [[ -z "${PROPOSED_TERM}" ]]; then
  echo "[ASSERT_FAIL] proposed seed term missing"
  exit 1
fi

run_probe "proposed_fallback.json" \
  "{\"message\":\"${PROPOSED_TERM}とは何ですか？\",\"threadId\":\"probe_matrix_proposed\"}"
echo "== proposed fallback ==" && \
jq '{rr:.decisionFrame.ku.routeReason, mf:.decisionFrame.ku.meaningFrame, resp:.response}' "${LOG_DIR}/proposed_fallback.json"
proposed_rr="$(jq -r '.decisionFrame.ku.routeReason' "${LOG_DIR}/proposed_fallback.json")"
proposed_resp="$(jq -r '.response' "${LOG_DIR}/proposed_fallback.json")"
assert_equals "${proposed_rr}" "DEF_PROPOSED_FALLBACK_V1" "proposed fallback rr"
assert_contains_not "${proposed_resp}" "いまの言葉を“次の一歩”に落とします。" "proposed fallback no-bridge-prefix"
echo

echo "== LOG =="
echo "${LOG_FILE}"
