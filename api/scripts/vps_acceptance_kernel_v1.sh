#!/usr/bin/env bash
# TENMON_SELF_BUILD_OS_PARENT_04 — VPS acceptance + seal + forensics kernel
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/automation"
exec python3 vps_acceptance_kernel_v1.py "$@"
