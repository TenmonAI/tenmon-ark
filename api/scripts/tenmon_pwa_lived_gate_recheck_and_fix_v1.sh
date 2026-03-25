#!/usr/bin/env bash
# TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1
# max 3 loops × 1〜2 修復系統（autofix は plan + reprobe、frontend 実パッチは手元 mainline）
set -euo pipefail
set +H
set +o histexpand

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
  esac
done

CARD="TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1"
MAX_LOOPS=3
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1 2>/dev/null || true
ln -sfn "$DIR" /var/log/tenmon/card 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
WEB="$ROOT/web"
AUTOMATION="$API/automation"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_tenmon_pwa_gate_common.sh"
CHAT_TS_PROBE_BASE_URL="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
export CHAT_TS_PROBE_BASE_URL
tenmon_pwa_normalize_base
tenmon_pwa_normalize_pwa_url
tenmon_pwa_export_gate_urls
export BASE TARGET_URL GATE_HEALTH_URL GATE_AUDIT_URL GATE_AUDIT_BUILD_URL

AUDIT_PY="$AUTOMATION/tenmon_pwa_real_browser_lastmile_audit_v1.py"
AUTOFIX_PY="$AUTOMATION/tenmon_pwa_real_browser_lastmile_autofix_v1.py"
PREFLIGHT_PY="$AUTOMATION/tenmon_pwa_runtime_preflight_v1.py"
GEN_DIR="$AUTOMATION/generated_cursor_apply"
mkdir -p "$GEN_DIR"

PY_EXTRA=()
if [ "$STDOUT_JSON" -eq 1 ]; then
  PY_EXTRA+=( --stdout-json )
fi

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

tenmon_pwa_refresh_gate_artifacts() {
  local odir="$1"
  mkdir -p "$odir"
  tenmon_pwa_log_gate_probe health "$GATE_HEALTH_URL" >/dev/null || true
  tenmon_pwa_log_gate_probe audit "$GATE_AUDIT_URL" >/dev/null || true
  tenmon_pwa_log_gate_probe audit_build "$GATE_AUDIT_BUILD_URL" >/dev/null || true
  wait_http "$GATE_HEALTH_URL" 30 || true
  wait_http "$GATE_AUDIT_BUILD_URL" 30 || true
  wait_http "$GATE_AUDIT_URL" 30 || true
  curl -fsS "$GATE_HEALTH_URL" | tee "$odir/health.json" || echo '{"ok":false}' > "$odir/health.json"
  curl -fsS "$GATE_AUDIT_URL" | tee "$odir/audit.json" || echo '{"ok":false}' > "$odir/audit.json"
  curl -fsS "$GATE_AUDIT_BUILD_URL" | tee "$odir/audit_build.json" || echo '{"ok":false}' > "$odir/audit_build.json"
  python3 <<PY > "$odir/gate_status.json"
import json, os, urllib.request
base = os.environ.get("BASE", "http://127.0.0.1:3000").rstrip("/")
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
}

tenmon_pwa_playwright_prep() {
  tenmon_pwa_ensure_pip_and_playwright
  python3 - <<'PY' || python3 -m pip install playwright
import playwright  # type: ignore
print("playwright-import-ok")
PY
  python3 -m playwright install chromium | tee "$DIR/playwright_install.log" || true
}

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[MAX_LOOPS] $MAX_LOOPS"
echo "[ROOT] $ROOT"
echo "[BASE] $BASE"
echo "[PWA_URL] $TARGET_URL"
git -C "$ROOT" rev-parse HEAD | tee "$DIR/git_sha.txt"
git -C "$ROOT" status --short | tee "$DIR/git_status.txt" || true
echo

# stale 排除: 本 run 直前の automation 本線 readiness をログ DIR に退避
if [ -f "$AUTOMATION/pwa_lived_completion_readiness.json" ]; then
  cp -f "$AUTOMATION/pwa_lived_completion_readiness.json" "$DIR/pwa_lived_completion_readiness.before.json"
fi
if [ -f "$AUTOMATION/pwa_final_completion_readiness.json" ]; then
  cp -f "$AUTOMATION/pwa_final_completion_readiness.json" "$DIR/pwa_final_completion_readiness.before.json"
fi

SNAP_BEFORE=0
LOOP=1
PASS_MAJOR=0

while [ "$LOOP" -le "$MAX_LOOPS" ]; do
  echo "===== LOOP ${LOOP}/${MAX_LOOPS} ====="

  echo "----- STEP: preflight JSON (driver / env) -----"
  set +e
  python3 "$PREFLIGHT_PY" --automation-dir "$AUTOMATION" --base "$BASE" --pwa-url "$TARGET_URL" --repo-root "$ROOT" | tee "$DIR/preflight_stdout.loop${LOOP}.json"
  set -e

  if [ -f "$AUTOMATION/pwa_playwright_preflight.json" ]; then
    cp -f "$AUTOMATION/pwa_playwright_preflight.json" "$DIR/pwa_playwright_preflight.loop${LOOP}.json"
    tenmon_pwa_export_preflight_env_v1 "$AUTOMATION/pwa_playwright_preflight.json" || true
  fi

  echo "----- STEP: gate + lived audit -----"
  tenmon_pwa_refresh_gate_artifacts "$DIR"
  tenmon_pwa_playwright_prep
  python3 "$AUDIT_PY" "$ROOT" "$DIR" --url "$TARGET_URL" "${PY_EXTRA[@]}" | tee "$DIR/lived_audit_stdout.loop${LOOP}.json"

  if [ "$SNAP_BEFORE" -eq 0 ]; then
    cp -f "$DIR/lived_audit_stdout.loop${LOOP}.json" "$DIR/lived_audit_stdout.before.json"
    cp -f "$AUTOMATION/pwa_real_browser_lastmile_blockers.json" "$DIR/pwa_real_browser_lastmile_blockers.before.json" || true
    SNAP_BEFORE=1
  fi

  MAJOR_COUNT="$(AUTOMATION="$AUTOMATION" python3 -c "
import json, os
from pathlib import Path
p = Path(os.environ['AUTOMATION']) / 'pwa_real_browser_lastmile_blockers.json'
maj = {'url_sync_missing','refresh_restore_fail','newchat_reload_residue','continuity_fail','duplicate_or_bleed_fail'}
b = json.loads(p.read_text(encoding='utf-8')).get('blockers',[]) if p.exists() else []
print(len([x for x in b if x in maj]))
")"
  echo "[MAJOR_BLOCKER_COUNT] $MAJOR_COUNT"

  if [ "$MAJOR_COUNT" -eq 0 ]; then
    PASS_MAJOR=1
    cp -f "$DIR/lived_audit_stdout.loop${LOOP}.json" "$DIR/lived_audit_stdout.after.json"
    cp -f "$AUTOMATION/pwa_real_browser_lastmile_blockers.json" "$DIR/pwa_real_browser_lastmile_blockers.after.json" || true
    echo "[LOOP] major blockers cleared at loop $LOOP"
    break
  fi

  if [ "$LOOP" -ge "$MAX_LOOPS" ]; then
    cp -f "$DIR/lived_audit_stdout.loop${LOOP}.json" "$DIR/lived_audit_stdout.after.json"
    cp -f "$AUTOMATION/pwa_real_browser_lastmile_blockers.json" "$DIR/pwa_real_browser_lastmile_blockers.after.json" || true
    break
  fi

  echo "----- STEP: autofix (plan + reprobe; stale blocker refresh) -----"
  set +e
  python3 "$AUTOFIX_PY" "$ROOT" "$DIR" --url "$TARGET_URL" "${PY_EXTRA[@]}" | tee "$DIR/autofix_stdout.loop${LOOP}.json"
  set -e

  echo "----- STEP: build (api + web) / restart / audit.build -----"
  ( cd "$API" && npm run build ) | tee "$DIR/api_build.loop${LOOP}.log"
  ( cd "$WEB" && npm run build ) | tee "$DIR/web_build.loop${LOOP}.log"
  sudo systemctl restart tenmon-ark-api.service || true
  sleep 2
  tenmon_pwa_refresh_gate_artifacts "$DIR"
  curl -fsS "$GATE_AUDIT_BUILD_URL" | tee "$DIR/audit_build.loop${LOOP}.json" >/dev/null || echo '{"ok":false}' > "$DIR/audit_build.loop${LOOP}.json"

  LOOP=$((LOOP+1))
done

if [ "$PASS_MAJOR" -eq 0 ] && [ ! -f "$DIR/lived_audit_stdout.after.json" ]; then
  cp -f "$DIR/lived_audit_stdout.loop${MAX_LOOPS}.json" "$DIR/lived_audit_stdout.after.json" 2>/dev/null || true
  cp -f "$AUTOMATION/pwa_real_browser_lastmile_blockers.json" "$DIR/pwa_real_browser_lastmile_blockers.after.json" 2>/dev/null || true
fi

echo
echo "===== DIFF + READINESS .after + final_verdict ====="
python3 - "$DIR" "$AUTOMATION" "$CARD" "$TS" "$MAX_LOOPS" "$LOOP" <<'PY'
import json, sys, time
from pathlib import Path

d = Path(sys.argv[1])
auto = Path(sys.argv[2])
card = sys.argv[3]
ts = sys.argv[4]
max_loops = int(sys.argv[5])
last_loop = int(sys.argv[6])

def load_blockers(name):
    p = d / name
    if not p.exists():
        p = auto / "pwa_real_browser_lastmile_blockers.json"
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8")).get("blockers", [])

before_b = load_blockers("pwa_real_browser_lastmile_blockers.before.json")
after_b = load_blockers("pwa_real_browser_lastmile_blockers.after.json")
maj_set = {
    "url_sync_missing",
    "refresh_restore_fail",
    "newchat_reload_residue",
    "continuity_fail",
    "duplicate_or_bleed_fail",
}
major_after = [x for x in after_b if x in maj_set]
sb, sa = set(before_b), set(after_b)
diff = {
    "card": card,
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "run_ts": ts,
    "max_loops": max_loops,
    "loops_executed": last_loop,
    "blockers_before": before_b,
    "blockers_after": after_b,
    "removed": sorted(sb - sa),
    "added": sorted(sa - sb),
    "major_remaining_after": major_after,
    "note": "major は lived product taxonomy（env / gate stale は別フィールド）",
}

(d / "diff_before_after.json").write_text(json.dumps(diff, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

gate = {}
gs = d / "gate_status.json"
if gs.exists():
    try:
        gate = json.loads(gs.read_text(encoding="utf-8"))
    except Exception:
        gate = {}

def not_in(blist, code):
    return code not in blist


def eff_audit_build_ok(g):
    """audit.py の effective_audit_build と同趣旨（実応答 body が ok なら stale gate を上書き）。"""
    if bool(g.get("audit_build_ok")):
        return True
    body = str(g.get("audit_build_body") or "").strip()
    if not body:
        return False
    try:
        j = json.loads(body)
        if isinstance(j, dict) and j.get("ok") is not False:
            return True
    except Exception:
        pass
    return False


ab_ok = eff_audit_build_ok(gate)

lived = {
    "card": "TENMON_PWA_LIVED_COMPLETION_SEAL_V1",
    "generated_at": diff["generated_at"],
    "parent_card": card,
    "health_ok": bool(gate.get("health_ok")),
    "audit_ok": bool(gate.get("audit_ok")),
    "audit_build_ok": ab_ok,
    "thread_id_presence_ok": not_in(after_b, "response_threadid_unused"),
    "url_sync_readiness": not_in(after_b, "url_sync_missing"),
    "refresh_restore_readiness": not_in(after_b, "refresh_restore_fail"),
    "new_chat_readiness": not_in(after_b, "newchat_reload_residue") and not_in(after_b, "thread_switch_event_missing"),
    "continuity_readiness": not_in(after_b, "continuity_fail"),
    "surface_meta_duplicate_bleed_clean": not_in(after_b, "duplicate_or_bleed_fail"),
    "factual_response_ok": not_in(after_b, "selector_or_dom_drift"),
    "final_ready": len(major_after) == 0 and ab_ok,
}

pf = {}
pfp = auto / "pwa_playwright_preflight.json"
if pfp.exists():
    try:
        pf = json.loads(pfp.read_text(encoding="utf-8"))
    except Exception:
        pf = {}
usable_pf = bool(pf.get("usable", True))
env_failure = bool(pf.get("env_failure")) or not usable_pf
env_probe_fail = "runtime_env_probe_failed" in after_b
env_blocker = env_failure or env_probe_fail
lived["env_failure"] = env_failure
lived["env_probe_failed"] = env_probe_fail
lived["driver_selected"] = pf.get("driver_selected") or pf.get("selected_driver")
lived["playwright_preflight_usable"] = usable_pf
if env_failure:
    lived["env_failure_reason"] = (pf.get("reason") or "").strip() or ";".join(
        pf.get("reasons", []) if isinstance(pf.get("reasons"), list) else []
    )
    lived["final_ready"] = False
if env_blocker:
    lived["final_ready"] = False

(d / "pwa_lived_completion_readiness.after.json").write_text(
    json.dumps(lived, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
(auto / "pwa_lived_completion_readiness.json").write_text(
    json.dumps(lived, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

final_c = {
    "version": 1,
    "card": "TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1",
    "generated_at": diff["generated_at"],
    "parent_card": card,
    "final_pwa_completion_readiness": len(major_after) == 0,
    "major_blockers_remaining": major_after,
    "remaining_blockers": after_b,
    "blockers": after_b,
}
final_c["env_failure"] = env_failure
final_c["env_probe_failed"] = env_probe_fail
final_c["driver_selected"] = pf.get("driver_selected") or pf.get("selected_driver")
final_c["playwright_preflight_usable"] = usable_pf
if env_failure:
    final_c["env_failure_reason"] = lived.get("env_failure_reason", "")
    final_c["final_pwa_completion_readiness"] = False
if env_blocker:
    final_c["final_pwa_completion_readiness"] = False
(d / "pwa_final_completion_readiness.after.json").write_text(
    json.dumps(final_c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
(auto / "pwa_final_completion_readiness.json").write_text(
    json.dumps(final_c, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)

(auto / "pwa_lived_completion_blockers.json").write_text(
    json.dumps(
        {
            "card": card,
            "generated_at": diff["generated_at"],
            "source": "lived_gate_recheck_after",
            "blockers": after_b,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
(auto / "pwa_final_completion_blockers.json").write_text(
    json.dumps(
        {
            "card": card,
            "generated_at": diff["generated_at"],
            "major_remaining": major_after,
            "blockers": after_b,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

product_pass = len(major_after) == 0
verdict = {
    "card": card,
    "generated_at": diff["generated_at"],
    "remaining_blockers": after_b,
    "major_remaining": major_after,
    "major_product_pass": product_pass,
    "env_failure": env_failure,
    "env_probe_failed": env_probe_fail,
    "env_blocker": env_blocker,
    "pass": product_pass and not env_blocker,
    "loops_used": last_loop,
    "artifacts": {
        "diff": str(d / "diff_before_after.json"),
        "lived_readiness_after": str(d / "pwa_lived_completion_readiness.after.json"),
        "final_readiness_after": str(d / "pwa_final_completion_readiness.after.json"),
        "lived_readiness_before": str(d / "pwa_lived_completion_readiness.before.json"),
        "final_readiness_before": str(d / "pwa_final_completion_readiness.before.json"),
    },
}
(d / "final_verdict.json").write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(verdict, ensure_ascii=False, indent=2))
PY

RETRY_MD="$GEN_DIR/TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_RETRY_CURSOR_AUTO_V1.md"
SEAL_MD="$GEN_DIR/TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1.md"

set +e
python3 - "$DIR/final_verdict.json" "$SEAL_MD" "$RETRY_MD" <<'PY'
import json, sys
from pathlib import Path

verdict = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
seal = Path(sys.argv[2])
retry = Path(sys.argv[3])

if verdict.get("pass"):
    seal.write_text(
        "# TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1\n\n"
        "- source: TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1\n"
        "- major product blockers（taxonomy 5）: 0\n"
        "- env_blocker: false（preflight / runtime probe）\n"
        "- machine-readable: ログ DIR の final_verdict.json\n"
        "- next: bash api/scripts/tenmon_pwa_final_seal_and_regression_guard_v1.sh\n",
        encoding="utf-8",
    )
    if retry.exists():
        retry.unlink()
else:
    retry.write_text(
        "# TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_RETRY_CURSOR_AUTO_V1\n\n"
        f"- major_remaining: {verdict.get('major_remaining', [])}\n"
        f"- env_blocker: {verdict.get('env_blocker')}\n"
        f"- env_failure: {verdict.get('env_failure')}\n"
        "- action: env なら runtime 復旧カード → それ以外は frontend mainline を 1〜2 点ずつ修正し、本スクリプトを再実行\n",
        encoding="utf-8",
    )
    raise SystemExit(1)
PY
VX=$?
set -e

if [ "$STDOUT_JSON" -eq 1 ]; then
  cat "$DIR/final_verdict.json" 2>/dev/null || true
fi

echo
echo "[FINAL_VERDICT] $DIR/final_verdict.json"
echo "[DIFF] $DIR/diff_before_after.json"
echo "[LOG] $DIR/run.log"

exit "${VX:-0}"
