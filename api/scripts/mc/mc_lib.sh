#!/usr/bin/env bash
# api/scripts/mc/mc_lib.sh
# MC V2 FINAL — §9.1 Shared Library for Collectors
# Source this file from all collector scripts.

set -euo pipefail

# ── Paths ────────────────────────────────────────────────
export TENMON_DATA_ROOT="${TENMON_DATA_ROOT:-/opt/tenmon-ark-data}"
export TENMON_REPO_ROOT="${TENMON_REPO_ROOT:-/opt/tenmon-ark-repo}"
export MC_DATA_DIR="${TENMON_DATA_ROOT}/mc"
export DB_PATH="${TENMON_DATA_ROOT}/kokuzo.sqlite"
export CANON_DIR="${TENMON_REPO_ROOT}/docs/ark"
export SERVICE_NAME="tenmon-ark-api"
export HEALTH_URL="http://127.0.0.1:3000/health"

# ── Ensure output directory ──────────────────────────────
mkdir -p "${MC_DATA_DIR}"

# ── Logging ──────────────────────────────────────────────
mc_log() {
  local level="$1"; shift
  echo "[MC][$(date -u +%Y-%m-%dT%H:%M:%SZ)][${level}] $*" >&2
}

mc_info()  { mc_log INFO  "$@"; }
mc_warn()  { mc_log WARN  "$@"; }
mc_error() { mc_log ERROR "$@"; }

# ── JSON helpers ─────────────────────────────────────────
# Write JSON to file atomically (write to tmp, then mv)
mc_write_json() {
  local outfile="$1"
  local tmpfile="${outfile}.tmp.$$"
  cat > "${tmpfile}"
  mv -f "${tmpfile}" "${outfile}"
  mc_info "Wrote ${outfile} ($(wc -c < "${outfile}") bytes)"
}

# Escape a string for JSON value
json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))" 2>/dev/null || echo '""'
}

# ── SQLite helper ────────────────────────────────────────
sql_ro() {
  sqlite3 -readonly "${DB_PATH}" "$@" 2>/dev/null || echo ""
}

# ── Sanitizer ────────────────────────────────────────────
# Remove secrets from output
mc_sanitize() {
  sed -E \
    -e 's/sk-[a-zA-Z0-9_-]{20,}/***REDACTED***/g' \
    -e 's/AIza[a-zA-Z0-9_-]{35}/***REDACTED***/g' \
    -e 's/ghp_[a-zA-Z0-9]{36}/***REDACTED***/g' \
    -e 's/gho_[a-zA-Z0-9]{36}/***REDACTED***/g' \
    -e 's/ntn_[a-zA-Z0-9]{40,}/***REDACTED***/g' \
    -e 's/Bearer [a-zA-Z0-9._-]{20,}/Bearer ***REDACTED***/g'
}

# ── Timestamp ────────────────────────────────────────────
mc_now_iso() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}
