#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT="$(cd "${API}/.." && pwd)"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-$ROOT}"
cd "$API"

STDOUT_JSON=0
EXTRA=()
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
    *) EXTRA+=("$__arg") ;;
  esac
done

if [[ "$STDOUT_JSON" -eq 1 ]]; then
  EXTRA+=(--stdout-json)
fi

exec python3 "${API}/automation/tenmon_full_autonomy_os_13plus4_master_parent_v1.py" --repo-root "${TENMON_REPO_ROOT}" "${EXTRA[@]}"
