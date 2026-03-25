#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
  esac
done

CARD="TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_TENMON_PWA_NEWCHAT_SURFACE_BINDING_V1 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
export BASE

say(){ printf '\n===== %s =====\n' "$1"; }

wait_http() {
  local url="$1"
  local tries="${2:-45}"
  local i=0
  while [ "$i" -lt "$tries" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i+1))
    sleep 1
  done
  return 1
}

say "CARD / IDENTITY"
echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] $ROOT"
git -C "$ROOT" rev-parse --short HEAD | tee "$DIR/git_sha_short.txt"

say "BUILD (web)"
(
  cd "$ROOT/web"
  npm run build
) | tee "$DIR/build_web.log"

say "GREP (reload / thread-switch)"
rg -n 'location\.reload|window\.location\.reload' "$ROOT/web/src/components/gpt/GptShell.tsx" | tee "$DIR/grep_gptshell_reload.txt" || true
rg -n 'tenmon:thread-switch|TENMON_THREAD_SWITCH_EVENT' "$ROOT/web/src" | tee "$DIR/grep_thread_switch.txt" || true

say "RESTART / HEALTH / AUDIT"
sudo systemctl restart tenmon-ark-api.service
sudo systemctl status tenmon-ark-api.service --no-pager | tee "$DIR/systemctl_status.txt" || true

wait_http "$BASE/health" 45 || true
wait_http "$BASE/api/audit" 45 || true
wait_http "$BASE/api/audit.build" 45 || true

curl -fsS "$BASE/health" | tee "$DIR/health.json" || echo '{"ok":false}' > "$DIR/health.json"
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" || echo '{"ok":false}' > "$DIR/audit.json"
curl -fsS "$BASE/api/audit.build" | tee "$DIR/audit_build.json" || echo '{"ok":false}' > "$DIR/audit_build.json"

say "GATE_STATUS_JSON"
python3 <<'PY' > "$DIR/gate_status.json"
import json, os, urllib.request
base = os.environ.get("BASE", "http://127.0.0.1:3000").rstrip("/")

def fetch(path):
    try:
        return urllib.request.urlopen(base + path, timeout=45).read().decode("utf-8", "replace")
    except Exception as e:
        return json.dumps({"ok": False, "error": str(e)})

def ok_gate(text):
    try:
        j = json.loads(text)
        if isinstance(j, dict) and j.get("ok") is False:
            return False
        return True
    except Exception:
        return len(text.strip()) > 0

h = fetch("/health")
a = fetch("/api/audit")
b = fetch("/api/audit.build")
out = {
    "health_ok": ok_gate(h),
    "audit_ok": ok_gate(a),
    "audit_build_ok": ok_gate(b),
    "health_body": h[:4000],
    "audit_body": a[:4000],
    "audit_build_body": b[:4000],
}
print(json.dumps(out, ensure_ascii=False, indent=2))
PY

say "NEWCHAT SURFACE BINDING PY"
set +e
PY_ARGS=( "$API/automation/tenmon_pwa_newchat_surface_binding_v1.py" "$ROOT" "$DIR" --gate-json "$DIR/gate_status.json" )
if [ "$STDOUT_JSON" -eq 1 ]; then
  PY_ARGS+=( --stdout-json )
fi
python3 "${PY_ARGS[@]}" | tee "$DIR/python_stdout.json"
PY_EXIT=$?
set -e

cp -f "$API/automation/pwa_newchat_surface_binding_trace.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_newchat_surface_binding_readiness.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_newchat_surface_binding_verdict.json" "$DIR/" 2>/dev/null || true

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort | tee "$DIR/output_list.txt"
echo "[PY_EXIT] $PY_EXIT"

exit "${PY_EXIT:-0}"
