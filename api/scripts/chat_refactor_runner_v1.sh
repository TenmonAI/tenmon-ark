#!/usr/bin/env bash
# CHAT_SAFE_REFACTOR_PATCH43_RUNNER_AUTOMATION_V1
# chat refactor 系カードの build / restart / health / PATCH29 acceptance を共通実行する runner。
# 用法: ./chat_refactor_runner_v1.sh <CARD名>

set -euo pipefail

CARD="${1:-CHAT_SAFE_REFACTOR_RUNNER_V1}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[RUNNER] CARD=$CARD TS=$TS DIR=$DIR"
cd /opt/tenmon-ark-repo/api

echo "== build =="
npm run build

echo ""
echo "== restart =="
sudo systemctl restart tenmon-ark-api.service

echo ""
echo "== health =="
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -fsS http://127.0.0.1:3000/health && break || sleep 1
done

echo ""
echo "== patch29 acceptance =="
EXIT=0
/opt/tenmon-ark-repo/api/scripts/patch29_final_acceptance_sweep_v1.sh || EXIT=$?

echo ""
if [ "$EXIT" -eq 0 ]; then
  echo "PASS"
else
  echo "FAIL"
fi
exit "$EXIT"
