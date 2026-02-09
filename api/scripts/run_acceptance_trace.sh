#!/usr/bin/env bash
set -euo pipefail

cd /opt/tenmon-ark-repo/api

LOG="/tmp/tenmon_acceptance_trace_$(date +%Y%m%d_%H%M%S).log"
echo "[trace] start: $(date -Iseconds)" | tee -a "$LOG"

echo "[trace] audit pre" | tee -a "$LOG"
curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok,gitSha,build,readiness}' | tee -a "$LOG"

echo "[trace] smoke" | tee -a "$LOG"
set +e
bash scripts/smoke.sh 2>&1 | tee -a "$LOG"
SMOKE_RC=${PIPESTATUS[0]}
echo "[trace] smoke rc=$SMOKE_RC" | tee -a "$LOG"
set -e

echo "[trace] acceptance (bash -x)" | tee -a "$LOG"
set +e
( set -o pipefail; bash -x scripts/acceptance_test.sh ) 2>&1 | tee -a "$LOG"
ACC_RC=${PIPESTATUS[0]}
echo "[trace] acceptance rc=$ACC_RC" | tee -a "$LOG"
set -e

if [ "$ACC_RC" -ne 0 ]; then
  echo "[trace] FAIL. last 200 service logs:" | tee -a "$LOG"
  journalctl -u tenmon-ark-api -n 200 --no-pager | tee -a "$LOG"
fi

echo "[trace] saved: $LOG"
exit "$ACC_RC"
