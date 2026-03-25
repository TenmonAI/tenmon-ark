#!/usr/bin/env bash
# TENMON_SELF_BUILD_OS_PARENT_01 — 自己構築横断 manifest 生成（read-only）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/automation"
exec python3 self_build_manifest_v1.py "$@"
