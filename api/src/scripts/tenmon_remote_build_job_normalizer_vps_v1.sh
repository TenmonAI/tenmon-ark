#!/usr/bin/env bash
# TENMON_REMOTE_BUILD_JOB_NORMALIZER_VPS_V1 — 正規化器の fixture 検証 + 成果物 JSON
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/api"
python3 automation/remote_build_job_normalizer_v1.py --write-vps-fixtures
echo "[OK] TENMON_REMOTE_BUILD_JOB_NORMALIZER_VPS_V1 → api/automation/out/"
