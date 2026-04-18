#!/usr/bin/env bash
# ============================================================
#  MC Phase 1 Acceptance Test — §18
#  Run on VPS after deployment:
#    bash api/tests/mc_phase1_acceptance.sh
# ============================================================
set -euo pipefail

BASE_URL="${MC_TEST_BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0
SKIP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() { PASS=$((PASS+1)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { FAIL=$((FAIL+1)); echo -e "  ${RED}✗${NC} $1 — $2"; }
skip() { SKIP=$((SKIP+1)); echo -e "  ${YELLOW}○${NC} $1 (skipped)"; }

echo "============================================"
echo "  MC Phase 1 Acceptance Test"
echo "  Base URL: ${BASE_URL}"
echo "============================================"
echo ""

# ── Test 1: Files exist ──
echo "§1 File existence checks:"

check_file() {
  local f="$1"
  local label="$2"
  if [ -f "$f" ]; then
    pass "$label exists ($f)"
  else
    fail "$label missing" "$f"
  fi
}

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Backend
check_file "$REPO_ROOT/api/src/core/mc/types.ts" "types.ts"
check_file "$REPO_ROOT/api/src/core/mc/constants.ts" "constants.ts"
check_file "$REPO_ROOT/api/src/core/mc/stateReader.ts" "stateReader.ts"
check_file "$REPO_ROOT/api/src/core/mc/sanitizer.ts" "sanitizer.ts"
check_file "$REPO_ROOT/api/src/core/mc/authGuards.ts" "authGuards.ts"
check_file "$REPO_ROOT/api/src/core/mc/builders/overviewBuilder.ts" "overviewBuilder.ts"
check_file "$REPO_ROOT/api/src/core/mc/builders/aiHandoffBuilder.ts" "aiHandoffBuilder.ts"
check_file "$REPO_ROOT/api/src/core/mc/builders/handoffBuilder.ts" "handoffBuilder.ts"
check_file "$REPO_ROOT/api/src/routes/mc.ts" "mc.ts router"

# Collectors
check_file "$REPO_ROOT/api/scripts/mc/mc_lib.sh" "mc_lib.sh"
check_file "$REPO_ROOT/api/scripts/mc/mc_collect_live_state.sh" "mc_collect_live_state.sh"
check_file "$REPO_ROOT/api/scripts/mc/mc_collect_git_state.sh" "mc_collect_git_state.sh"
check_file "$REPO_ROOT/api/scripts/mc/mc_build_ai_handoff.sh" "mc_build_ai_handoff.sh"
check_file "$REPO_ROOT/api/scripts/mc/mc_collect_all.sh" "mc_collect_all.sh"

# systemd
check_file "$REPO_ROOT/api/systemd/mc-collect-live.service" "mc-collect-live.service"
check_file "$REPO_ROOT/api/systemd/mc-collect-live.timer" "mc-collect-live.timer"
check_file "$REPO_ROOT/api/systemd/mc-collect-git.service" "mc-collect-git.service"
check_file "$REPO_ROOT/api/systemd/mc-collect-git.timer" "mc-collect-git.timer"
check_file "$REPO_ROOT/api/systemd/mc-build-handoff.service" "mc-build-handoff.service"
check_file "$REPO_ROOT/api/systemd/mc-build-handoff.timer" "mc-build-handoff.timer"
check_file "$REPO_ROOT/api/systemd/install-mc-timers.sh" "install-mc-timers.sh"

# Frontend
check_file "$REPO_ROOT/web/src/pages/mc/McLayout.tsx" "McLayout.tsx"
check_file "$REPO_ROOT/web/src/pages/mc/McOverview.tsx" "McOverview.tsx"
check_file "$REPO_ROOT/web/src/pages/mc/McHandoff.tsx" "McHandoff.tsx"
check_file "$REPO_ROOT/web/src/pages/mc/McLive.tsx" "McLive.tsx"
check_file "$REPO_ROOT/web/src/pages/mc/McGit.tsx" "McGit.tsx"
check_file "$REPO_ROOT/web/src/pages/mc/McSoul.tsx" "McSoul.tsx"

echo ""

# ── Test 2: Script executability ──
echo "§2 Script executability:"
for script in mc_lib.sh mc_collect_live_state.sh mc_collect_git_state.sh mc_build_ai_handoff.sh mc_collect_all.sh; do
  if [ -x "$REPO_ROOT/api/scripts/mc/$script" ]; then
    pass "$script is executable"
  else
    fail "$script not executable" "chmod +x needed"
  fi
done

echo ""

# ── Test 3: index.ts mount ──
echo "§3 index.ts MC router mount:"
if grep -q 'mcRouter' "$REPO_ROOT/api/src/index.ts"; then
  pass "mcRouter imported in index.ts"
else
  fail "mcRouter not found in index.ts" "import missing"
fi

if grep -q '/api/mc' "$REPO_ROOT/api/src/index.ts"; then
  pass "/api/mc route mounted in index.ts"
else
  fail "/api/mc route not mounted" "app.use missing"
fi

echo ""

# ── Test 4: App.tsx MC routes ──
echo "§4 App.tsx MC routes:"
if grep -q 'McOverview' "$REPO_ROOT/web/src/App.tsx"; then
  pass "McOverview imported in App.tsx"
else
  fail "McOverview not in App.tsx" "import missing"
fi

if grep -q 'isMc' "$REPO_ROOT/web/src/App.tsx"; then
  pass "isMc route detection in App.tsx"
else
  fail "isMc not in App.tsx" "route detection missing"
fi

echo ""

# ── Test 5: Auth guard ──
echo "§5 Auth guard checks:"
if grep -q 'mcRequireAuth\|mcRequireAdmin\|requireFounder\|requireAuth' "$REPO_ROOT/api/src/routes/mc.ts"; then
  pass "Auth guard used in mc.ts router"
else
  fail "No auth guard in mc.ts" "security risk"
fi

echo ""

# ── Test 6: Sanitizer ──
echo "§6 Secret sanitizer:"
if grep -q 'sanitize\|scrubString\|auditForLeaks' "$REPO_ROOT/api/src/core/mc/sanitizer.ts"; then
  pass "sanitize/scrub functions exist in sanitizer.ts"
else
  fail "sanitize functions missing" "secret leak risk"
fi

echo ""

# ── Test 7: Build check (if npm available) ──
echo "§7 Build verification:"
if command -v npm &>/dev/null && [ -f "$REPO_ROOT/web/package.json" ]; then
  echo "  Running Vite build..."
  cd "$REPO_ROOT/web"
  if npm run build --silent 2>&1 | tail -3; then
    pass "Vite build succeeded"
  else
    fail "Vite build failed" "check TypeScript errors"
  fi
else
  skip "npm not available or web/package.json missing"
fi

echo ""

# ── Summary ──
echo "============================================"
TOTAL=$((PASS+FAIL+SKIP))
echo -e "  Total: ${TOTAL}  ${GREEN}Pass: ${PASS}${NC}  ${RED}Fail: ${FAIL}${NC}  ${YELLOW}Skip: ${SKIP}${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}ALL TESTS PASSED${NC}"
else
  echo -e "  ${RED}${FAIL} TESTS FAILED${NC}"
fi
echo "============================================"

exit "$FAIL"
