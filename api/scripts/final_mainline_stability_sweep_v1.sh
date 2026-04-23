#!/usr/bin/env bash
# FINAL_MAINLINE_STABILITY_SWEEP_V1 — 主線総合安定（人力 mainline 最終監査）
# STEP 0: build / health / PATCH29 / WILL / beauty / language essence / HRL task / density ledger / memory 非干渉（軽量）
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/final_mainline_stability_sweep_v1.sh [OUT_DIR]
#
# 環境変数:
#   TENMON_DATA_DIR — kokuzo.sqlite 所在（既定 /opt/tenmon-ark-data）
#   SKIP_SQLITE_CHECKS=1 — DB ファイルが無い環境では ledger 検査をスキップ
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-/tmp/final_mainline_stability_sweep_v1_${TS}}"
mkdir -p "$OUT_DIR"
LOG="$OUT_DIR/FINAL_MAINLINE_STABILITY_SWEEP_V1.log"
exec > >(tee -a "$LOG") 2>&1

echo "== FINAL_MAINLINE_STABILITY_SWEEP_V1 =="
echo "BASE=$BASE OUT_DIR=$OUT_DIR"
echo

fail() { echo "[FAIL] $*"; exit 1; }

echo "== 1) build =="
npm run build || fail "npm run build"

echo
echo "== 2) health =="
curl -fsS "$BASE/health" >"$OUT_DIR/health.json" || fail "health curl"
python3 - <<'PY' "$OUT_DIR/health.json" || fail "health json"
import json, sys
p = sys.argv[1]
j = json.load(open(p, encoding="utf-8"))
if j.get("status") != "ok":
    sys.exit(1)
print("[PASS] health status=ok")
PY

echo
echo "== 3) PATCH29 (8 probe + ku 期待) =="
export BASE
bash scripts/patch29_probe_8_sweep.sh "$OUT_DIR/patch29" || fail "patch29 sweep"

python3 - <<'PY' "$OUT_DIR/patch29" || fail "patch29 expectations"
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
expect = {
    "compare":    "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1",
    "selfaware":  "R22_SELFAWARE_CONSCIOUSNESS_V1",
    "systemdiag": "SYSTEM_DIAGNOSIS_PREEMPT_V1",
    "future":     "R22_FUTURE_OUTLOOK_V1",
    "judgement":  "R22_JUDGEMENT_PREEMPT_V1",
    "essence":    "R22_ESSENCE_ASK_V1",
    "structure":  "TENMON_STRUCTURE_LOCK_V1",
    "explicit":   "EXPLICIT_CHAR_PREEMPT_V1",
}
bad = []
for name, want_rr in expect.items():
    p = out / f"{name}.json"
    j = json.loads(p.read_text(encoding="utf-8"))
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    got = ku.get("routeReason")
    if got != want_rr:
        bad.append(f"{name}: got {got!r} want {want_rr!r}")
    if not ku.get("responsePlan"):
        bad.append(f"{name}: missing responsePlan")
if bad:
    print("\n".join(bad))
    sys.exit(1)
print("[PASS] PATCH29 routeReason x8 + responsePlan")
PY

echo
echo "== 4) WILL_CORE_RUNTIME_PROBE_V1 =="
bash scripts/will_core_runtime_probe_v1.sh "$OUT_DIR/will_core" || fail "will_core probe"

echo
echo "== 5) BEAUTY_COMPILER probe =="
BEAUTY_TID="final-sweep-beauty-${TS}"
BEAUTY_MSG='この文章をもっと美しい日本語に整えてください。'
jq -n --arg m "$BEAUTY_MSG" --arg t "$BEAUTY_TID" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/beauty.json" || fail "beauty curl"
python3 - <<'PY' "$OUT_DIR/beauty.json" || fail "beauty acceptance"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
if ku.get("routeReason") != "BEAUTY_COMPILER_PREEMPT_V1":
    sys.exit("routeReason want BEAUTY_COMPILER_PREEMPT_V1 got %r" % ku.get("routeReason"))
if not ku.get("responsePlan"):
    sys.exit("missing responsePlan")
resp = str(j.get("response") or "")
if "KHSL:LAW:" in resp:
    sys.exit("KHSL:LAW leak in response")
print("[PASS] BEAUTY_COMPILER_PREEMPT_V1")
PY

echo
echo "== 6) LANGUAGE_ESSENCE probe =="
LE_TID="final-sweep-le-${TS}"
LE_MSG='言語の本質とは何ですか？'
jq -n --arg m "$LE_MSG" --arg t "$LE_TID" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/language_essence.json" || fail "language essence curl"
python3 - <<'PY' "$OUT_DIR/language_essence.json" || fail "language essence acceptance"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
if ku.get("routeReason") != "LANGUAGE_ESSENCE_PREEMPT_V1":
    sys.exit("routeReason want LANGUAGE_ESSENCE_PREEMPT_V1 got %r" % ku.get("routeReason"))
if not ku.get("responsePlan"):
    sys.exit("missing responsePlan")
resp = str(j.get("response") or "")
if "KHSL:LAW:" in resp:
    sys.exit("KHSL:LAW leak")
if "言語の本質" not in resp and "意味" not in resp:
    sys.exit("expected human prose markers missing")
print("[PASS] LANGUAGE_ESSENCE_PREEMPT_V1")
PY

echo
echo "== 7) task / followup / human-readable law (surface) =="
HRL_TID="final-sweep-hrl-${TS}"
for key in task followup thin; do
  case "$key" in
    task)   MSG='いま何を直すべき？' ;;
    followup) MSG='次の一手は？' ;;
    thin)   MSG='なぜ薄くなるの？' ;;
  esac
  TID="${HRL_TID}-${key}"
  jq -n --arg m "$MSG" --arg t "$TID" '{message:$m,threadId:$t,mode:"NATURAL"}' \
    | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/hrl_${key}.json" || fail "hrl $key curl"
done
python3 - <<'PY' "$OUT_DIR" || fail "hrl acceptance"
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
# followup 短問は R22_NEXTSTEP_FOLLOWUP_V1 等で responsePlan が付かない経路があり得る（契約は ku 内で保持）
FOLLOWUP_OK_WITHOUT_RP = frozenset(
    {
        "R22_NEXTSTEP_FOLLOWUP_V1",
        "NATURAL_FALLBACK",
    }
)
for key in ("task", "followup", "thin"):
    j = json.loads((out / f"hrl_{key}.json").read_text(encoding="utf-8"))
    resp = str(j.get("response") or "")
    if "KHSL:LAW:" in resp:
        sys.exit("KHSL:LAW in hrl_%s" % key)
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    rr = ku.get("routeReason")
    rp = ku.get("responsePlan")
    if not rp:
        if rr not in FOLLOWUP_OK_WITHOUT_RP:
            sys.exit("hrl_%s: missing responsePlan and routeReason %r not exempt" % (key, rr))
        if len(resp) < 24:
            sys.exit("hrl_%s: empty surface" % key)
    if not rr:
        sys.exit("hrl_%s: missing routeReason" % key)
print("[PASS] HRL surface (no KHSL leak, responsePlan or exempt followup route)")
PY

echo
echo "== 8) density ledger insert =="
DEN_TID="final-sweep-density-${TS}"
jq -n --arg t "$DEN_TID" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/density_chat.json" || fail "density chat"
KDATA="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}/kokuzo.sqlite"
if [[ "${SKIP_SQLITE_CHECKS:-}" == "1" ]]; then
  echo "[SKIP] SKIP_SQLITE_CHECKS=1 density ledger sqlite"
else
  if [[ ! -f "$KDATA" ]]; then
    echo "[WARN] kokuzo.sqlite not found at $KDATA — set TENMON_DATA_DIR or SKIP_SQLITE_CHECKS=1"
    fail "density ledger sqlite missing"
  fi
  CNT="$(sqlite3 -readonly "$KDATA" "SELECT COUNT(*) FROM conversation_density_ledger_runtime_v1 WHERE thread_id='${DEN_TID}';" 2>/dev/null || echo 0)"
  if [[ "${CNT:-0}" -lt 1 ]]; then
    fail "density ledger: expected row for thread_id=${DEN_TID}, count=${CNT}"
  fi
  echo "[PASS] density ledger rows for ${DEN_TID}: ${CNT}"
fi

echo
echo "== 9) memory inheritance — cross-thread marker non-mix (best-effort) =="
MEM_TS="${TS}"
TA="final-sweep-mem-a-${MEM_TS}"
TB="final-sweep-mem-b-${MEM_TS}"
TOK_A="MEMSWEEP_ALPHA_${MEM_TS}"
TOK_B="MEMSWEEP_BETA_${MEM_TS}"
jq -n --arg m "このスレッド専用トークンは ${TOK_A} です。以後これだけ覚えてください。" --arg t "$TA" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/mem_a1.json" || fail "mem a1"
jq -n --arg m "このスレッド専用トークンは ${TOK_B} です。以後これだけ覚えてください。" --arg t "$TB" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/mem_b1.json" || fail "mem b1"
jq -n --arg m "直前に伝えたスレッド専用トークンを一字一句そのまま繰り返してください。" --arg t "$TA" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$OUT_DIR/mem_a2.json" || fail "mem a2"
python3 - <<PY || fail "memory cross contamination"
import json, pathlib, sys
out = pathlib.Path("${OUT_DIR}")
tok_b = "${TOK_B}"
r = str(json.load(open(out / "mem_a2.json", encoding="utf-8")).get("response") or "")
if tok_b in r:
    sys.exit("cross-thread token leak: B token in thread A response")
print("[PASS] no obvious cross-thread token leak (thread A follow-up)")
PY

echo
echo "== RESULT: FINAL_MAINLINE_STABILITY_SWEEP_V1 PASS =="
echo "log: $LOG"
echo "artifacts: $OUT_DIR"
