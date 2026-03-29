#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec python3 "$ROOT/api/automation/tenmon_reuse_bench_and_conversation_uplift_acceptance_cursor_auto_v1.py"
