#!/usr/bin/env bash
# TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1
set -euo pipefail
set +H
set +o histexpand

CARD="${CARD:-TENMON_KG1_DETERMINISTIC_SEED_GENERATOR_VPS_V1}"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
OUT_DIR="${KG1_OUT_DIR:-$API/automation/out/tenmon_kg1_deterministic_seed_generator_v1}"
PASSABLE="${KG1_PASSABLE_JSON:-$API/automation/out/tenmon_kg0_khs_health_gate_v1/khs_passable_set.json}"
DB="${KG1_DB:-}"

echo "[$CARD] api=$API out=$OUT_DIR"

mkdir -p "$OUT_DIR"

# build を壊さない確認（dist はコミット対象外だが型チェック相当）
(cd "$API" && npm run build)

EXTRA=(--out-dir "$OUT_DIR" --passable-json "$PASSABLE")
if [[ -n "$DB" ]]; then
  EXTRA+=(--db "$DB")
fi
# KG0 が FAIL の環境でもサンプル生成する場合は KG1_RELAX_PIPELINE=1
if [[ "${KG1_RELAX_PIPELINE:-}" == "1" ]]; then
  EXTRA+=(--no-require-pipeline)
fi

# 任意: 稼働 API の監査
if [[ -n "${TENMON_API_BASE:-}" ]]; then
  export KG1_AUDIT_URL="${TENMON_API_BASE%/}/api/audit"
fi

set +e
(cd "$API" && npx tsx src/seed/deterministic_seed_generator_run_v1.ts "${EXTRA[@]}")
RC=$?
set -e

if [[ "${KG1_EXIT_ZERO:-}" == "1" ]]; then
  exit 0
fi
exit "$RC"
