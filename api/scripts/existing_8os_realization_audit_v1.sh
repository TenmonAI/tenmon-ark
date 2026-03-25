#!/usr/bin/env bash
# 既存 8 親 OS の runner / 成果物 / JSON 契約の実成立監査
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="${TENMON_PYTHON:-python3}"
exec "$PY" "$ROOT/automation/existing_8os_realization_audit_v1.py" "$@"
