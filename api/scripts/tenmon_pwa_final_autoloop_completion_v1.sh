#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"

# TENMON_PWA_RUNTIME_ENV_RESTORE_V1: gate base 一意化（子プロセス・ログ用）
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_tenmon_pwa_gate_common.sh"
CHAT_TS_PROBE_BASE_URL="${CHAT_TS_PROBE_BASE_URL:-https://tenmon-ark.com}"
export CHAT_TS_PROBE_BASE_URL
tenmon_pwa_normalize_base
tenmon_pwa_normalize_pwa_url
tenmon_pwa_export_gate_urls
export BASE TARGET_URL GATE_HEALTH_URL GATE_AUDIT_URL GATE_AUDIT_BUILD_URL

CMD=( python3 "$API/automation/tenmon_pwa_final_autoloop_completion_v1.py" "$ROOT" )
if [ "$STDOUT_JSON" -eq 1 ]; then
  CMD+=( --stdout-json )
fi

exec "${CMD[@]}"

