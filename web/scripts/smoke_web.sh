#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
APP="src/App.tsx"
SETTINGS="src/components/SettingsPanel.tsx"
DB="src/lib/db.ts"

echo "[web-smoke] check files exist"
test -f "$APP" || { echo "[web-smoke] FAIL: missing $APP"; exit 1; }
test -f "$SETTINGS" || { echo "[web-smoke] FAIL: missing $SETTINGS"; exit 1; }
test -f "$DB" || { echo "[web-smoke] FAIL: missing $DB"; exit 1; }

echo "[web-smoke] check no heredoc-garbage markers"
if rg -n 'EOFb\.close|EOF;</div>|chmod \+x|HREAD_ID' "$DB" "$SETTINGS" >/dev/null 2>&1; then
  echo "[web-smoke] FAIL: broken heredoc markers detected"
  rg -n 'EOFb\.close|EOF;</div>|chmod \+x|HREAD_ID' "$DB" "$SETTINGS" || true
  exit 1
fi

echo "[web-smoke] check showSettings is not before App()"
APP_LINE="$(rg -n 'export function App\(' "$APP" | head -n1 | cut -d: -f1 || true)"
test -n "$APP_LINE" || { echo "[web-smoke] FAIL: cannot find export function App()"; exit 1; }
if head -n "$((APP_LINE-1))" "$APP" | rg -n 'showSettings|setShowSettings' >/dev/null 2>&1; then
  echo "[web-smoke] FAIL: showSettings appears before App() (typeブロック混入の再発)"
  head -n "$((APP_LINE-1))" "$APP" | rg -n 'showSettings|setShowSettings' || true
  exit 1
fi

echo "[web-smoke] check return() has fragment open '<>' nearby"
RET_LINE="$(rg -n '^\s*return\s*\(' "$APP" | head -n1 | cut -d: -f1 || true)"
test -n "$RET_LINE" || { echo "[web-smoke] FAIL: cannot find main return("; exit 1; }
sed -n "$RET_LINE,$((RET_LINE+8))p" "$APP" | rg -n '^\s*<>\s*$' >/dev/null 2>&1 || {
  echo "[web-smoke] FAIL: missing fragment opener <> right after return("
  nl -ba "$APP" | sed -n "$RET_LINE,$((RET_LINE+15))p" || true
  exit 1
}

echo "[web-smoke] check file tail has closing </>"
tail -n 80 "$APP" | rg -n '^\s*</>\s*$' >/dev/null 2>&1 || {
  echo "[web-smoke] FAIL: missing fragment closer </> near file end"
  tail -n 120 "$APP" || true
  exit 1
}

echo "[web-smoke] check SettingsPanel exports"
rg -n 'export function SettingsPanel' "$SETTINGS" >/dev/null 2>&1 || {
  echo "[web-smoke] FAIL: SettingsPanel export not found"
  rg -n 'SettingsPanel' "$SETTINGS" || true
  exit 1
}

echo "[web-smoke] OK"

# ---- FORBIDDEN_SCAN_V2: scope to runtime payload/key files only ----
echo "[web-smoke] forbidden strings (runtime scope only)"
FILES=(
  "src/App.tsx"
  "src/hooks/useChat.ts"
  "src/api/chat.ts"
  "src/pages/TrainPage.tsx"
  "src/pages/TrainingPage.tsx"
  "src/pages/KanagiPage.tsx"
)
for f in "${FILES[@]}"; do
  test -f "$f" || continue
done

if rg -n 'tenmon-ark\.sessionId|session_id:|body:\s*JSON\.stringify\(\{[\s\S]*\binput\b|^\s*input:\s*' "${FILES[@]}" -S >/dev/null 2>&1; then
  echo "[web-smoke] FAIL: forbidden runtime strings detected"
  rg -n 'tenmon-ark\.sessionId|session_id:|body:\s*JSON\.stringify\(\{[\s\S]*\binput\b|^\s*input:\s*' "${FILES[@]}" -S || true
  exit 1
fi

# ---- P1_PERSIST_GATE_V1: export/import + persist functions exist ----
echo "[web-smoke] P1 persist gate (symbols)"
rg -n 'export\s+async\s+function\s+exportAll|export\s+async\s+function\s+importAll|export\s+async\s+function\s+listMessagesByThread|export\s+async\s+function\s+replaceThreadMessages' src/lib/db.ts >/dev/null \
  || { echo "[web-smoke] FAIL: missing persist symbols in src/lib/db.ts"; exit 1; }
rg -n 'Importしました。リロードします' src/components/SettingsPanel.tsx >/dev/null \
  || { echo "[web-smoke] FAIL: missing import reload UX in SettingsPanel.tsx"; exit 1; }
