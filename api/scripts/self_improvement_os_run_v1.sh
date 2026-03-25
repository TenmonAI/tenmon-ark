#!/usr/bin/env bash
# TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1 — OS 統合 runner（ledger / scorer / card gen / seal governor）
set -euo pipefail
set +H
set +o histexpand

if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1"
  fi
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
RUN="$API/automation/self_improvement_os_runner_v1.py"

DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"

EXTRA=()
[ -n "${OS_RUNNER_SEAL_DIR:-}" ] && EXTRA+=(--seal-dir "$OS_RUNNER_SEAL_DIR")
[ "${OS_RUNNER_SKIP_SEAL:-0}" = "1" ] && EXTRA+=(--skip-seal --seal-exit-code "${OS_RUNNER_SEAL_EXIT_CODE:-0}")
[ -n "${OS_RUNNER_TS_FOLDER:-}" ] && EXTRA+=(--ts-folder "$OS_RUNNER_TS_FOLDER")

set +e
python3 "$RUN" run "${EXTRA[@]}" --stdout-json | tee "$DIR/runner_stdout.json"
RC=$?
set -e

SEAL="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
OSI=""
if [ -n "$SEAL" ] && [ -d "$SEAL/_self_improvement_os_integrated" ]; then
  OSI="$SEAL/_self_improvement_os_integrated"
  for f in self_improvement_os_manifest.json integrated_final_verdict.json stopbleed_final_verdict.json seal_governor_verdict.json next_card_dispatch.json final_verdict.json evidence_bundle.json; do
    if [ -f "$OSI/$f" ]; then
      cp -a "$OSI/$f" "$DIR/$f" || true
    fi
  done
fi

if [ "$RC" -ne 0 ]; then
  echo "[FAIL] runner exit $RC — 成果物: $DIR / $OSI"
  exit "$RC"
fi

echo "[PASS] $DIR"
exit 0
