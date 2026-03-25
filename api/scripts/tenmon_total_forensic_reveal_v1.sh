#!/usr/bin/env bash
# TENMON_TOTAL_FORENSIC_REVEAL_V1 — VPS 総合フォレンジック観測（読み取り中心・失敗しても証拠束を残す）
set -u
set +e

CARD="${CARD:-TENMON_TOTAL_FORENSIC_REVEAL_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
AUT="$API/automation"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${TENMON_TOTAL_FORENSIC_OUT_DIR:-$AUT/out/tenmon_total_forensic_reveal_v1/$TS}"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

mkdir -p "$OUT"

COLLECT_PY="$AUT/tenmon_total_forensic_collect_v1.py"
INTEGRATE_PY="$AUT/tenmon_total_forensic_integrate_v1.py"
WORLD_PY="$AUT/tenmon_chat_ts_worldclass_completion_report_v1.py"
ORCH_PY="$AUT/full_orchestrator_v1.py"

echo "[$CARD] OUT=$OUT BASE=$BASE"

cd "$API" || exit 1

# --- typecheck（dist は書かない）---
npm run check >"$OUT/typecheck.log" 2>&1
echo $? >"$OUT/typecheck.rc"

# --- health / audit / runtime_matrix / chat 静的 ---
python3 "$COLLECT_PY" --out-dir "$OUT" --base-url "$BASE" >>"$OUT/collect.log" 2>&1

# --- worldclass 静的レポート（本体スクリプトを呼ぶだけ・改変なし）---
export CHAT_TS_PROBE_BASE_URL="${BASE}"
set +e
python3 "$WORLD_PY" --stdout-json >"$OUT/worldclass_report.json" 2>"$OUT/worldclass.stderr"
_WRC=$?
if [[ "$_WRC" -ne 0 ]] || [[ ! -s "$OUT/worldclass_report.json" ]]; then
  python3 - <<PY
import json, pathlib
p = pathlib.Path("$OUT/worldclass_report.json")
err = pathlib.Path("$OUT/worldclass.stderr").read_text(encoding="utf-8", errors="replace")[-8000:]
p.write_text(json.dumps({
  "error": "worldclass_report_script_failed",
  "exit_code": ${_WRC:-1},
  "stderr_tail": err,
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
fi

# --- seal verdict（読み取りのみ）---
SEAL=""
if [[ -n "${TENMON_ORCHESTRATOR_SEAL_DIR:-}" ]]; then
  SEAL="${TENMON_ORCHESTRATOR_SEAL_DIR}"
elif [[ -L /var/log/tenmon/card ]] || [[ -d /var/log/tenmon/card ]]; then
  SEAL="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
fi
if [[ -n "$SEAL" && -f "$SEAL/final_verdict.json" ]]; then
  cp -a "$SEAL/final_verdict.json" "$OUT/seal_verdict.json"
else
  export OUT
  SEAL="$SEAL" python3 - <<'PY'
import json, os, pathlib
seal = (os.environ.get("SEAL") or "").strip()
pathlib.Path(os.environ["OUT"]).joinpath("seal_verdict.json").write_text(
    json.dumps(
        {
            "missing": True,
            "note": "final_verdict.json not found (set TENMON_ORCHESTRATOR_SEAL_DIR or run runtime seal)",
            "resolved_seal_dir": seal or None,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
PY
fi

# --- full orchestrator（読み取りのみ）---
ORCH_SNAP="$OUT/orchestrator_snap"
mkdir -p "$ORCH_SNAP"
export TENMON_ORCHESTRATOR_SEAL_DIR="${SEAL:-}"
export TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR="${TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR:-$AUT/out/tenmon_kokuzo_learning_improvement_os_v1}"
python3 "$ORCH_PY" --out-dir "$ORCH_SNAP" --stdout-json >"$OUT/orchestrator_run.log" 2>&1 || true

python3 - <<PY
import json
from pathlib import Path
out = Path("$OUT")
snap = Path("$ORCH_SNAP")
q_path = snap / "full_orchestrator_queue.json"
m_path = snap / "full_orchestrator_manifest.json"
rep = {}
if q_path.is_file():
    rep["queue"] = json.loads(q_path.read_text(encoding="utf-8"))
if m_path.is_file():
    rep["manifest"] = json.loads(m_path.read_text(encoding="utf-8"))
(out / "orchestrator_report.json").write_text(
    json.dumps(rep if rep else {"error": "orchestrator_snap_empty"}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
PY

# --- kokuzo learning 統合（ファイルがあればコピー）---
KOKUZO_DEFAULT="$AUT/out/tenmon_kokuzo_learning_improvement_os_v1/integrated_learning_verdict.json"
KOKUZO_SRC="${TENMON_FORENSIC_KOKUZO_VERDICT:-$KOKUZO_DEFAULT}"
if [[ -f "$KOKUZO_SRC" ]]; then
  cp -a "$KOKUZO_SRC" "$OUT/kokuzo_learning_report.json"
else
  echo '{"missing":true,"note":"integrated_learning_verdict.json not found"}' >"$OUT/kokuzo_learning_report.json"
fi

# --- 統合 verdict / next priority ---
python3 "$INTEGRATE_PY" --out-dir "$OUT" >>"$OUT/integrate.log" 2>&1

# --- VPS マーカー & latest リンク ---
echo "${CARD}
${TS}
$(date -u +%Y-%m-%dT%H:%M:%SZ)
" >"$OUT/TENMON_TOTAL_FORENSIC_REVEAL_V1"

mkdir -p "$AUT/out/tenmon_total_forensic_reveal_v1"
ln -sfn "$OUT" "$AUT/out/tenmon_total_forensic_reveal_v1/latest"

echo "[$CARD] done → $OUT"
echo "[$CARD] integrated_forensic_verdict.json / next_priority_cards.json"

exit 0
