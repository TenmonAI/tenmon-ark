#!/usr/bin/env bash
# TENMON-ARK 貫通フェーズ: 4 カードの API 検査 + 証跡（build/health 前提）
# 用法: cd api && BASE=http://127.0.0.1:3000 ./scripts/tenmon_through_phase_cards_v1.sh [EVIDENCE_ROOT]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BASE="${BASE:-http://127.0.0.1:3000}"
EV="${1:-/tmp/tenmon_through_phase_v1_$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$EV"
[[ "${SKIP_NPM_BUILD:-}" == "1" ]] || npm run build
curl -fsS "$BASE/health" >"$EV/health.json"

curl -fsS "$BASE/api/audit/seed-learning-effect-v1" >"$EV/card1_seed_bridge_context.json"
curl -fsS "$BASE/api/audit/meta-optimizer-bundle-v1" >"$EV/card3_meta_optimizer_bundle.json"
curl -fsS "$BASE/api/audit/evolution/intelligence-os-master-v1" >"$EV/card4_intelligence_master.json"
curl -fsS "$BASE/api/audit/cursor-action-broker-v1" >"$EV/card5_cursor_broker.json"
curl -fsS "$BASE/api/audit/prompt-to-cursor-compiler-v1?card=CURSOR_ACTION_BROKER_V1" >"$EV/card6_prompt_compiler.json"
curl -fsS "$BASE/api/audit/full-autonomous-build-loop-v1" >"$EV/card7_full_loop.json"

KDB="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}/kokuzo.sqlite"
sqlite3 -readonly "$KDB" "SELECT COUNT(*) FROM evolution_ledger_v1;" >"$EV/card2_ledger_count.txt" 2>/dev/null || echo "-1" >"$EV/card2_ledger_count.txt"

python3 - <<'PY' "$EV/card3_meta_optimizer_bundle.json" "$EV/card4_intelligence_master.json" "$EV/card2_ledger_count.txt" "$EV/card5_cursor_broker.json" "$EV/card6_prompt_compiler.json" "$EV/card7_full_loop.json"
import json, sys
mo = json.load(open(sys.argv[1], encoding="utf-8"))
intel = json.load(open(sys.argv[2], encoding="utf-8"))
lc = int(open(sys.argv[3]).read().strip() or "-1")
b5 = json.load(open(sys.argv[4], encoding="utf-8"))
b6 = json.load(open(sys.argv[5], encoding="utf-8"))
b7 = json.load(open(sys.argv[6], encoding="utf-8"))
assert mo.get("suggestedCard") and mo.get("confidence") is not None
assert mo.get("nextCard") == mo.get("suggestedCard")
assert intel.get("sixAxes")
assert intel.get("completionLevel")
assert intel.get("phaseNextCard")
assert isinstance(intel.get("finalResiduals"), list)
assert b5.get("v") == "CURSOR_ACTION_BROKER_V1" and b5.get("states")
assert b6.get("v") == "PROMPT_TO_CURSOR_COMPILER_V1" and b6.get("compiledPrompt")
assert b7.get("v") == "FULL_AUTONOMOUS_BUILD_LOOP_V1" and b7.get("loopPhases")
print("[PASS] 7-card phase bundle + intel + ledger=", lc)
PY

cat >"$EV/phase_envelope.json" <<EOF
{"card":"TENMON_THROUGH_PHASE_CARDS_V1","evidenceBundlePath":"$EV","notes":"CARD1 bridge via finalize; CARD2 evolution_ledger_v1 count in card2_ledger_count.txt"}
EOF
echo "OK $EV"
