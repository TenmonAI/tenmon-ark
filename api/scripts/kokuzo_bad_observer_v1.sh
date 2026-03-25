#!/usr/bin/env bash
# TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
PY="$API/automation/kokuzo_bad_observer_v1.py"
RETRY="$API/automation/generated_cursor_apply/TENMON_A0_KOKUZO_BAD_OBSERVE_RETRY_CURSOR_AUTO_V1.md"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"

cd "$API"
npm run build

EXTRA=()
if [ -n "${KOKUZO_BAD_COMPARE_DIR:-}" ]; then
  EXTRA+=(--compare-dir "$KOKUZO_BAD_COMPARE_DIR")
fi
if [ -n "${KOKUZO_BAD_LOG_DIR:-}" ]; then
  EXTRA+=(--log-dir "$KOKUZO_BAD_LOG_DIR")
fi
if [ -n "${KOKUZO_BAD_DB:-}" ]; then
  EXTRA+=(--db "$KOKUZO_BAD_DB")
fi
if [ -n "${KOKUZO_BAD_DOC_FILTER:-}" ]; then
  EXTRA+=(--doc-filter "$KOKUZO_BAD_DOC_FILTER")
fi
if [ -n "${KOKUZO_BAD_LIMIT:-}" ]; then
  EXTRA+=(--limit "$KOKUZO_BAD_LIMIT")
fi

set +e
python3 "$PY" --out-dir "$DIR" "${EXTRA[@]}" --stdout-json | tee "$DIR/observer_stdout.json"
RC=$?
set -e

if [ "$RC" -ne 0 ]; then
  mkdir -p "$(dirname "$RETRY")"
  cat > "$RETRY" <<'EOF'
# TENMON_A0_KOKUZO_BAD_OBSERVE_RETRY_CURSOR_AUTO_V1

> kokuzo_bad_observer 失敗 — `kokuzo_bad_report.json` / DB パスを確認

## VPS_VALIDATION_OUTPUTS

- `TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1`
- `kokuzo_bad_report.json`
- `page_bad_distribution.json`
- `final_verdict.json`

EOF
fi

echo "[DONE] rc=$RC dir=$DIR"
exit "$RC"
