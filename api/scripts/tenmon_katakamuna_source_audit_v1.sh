#!/usr/bin/env bash
# TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1
set -euo pipefail
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
exec python3 "$ROOT/api/automation/tenmon_katakamuna_source_audit_and_classification_cursor_auto_v1.py"
