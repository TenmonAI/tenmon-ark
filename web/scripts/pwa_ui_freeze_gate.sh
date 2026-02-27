#!/usr/bin/env bash
# PWA_LOGIN_THREADS_GPTUI_FREEZE_V1: CI gate for PWA UI freeze.
# Exit 10: forbidden file in diff (staged only)
# Exit 11: build failed
# Exit 0: OK

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

FORBIDDEN="web/src/App.tsx
web/src/pages/ChatPage.tsx
web/index.html"

# Check staged files only (what would be committed)
CHANGED="$(git diff --cached --name-only 2>/dev/null || true)"
for f in $FORBIDDEN; do
  if echo "$CHANGED" | grep -q "^${f}$"; then
    echo "[GATE] Forbidden file in diff: $f"
    exit 10
  fi
done

if ! pnpm -C web build 2>&1; then
  echo "[GATE] Build failed"
  exit 11
fi

echo "[GATE] PASS"
exit 0
