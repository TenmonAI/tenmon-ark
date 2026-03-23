#!/usr/bin/env bash
# VPS_FIX_RESTART_AND_ROUTE_BLEED_V1_SAFE — build / restart / health / audit / final_seal + target probe 抽出
# 観測・実行用。必要なら手元で chmod +x して実行すること。
set -euo pipefail
set +H 2>/dev/null || true
set +o histexpand 2>/dev/null || true

ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
BASE="${TENMON_API_BASE:-http://127.0.0.1:3000}"
SYSTEMD_UNIT="${TENMON_API_SYSTEMD_UNIT:-tenmon-ark-api.service}"
REPORT_ROOT="$API/automation/reports/TENMON_ARK_FINAL_SEAL_AUTOPILOT_V3"

# カード観測対象（baseline_probe_matrix.json の .probe と一致）
TARGET_PROBES=(
  soul_1
  continuity_followup_1
  next_step_2
  worldview_1
  support_dense_1
  selfaware_dense_1
)

cd "$ROOT"
git status --short || true

cd "$API"
npm run build

sudo systemctl restart "$SYSTEMD_UNIT"

curl -fsS "$BASE/health"
curl -fsS "$BASE/api/audit" | head -c 4000
echo

python3 "$API/automation/final_seal_autopilot_v3.py" \
  --repo-root "$ROOT" \
  --base-url "$BASE" \
  --skip-build \
  --assume-restart-ok \
  --cycle 0

MATRIX=""
if compgen -G "$REPORT_ROOT"/*/baseline_probe_matrix.json > /dev/null; then
  MATRIX="$(ls -t "$REPORT_ROOT"/*/baseline_probe_matrix.json | head -1)"
fi

if [[ -z "$MATRIX" || ! -f "$MATRIX" ]]; then
  echo "ERROR: baseline_probe_matrix.json not found under $REPORT_ROOT" >&2
  exit 1
fi

echo "=== probe matrix: $MATRIX ==="

if command -v jq >/dev/null 2>&1; then
  for p in "${TARGET_PROBES[@]}"; do
    echo "--- target: $p ---"
    jq --arg p "$p" '
      .probes[]
      | select(.probe == $p)
      | {
          probe,
          routeReason: .rr,
          routeClass: .rc,
          responseHead,
          generic_preamble_bad,
          helper_tail_bad,
          repetition_bad,
          center_preamble_bad,
          fallback_bleed,
          ok
        }
    ' "$MATRIX"
  done
else
  echo "WARN: jq not found; falling back to grep (coarse)" >&2
  for p in "${TARGET_PROBES[@]}"; do
    echo "--- target: $p (grep) ---"
    grep -F "\"probe\": \"$p\"" "$MATRIX" || true
  done
fi
