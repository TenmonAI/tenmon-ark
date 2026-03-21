#!/usr/bin/env bash
# MAINLINE_AUTO_HEAL_PATCH_LOOP_V1 — 5 micro-card envelope + before/after completion proxy 比較
# will/meaning/worldview・schema/dist は触らない。FAIL 時は forensic ログのみ。
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${1:-/tmp/mainline_auto_heal_${TS}}"
mkdir -p "${OUT}/before" "${OUT}/after" "${OUT}/microcards"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${ROOT}/scripts/lib/mainline_completion_summary_extract_v3.py"

evidenceBundlePath() {
  echo "${OUT}/evidence_bundle.txt"
}

run_mini_forensic() {
  local dir="$1"
  local tag="$2"
  run_one() {
    local name="$1"
    local message="$2"
    local thread_id="tenmon-heal-${tag}-${name}"
    local raw="${dir}/${name}.raw.json"
    local summ="${dir}/${name}.summary.json"
    local payload
    payload="$(python3 -c "import json,sys; print(json.dumps({'message':sys.argv[1],'threadId':sys.argv[2]}))" "${message}" "${thread_id}")"
    curl -fsS --max-time 40 "${BASE}/api/chat" \
      -H "Content-Type: application/json" \
      -d "${payload}" > "${raw}" 2>/dev/null || echo "{\"error\":\"curl\"}" > "${raw}"
    python3 "${PY}" "${raw}" "${summ}" || true
  }
  run_one "p1" "要するに？"
  run_one "p2" "次の一手だけ教えて"
  run_one "p3" "この一文を美しく整えて"
  run_one "p4" "天聞アークの構造は？"
  python3 "${PY}" --aggregate "${dir}" > "${dir}/aggregate.stdout" 2>&1 || true
  cp -f "${dir}/forensic_aggregate.json" "${dir}/forensic_aggregate.snapshot.json" 2>/dev/null || true
}

microcard() {
  local id="$1"
  local note="$2"
  local f="${OUT}/microcards/${id}.envelope.json"
  python3 -c "import json,sys; print(json.dumps({'microCard':sys.argv[1],'note':sys.argv[2],'status':'envelope_only','risk':'low'},ensure_ascii=False,indent=2))" "${id}" "${note}" > "${f}"
  echo "microcard=${id} -> ${f}"
}

echo "== MAINLINE_AUTO_HEAL_PATCH_LOOP_V1 OUT=${OUT} BASE=${BASE}"

run_mini_forensic "${OUT}/before" "before"
BEFORE_AGG="${OUT}/before/forensic_aggregate.json"

# 5 micro-cards (envelope / 主線コード非変更)
microcard "next_step_surface_repair" "next step 薄さの観測のみ"
microcard "responseplan_surface_bind_repair" "responsePlan.routeReason 欠落の観測のみ"
microcard "beauty_signal_surface_repair" "beauty thin ヒューリスティック観測のみ"
microcard "law_humanize_surface_repair" "KHSL 露出の観測のみ"
microcard "ask_overuse_thinner" "過剰質問マーカ観測のみ"

run_mini_forensic "${OUT}/after" "after"

{
  echo "evidenceBundlePath=${OUT}"
  echo "beforeAggregate=${BEFORE_AGG}"
  echo "afterAggregate=${OUT}/after/forensic_aggregate.json"
  echo "completionScoreCompare=see jq diff below"
} > "$(evidenceBundlePath)"

echo "--- before aggregate ---"
cat "${BEFORE_AGG}" 2>/dev/null || echo "{}"
echo "--- after aggregate ---"
cat "${OUT}/after/forensic_aggregate.json" 2>/dev/null || echo "{}"

export OUT
python3 <<'PY'
import json, os
from pathlib import Path
out = Path(os.environ["OUT"])
b = out / "before" / "forensic_aggregate.json"
a = out / "after" / "forensic_aggregate.json"
def load(p):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}
B, A = load(b), load(a)
keys = ["human_readable_rate", "next_step_rate", "beauty_signal_rate", "sample_count"]
print("=== delta ===")
for k in keys:
    print(k, "before=", B.get(k), "after=", A.get(k))
PY

echo "evidenceBundlePath=$(evidenceBundlePath)"
echo "DONE MAINLINE_AUTO_HEAL_PATCH_LOOP_V1"
