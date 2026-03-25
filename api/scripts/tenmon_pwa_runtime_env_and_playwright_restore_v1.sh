#!/usr/bin/env bash
# TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
  esac
done

CARD="TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1 2>/dev/null || true
ln -sfn "$DIR" /var/log/tenmon/card 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"

BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
PWA_URL="${TENMON_PWA_URL:-https://tenmon-ark.com/pwa/}"
export CHAT_TS_PROBE_BASE_URL="$BASE"
export TENMON_PWA_URL="$PWA_URL"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_tenmon_pwa_gate_common.sh"
tenmon_pwa_normalize_base
tenmon_pwa_normalize_pwa_url
tenmon_pwa_export_gate_urls
export BASE TARGET_URL GATE_HEALTH_URL GATE_AUDIT_URL GATE_AUDIT_BUILD_URL

RESTORE_JSON="$API/automation/pwa_runtime_env_restore_report.json"
GEN_DIR="$API/automation/generated_cursor_apply"
mkdir -p "$API/automation" "$GEN_DIR"

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] $ROOT"
echo "[BASE] $BASE (normalized)"
echo "[PWA_URL] $TARGET_URL"
echo "[GATE_HEALTH_URL] $GATE_HEALTH_URL"
git -C "$ROOT" rev-parse HEAD 2>/dev/null | tee "$DIR/git_sha.txt" || true
git -C "$ROOT" status --short 2>/dev/null | tee "$DIR/git_status.txt" || true
echo

echo "===== OBSERVE: PYTHON / PIP / PLAYWRIGHT / NODE ====="
{
  echo "[python3]"
  command -v python3 || true
  python3 --version || true
  echo "[pip]"
  python3 -m pip --version || true
  echo "[ensurepip]"
  python3 -m ensurepip --version || true
  echo "[node]"
  node --version || true
  echo "[npm]"
  npm --version || true
  echo "[playwright-node]"
  npx playwright --version || true
  echo "[gate_probe]"
  tenmon_pwa_http_status "$GATE_HEALTH_URL" || true
  tenmon_pwa_http_status "$GATE_AUDIT_URL" || true
  tenmon_pwa_http_status "$GATE_AUDIT_BUILD_URL" || true
} | tee "$DIR/runtime_before.txt"
echo

echo "===== OBSERVATION: PIP / ENSUREPIP / APT (before restore) → pwa_runtime_env_observation.json ====="
python3 - "$API/automation/pwa_runtime_env_observation.json" <<'PY'
import json, shutil, subprocess, sys
from pathlib import Path

out = Path(sys.argv[1])
py = shutil.which("python3") or "python3"


def run(cmd: str) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
        return p.returncode, (p.stdout or p.stderr or "")[:600]
    except Exception as e:
        return 1, repr(e)


rc_pip, pip_tail = run(f"{py} -m pip --version")
rc_ep, ep_tail = run(f"{py} -m ensurepip --version")
doc = {
    "card": "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1",
    "python_pip_before_restore": {"ok": rc_pip == 0, "tail": pip_tail},
    "ensurepip_before_restore": {"ok": rc_ep == 0, "tail": ep_tail},
    "apt_get_available": shutil.which("apt-get") is not None,
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(doc, ensure_ascii=False, indent=2))
PY
cp -f "$API/automation/pwa_runtime_env_observation.json" "$DIR/" 2>/dev/null || true

echo "===== DO: RESTORE PYTHON PIP + PLAYWRIGHT (PHASE A) ====="
python3 <<PY
import json, subprocess, sys, time
from pathlib import Path

out = {
    "card": "${CARD}",
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "phases": {},
}

def run_step(name, cmd):
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        out["phases"][name] = {"rc": p.returncode, "stdout": (p.stdout or "")[-2000:], "stderr": (p.stderr or "")[-2000:]}
        return p.returncode == 0
    except Exception as e:
        out["phases"][name] = {"error": repr(e)}
        return False

p = subprocess.run([sys.executable, "-m", "pip", "--version"], capture_output=True, text=True)
pip_ok = p.returncode == 0
out["phases"]["pip_initial"] = {"ok": pip_ok, "tail": (p.stdout or p.stderr or "")[-500:]}

if not pip_ok:
    run_step("ensurepip", f"{sys.executable} -m ensurepip --upgrade")
    p2 = subprocess.run([sys.executable, "-m", "pip", "--version"], capture_output=True, text=True)
    pip_ok = p2.returncode == 0
    out["phases"]["pip_after_ensurepip"] = {"ok": pip_ok}

if not pip_ok:
    run_step("apt_python3_pip", "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip")

run_step("pip_upgrade", f"{sys.executable} -m pip install --upgrade pip setuptools wheel")
run_step("pip_install_playwright", f"{sys.executable} -m pip install playwright")
run_step("playwright_install_chromium", f"{sys.executable} -m playwright install chromium")

p3 = subprocess.run([sys.executable, "-m", "pip", "--version"], capture_output=True, text=True)
out["phases"]["pip_final"] = {"ok": p3.returncode == 0, "tail": (p3.stdout or p3.stderr or "")[-500:]}

try:
    import playwright  # noqa: F401
    out["python_playwright_import_ok"] = True
except Exception as e:
    out["python_playwright_import_ok"] = False
    out["python_playwright_import_error"] = repr(e)

Path(r"${RESTORE_JSON}").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"wrote": r"${RESTORE_JSON}", "playwright_import": out.get("python_playwright_import_ok")}, indent=2))
PY

echo
echo "===== DO: NODE PLAYWRIGHT CHROMIUM (PHASE A2) ====="
set +e
if command -v npm >/dev/null 2>&1; then
  npm exec --package=playwright@1.58.2 -- playwright install chromium 2>&1 | tee "$DIR/node_playwright_install.log" || true
fi
set -e
echo

# libatk-1.0.so.0 等: Chromium 実行に必要な OS 依存（root が要る場合あり）
echo "===== DO: SYSTEM LIBRARIES FOR CHROMIUM (playwright install-deps) ====="
echo "[NOTE] root または sudo が無いと失敗することがあります。失敗時は手動: sudo python3 -m playwright install-deps chromium"
set +e
python3 -m playwright install-deps chromium 2>&1 | tee "$DIR/py_playwright_install_deps.log" || true
if command -v apt-get >/dev/null 2>&1; then
  # 最小フォールバック（Debian/Ubuntu 系）
  DEBIAN_FRONTEND=noninteractive apt-get update -qq 2>/dev/null || true
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libcups2 libdrm2 libgbm1 libasound2 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 libpango-1.0-0 \
    libcairo2 libnss3 libnspr4 libdbus-1-3 libglib2.0-0 libx11-6 libxcb1 2>&1 | tee -a "$DIR/apt_playwright_fallback_libs.log" || true
fi
set -e
echo

echo "===== CHECK: GATES + PREFLIGHT (PHASE B/C) ====="
set +e
python3 "$API/automation/tenmon_pwa_runtime_preflight_v1.py" \
  --automation-dir "$API/automation" \
  --base "$BASE" \
  --pwa-url "$TARGET_URL" \
  --repo-root "$ROOT"
PF_EXIT=$?
set -e

if [ -f "$API/automation/pwa_playwright_preflight.json" ]; then
  tenmon_pwa_export_preflight_env_v1 "$API/automation/pwa_playwright_preflight.json" || true
fi

cp -f "$RESTORE_JSON" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_playwright_preflight.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_gate_url_normalization_report.json" "$DIR/" 2>/dev/null || true

python3 - "$API/automation/pwa_playwright_preflight.json" "$DIR/final_verdict.json" "$API/automation/pwa_probe_gap_report.json" "$CARD" "$TS" "$PF_EXIT" <<'PY'
import json, sys, time
from pathlib import Path

pf_path = Path(sys.argv[1])
out_verdict = Path(sys.argv[2])
gap_out = Path(sys.argv[3])
card = sys.argv[4]
ts = sys.argv[5]
pf_exit = int(sys.argv[6])

pf = json.loads(pf_path.read_text(encoding="utf-8")) if pf_path.exists() else {}
driver = pf.get("driver_selected") or pf.get("selected_driver")
pass_ok = bool(pf.get("usable", False)) and bool(driver)
env_failure = bool(pf.get("env_failure")) or not bool(pf.get("usable", True))

verdict = {
    "card": card,
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "run_ts": ts,
    "preflight_exit_code": pf_exit,
    "pass": pass_ok,
    "driver_selected": driver,
    "selected_driver": driver,
    "preferred_driver": pf.get("preferred_driver"),
    "env_failure": env_failure,
    "reasons": pf.get("reasons", []),
    "false_mostly_due_env_failure": env_failure,
    "evidence": {
        "pwa_playwright_preflight": str(pf_path),
        "pwa_runtime_env_restore_report": "api/automation/pwa_runtime_env_restore_report.json",
    },
}
out_verdict.write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

gap = {
    "card": card,
    "generated_at": verdict["generated_at"],
    "false_mostly_due_env_failure": verdict["false_mostly_due_env_failure"],
    "preflight_source": "api/automation/pwa_playwright_preflight.json",
    "note": "env vs product: env_failure のとき PWA false を product failure と断定しない",
    "driver_selected": driver,
    "selected_driver": driver,
}
gap_out.write_text(json.dumps(gap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"final_verdict": verdict, "pwa_probe_gap_report": gap}, ensure_ascii=False, indent=2))
PY

cp -f "$DIR/final_verdict.json" "$API/automation/pwa_runtime_env_restore_final_verdict.json" 2>/dev/null || true
cp -f "$API/automation/pwa_probe_gap_report.json" "$DIR/" 2>/dev/null || true

RECHECK_MD="$GEN_DIR/TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1.md"
DRIVER_LINE="none"
if [ -f "$API/automation/pwa_playwright_preflight.json" ]; then
  DRIVER_LINE="$(python3 -c "import json; d=json.load(open('$API/automation/pwa_playwright_preflight.json')); print(d.get('driver_selected') or d.get('selected_driver') or 'none')" 2>/dev/null || echo none)"
fi

if [ "$PF_EXIT" -eq 0 ]; then
  cat > "$RECHECK_MD" <<EOF
# TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1

- parent: ${CARD}
- generated_at: ${TS}
- status: preflight PASS（\`selected_driver\`: ${DRIVER_LINE}）
- machine-readable: \`api/automation/pwa_playwright_preflight.json\`

driver が選ばれ、lived browser probe は \`tenmon_pwa_real_browser_lastmile_audit_v1.py\` から実行可能。

\`\`\`bash
bash api/scripts/tenmon_pwa_real_browser_lastmile_audit_v1.sh --stdout-json
\`\`\`
EOF
else
  cat > "$RECHECK_MD" <<EOF
# TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1

- parent: ${CARD}
- generated_at: ${TS}
- status: preflight FAIL（\`env_failure\` / \`pwa_playwright_preflight.json\` を確認）
- selected_driver: ${DRIVER_LINE:-none}

環境復旧が未完了の可能性あり。ログ: \`$DIR/run.log\`
EOF
fi

if [ "$STDOUT_JSON" -eq 1 ]; then
  cat "$DIR/final_verdict.json" || true
fi

echo "[PREFLIGHT_EXIT] $PF_EXIT"
echo "[LOG] $DIR/run.log"
echo "[FINAL_VERDICT] $DIR/final_verdict.json"
echo "[GAP] $API/automation/pwa_probe_gap_report.json"
echo "[NEXT] $RECHECK_MD"

exit "$PF_EXIT"
