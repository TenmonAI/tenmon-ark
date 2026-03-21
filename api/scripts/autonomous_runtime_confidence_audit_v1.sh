#!/usr/bin/env bash
# AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1 — 連続監査 + confidence + 証跡
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/autonomous_runtime_confidence_audit_v1.sh [EVIDENCE_ROOT]
#
# 任意: EXPECTED_EVIDENCE_DIR — 前回 supervisor の envelope 親ディレクトリが存在するかだけ検査
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE_ROOT="${1:-/tmp/autonomous_runtime_confidence_audit_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
LOG="$EVIDENCE_ROOT/AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1.log"
exec > >(tee -a "$LOG") 2>&1

echo "== AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1 evidence=$EVIDENCE_ROOT BASE=$BASE"

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

echo "== GET /api/audit/autonomous-runtime-confidence-v1 =="
curl -fsS "$BASE/api/audit/autonomous-runtime-confidence-v1" >"$EVIDENCE_ROOT/confidence_audit.json"

python3 - <<'PY' "$EVIDENCE_ROOT/confidence_audit.json"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
assert j.get("ok") is True, j
assert j.get("v") == "AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1"
cf = j.get("confidence") or {}
assert "aggregateConfidence" in cf, cf
assert "supervisorStability" in cf
man = j.get("manifest") or {}
cyc = man.get("supervisorNaturalCycles") or []
assert len(cyc) == 3, cyc
nc = {x.get("nextCard") for x in cyc}
assert len(nc) == 1, nc
sim = man.get("simulatedPaths") or {}
rb = sim.get("rollback") or {}
qb = sim.get("quarantine") or {}
assert rb.get("omegaKind") == "rollback"
assert rb.get("acceptanceStatus") == "fail"
assert qb.get("omegaKind") == "quarantine"
assert qb.get("acceptanceStatus") == "fail"
assert j.get("nextCard") == "SEED_LEARNING_EFFECT_AUDIT_V1"
print("[PASS] confidence audit structure + 3 cycles + sim paths + single nextCard")
print("[INFO] aggregateConfidence=", cf.get("aggregateConfidence"), "staleDist=", (man.get("staleDistHeuristic") or {}).get("suspected"))
PY

if [[ -n "${EXPECTED_EVIDENCE_DIR:-}" ]]; then
  echo "== optional evidence dir check: $EXPECTED_EVIDENCE_DIR =="
  test -d "$EXPECTED_EVIDENCE_DIR" || { echo "[FAIL] missing EXPECTED_EVIDENCE_DIR"; exit 1; }
  test -f "$EXPECTED_EVIDENCE_DIR/envelope.json" || echo "[WARN] envelope.json missing under EXPECTED_EVIDENCE_DIR"
fi

python3 - <<PY "$EVIDENCE_ROOT"
import json, pathlib, datetime, sys
root = pathlib.Path(sys.argv[1])
main = json.loads((root / "confidence_audit.json").read_text(encoding="utf-8"))
env = {
    "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
    "cardId": "AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1",
    "evidenceBundlePath": str(root),
    "acceptancePlan": "build+health+autonomous-runtime-confidence-v1 JSON; 3 supervisor summaries; rollback/quarantine sim",
    "nextCard": main.get("nextCard"),
    "aggregateConfidence": (main.get("confidence") or {}).get("aggregateConfidence"),
    "completedAtUtc": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
}
(root / "envelope.json").write_text(json.dumps(env, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
mani = {
    "auditCard": "AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1",
    "generatedAtUtc": env["completedAtUtc"],
    "artifacts": ["health.json", "confidence_audit.json", "envelope.json", "AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1.log"],
    "evidenceBundlePath": str(root),
}
(root / "CONFIDENCE_AUDIT_MANIFEST.json").write_text(json.dumps(mani, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("[OK] envelope.json + CONFIDENCE_AUDIT_MANIFEST.json")
PY

echo
echo "== ALL DONE: $EVIDENCE_ROOT =="
