#!/usr/bin/env bash
# TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1
# Dry bind: queue/result は Python 側で読取のみ（直書きなし）。Mac agent は TENMON_REMOTE_CURSOR_BASE_URL 等で VPS と整合。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(cd "${API}/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
exec python3 "${API}/automation/tenmon_mac_cursor_executor_runtime_bind_v1.py" "$@"
