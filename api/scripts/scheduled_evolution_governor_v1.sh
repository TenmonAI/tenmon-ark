#!/usr/bin/env bash
# PARENT_07: 成熟度に応じた自己改善ループ周波数の状態更新（cron 変更はしない）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${TENMON_PYTHON:-python3}"
exec "$PY" "$ROOT/automation/scheduled_evolution_governor_v1.py" "$@"
