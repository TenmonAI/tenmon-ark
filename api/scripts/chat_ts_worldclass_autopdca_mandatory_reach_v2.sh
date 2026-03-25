#!/usr/bin/env bash
# CHAT_TS_WORLDCLASS_AUTOPDCA_MANDATORY_REACH_V2 / STAGE5 束ね実行
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-CHAT_TS_WORLDCLASS_AUTOPDCA_MANDATORY_REACH_V2}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
GEN="$API/automation/generated_cursor_apply"
SEAL="$API/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh"
POSTLOCK="$API/scripts/chat_ts_postlock_maintenance_v1.sh"

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[BASE] ${CHAT_TS_PROBE_BASE_URL:-unset}"

echo "===== STAGE POINTERS ====="
ls -1 "$GEN"/CHAT_TS_STAGE*.md "$GEN"/CHAT_TS_WORLDCLASS*.md 2>/dev/null | head -40 || true
echo

echo "===== STAGE5 ACCEPTANCE (seal + merge) ====="
set +e
"$SEAL" "${1:-CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1}"
RC=$?
set -e

if [ "$RC" -eq 0 ]; then
  echo "[SEAL] chat_ts_overall_100 (Stage5 bundle) reached"
  # POSTLOCK: seal 内でも maintenance は走るが、symlink 直後の明示実行（ENFORCE 時はここでも失敗させる）
  if [ "${CHAT_TS_POSTLOCK_AUTOPDCA_ENFORCE:-0}" = "1" ]; then
    export CHAT_TS_POSTLOCK_MAINTENANCE_ENFORCE=1
    "$POSTLOCK" || exit 1
  else
    "$POSTLOCK" || true
  fi
  echo "[COMPLETION_SUPPLEMENT] $(readlink -f /var/log/tenmon/card 2>/dev/null)/_completion_supplement"
  exit 0
fi

echo "[FAIL] Stage5 overall 未達。focused next を確認。"
echo "[NEXT_STAGE5_AUTO] $GEN/CHAT_TS_STAGE5_WORLDCLASS_NEXT_PDCA_AUTO_V1.md"
echo "[RETRY_CURSOR] $GEN/CHAT_TS_STAGE5_WORLDCLASS_SEAL_RETRY_CURSOR_AUTO_V1.md"
exit 1
