#!/usr/bin/env bash
# TENMON_SELF_BUILD_OS_FINAL_AUDIT — 7 系統の最終監査（read-only）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/automation"
exec python3 self_build_os_final_audit_v1.py "$@"
