#!/usr/bin/env bash
# TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_VPS_V1 — result bundle が無ければ fixture を作り governor を実行
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"
OUT="$ROOT/api/automation/out"
mkdir -p "$OUT"

BUNDLE="$OUT/remote_build_result_bundle.json"
if [ ! -f "$BUNDLE" ]; then
  bash "$ROOT/api/src/scripts/tenmon_remote_build_result_collector_vps_v1.sh" || true
fi
if [ ! -f "$BUNDLE" ]; then
  python3 - <<'PY' "$BUNDLE"
import json, pathlib, sys
from datetime import datetime, timezone
p = pathlib.Path(sys.argv[1])
p.parent.mkdir(parents=True, exist_ok=True)
now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
bundle = {
  "version": 1,
  "card": "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1",
  "ingested_at": now,
  "job_id": "rbj_seal_fixture_v1",
  "classification": "needs_review",
  "result_status": "needs_review",
  "raw_bundle": {
    "version": 1,
    "card": "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1",
    "job_id": "rbj_seal_fixture_v1",
    "collected_at": now,
    "build": {"ok": None, "log_tail": "fixture"},
    "diff": {"stat": "", "patch_tail": "", "unified_diff_chars": 0},
    "acceptance": {"passed": None, "checks": []},
  },
}
p.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
fi

python3 automation/remote_build_seal_governor_v1.py --bundle "$BUNDLE"

echo "[OK] TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_VPS_V1 → $OUT"
