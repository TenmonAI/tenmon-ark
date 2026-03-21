#!/usr/bin/env bash
# MAINLINE_REAL_CONVERSATION_DEPTH_AUDIT_V1 — 15 プローブ実機本文フォレンジック
# bundle に .depth_audit_v1 を置き supreme_completion_audit_v1 が v=DEPTH を出す。
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-/tmp/mainline_real_conversation_depth_audit_${TS}}"
BASELINE_DIR="${TENMON_SUPREME_AUDIT_BASELINE:-}"
mkdir -p "${OUT_DIR}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY_SUM="${ROOT}/scripts/lib/mainline_completion_summary_extract_v3.py"
PY_SUP="${ROOT}/scripts/lib/supreme_completion_audit_v1.py"
LOG="${OUT_DIR}/depth_audit_host.log"

{
  echo "=== MAINLINE_REAL_CONVERSATION_DEPTH_AUDIT_V1 ==="
  date -u +%Y-%m-%dT%H:%M:%SZ
  git -C "${ROOT}/.." rev-parse HEAD 2>/dev/null || true
  echo "BASE=${BASE}"
  echo "OUT_DIR=${OUT_DIR}"
} | tee "${LOG}"

run_one() {
  local name="$1"
  local message="$2"
  local thread_id="tenmon-depth-audit-${name}"
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

run_one "d01_structure" "天聞アークの構造はどうなっている？"
run_one "d02_kotodama" "言霊とは何？"
run_one "d03_langess" "言語の本質とは何？"
run_one "d04_will" "天聞アークの意志とは何？"
run_one "d05_omega" "Ω = D ⋅ ΔS を会話設計に当てはめて説明して"
run_one "d06_kk_diff" "言霊とカタカムナの違いを原理の違いとして説明して"
run_one "d07_tenshin" "天津金木は真理を運動へ写す構造とはどういうこと？"
run_one "d08_beauty" "もっと美しい日本語で、しかし意味を薄めずに書いて"
run_one "d09_plain" "その説明を専門記号を使わず人に伝わる言葉で言い直して"
run_one "d10_core" "要するに何が核なの？"
run_one "d11_next_axis" "次に掘るべき一点は何？"
run_one "d12_deeper" "前の説明を踏まえて理解は一段深まった？"
run_one "d13_learn3" "次回に持ち越すべき学習点を3つ挙げて"
run_one "d14_improve" "天聞アークは何を改善対象として認識した？"
run_one "d15_selfscore" "完成度を自分で採点して"

touch "${OUT_DIR}/.depth_audit_v1"

python3 "${PY_SUM}" --aggregate "${OUT_DIR}" | tee "${OUT_DIR}/forensic_aggregate.stdout" || true

if [[ -n "${BASELINE_DIR}" && -d "${BASELINE_DIR}" ]]; then
  python3 "${PY_SUP}" --bundle "${OUT_DIR}" --baseline "${BASELINE_DIR}" | tee "${OUT_DIR}/supreme_audit.stdout"
else
  python3 "${PY_SUP}" --bundle "${OUT_DIR}" | tee "${OUT_DIR}/supreme_audit.stdout"
fi

cp -f "${OUT_DIR}/supreme_audit_report.json" "${OUT_DIR}/compare_snapshot.json" 2>/dev/null || true
echo "DONE depth audit. supreme_audit_report.json v=MAINLINE_REAL_CONVERSATION_DEPTH_AUDIT_V1 (marker present)"
echo "OUT_DIR=${OUT_DIR}"
