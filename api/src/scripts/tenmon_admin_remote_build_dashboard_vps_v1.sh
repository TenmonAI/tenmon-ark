#!/usr/bin/env bash
# TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_VPS_V1 — 成果物 JSON + ガード検証（管理者キー必須）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
API="${TENMON_API_BASE:-http://127.0.0.1:3000}"
API="${API%/}"
OUT="${TENMON_REMOTE_BUILD_VPS_OUT:-$ROOT/api/automation/out}"
KEY="${FOUNDER_KEY:-CHANGE_ME_FOUNDER_KEY}"
mkdir -p "$OUT"

echo "TENMON_ADMIN_REMOTE_BUILD_DASHBOARD_VPS_V1"

# 匿名は 403
NO_AUTH=$(curl -sS -o /dev/null -w "%{http_code}" "$API/api/admin/remote-build/jobs" || true)

curl -sS -H "X-Founder-Key: $KEY" "$API/api/admin/remote-build/vps-snapshot" | tee "$OUT/vps_snapshot.json" >/dev/null
# manifest 本文（JSON の .manifest を抽出）
python3 - <<'PY' "$OUT/vps_snapshot.json" "$OUT/remote_build_dashboard_manifest.json"
import json, pathlib, sys
snap = pathlib.Path(sys.argv[1])
out_m = pathlib.Path(sys.argv[2])
raw = snap.read_text(encoding="utf-8", errors="replace")
try:
    j = json.loads(raw)
    m = j.get("manifest")
    if m is not None:
        out_m.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        out_m.write_text(json.dumps({"ok": False, "error": "manifest null in vps_snapshot"}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
except Exception as e:
    out_m.write_text(json.dumps({"ok": False, "error": str(e), "raw_head": raw[:400]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
echo "$NO_AUTH" >"$OUT/admin_guard_anon.txt"

curl -sS -X POST -H "Content-Type: application/json" -H "X-Founder-Key: $KEY" \
  "$API/api/admin/remote-build/guard-check" \
  -d '{"cardName":"TENMON_SAFE_PROBE_CARD_V1","cardBodyMd":"# test\napi/src/scripts only"}' \
  | tee "$OUT/admin_guard_check.json" >/dev/null

# admin_guard_check に匿名 HTTP ステータスをマージ
python3 - <<'PY' "$OUT/admin_guard_check.json" "$OUT/admin_guard_anon.txt"
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
anon = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8").strip()
try:
    j = json.loads(p.read_text(encoding="utf-8"))
except Exception:
    j = {}
j["anonymous_list_http_status"] = anon
j["anonymous_must_be_403"] = anon == "403"
p.write_text(json.dumps(j, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

# 直近 submit 結果があればコピー済み（API が automation/out に書く）
if [ -f "$ROOT/api/automation/out/remote_build_job_submit_result.json" ]; then
  cp -f "$ROOT/api/automation/out/remote_build_job_submit_result.json" "$OUT/remote_build_job_submit_result.json" 2>/dev/null || true
else
  echo '{"note":"no submit yet — use dashboard POST /api/admin/remote-build/jobs"}' >"$OUT/remote_build_job_submit_result.json"
fi

echo "[OK] artifacts under $OUT"
