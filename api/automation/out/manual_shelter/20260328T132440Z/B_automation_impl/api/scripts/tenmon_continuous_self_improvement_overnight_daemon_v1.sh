#!/usr/bin/env bash
# TENMON_CONTINUOUS_SELF_IMPROVEMENT_OVERNIGHT_DAEMON — 本体 / systemd テンプレ emit ラッパー
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"

cd "$ROOT/api"

# 次回夜起動前の rearm（候補同期 + 正常終了由来 lock/stop clear）
if [ -f "scripts/tenmon_overnight_rearm_v1.sh" ]; then
  bash "scripts/tenmon_overnight_rearm_v1.sh" || true
fi

OVERNIGHT_MODE="${TENMON_OVERNIGHT_MODE:-continuity_operable}"
if [ "${OVERNIGHT_MODE}" = "continuity_operable" ] && [ -f "scripts/tenmon_overnight_continuity_operable_pdca_orchestrator_v1.sh" ]; then
  exec bash "scripts/tenmon_overnight_continuity_operable_pdca_orchestrator_v1.sh" "$@"
fi

case "${1:-}" in
  systemd-template)
    shift
    exec python3 automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py --emit-systemd-template-only "$@"
    ;;
esac

exec python3 automation/tenmon_continuous_self_improvement_overnight_daemon_v1.py "$@"

