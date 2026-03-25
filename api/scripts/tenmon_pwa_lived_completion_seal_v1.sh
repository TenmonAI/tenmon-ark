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

CARD="TENMON_PWA_LIVED_COMPLETION_SEAL_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_TENMON_PWA_LIVED_COMPLETION_SEAL_V1 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
export BASE

say(){ printf '\n===== %s =====\n' "$1"; }

say "CARD / IDENTITY"
echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] $ROOT"
echo "[BASE] $BASE"
git -C "$ROOT" rev-parse --short HEAD | tee "$DIR/git_sha_short.txt"

say "LIVED COMPLETION SEAL (python — API lived)"
set +e
PY_ARGS=( "$API/automation/tenmon_pwa_lived_completion_seal_v1.py" "$ROOT" "$DIR" "$BASE" )
if [ "$STDOUT_JSON" -eq 1 ]; then
  PY_ARGS+=( --stdout-json )
fi
python3 "${PY_ARGS[@]}" | tee "$DIR/python_stdout.json"
PY_EXIT=$?
set -e

cp -f "$API/automation/pwa_lived_completion_seal_report.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_lived_completion_readiness.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/pwa_lived_completion_blockers.json" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/generated_cursor_apply/TENMON_PWA_LIVED_COMPLETION_SEAL_PASS_V1.md" "$DIR/" 2>/dev/null || true
cp -f "$API/automation/generated_cursor_apply/TENMON_PWA_LIVED_FAIL_NEXT_PDCA_AUTO_V1.md" "$DIR/" 2>/dev/null || true

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort | tee "$DIR/output_list.txt"
echo "[PY_EXIT] $PY_EXIT"

exit "${PY_EXIT:-0}"
