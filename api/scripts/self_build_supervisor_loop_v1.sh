#!/usr/bin/env bash
# SELF_BUILD_SUPERVISOR_LOOP_V1 — 1 サイクル + 失敗経路シミュレーション + evidenceBundlePath
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/self_build_supervisor_loop_v1.sh [EVIDENCE_ROOT]
#
# 前提: npm run build 後に API を再起動済み（SKIP_NPM_BUILD=1 で build を省略可）
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE_ROOT="${1:-/tmp/self_build_supervisor_loop_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
LOG="$EVIDENCE_ROOT/SELF_BUILD_SUPERVISOR_LOOP_V1.log"
exec > >(tee -a "$LOG") 2>&1

LOCAL_HDR=(-H "x-tenmon-local-test: 1")

echo "== SELF_BUILD_SUPERVISOR_LOOP_V1 evidence=$EVIDENCE_ROOT BASE=$BASE"

if [[ "${SKIP_NPM_BUILD:-}" == "1" ]]; then
  echo "[SKIP_NPM_BUILD=1] npm run build omitted"
else
  echo "== npm run build =="
  npm run build
fi

echo "== health =="
curl -fsS "$BASE/health" >"$EVIDENCE_ROOT/health.json"
python3 - <<'PY' "$EVIDENCE_ROOT/health.json"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("status") == "ok", j
PY

echo "== supervisor cycle (PASS path) =="
curl -fsS "${LOCAL_HDR[@]}" "$BASE/api/audit/supervisor/self-build-loop-v1" >"$EVIDENCE_ROOT/cycle_pass.json"
python3 - <<'PY' "$EVIDENCE_ROOT/cycle_pass.json"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ok") is True, j
assert j.get("v") == "SELF_BUILD_SUPERVISOR_LOOP_V1"
ph = j.get("phases") or {}
assert ph.get("observe"), ph
assert ph.get("decide"), ph
assert ph.get("dispatch"), ph
assert ph.get("acceptance"), ph
om = j.get("omega") or {}
assert om.get("nextCard"), om
ac = ph.get("acceptance") or {}
st = ac.get("status")
print("[INFO] acceptance.status=", st, "omega.kind=", om.get("kind"), "nextCard=", om.get("nextCard"))
if st != "pass":
    print("[WARN] acceptance not pass (constitution pending or not ready) — サイクル記録は成立")
PY

echo "== supervisor simulate rollback (fail → rollback) =="
curl -fsS "${LOCAL_HDR[@]}" -H "Content-Type: application/json" \
  -d '{"simulateOutcome":"rollback"}' -X POST "$BASE/api/audit/supervisor/self-build-loop-v1" \
  >"$EVIDENCE_ROOT/cycle_sim_rollback.json"
python3 - <<'PY' "$EVIDENCE_ROOT/cycle_sim_rollback.json"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ok") is True
om = j.get("omega") or {}
assert om.get("kind") == "rollback"
assert (j.get("phases") or {}).get("acceptance", {}).get("status") == "fail"
assert om.get("nextCardDispatch") == "blocked_quarantine"
print("[PASS] rollback path")
PY

echo "== supervisor simulate quarantine =="
curl -fsS "${LOCAL_HDR[@]}" -H "Content-Type: application/json" \
  -d '{"simulateOutcome":"quarantine"}' -X POST "$BASE/api/audit/supervisor/self-build-loop-v1" \
  >"$EVIDENCE_ROOT/cycle_sim_quarantine.json"
python3 - <<'PY' "$EVIDENCE_ROOT/cycle_sim_quarantine.json"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ok") is True
om = j.get("omega") or {}
assert om.get("kind") == "quarantine"
assert (j.get("phases") or {}).get("acceptance", {}).get("status") == "fail"
print("[PASS] quarantine path")
PY

python3 - <<PY "$EVIDENCE_ROOT"
import json, pathlib, datetime, sys
root = pathlib.Path(sys.argv[1])
# 公式サイクル記録は PASS 応答を正とする
main = json.loads((root / "cycle_pass.json").read_text(encoding="utf-8"))
env = {
    "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
    "cardId": "SELF_BUILD_SUPERVISOR_LOOP_V1",
    "evidenceBundlePath": str(root),
    "acceptancePlan": "build+health+supervisor cycle JSON; rollback/quarantine simulate",
    "nextCard": (main.get("omega") or {}).get("nextCard"),
    "omegaKind": (main.get("omega") or {}).get("kind"),
    "completedAtUtc": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
}
(root / "envelope.json").write_text(json.dumps(env, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("[OK] envelope.json")
PY

echo
echo "== ALL DONE: $EVIDENCE_ROOT =="
