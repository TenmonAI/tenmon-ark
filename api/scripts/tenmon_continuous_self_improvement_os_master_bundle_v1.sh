#!/usr/bin/env bash
set -euo pipefail

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"
cd "$ROOT/api"

exec python3 automation/tenmon_continuous_self_improvement_os_master_bundle_v1.py "$@"

