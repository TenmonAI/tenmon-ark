#!/usr/bin/env bash
# CHAT_SAFE_REFACTOR_PATCH29_FINAL_ACCEPTANCE_SWEEP_V1
# 8 probe 一括実行し decisionFrame.ku を監査する。

set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-/tmp/patch29_probe_${TS}}"
mkdir -p "${OUT_DIR}"

run_one() {
  local name="$1"
  local message="$2"
  local thread_id="patch29-${name}"
  local out="${OUT_DIR}/${name}.json"
  curl -fsS --max-time 30 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"${message}\",\"threadId\":\"${thread_id}\"}" > "${out}" 2>/dev/null || echo "{\"error\":\"curl failed\"}" > "${out}"
  echo "${out}"
}

audit_ku() {
  local file="$1"
  local name="$2"
  if [[ ! -f "${file}" ]]; then
    echo "| ${name} | - | - | - | - | - | - |"
    return
  fi
  local rr rc al am af rp
  rr="$(jq -r '.decisionFrame.ku.routeReason // "-"' "${file}" 2>/dev/null)"
  rc="$(jq -r '.decisionFrame.ku.routeClass // "-"' "${file}" 2>/dev/null)"
  al="$(jq -r '.decisionFrame.ku.answerLength // "-"' "${file}" 2>/dev/null)"
  am="$(jq -r '.decisionFrame.ku.answerMode // "-"' "${file}" 2>/dev/null)"
  af="$(jq -r '.decisionFrame.ku.answerFrame // "-"' "${file}" 2>/dev/null)"
  rp="$(jq -r 'if .decisionFrame.ku.responsePlan != null then (.decisionFrame.ku.responsePlan.routeReason // "yes") else "-" end' "${file}" 2>/dev/null)"
  echo "| ${name} | ${rr} | ${rc} | ${al} | ${am} | ${af} | ${rp} |"
}

echo "== PATCH29 8 probe =="
echo "BASE=${BASE} OUT_DIR=${OUT_DIR}"
echo

# 8 probe 実行
run_one "compare"    "言霊とカタカムナの違いは？" >/dev/null
run_one "selfaware"  "天聞アークに意識はあるの？" >/dev/null
run_one "systemdiag" "天聞アークの現状を診断して" >/dev/null
run_one "future"     "天聞アークの今後はどうなる？" >/dev/null
run_one "judgement"  "この方針でいい？" >/dev/null
run_one "essence"    "要するに？" >/dev/null
run_one "structure"  "天聞アークの構造はどうなっている？" >/dev/null
run_one "explicit"   "1000文字で天聞アークの思考回路を説明してくれ" >/dev/null

echo "== decisionFrame.ku 監査表 =="
echo "| probe | routeReason | routeClass | answerLength | answerMode | answerFrame | responsePlan |"
echo "|-------|-------------|------------|--------------|------------|-------------|--------------|"
audit_ku "${OUT_DIR}/compare.json"    "compare"
audit_ku "${OUT_DIR}/selfaware.json"  "selfaware"
audit_ku "${OUT_DIR}/systemdiag.json" "systemdiag"
audit_ku "${OUT_DIR}/future.json"     "future"
audit_ku "${OUT_DIR}/judgement.json"  "judgement"
audit_ku "${OUT_DIR}/essence.json"    "essence"
audit_ku "${OUT_DIR}/structure.json"  "structure"
audit_ku "${OUT_DIR}/explicit.json"   "explicit"
echo
echo "OUT_DIR=${OUT_DIR}"
