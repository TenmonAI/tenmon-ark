#!/usr/bin/env bash
set -euo pipefail

# TENMON_SLEEP_AUTONOMY_MASTER_BUNDLE_V1
# CARD0 実行 wrapper（順次実行・並列なし）

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export TENMON_REPO_ROOT="$ROOT"

cd "$ROOT/api"
exec python3 automation/tenmon_sleep_autonomy_master_bundle_v1.py "$@"

