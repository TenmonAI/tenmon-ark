#!/usr/bin/env bash
# TENMON_PDCA_SELF_RUNNING_OS_PARENT_CURSOR_AUTO_V1 — 単発実行ラッパ
set -euo pipefail
ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="${ROOT}"
cd "${ROOT}"
PY="${PYTHON:-python3}"
exec "${PY}" "${ROOT}/api/automation/tenmon_pdca_self_running_os_parent_v1.py" "$@"
