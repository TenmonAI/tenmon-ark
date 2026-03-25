#!/usr/bin/env bash
# PARENT_08: 最終マスタ監査（封印 MD / readiness / blockers）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${TENMON_PYTHON:-python3}"
exec "$PY" "$ROOT/automation/final_master_audit_v1.py" "$@"
