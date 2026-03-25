#!/usr/bin/env bash
# TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"

EXTRA=()
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) EXTRA+=( --stdout-json ) ;;
    --prune-web-bak) EXTRA+=( --prune-web-bak ) ;;
  esac
done

python3 "$API/automation/tenmon_pwa_frontend_residue_hygiene_v1.py" --repo-root "$ROOT" "${EXTRA[@]}"
echo "[EVIDENCE] $API/automation/pwa_frontend_residue_hygiene_evidence.json"
