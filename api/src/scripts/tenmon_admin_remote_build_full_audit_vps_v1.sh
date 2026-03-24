#!/usr/bin/env bash
# TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_VPS_V1
# 7層 end-to-end 監査: admin dashboard -> normalizer -> bridge -> executor -> collector -> seal -> dashboard reflection
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"

# 監査前に各層の VPS スクリプトを可能な限り実行（失敗しても監査が missing_contracts に落とす）
set +e
bash "$ROOT/api/src/scripts/tenmon_admin_remote_build_dashboard_vps_v1.sh"
bash "$ROOT/api/src/scripts/tenmon_remote_build_job_normalizer_vps_v1.sh"
bash "$ROOT/api/src/scripts/tenmon_mac_remote_bridge_vps_v1.sh"
bash "$ROOT/api/src/scripts/tenmon_cursor_mac_executor_vps_v1.sh"
bash "$ROOT/api/src/scripts/tenmon_remote_build_result_collector_vps_v1.sh"
bash "$ROOT/api/src/scripts/tenmon_remote_build_seal_and_rollback_vps_v1.sh"
set -e

python3 automation/admin_remote_build_full_audit_v1.py --run-pipeline || true

echo "[DONE] TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_VPS_V1"
echo "out: api/automation/out/admin_remote_build_end_to_end_verdict.json"

