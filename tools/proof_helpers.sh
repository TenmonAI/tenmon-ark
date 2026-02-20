# TENMON PROOF HELPERS (SOFT ZONE)
# Usage: source tools/proof_helpers.sh

proof_curl () {
  # never kill your shell even if curl fails (expected 4xx/5xx are "evidence")
  set +e
  curl -sS -i "$@"
  local rc=$?
  echo
  echo "[proof_curl rc=$rc]"
  set -e
  return 0
}

soft_zone_begin(){ set +e; }
soft_zone_end(){ set -e; }
