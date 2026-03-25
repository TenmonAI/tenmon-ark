#!/usr/bin/env bash
# PARENT_06: JSON ファイルを remote admin キューへ投入（VPS / ローカル）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${TENMON_PYTHON:-python3}"
exec "$PY" "$ROOT/automation/remote_admin_intake_v1.py" --payload "${1:?usage: remote_admin_intake_v1.sh path/to/payload.json}" --source "${TENMON_INTAKE_SOURCE:-shell}"
