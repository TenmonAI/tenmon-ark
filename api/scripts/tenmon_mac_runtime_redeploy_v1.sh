#!/usr/bin/env bash
# TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK / TENMON_MAC_REDEPLOY_REALRUN_BRIDGE
# - Mac 上: check | stop | start | health | scp_suggest | full
# - VPS/手元（repo あり・ssh Mac 可）: bridge_push | confirm_hints
# SSOT: api/docs/constitution/TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1.md
#       api/docs/constitution/TENMON_MAC_REDEPLOY_REALRUN_BRIDGE_CURSOR_AUTO_V1.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(cd "${API}/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"

MAC_HOME="${TENMON_MAC_HOME:-$HOME/tenmon-mac}"
LOG_DIR="${TENMON_MAC_LOG_DIR:-$MAC_HOME/logs}"
MAIN_LOG="${TENMON_MAC_WATCH_LOG:-$LOG_DIR/watch_loop.log}"
PID_FILE="${TENMON_MAC_WATCH_PID_FILE:-$LOG_DIR/watch_loop.pid}"
WATCH="${TENMON_MAC_WATCH_SCRIPT:-$MAC_HOME/tenmon_cursor_watch_loop.sh}"
BIND_PY="${TENMON_MAC_EXECUTOR_BIND_PY:-$MAC_HOME/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py}"
BROWSER_PY="${TENMON_MAC_BROWSER_AI_PY:-$MAC_HOME/browser_ai_operator_v1.py}"
REVIEW_PY="${TENMON_MAC_REVIEW_ACCEPT_PY:-$MAC_HOME/cursor_review_acceptor_v1.py}"

# リポジトリ内の参照パス（鮮度比較用）
REPO_WATCH="${TENMON_REPO_ROOT}/api/scripts/tenmon_cursor_watch_loop.sh"
REPO_BIND="${TENMON_REPO_ROOT}/api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py"
REPO_BROWSER="${TENMON_REPO_ROOT}/api/automation/browser_ai_operator_v1.py"
REPO_REVIEW="${TENMON_REPO_ROOT}/api/automation/cursor_review_acceptor_v1.py"

die() { echo "[FAIL] $*" >&2; exit 1; }
warn() { echo "[WARN] $*" >&2; }

_ts() {
  if stat -f%m "$1" >/dev/null 2>&1; then
    stat -f%m "$1" 2>/dev/null || echo 0
  else
    stat -c%Y "$1" 2>/dev/null || echo 0
  fi
}

_fmt_mtime() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "missing"
    return
  fi
  if stat -f%Sm "$f" >/dev/null 2>&1; then
    stat -f%Sm "$f" 2>/dev/null
  else
    date -r "$(_ts "$f")" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || ls -l "$f"
  fi
}

_compare_pair() {
  local name="$1" mac_f="$2" repo_f="$3"
  echo "---- $name ----"
  echo "  mac_path: $mac_f"
  echo "  mac_mtime: $(_fmt_mtime "$mac_f")  exists=$([[ -f "$mac_f" ]] && echo yes || echo no)"
  echo "  repo_path: $repo_f"
  echo "  repo_mtime: $(_fmt_mtime "$repo_f")  exists=$([[ -f "$repo_f" ]] && echo yes || echo no)"
  if [[ -f "$mac_f" && -f "$repo_f" ]]; then
    local tm tr
    tm="$(_ts "$mac_f")"
    tr="$(_ts "$repo_f")"
    if [[ "$tr" -gt "$tm" ]]; then
      warn "repo newer than mac copy → redeploy (scp) recommended: $name"
    fi
  elif [[ ! -f "$mac_f" ]]; then
    warn "mac copy missing: $name"
  fi
}

cmd_check() {
  echo "[check] TENMON_REPO_ROOT=$TENMON_REPO_ROOT"
  echo "[check] MAC_HOME=$MAC_HOME"
  _compare_pair "watch_loop" "$WATCH" "$REPO_WATCH"
  _compare_pair "executor_result_bind" "$BIND_PY" "$REPO_BIND"
  _compare_pair "browser_ai_operator" "$BROWSER_PY" "$REPO_BROWSER"
  _compare_pair "cursor_review_acceptor" "$REVIEW_PY" "$REPO_REVIEW"
  echo "[check] done"
}

cmd_scp_suggest() {
  local VPS="${TENMON_MAC_VPS_SSH:-}"
  local R="${TENMON_MAC_VPS_REPO_PATH:-}"
  if [[ -z "$VPS" || -z "$R" ]]; then
    echo "Set TENMON_MAC_VPS_SSH (user@host) and TENMON_MAC_VPS_REPO_PATH (remote repo root) for suggestions."
    echo "See: api/docs/constitution/TENMON_MAC_RUNTIME_REDEPLOY_AND_RESTART_RUNBOOK_CURSOR_AUTO_V1.md"
    return 0
  fi
  echo "# suggested scp (verify paths):"
  echo "mkdir -p \"$MAC_HOME\""
  echo "scp \"$VPS:$R/api/scripts/tenmon_cursor_watch_loop.sh\" \"$MAC_HOME/\""
  echo "scp \"$VPS:$R/api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py\" \"$MAC_HOME/\""
  echo "scp \"$VPS:$R/api/automation/browser_ai_operator_v1.py\" \"$MAC_HOME/\""
  echo "scp \"$VPS:$R/api/automation/cursor_review_acceptor_v1.py\" \"$MAC_HOME/\""
}

cmd_stop() {
  echo "[stop] pkill -f tenmon_cursor_watch_loop.sh"
  pkill -f "tenmon_cursor_watch_loop.sh" 2>/dev/null || true
  sleep 2
  if pgrep -fl tenmon_cursor_watch_loop.sh >/dev/null 2>&1; then
    die "stop: watch loop still running (pgrep shows process)"
  fi
  echo "[stop] ok"
}

cmd_start() {
  [[ -f "$WATCH" ]] || die "start: missing watch script: $WATCH"
  mkdir -p "$LOG_DIR"
  local envf="${TENMON_MAC_ENV_FILE:-$HOME/.tenmon_mac_watch_env}"
  if [[ -f "$envf" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$envf"
    set +a
  else
    warn "no env file at $envf (optional; ensure TENMON_REMOTE_CURSOR_BASE_URL etc. are exported)"
  fi
  [[ -n "${TENMON_REMOTE_CURSOR_BASE_URL:-}" ]] || die "start: set TENMON_REMOTE_CURSOR_BASE_URL (or source env file)"
  chmod +x "$WATCH" 2>/dev/null || true
  echo "[start] nohup caffeinate -i bash $WATCH log=$MAIN_LOG pid=$PID_FILE"
  nohup caffeinate -i bash "$WATCH" >>"$MAIN_LOG" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
  local pid
  pid="$(cat "$PID_FILE")"
  ps -p "$pid" >/dev/null 2>&1 || die "start: process $pid not running (see tail $MAIN_LOG)"
  echo "[start] ok pid=$pid"
}

cmd_health() {
  echo "[health] log tail: $MAIN_LOG"
  if [[ -f "$MAIN_LOG" ]]; then
    tail -n 80 "$MAIN_LOG" || true
  else
    warn "no log file yet: $MAIN_LOG"
  fi
  echo "[health] pid file: $PID_FILE"
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]]; then
      ps -p "$pid" -o pid,comm,args 2>/dev/null || warn "pid $pid not running"
    fi
  else
    warn "no pid file"
    pgrep -fl tenmon_cursor_watch_loop.sh 2>/dev/null || true
  fi
  local BASE="${TENMON_REMOTE_CURSOR_BASE_URL:-}"
  local TOK="${TENMON_FOUNDER_EXECUTOR_BEARER:-${TENMON_EXECUTOR_BEARER_TOKEN:-}}"
  if [[ -n "$BASE" && -n "$TOK" ]]; then
    echo "[health] GET $BASE/api/admin/cursor/queue (first 1500 bytes)"
    curl -fsS -m 25 -H "Authorization: Bearer $TOK" "$BASE/api/admin/cursor/queue" 2>&1 | head -c 1500 || warn "queue curl failed"
    echo
  else
    warn "skip queue check: set TENMON_REMOTE_CURSOR_BASE_URL and TENMON_FOUNDER_EXECUTOR_BEARER or TENMON_EXECUTOR_BEARER_TOKEN"
  fi
  echo "[health] done"
}

cmd_full() {
  cmd_stop
  cmd_start
  cmd_health
}

# TENMON_MAC_REDEPLOY_REALRUN_BRIDGE: repo 側 → Mac へ scp し、real-run 向け env で watch loop を再起動（Mac に物理接触不要）
cmd_bridge_push() {
  [[ -n "${TENMON_MAC_SSH:-}" ]] || die "bridge_push: set TENMON_MAC_SSH (user@mac-host)"
  [[ -n "${TENMON_REMOTE_CURSOR_BASE_URL:-}" ]] || die "bridge_push: set TENMON_REMOTE_CURSOR_BASE_URL"
  [[ -n "${TENMON_REPO_ROOT:-}" && -d "${TENMON_REPO_ROOT}" ]] || die "bridge_push: set TENMON_REPO_ROOT to local repo root"

  local R="$TENMON_REPO_ROOT"
  local DEST_REL="${TENMON_MAC_REMOTE_DIR:-tenmon-mac}"
  local files=(
    "api/scripts/tenmon_cursor_watch_loop.sh"
    "api/automation/tenmon_mac_executor_auth_refresh_v1.py"
    "api/automation/tenmon_mac_executor_result_return_and_acceptance_bind_v1.py"
    "api/automation/browser_ai_operator_v1.py"
    "api/automation/cursor_review_acceptor_v1.py"
    "api/scripts/tenmon_mac_runtime_redeploy_v1.sh"
  )

  echo "[bridge_push] TENMON_MAC_SSH=${TENMON_MAC_SSH} DEST=~\$HOME/${DEST_REL}"
  ssh -o BatchMode=yes "${TENMON_MAC_SSH}" "mkdir -p \"\$HOME/${DEST_REL}/logs\"" || die "bridge_push: ssh mkdir failed"

  local f
  for f in "${files[@]}"; do
    [[ -f "$R/$f" ]] || die "bridge_push: missing $R/$f"
    echo "[bridge_push] scp $f"
    scp "$R/$f" "${TENMON_MAC_SSH}:~/${DEST_REL}/" || die "bridge_push: scp failed: $f"
  done

  local _mh
  if [[ -n "${TENMON_MAC_HOME:-}" ]]; then
    _mh="export TENMON_MAC_HOME=$(printf '%q' "$TENMON_MAC_HOME")"
  else
    _mh="export TENMON_MAC_HOME=\"\$HOME/${DEST_REL}\""
  fi
  local _rs
  if [[ -n "${TENMON_MAC_RESULT_SUMMARY_PATH:-}" ]]; then
    _rs="export TENMON_MAC_RESULT_SUMMARY_PATH=$(printf '%q' "$TENMON_MAC_RESULT_SUMMARY_PATH")"
  else
    _rs="# TENMON_MAC_RESULT_SUMMARY_PATH optional"
  fi

  echo "[bridge_push] remote pkill + chmod + caffeinate + log tail"
  ssh -o BatchMode=yes "${TENMON_MAC_SSH}" "bash -s" <<EOF
set -euo pipefail
export TENMON_REMOTE_CURSOR_BASE_URL=$(printf '%q' "$TENMON_REMOTE_CURSOR_BASE_URL")
${_mh}
${_rs}
export TENMON_FORCE_DRY_RUN=$(printf '%q' "${TENMON_FORCE_DRY_RUN:-0}")
export TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED=$(printf '%q' "${TENMON_REAL_EXEC_REQUIRE_ESCROW_APPROVED:-1}")
pkill -f "tenmon_cursor_watch_loop.sh" || true
sleep 2
MAC="\${TENMON_MAC_HOME}"
chmod +x "\${MAC}/tenmon_cursor_watch_loop.sh" 2>/dev/null || true
chmod +x "\${MAC}/tenmon_mac_runtime_redeploy_v1.sh" 2>/dev/null || true
LOG_DIR="\${TENMON_MAC_LOG_DIR:-\${MAC}/logs}"
mkdir -p "\${LOG_DIR}"
MAIN_LOG="\${TENMON_MAC_WATCH_LOG:-\${LOG_DIR}/watch_loop.log}"
nohup caffeinate -i bash "\${MAC}/tenmon_cursor_watch_loop.sh" >>"\${MAIN_LOG}" 2>&1 &
echo \$! >"\${LOG_DIR}/watch_loop.pid"
sleep 2
tail -n 40 "\${MAIN_LOG}" || true
EOF
  echo "[bridge_push] ok"
}

cmd_confirm_hints() {
  echo "grep -E 'executor_real_run id=|exec_decision .*want_real=true|real_execution_enabled' \"\${TENMON_MAC_WATCH_LOG:-\$HOME/tenmon-mac/logs/watch_loop.log}\" | tail -n 30"
  echo "tail -n 80 \"\${TENMON_MAC_WATCH_LOG:-\$HOME/tenmon-mac/logs/watch_loop.log}\""
  echo "curl -fsS -m 25 -H \"Authorization: Bearer \${TENMON_FOUNDER_EXECUTOR_BEARER:-\$TENMON_EXECUTOR_BEARER_TOKEN}\" \"\${TENMON_REMOTE_CURSOR_BASE_URL}/api/admin/cursor/queue\" | head -c 2000"
}

usage() {
  echo "usage: TENMON_REPO_ROOT=... $0 check|stop|start|health|scp_suggest|full|bridge_push|confirm_hints" >&2
  echo "  bridge_push: needs TENMON_MAC_SSH, TENMON_REMOTE_CURSOR_BASE_URL, TENMON_REPO_ROOT (run from VPS or laptop with ssh/scp to Mac)" >&2
}

main() {
  local sub="${1:-}"
  case "$sub" in
    check) cmd_check ;;
    stop) cmd_stop ;;
    start) cmd_start ;;
    health) cmd_health ;;
    scp_suggest) cmd_scp_suggest ;;
    full) cmd_full ;;
    bridge_push) cmd_bridge_push ;;
    confirm_hints) cmd_confirm_hints ;;
    *) usage; die "unknown subcommand: ${sub:-empty}" ;;
  esac
}

main "$@"
