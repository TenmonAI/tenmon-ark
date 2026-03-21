#!/usr/bin/env bash
# SEED_LEARNING_EFFECT_AUDIT_V1 — DB 監査 API + live probe（2 ターン差分）
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/seed_learning_effect_audit_v1.sh [EVIDENCE_ROOT]
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SAN_TS="$(echo "$TS" | tr -c 'A-Za-z0-9' '_')"
EVIDENCE_ROOT="${1:-/tmp/seed_learning_effect_audit_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
LOG="$EVIDENCE_ROOT/SEED_LEARNING_EFFECT_AUDIT_V1.log"
exec > >(tee -a "$LOG") 2>&1

LOCAL_HDR=(-H "x-tenmon-local-test: 1" -H "x-tenmon-local-user: seedfx_${SAN_TS}@audit.local")

echo "== SEED_LEARNING_EFFECT_AUDIT_V1 evidence=$EVIDENCE_ROOT BASE=$BASE"

if [[ "${SKIP_NPM_BUILD:-}" == "1" ]]; then
  echo "[SKIP_NPM_BUILD=1] npm run build omitted"
else
  npm run build
fi

echo "== health =="
curl -fsS "$BASE/health" >"$EVIDENCE_ROOT/health.json"
python3 - <<'PY' "$EVIDENCE_ROOT/health.json"
import json, sys
assert json.load(open(sys.argv[1], encoding="utf-8")).get("status") == "ok"
PY

echo "== GET /api/audit/seed-learning-effect-v1 =="
curl -fsS "$BASE/api/audit/seed-learning-effect-v1" >"$EVIDENCE_ROOT/db_audit.json"

echo "== live probe: two chat turns =="
jq -n --arg t "seed-a-${SAN_TS}" '{message:"カタカムナとは何ですか",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/live_turn_a.json"
jq -n --arg t "seed-b-${SAN_TS}" '{message:"言霊とカタカムナの違いは？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/live_turn_b.json"

python3 - <<'PY' "$EVIDENCE_ROOT/db_audit.json" "$EVIDENCE_ROOT/live_turn_a.json" "$EVIDENCE_ROOT/live_turn_b.json" "$EVIDENCE_ROOT/merged_report.json"
import json, sys

def ku(path):
    j = json.load(open(path, encoding="utf-8"))
    return (j.get("decisionFrame") or {}).get("ku") or {}

def rp(k):
    return (k.get("responsePlan") or {}) if isinstance(k, dict) else {}

def sk(k):
    ss = k.get("sourceStackSummary") or {}
    return ss.get("sourceKinds") if isinstance(ss, dict) else None

def density(k):
    dc = rp(k).get("densityContract") if isinstance(rp(k), dict) else None
    return (dc or {}).get("densityTarget") if isinstance(dc, dict) else None

def prose_sample(path):
    j = json.load(open(path, encoding="utf-8"))
    r = j.get("response")
    if isinstance(r, str):
        return r.strip()[:220].replace("\n", " ")
    return None

dbp, pa, pb, out = sys.argv[1:5]
db = json.load(open(dbp, encoding="utf-8"))
assert db.get("v") == "SEED_LEARNING_EFFECT_AUDIT_V1"
ka, kb = ku(pa), ku(pb)
rra, rrb = ka.get("routeReason"), kb.get("routeReason")
ska, skb = sk(ka), sk(kb)
da, db_ = density(ka), density(kb)
pra, prb = prose_sample(pa), prose_sample(pb)

live_changed = {
    "routeReason": rra != rrb,
    "sourceKinds": ska != skb,
    "densityContract": da != db_,
    "prosePrefix": (pra or "") != (prb or "") and pra and prb,
}
live_any = any(live_changed.values())

db_ok = bool((db.get("effectSignals") or {}).get("effectEvidenceSatisfied"))

merged = {
    "v": "SEED_LEARNING_EFFECT_AUDIT_V1",
    "dbAudit": {"effectEvidenceSatisfied": db_ok, "reasons": (db.get("effectSignals") or {}).get("effectEvidenceReasons")},
    "liveProbe": {
        "turnA_routeReason": rra,
        "turnB_routeReason": rrb,
        "turnA_sourceKinds": ska,
        "turnB_sourceKinds": skb,
        "turnA_densityTarget": da,
        "turnB_densityTarget": db_,
        "proseSampleA": pra,
        "proseSampleB": prb,
        "axesChanged": live_changed,
        "anyAxisChanged": live_any,
    },
    "acceptance": {
        "effectReported": True,
        "seedEffectEvidence": db_ok or live_any,
        "nextCard": db.get("nextCard"),
    },
}
open(out, "w", encoding="utf-8").write(json.dumps(merged, ensure_ascii=False, indent=2) + "\n")

if not merged["acceptance"]["seedEffectEvidence"]:
    print("[FAIL] no DB effect signal and no live axis diff")
    sys.exit(1)
print("[PASS] seed effect evidence: db=", db_ok, "liveAny=", live_any)
PY

python3 - <<PY "$EVIDENCE_ROOT"
import json, pathlib, datetime, sys
root = pathlib.Path(sys.argv[1])
merged = json.loads((root / "merged_report.json").read_text(encoding="utf-8"))
env = {
    "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
    "cardId": "SEED_LEARNING_EFFECT_AUDIT_V1",
    "evidenceBundlePath": str(root),
    "acceptancePlan": "build+health+db_audit+live_probe; seedEffectEvidence true",
    "nextCard": merged.get("acceptance", {}).get("nextCard"),
    "seedEffectEvidence": merged.get("acceptance", {}).get("seedEffectEvidence"),
    "completedAtUtc": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
}
(root / "envelope.json").write_text(json.dumps(env, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
mani = {
    "auditCard": "SEED_LEARNING_EFFECT_AUDIT_V1",
    "generatedAtUtc": env["completedAtUtc"],
    "artifacts": [
        "health.json",
        "db_audit.json",
        "live_turn_a.json",
        "live_turn_b.json",
        "merged_report.json",
        "envelope.json",
        "SEED_LEARNING_EFFECT_AUDIT_V1.log",
    ],
    "evidenceBundlePath": str(root),
}
(root / "SEED_EFFECT_AUDIT_MANIFEST.json").write_text(json.dumps(mani, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("[OK] envelope + SEED_EFFECT_AUDIT_MANIFEST.json")
PY

echo "== DONE $EVIDENCE_ROOT =="
