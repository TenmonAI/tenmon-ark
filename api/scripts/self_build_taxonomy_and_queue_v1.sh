#!/usr/bin/env bash
# TENMON_SELF_BUILD_OS_PARENT_02 — manifest → taxonomy → priority queue
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/automation"
python3 self_build_manifest_v1.py
python3 self_build_taxonomy_v1.py
python3 self_build_priority_queue_v1.py "$@"
