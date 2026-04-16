#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000/api/chat}"
SUKUYOU_BASE="${SUKUYOU_BASE:-http://localhost:3000/api/sukuyou/guidance}"
FEEDBACK_BASE="${FEEDBACK_BASE:-http://localhost:3000/api/feedback}"
ACCEPT_JSON="${ACCEPT_JSON:-/tmp/tenmon_hybrid_llm_public_release_acceptance_v1.json}"
MONITOR_JSON="${MONITOR_JSON:-/tmp/tenmon_public_release_log_monitor_v1.json}"

echo "[FINAL-LOCK] running acceptance..."
BASE="$BASE" SUKUYOU_BASE="$SUKUYOU_BASE" FEEDBACK_BASE="$FEEDBACK_BASE" OUT_JSON="$ACCEPT_JSON" \
  /opt/tenmon-ark-repo/api/scripts/tenmon_hybrid_llm_public_release_acceptance_v1.sh

echo "[FINAL-LOCK] running log monitor..."
BASE="$BASE" OUT_JSON="$MONITOR_JSON" \
  /opt/tenmon-ark-repo/api/scripts/tenmon_public_release_log_monitor_v1.sh >/tmp/tenmon_public_release_log_monitor_v1.stdout.json

python3 - <<'PY'
import json, os, sys

accept_path = os.environ.get("ACCEPT_JSON", "/tmp/tenmon_hybrid_llm_public_release_acceptance_v1.json")
monitor_path = os.environ.get("MONITOR_JSON", "/tmp/tenmon_public_release_log_monitor_v1.json")

with open(accept_path, "r", encoding="utf-8") as f:
    accept = json.load(f)
with open(monitor_path, "r", encoding="utf-8") as f:
    mon = json.load(f)

main_rate = float((mon.get("sample_metrics") or {}).get("main_response_rate", 0.0))
fail_rate = float((mon.get("sample_metrics") or {}).get("failsoft_rate", 1.0))
gem404 = int((mon.get("log_counts") or {}).get("gemini_404", 0))

final_pass = {
    "acceptance_all": bool(((accept.get("PASS") or {}).get("ALL"))),
    "main_response_rate_gt_90pct": main_rate > 0.90,
    "failsoft_rate_lt_10pct": fail_rate < 0.10,
    "gemini_404_zero": gem404 == 0,
}
final_pass["ALL"] = all(final_pass.values())

out = {
    "PASS": final_pass,
    "metrics": {
        "main_response_rate": main_rate,
        "failsoft_rate": fail_rate,
        "gemini_404": gem404,
        "gemini_429": int((mon.get("log_counts") or {}).get("gemini_429", 0)),
        "openai_quota": int((mon.get("log_counts") or {}).get("openai_quota", 0)),
    },
    "acceptance_json": accept_path,
    "monitor_json": monitor_path,
}
print(json.dumps(out, ensure_ascii=False, indent=2))
if not final_pass["ALL"]:
    sys.exit(2)
PY
