#!/usr/bin/env bash
# TENMON_R1_20A_DETAILPLAN_STABILIZE_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_R1_20A_DETAILPLAN_STABILIZE_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"
BASE="${R1_20A_PROBE_BASE_URL:-http://127.0.0.1:3000}"

cd "$API"
npm run build

curl -fsS "$BASE/health" | tee "$DIR/health.json" >/dev/null || echo '{"ok":false}' > "$DIR/health.json"
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" >/dev/null || echo '{}' > "$DIR/audit.json"

# Phase20 / coreplan プローブ（HYBRID に流す — サーバ未起動時はスキップ）
PROBE_OUT="$DIR/detailplan_probe.json"
if curl -fsS -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"coreplan probe","threadId":"smoke-hybrid-r1-20a"}' \
  >"$PROBE_OUT" 2>/dev/null; then
  :
else
  echo '{"error":"chat_probe_skipped_or_failed"}' > "$PROBE_OUT"
fi

python3 - "$DIR" "$PROBE_OUT" <<'PY'
import json, pathlib, sys
d = pathlib.Path(sys.argv[1])
probe_path = pathlib.Path(sys.argv[2])
body = {}
try:
    body = json.loads(probe_path.read_text(encoding="utf-8", errors="replace"))
except Exception:
    body = {}
dp = body.get("detailPlan")
audit = {
    "card": "TENMON_R1_20A_DETAILPLAN_STABILIZE_V1",
    "detailPlan_is_object": isinstance(dp, dict) and not isinstance(dp, type(None)),
    "has_chainOrder": isinstance(dp, dict) and isinstance(dp.get("chainOrder"), list),
    "has_warnings": isinstance(dp, dict) and isinstance(dp.get("warnings"), list),
    "has_evidenceIds": isinstance(dp, dict) and isinstance(dp.get("evidenceIds"), list),
    "has_debug_contract": isinstance(dp, dict) and isinstance((dp.get("debug") or {}).get("detailPlanContractR1"), str),
}
(d / "p20_contract_audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
pass_ = audit["detailPlan_is_object"] and audit["has_chainOrder"] and audit["has_warnings"]
fv = {
    "version": 1,
    "card": "TENMON_R1_20A_DETAILPLAN_STABILIZE_VPS_V1",
    "pass": pass_,
    "paths": {
        "p20_contract_audit": str(d / "p20_contract_audit.json"),
        "detailplan_probe": str(probe_path),
    },
    "fail_next_cursor_card": "TENMON_R1_20A_DETAILPLAN_STABILIZE_RETRY_CURSOR_AUTO_V1",
}
(d / "final_verdict.json").write_text(json.dumps(fv, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(fv, ensure_ascii=False, indent=2))
PY

echo "[DONE] $DIR"
exit 0
