#!/usr/bin/env bash
# TENMON_OBSERVATION_OS_VPS_V1 — repo manifest / taxonomy / priority queue 一括観測（read-only）
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_OBSERVATION_OS_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
echo "[$CARD] running observation_os_v1.py"

cd "$API" || exit 1

mkdir -p automation/out

EXTRA=()
if [[ -n "${TENMON_OBSERVATION_SNAPSHOT_DIR:-}" ]]; then
  EXTRA+=(--out-snapshot-dir "$TENMON_OBSERVATION_SNAPSHOT_DIR")
fi

python3 automation/observation_os_v1.py "${EXTRA[@]}" --stdout-json | tee automation/out/tenmon_observation_os_v1_last_run.json

echo "[$CARD] artifacts → api/automation/full_*.json , blocker_taxonomy.json , priority_queue.json , observation_os_report.json"
