#!/usr/bin/env bash
set -euo pipefail
set +H

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
SVC="${SVC:-tenmon-ark-api.service}"
REPO="${REPO:-/opt/tenmon-ark-repo}"

OUT_DIR="${1:-}"
[ -n "$OUT_DIR" ] || { echo "[FATAL] usage: obs_evidence_bundle.sh <OUT_DIR>" >&2; exit 2; }
mkdir -p "$OUT_DIR"

curl -fsS "$BASE_URL/api/audit" | tee "$OUT_DIR/audit.json" >/dev/null || true
systemctl status "$SVC" --no-pager | tee "$OUT_DIR/systemctl_status.txt" >/dev/null || true
journalctl -u "$SVC" -n 200 --no-pager | tee "$OUT_DIR/journal_tail.txt" >/dev/null || true
ss -lntp | grep -F ":3000" | tee "$OUT_DIR/ss_3000.txt" >/dev/null || true
git -C "$REPO" rev-parse HEAD | tee "$OUT_DIR/git_head.txt" >/dev/null || true
git -C "$REPO" status --porcelain | tee "$OUT_DIR/git_status.txt" >/dev/null || true

echo "[OK] evidence bundle => $OUT_DIR"
