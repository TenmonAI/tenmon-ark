#!/usr/bin/env bash
# MAINLINE_SUPREME_COMPLETION_AUDIT_V1 — 18 プローブ + forensic summary + 10 軸 supreme レポート
# high-risk（chat 主幹等）は触らない。evidence bundle / before ログのみ。
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-/tmp/mainline_supreme_completion_audit_${TS}}"
BASELINE_DIR="${TENMON_SUPREME_AUDIT_BASELINE:-}"
mkdir -p "${OUT_DIR}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY_SUM="${ROOT}/scripts/lib/mainline_completion_summary_extract_v3.py"
PY_SUP="${ROOT}/scripts/lib/supreme_completion_audit_v1.py"
LOG="${OUT_DIR}/before_after_host.log"

{
  echo "=== MAINLINE_SUPREME_COMPLETION_AUDIT_V1 ==="
  date -u +%Y-%m-%dT%H:%M:%SZ
  git -C "${ROOT}/.." rev-parse HEAD 2>/dev/null || true
  echo "BASE=${BASE}"
  echo "OUT_DIR=${OUT_DIR}"
} | tee "${LOG}"

run_one() {
  local name="$1"
  local message="$2"
  local thread_id="tenmon-supreme-audit-${name}"
  local raw="${OUT_DIR}/${name}.raw.json"
  local summ="${OUT_DIR}/${name}.summary.json"
  local meta="${OUT_DIR}/${name}.meta.json"
  python3 -c "import json, pathlib, sys; pathlib.Path(sys.argv[1]).write_text(json.dumps({'probe':sys.argv[2],'message':sys.argv[3]},ensure_ascii=False)+'\n',encoding='utf-8')" "${meta}" "${name}" "${message}"
  local payload
  payload="$(python3 -c "import json,sys; print(json.dumps({'message':sys.argv[1],'threadId':sys.argv[2]}))" "${message}" "${thread_id}")"
  curl -fsS --max-time 55 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "${payload}" > "${raw}" 2>/dev/null || echo "{\"error\":\"curl failed\",\"threadId\":\"${thread_id}\"}" > "${raw}"
  python3 "${PY_SUM}" "${raw}" "${summ}" || true
  echo "${name}"
}

echo "OUT_DIR=${OUT_DIR}" | tee -a "${LOG}"

run_one "p01_structure" "天聞アークの構造はどうなっている？"
run_one "p02_kotodama" "言霊とは何？"
run_one "p03_langess" "言語の本質とは何？"
run_one "p04_will" "天聞アークの意志とは何？"
run_one "p05_compare_kk" "言霊とカタカムナの違いを原理として説明して"
run_one "p06_tenshin" "天津金木は真理そのものではなく構造だとはどういうこと？"
run_one "p07_omega" "Ω = D ⋅ ΔS を会話設計に当てはめて説明して"
run_one "p08_daily" "その法則を日常判断に還元するとどうなる？"
run_one "p09_plain" "専門記号を使わず言い直して"
run_one "p10_one_line" "中心命題を一句に圧して"
run_one "p11_beauty" "もっと美しい日本語で、意味を薄めずに書いて"
run_one "p12_reason_emotion" "理を先に、情を後に置く三段構成で書いて"
run_one "p13_d_subj" "D が主観に変わるとなぜ崩れるの？"
run_one "p14_seichu" "正中とは何？"
run_one "p15_turbidity" "変化を止めずに濁りだけ防ぐには？"
run_one "p16_learn3" "次回に持ち越す学習点を3つ挙げて"
run_one "p17_improve" "この対話で何を改善対象と認識した？"
run_one "p18_selfscore" "ここまでの完成度を自己採点して"

python3 "${PY_SUM}" --aggregate "${OUT_DIR}" | tee "${OUT_DIR}/forensic_aggregate.stdout" || true

if [[ -n "${BASELINE_DIR}" && -d "${BASELINE_DIR}" ]]; then
  python3 "${PY_SUP}" --bundle "${OUT_DIR}" --baseline "${BASELINE_DIR}" | tee "${OUT_DIR}/supreme_audit.stdout"
else
  python3 "${PY_SUP}" --bundle "${OUT_DIR}" | tee "${OUT_DIR}/supreme_audit.stdout"
fi

cp -f "${OUT_DIR}/supreme_audit_report.json" "${OUT_DIR}/compare_snapshot.json" 2>/dev/null || true
echo "DONE supreme audit. evidence_bundle.txt + supreme_audit_report.json"
echo "OUT_DIR=${OUT_DIR}"
