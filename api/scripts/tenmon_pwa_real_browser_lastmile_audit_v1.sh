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

CARD="TENMON_PWA_REAL_BROWSER_LASTMILE_AUDIT_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_TENMON_PWA_REAL_BROWSER_LASTMILE_AUDIT_V1 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
# TENMON_PWA_RUNTIME_ENV_RESTORE_V1: gate URL 正規化（CHAT_TS_PROBE_BASE_URL）
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_tenmon_pwa_gate_common.sh"
CHAT_TS_PROBE_BASE_URL="${CHAT_TS_PROBE_BASE_URL:-https://tenmon-ark.com}"
export CHAT_TS_PROBE_BASE_URL
tenmon_pwa_normalize_base
tenmon_pwa_normalize_pwa_url
tenmon_pwa_export_gate_urls
export BASE TARGET_URL GATE_HEALTH_URL GATE_AUDIT_URL GATE_AUDIT_BUILD_URL

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
echo "[BASE] $BASE"
echo "[TARGET_URL] $TARGET_URL"
echo "[GATE_HEALTH_URL] $GATE_HEALTH_URL"
echo "[GATE_AUDIT_URL] $GATE_AUDIT_URL"
echo "[GATE_AUDIT_BUILD_URL] $GATE_AUDIT_BUILD_URL"
git -C "$ROOT" rev-parse --short HEAD | tee "$DIR/git_sha_short.txt"
git -C "$ROOT" status --short | tee "$DIR/git_status.txt" || true

say "BUILD / WEB BUILD"
(
  cd "$API"
  npm run build
) | tee "$DIR/build_api.log"
(
  cd "$ROOT/web"
  npm run build
) | tee "$DIR/build_web.log"

say "RESTART / AUDIT"
sudo systemctl restart tenmon-ark-api.service || true
sudo systemctl status tenmon-ark-api.service --no-pager | tee "$DIR/systemctl_status.txt" || true

tenmon_pwa_log_gate_probe health "$GATE_HEALTH_URL" >/dev/null || true
tenmon_pwa_log_gate_probe audit "$GATE_AUDIT_URL" >/dev/null || true
tenmon_pwa_log_gate_probe audit_build "$GATE_AUDIT_BUILD_URL" >/dev/null || true

wait_http "$GATE_HEALTH_URL" 45 || true
wait_http "$GATE_AUDIT_BUILD_URL" 45 || true
wait_http "$GATE_AUDIT_URL" 45 || true

curl -fsS "$GATE_HEALTH_URL" | tee "$DIR/health.json" || echo '{"ok":false}' > "$DIR/health.json"
curl -fsS "$GATE_AUDIT_URL" | tee "$DIR/audit.json" || echo '{"ok":false}' > "$DIR/audit.json"
curl -fsS "$GATE_AUDIT_BUILD_URL" | tee "$DIR/audit_build.json" || echo '{"ok":false}' > "$DIR/audit_build.json"

say "GATE STATUS JSON"
python3 <<'PY' > "$DIR/gate_status.json"
import json, os, urllib.request
base = os.environ.get("BASE", "https://tenmon-ark.com").rstrip("/")
def fetch(path):
    try:
        return urllib.request.urlopen(base + path, timeout=45).read().decode("utf-8", "replace")
    except Exception as e:
        return json.dumps({"ok": False, "error": str(e)})
def ok_gate(txt):
    try:
        j = json.loads(txt)
        if isinstance(j, dict) and j.get("ok") is False:
            return False
        return True
    except Exception:
        return bool((txt or "").strip())
h = fetch("/health")
a = fetch("/api/audit")
b = fetch("/api/audit.build")
print(json.dumps({
  "health_ok": ok_gate(h),
  "audit_ok": ok_gate(a),
  "audit_build_ok": ok_gate(b),
  "health_body": h[:4000],
  "audit_body": a[:4000],
  "audit_build_body": b[:4000],
}, ensure_ascii=False, indent=2))
PY

python3 "$API/automation/tenmon_pwa_runtime_preflight_v1.py" \
  --automation-dir "$API/automation" \
  --base "$BASE" \
  --pwa-url "$TARGET_URL" || true

say "PLAYWRIGHT PREP"
tenmon_pwa_ensure_pip_and_playwright
python3 - <<'PY' || python3 -m pip install playwright
import playwright  # type: ignore
print("playwright-import-ok")
PY
python3 -m playwright install chromium | tee "$DIR/playwright_install.log" || true

say "REAL BROWSER AUDIT PY"
set +e
PY_ARGS=( "$API/automation/tenmon_pwa_real_browser_lastmile_audit_v1.py" "$ROOT" "$DIR" --url "$TARGET_URL" )
if [ "$STDOUT_JSON" -eq 1 ]; then
  PY_ARGS+=( --stdout-json )
fi
python3 "${PY_ARGS[@]}" | tee "$DIR/python_stdout.json"
PY_EXIT=$?
set -e

cp -f "$API/automation/pwa_real_browser_lastmile_audit_report.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_real_browser_lastmile_blockers.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_real_browser_lastmile_probe_trace.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/generated_cursor_apply/TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1.md" "$DIR/" 2>/dev/null || true

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort | tee "$DIR/output_list.txt"
echo "[PY_EXIT] $PY_EXIT"

exit "${PY_EXIT:-0}"
