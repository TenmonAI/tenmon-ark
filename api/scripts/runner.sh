#!/usr/bin/env bash
set -euo pipefail
set +H

CMD="${1:-}"
JOB="${2:-}"

RUN_DIR="/opt/tenmon-ark-data/runner"
ALLOW="$RUN_DIR/allowlist.sha256"
LOCK="$RUN_DIR/runner.lock"
TTL="${RUNNER_TTL_SEC:-1800}"

mkdir -p "$RUN_DIR"

if [ "$CMD" != "run" ] || [ -z "$JOB" ]; then
  echo "usage: runner.sh run /path/to/job.sh" >&2
  exit 2
fi

[ -f "$JOB" ] || { echo "[FATAL] missing job: $JOB" >&2; exit 2; }
[ -f "$ALLOW" ] || { echo "[DENY] allowlist missing: $ALLOW" >&2; exit 3; }

JOB_SHA="$(sha256sum "$JOB" | awk "{print \$1}")"
if ! grep -Fq "$JOB_SHA" "$ALLOW"; then
  echo "[DENY] sha256 not in allowlist: $JOB_SHA" >&2
  exit 3
fi

OUT_DIR="/var/log/tenmon/runner/$(date -u +%Y%m%dT%H%M%SZ)_$(basename "$JOB")"
mkdir -p "$OUT_DIR"

# evidence before
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
SVC="${SVC:-tenmon-ark-api.service}"
REPO="${REPO:-/opt/tenmon-ark-repo}"
if [ -x "/opt/tenmon-ark-repo/api/scripts/obs_evidence_bundle.sh" ]; then
  /opt/tenmon-ark-repo/api/scripts/obs_evidence_bundle.sh "$OUT_DIR/before" || true
fi

# single runner lock
exec 9>"$LOCK"
flock -n 9 || { echo "[BUSY] runner locked" >&2; exit 5; }

echo "[RUN] job=$JOB sha=$JOB_SHA ttl=$TTL out=$OUT_DIR"

set +e
timeout "$TTL" bash "$JOB" >"$OUT_DIR/job.out" 2>"$OUT_DIR/job.err"
RC="$?"
set -e
echo "$RC" >"$OUT_DIR/job.rc"

# evidence after
if [ -x "/opt/tenmon-ark-repo/api/scripts/obs_evidence_bundle.sh" ]; then
  /opt/tenmon-ark-repo/api/scripts/obs_evidence_bundle.sh "$OUT_DIR/after" || true
fi

exit "$RC"
