#!/usr/bin/env bash
# TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
RUN="$API/automation/chat_refactor_os_runner_v1.py"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

EXTRA=(--out-dir "$DIR")
[ "${CHAT_REFACTOR_OS_DEMO:-0}" = "1" ] && EXTRA+=(--demo)
[ -n "${CHAT_REFACTOR_CHAT_PATH:-}" ] && EXTRA+=(--chat-path "$CHAT_REFACTOR_CHAT_PATH")
[ -n "${CHAT_REFACTOR_OS_TS_FOLDER:-}" ] && EXTRA+=(--ts-folder "$CHAT_REFACTOR_OS_TS_FOLDER")
[ "${CHAT_REFACTOR_OS_NO_WRITE_REPO:-0}" = "1" ] && EXTRA+=(--no-write-repo)
[ "${CHAT_REFACTOR_OS_RUN_ACCEPTANCE:-0}" = "1" ] && EXTRA+=(--run-acceptance-seal)

set +e
python3 "$RUN" "${EXTRA[@]}" --stdout-json | tee "$DIR/os_runner_stdout.json"
RC=$?
set -e

echo "[DONE] rc=$RC dir=$DIR"
exit "$RC"
