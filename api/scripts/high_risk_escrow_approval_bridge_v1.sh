#!/usr/bin/env bash
set -euo pipefail

# TENMON_HIGH_RISK_ESCROW_APPROVAL_BRIDGE_CURSOR_AUTO_V1
# - escrow package を生成し、人間が --approve を付けた時だけ enqueue する

REPO_ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
CARD_ID="${1:-}"

if [[ -z "${CARD_ID}" ]]; then
  echo "usage: $0 <CARD_ID> [--approve] [--objective=...] [--blocked-reason=...] [--approve-by=...]" 1>&2
  exit 2
fi

shift || true

cd "${REPO_ROOT}/api"
exec python3 automation/high_risk_escrow_approval_bridge_v1.py \
  --repo-root "${REPO_ROOT}" \
  --card-id "${CARD_ID}" \
  "$@"

