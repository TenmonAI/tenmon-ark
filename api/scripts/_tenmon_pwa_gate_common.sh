# TENMON_PWA_RUNTIME_ENV_RESTORE_V1 — shared gate URL normalization + optional pip/playwright bootstrap
# shellcheck shell=bash
# Usage: source from repo api/scripts after SCRIPT_DIR is set.

tenmon_pwa_normalize_base() {
  local raw="${CHAT_TS_PROBE_BASE_URL:-https://tenmon-ark.com}"
  raw="${raw%/}"
  raw="${raw//[[:space:]]/}"
  if [ -z "$raw" ]; then
    raw="https://tenmon-ark.com"
  fi
  export BASE="$raw"
}

tenmon_pwa_normalize_pwa_url() {
  local u="${TENMON_PWA_URL:-https://tenmon-ark.com/pwa/}"
  u="${u//[[:space:]]/}"
  if [ -z "$u" ]; then
    u="https://tenmon-ark.com/pwa/"
  fi
  export TARGET_URL="$u"
}

tenmon_pwa_export_gate_urls() {
  # 契約: /api/health（index の /health ルートは後方互換のまま残す）
  export GATE_HEALTH_URL="${BASE}/api/health"
  export GATE_AUDIT_URL="${BASE}/api/audit"
  export GATE_AUDIT_BUILD_URL="${BASE}/api/audit.build"
}

# pwa_playwright_preflight.json を読み、lived / audit 子プロセスへ driver と env 成否を伝える
# TENMON_PWA_PREFERRED_DRIVER: python | node | ""
# TENMON_PWA_DRIVER_SELECTED: python_playwright | node_playwright | ""
# TENMON_PWA_ENV_FAILURE / TENMON_PWA_PLAYWRIGHT_USABLE / TENMON_PWA_BROWSER_LAUNCH_OK: "0" | "1"
tenmon_pwa_export_preflight_env_v1() {
  local pf="${1:-}"
  if [ -z "$pf" ] || [ ! -f "$pf" ]; then
    export TENMON_PWA_PREFLIGHT_JSON=""
    export TENMON_PWA_PREFERRED_DRIVER=""
    export TENMON_PWA_DRIVER_SELECTED=""
    export TENMON_PWA_ENV_FAILURE="1"
    export TENMON_PWA_PLAYWRIGHT_USABLE="0"
    export TENMON_PWA_BROWSER_LAUNCH_OK="0"
    return 1
  fi
  export TENMON_PWA_PREFLIGHT_JSON="$pf"
  eval "$(TENMON_PF="$pf" python3 <<'PY'
import json, os, shlex

path = os.environ["TENMON_PF"]
with open(path, encoding="utf-8") as f:
    d = json.load(f)


def b(v):
    return "1" if v else "0"


pd = d.get("preferred_driver") or ""
driver = d.get("driver_selected") or d.get("selected_driver") or ""
lines = [
    f"export TENMON_PWA_PREFERRED_DRIVER={shlex.quote(pd)}",
    f"export TENMON_PWA_DRIVER_SELECTED={shlex.quote(driver)}",
    f"export TENMON_PWA_ENV_FAILURE={b(d.get('env_failure'))}",
    f"export TENMON_PWA_PLAYWRIGHT_USABLE={b(d.get('usable'))}",
    f"export TENMON_PWA_BROWSER_LAUNCH_OK={b(d.get('browser_launch_ok'))}",
]
print("\n".join(lines))
PY
)"
  return 0
}

# curl で HTTP ステータスを取得（失敗時は 0 と stderr に記録）
tenmon_pwa_http_status() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 45 "$url" 2>/dev/null || echo "0")"
  echo "$code"
}

# 404 等をログに明示（標準エラー）
tenmon_pwa_log_gate_probe() {
  local name="$1"
  local url="$2"
  local code
  code="$(tenmon_pwa_http_status "$url")"
  if [ "$code" = "404" ] || [ "$code" = "0" ]; then
    echo "[GATE] ${name} url=${url} http_status=${code}" >&2
  fi
  echo "$code"
}

# PHASE A: ensurepip → apt python3-pip → pip install playwright → chromium
tenmon_pwa_ensure_pip_and_playwright() {
  set +e
  python3 -m pip --version >/dev/null 2>&1
  local pip_ok=$?
  if [ "$pip_ok" -ne 0 ]; then
    python3 -m ensurepip --upgrade 2>/dev/null || true
  fi
  python3 -m pip --version >/dev/null 2>&1
  pip_ok=$?
  if [ "$pip_ok" -ne 0 ]; then
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update -qq 2>/dev/null || true
      DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip 2>/dev/null || true
    fi
  fi
  python3 -m pip install --upgrade pip setuptools wheel 2>/dev/null || true
  python3 -m pip install playwright 2>/dev/null || true
  python3 -m playwright install chromium 2>/dev/null || true
  set -e
}
