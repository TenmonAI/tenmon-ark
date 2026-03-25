#!/usr/bin/env bash
# TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1
# + TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_CURSOR_AUTO_V1
#
# 観測実行面固定: GIT → RUNTIME GATES → TOOLCHAIN → CHAT (curl) → FRONTEND grep → snapshots → integrator
# 修復ではない。exit!=0 でも LOG_DIR に証拠を残す。
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 実行カード既定（親レポート名は環境で上書き可）
CARD="${TENMON_MASTER_FORENSIC_CARD:-TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1}"
EXECUTION_CONTRACT="TENMON_TOTAL_COMPLETION_MASTER_FORENSIC_REPORT_EXECUTION_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_MASTER_FORENSIC_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"

STDOUT_JSON=0
STRICT=0
NO_LIVE=0
for a in "$@"; do
  case "$a" in
    --stdout-json) STDOUT_JSON=1 ;;
    --strict) STRICT=1 ;;
    --no-live-probe) NO_LIVE=1 ;;
  esac
done

mkdir -p "$LOG_DIR/snapshots"

: >"$LOG_DIR/run.log"
{
  echo "execution_contract=${EXECUTION_CONTRACT}"
  echo "card=${CARD}"
  echo "ts=${TS}"
  echo "repo=${REPO}"
  date -u
} >>"$LOG_DIR/run.log"

# ----- 埋め込み観測（省略禁止・順序固定）-----
set +e

{
  echo "===== GIT ====="
  git -C "$REPO" rev-parse --short HEAD
  git -C "$REPO" rev-parse HEAD
  git -C "$REPO" status --short
} >>"$LOG_DIR/run.log" 2>&1
git -C "$REPO" rev-parse --short HEAD >"$LOG_DIR/git_rev_short.txt" 2>>"$LOG_DIR/run.log" || true
git -C "$REPO" rev-parse HEAD >"$LOG_DIR/git_rev_full.txt" 2>>"$LOG_DIR/run.log" || true
git -C "$REPO" status --short >"$LOG_DIR/git_status_short.txt" 2>>"$LOG_DIR/run.log" || true

{
  echo "===== RUNTIME GATES ====="
  curl -i "${TENMON_GATE_BASE:-http://127.0.0.1:3000}/api/health" || true
  echo ""
  curl -fsS "${TENMON_GATE_BASE:-http://127.0.0.1:3000}/api/audit" || true
  echo ""
  curl -fsS "${TENMON_GATE_BASE:-http://127.0.0.1:3000}/api/audit.build" || true
  echo ""
} >>"$LOG_DIR/run.log" 2>&1

BASE="${TENMON_GATE_BASE:-http://127.0.0.1:3000}"
curl -sS -i -o "$LOG_DIR/gate_api_health.headers_body.txt" "$BASE/api/health" 2>>"$LOG_DIR/run.log" || true
curl -sS -o "$LOG_DIR/gate_api_audit.body" -w "audit_http=%{http_code}\n" "$BASE/api/audit" 2>>"$LOG_DIR/run.log" || true
curl -sS -o "$LOG_DIR/gate_api_audit_build.body" -w "audit_build_http=%{http_code}\n" "$BASE/api/audit.build" 2>>"$LOG_DIR/run.log" || true

{
  echo "===== TOOLCHAIN ====="
  python3 --version || true
  python3 -m pip --version || true
  python3 - <<'PY' || true
try:
    import playwright
    print({"playwright_python_installed": True})
except Exception:
    print({"playwright_python_installed": False})
PY
  node -v || true
  npm -v || true
  npx playwright --version || true
} >>"$LOG_DIR/run.log" 2>&1

python3 --version >"$LOG_DIR/toolchain_python3.txt" 2>&1 || true
python3 -m pip --version >"$LOG_DIR/toolchain_pip.txt" 2>&1 || true
python3 - <<'PY' >"$LOG_DIR/toolchain_playwright_python.json" 2>&1 || true
try:
    import playwright
    print({"playwright_python_installed": True})
except Exception:
    print({"playwright_python_installed": False})
PY
node -v >"$LOG_DIR/toolchain_node.txt" 2>&1 || true
npm -v >"$LOG_DIR/toolchain_npm.txt" 2>&1 || true
npx playwright --version >"$LOG_DIR/toolchain_npx_playwright.txt" 2>&1 || true

{
  echo "===== CHAT PROBE (curl 固定) ====="
  curl -fsS -H 'content-type: application/json' \
    -d '{"threadId":"probe_master_forensic","message":"言霊とは何かを100字前後で答えて"}' \
    "$BASE/api/chat" || true
  echo ""
  curl -fsS -H 'content-type: application/json' \
    -d '{"threadId":"probe_master_forensic","message":"前の返答を受けて、要点を一つだけ継続して"}' \
    "$BASE/api/chat" || true
  echo ""
} >>"$LOG_DIR/run.log" 2>&1

curl -fsS -H 'content-type: application/json' \
  -d '{"threadId":"probe_master_forensic","message":"言霊とは何かを100字前後で答えて"}' \
  "$BASE/api/chat" >"$LOG_DIR/chat_probe_curl_1.json" 2>>"$LOG_DIR/chat_probe_curl_1.err" || true
curl -fsS -H 'content-type: application/json' \
  -d '{"threadId":"probe_master_forensic","message":"前の返答を受けて、要点を一つだけ継続して"}' \
  "$BASE/api/chat" >"$LOG_DIR/chat_probe_curl_2.json" 2>>"$LOG_DIR/chat_probe_curl_2.err" || true

{
  echo "===== FRONTEND RESIDUE (grep 固定) ====="
  grep -RIn "window.location.reload()" "$REPO/web/src" || true
  grep -RIn "sessionId" "$REPO/web/src" || true
  find "$REPO/web/src" -type f 2>/dev/null | grep -E '\.bak|\.bak\.' || true
  grep -RIn "threadId" "$REPO/web/src" || true
} >>"$LOG_DIR/run.log" 2>&1

grep -RIn "window.location.reload()" "$REPO/web/src" >"$LOG_DIR/frontend_grep_window_reload.txt" 2>&1 || true
grep -RIn "sessionId" "$REPO/web/src" >"$LOG_DIR/frontend_grep_sessionId.txt" 2>&1 || true
find "$REPO/web/src" -type f 2>/dev/null | grep -E '\.bak|\.bak\.' >"$LOG_DIR/frontend_find_bak.txt" 2>&1 || true
grep -RIn "threadId" "$REPO/web/src" >"$LOG_DIR/frontend_grep_threadId.txt" 2>&1 || true

set -e

# automation snapshot（コピーのみ・観測）
for f in \
  tenmon_system_verdict.json \
  tenmon_total_unfinished_completion_report.json \
  pwa_lived_completion_readiness.json \
  pwa_final_completion_readiness.json \
  pwa_final_completion_blockers.json \
  pwa_playwright_preflight.json \
  tenmon_regression_memory.json \
  tenmon_self_repair_safe_loop_verdict.json \
  tenmon_self_repair_acceptance_seal_verdict.json \
  tenmon_self_build_execution_chain_verdict.json \
  tenmon_repo_hygiene_watchdog_verdict.json \
  tenmon_gate_contract_verdict.json \
  tenmon_learning_self_improvement_integrated_verdict.json \
  tenmon_remote_admin_cursor_runtime_proof_verdict.json \
  tenmon_worldclass_acceptance_scorecard.json
do
  if [[ -f "$REPO/api/automation/$f" ]]; then
    cp -f "$REPO/api/automation/$f" "$LOG_DIR/snapshots/$f" || true
  fi
done

export TENMON_MASTER_FORENSIC_LOG_DIR="$LOG_DIR"
export TENMON_MASTER_EXECUTION_CONTRACT="$EXECUTION_CONTRACT"

PY_ARGS=(--repo-root "$REPO" --log-dir "$LOG_DIR" --base "$BASE" --prefer-shell-observations)
if [[ "$NO_LIVE" -eq 1 ]]; then
  PY_ARGS+=(--no-live-probe)
fi
if [[ "$STRICT" -eq 1 ]]; then
  PY_ARGS+=(--strict)
fi
if [[ "$STDOUT_JSON" -eq 1 ]]; then
  PY_ARGS+=(--stdout-json)
fi

set +e
if [[ "$STDOUT_JSON" -eq 1 ]]; then
  python3 "$REPO/api/automation/tenmon_total_completion_master_report_v1.py" "${PY_ARGS[@]}" 2>"$LOG_DIR/integrator.stderr"
  PY_RC=$?
else
  python3 "$REPO/api/automation/tenmon_total_completion_master_report_v1.py" "${PY_ARGS[@]}" >"$LOG_DIR/integrator.stdout" 2>"$LOG_DIR/integrator.stderr"
  PY_RC=$?
fi
set -e
echo "{\"integrator_exit_rc\": $PY_RC}" >>"$LOG_DIR/run.log" || true

exit "$PY_RC"
