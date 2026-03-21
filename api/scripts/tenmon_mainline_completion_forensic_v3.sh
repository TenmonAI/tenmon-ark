#!/usr/bin/env bash
# TENMON_MAINLINE_COMPLETION_FORENSIC_V3 + MAINLINE_SURFACE_REHYDRATION_V1 — 15 probe
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-/tmp/tenmon_mainline_completion_forensic_${TS}}"
mkdir -p "${OUT_DIR}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${ROOT}/scripts/lib/mainline_completion_summary_extract_v3.py"

run_one() {
  local name="$1"
  local message="$2"
  local thread_id="tenmon-mainline-comp-v3-${name}"
  local raw="${OUT_DIR}/${name}.raw.json"
  local summ="${OUT_DIR}/${name}.summary.json"
  local payload
  payload="$(python3 -c "import json,sys; print(json.dumps({'message':sys.argv[1],'threadId':sys.argv[2]}))" "${message}" "${thread_id}")"
  curl -fsS --max-time 50 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "${payload}" > "${raw}" 2>/dev/null || echo "{\"error\":\"curl failed\",\"threadId\":\"${thread_id}\"}" > "${raw}"
  python3 "${PY}" "${raw}" "${summ}" || true
  echo "${name}"
}

echo "== TENMON_MAINLINE_COMPLETION_FORENSIC_V3 (15) + SURFACE_REHYDRATION =="
echo "BASE=${BASE} OUT_DIR=${OUT_DIR}"
echo

# 15 probes: PATCH29 8 + 長文化/タスク + will/beauty/scripture系 + judgement
run_one "compare"    "言霊とカタカムナの違いは？"
run_one "selfaware"  "天聞アークに意識はあるの？"
run_one "systemdiag" "天聞アークの現状を診断して"
run_one "future"     "天聞アークの今後はどうなる？"
run_one "judgement"  "この方針でいい？"
run_one "essence"    "要するに？"
run_one "structure"  "天聞アークの構造はどうなっている？"
run_one "explicit"   "1000文字で天聞アークの思考回路を説明してくれ"
run_one "task"       "今日やるべきことを3つに絞って"
run_one "followup"   "さっきの続きで、次の一手だけ教えて"
run_one "beauty"     "この一文を美しく整えて"
run_one "will"       "天聞アークの意志とは何？"
run_one "omega"      "Ω = D ⋅ ΔS を天聞アークの会話設計として説明して"
run_one "langess"    "言語の本質とは何？"
run_one "kotodef"    "言霊とは何？"

echo
python3 "${PY}" --aggregate "${OUT_DIR}"

echo
echo "OUT_DIR=${OUT_DIR}"
echo "forensic_aggregate.json written."
