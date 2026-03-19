#!/usr/bin/env bash
# CHAT_SAFE_REFACTOR_PATCH29_FINAL_ACCEPTANCE_SWEEP_V1
# 8 route 一括 acceptance 監査: build → restart → health → 8 probe → acceptance summary

set -euo pipefail

CARD="CHAT_SAFE_REFACTOR_PATCH29_FINAL_ACCEPTANCE_SWEEP_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

cd /opt/tenmon-ark-repo/api

echo "== build =="
npm run build

echo
echo "== restart =="
sudo systemctl restart tenmon-ark-api.service

echo
echo "== wait ready =="
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS http://127.0.0.1:3000/health && break || sleep 1
done

probe () {
  local name="$1"
  local msg="$2"
  local tid="$3"
  curl -sS http://127.0.0.1:3000/api/chat \
    -H 'content-type: application/json' \
    --data "{\"message\":\"${msg}\",\"threadId\":\"${tid}\",\"mode\":\"NATURAL\"}" \
    > "$DIR/probe.${name}.json"
  echo "saved: $DIR/probe.${name}.json"
}

echo
echo "== probes =="
probe compare    "言霊とカタカムナの違いは？"             "patch29-compare"
probe selfaware  "天聞アークに意識はあるの？"             "patch29-selfaware"
probe systemdiag "天聞アークの現状を診断して"             "patch29-systemdiag"
probe future     "天聞アークの今後はどうなる？"           "patch29-future"
probe judgement  "この方針でいい？"                       "patch29-judgement"
probe essence    "要するに？"                             "patch29-essence"
probe structure  "天聞アークの構造はどうなっている？"     "patch29-structure"
probe explicit   "1000文字で天聞アークの思考回路を説明してくれ" "patch29-explicit"

echo
echo "== acceptance summary =="
python3 - <<'PY'
import json, pathlib

dirp = pathlib.Path("/var/log/tenmon/card").resolve()
names = ["compare","selfaware","systemdiag","future","judgement","essence","structure","explicit"]
rows = []

for n in names:
    p = dirp / f"probe.{n}.json"
    obj = json.loads(p.read_text())
    df = obj.get("decisionFrame") or {}
    ku = df.get("ku") or {}
    rp = ku.get("responsePlan") or {}
    rows.append({
        "file": p.name,
        "routeReason": ku.get("routeReason"),
        "routeClass": ku.get("routeClass"),
        "answerLength": ku.get("answerLength"),
        "answerMode": ku.get("answerMode"),
        "answerFrame": ku.get("answerFrame"),
        "hasResponsePlan": bool(ku.get("responsePlan")),
        "responsePlan.routeReason": rp.get("routeReason"),
        "responseHead": str(obj.get("response",""))[:160],
    })

print(json.dumps(rows, ensure_ascii=False, indent=2))
PY

echo
echo "== acceptance check (expectations) =="
python3 - <<PY
import json, pathlib, sys

dirp = pathlib.Path("/var/log/tenmon/card").resolve()
expect = {
    "compare":    {"routeReason": "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1", "routeClass": "analysis", "answerLength": "medium", "answerMode": "analysis", "answerFrame": "statement_plus_one_question", "hasResponsePlan": True, "responsePlan.routeReason": "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1"},
    "selfaware":  {"routeReason": "R22_SELFAWARE_CONSCIOUSNESS_V1", "routeClass": "selfaware", "answerLength": "short", "answerMode": "analysis", "answerFrame": "one_step", "hasResponsePlan": True, "responsePlan.routeReason": "R22_SELFAWARE_CONSCIOUSNESS_V1"},
    "systemdiag": {"routeReason": "SYSTEM_DIAGNOSIS_PREEMPT_V1", "routeClass": "analysis", "answerLength": "short", "answerMode": "analysis", "answerFrame": "statement_plus_one_question", "hasResponsePlan": True, "responsePlan.routeReason": "SYSTEM_DIAGNOSIS_PREEMPT_V1"},
    "future":     {"routeReason": "R22_FUTURE_OUTLOOK_V1", "routeClass": "analysis", "answerLength": "short", "answerMode": "analysis", "answerFrame": "one_step", "hasResponsePlan": True, "responsePlan.routeReason": "R22_FUTURE_OUTLOOK_V1"},
    "judgement":  {"routeReason": "R22_JUDGEMENT_PREEMPT_V1", "routeClass": "judgement", "answerLength": "short", "answerMode": "analysis", "answerFrame": "one_step", "hasResponsePlan": True, "responsePlan.routeReason": "R22_JUDGEMENT_PREEMPT_V1"},
    "essence":    {"routeReason": "R22_ESSENCE_ASK_V1", "routeClass": "analysis", "answerLength": "short", "answerMode": "analysis", "answerFrame": "one_step", "hasResponsePlan": True, "responsePlan.routeReason": "R22_ESSENCE_ASK_V1"},
    "structure":  {"routeReason": "TENMON_STRUCTURE_LOCK_V1", "routeClass": "analysis", "answerLength": "medium", "answerMode": "define", "answerFrame": "statement_plus_one_question", "hasResponsePlan": True, "responsePlan.routeReason": "TENMON_STRUCTURE_LOCK_V1"},
    "explicit":   {"routeReason": "EXPLICIT_CHAR_PREEMPT_V1", "routeClass": "analysis", "answerLength": "long", "answerMode": "analysis", "answerFrame": "one_step", "hasResponsePlan": True, "responsePlan.routeReason": "EXPLICIT_CHAR_PREEMPT_V1"},
}
failed = []
for name, want in expect.items():
    p = dirp / f"probe.{name}.json"
    obj = json.loads(p.read_text())
    ku = (obj.get("decisionFrame") or {}).get("ku") or {}
    rp = ku.get("responsePlan") or {}
    got = {
        "routeReason": ku.get("routeReason"),
        "routeClass": ku.get("routeClass"),
        "answerLength": ku.get("answerLength"),
        "answerMode": ku.get("answerMode"),
        "answerFrame": ku.get("answerFrame"),
        "hasResponsePlan": bool(ku.get("responsePlan")),
        "responsePlan.routeReason": rp.get("routeReason"),
    }
    for k, v in want.items():
        if got.get(k) != v:
            failed.append(f"{name}.{k}: got {got.get(k)!r} want {v!r}")
if failed:
    for f in failed:
        print(f"[FAIL] {f}")
    sys.exit(1)
print("[PASS] all 8 routes match expectations")
PY

echo
echo "[REPORT_DIR] $DIR"
