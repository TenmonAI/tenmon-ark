#!/usr/bin/env bash
# TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_VPS_V1
# マスター統合投入キャンペーン: manifest / progress / summary / blockers / readiness delta
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"

python3 automation/master_integrated_deploy_sequence_v1.py --bootstrap

echo "[DONE] TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_VPS_V1"
echo "marker: api/automation/TENMON_MASTER_INTEGRATED_DEPLOY_SEQUENCE_VPS_V1"
echo "out:   api/automation/out/tenmon_master_integrated_deploy_sequence_v1/"
