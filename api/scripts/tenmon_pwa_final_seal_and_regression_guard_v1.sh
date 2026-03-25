#!/usr/bin/env bash
# TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1
set -euo pipefail
set +H
set +o histexpand

STDOUT_JSON=0
for __arg in "$@"; do
  case "$__arg" in
    --stdout-json) STDOUT_JSON=1 ;;
  esac
done

CARD="TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card_TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1 2>/dev/null || true
ln -sfn "$DIR" /var/log/tenmon/card 2>/dev/null || true
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
WEB="$ROOT/web"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/_tenmon_pwa_gate_common.sh"
CHAT_TS_PROBE_BASE_URL="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
export CHAT_TS_PROBE_BASE_URL
tenmon_pwa_normalize_base
tenmon_pwa_export_gate_urls
export BASE GATE_HEALTH_URL GATE_AUDIT_URL GATE_AUDIT_BUILD_URL

RUNNER="$API/scripts/tenmon_pwa_final_autoloop_completion_v1.sh"
INTEGRATE="$API/automation/tenmon_pwa_final_seal_verdict_integrate_v1.py"
GEN_DIR="$API/automation/generated_cursor_apply"
mkdir -p "$GEN_DIR"

RUNNER_ARGS=()
if [ "$STDOUT_JSON" -eq 1 ]; then
  RUNNER_ARGS+=( --stdout-json )
fi

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] $ROOT"
echo "[BASE] $BASE"
git -C "$ROOT" rev-parse HEAD | tee "$DIR/git_sha.txt"
git -C "$ROOT" status --short | tee "$DIR/git_status.txt" || true
echo

echo "===== PRE-AUTOLOOP LIVED SNAPSHOT (pwa_seal_lived_snapshot.json) ====="
python3 - "$ROOT" <<'PY'
import json, os, sys, time
from pathlib import Path

root = Path(sys.argv[1])
auto = root / "api" / "automation"


def read_json(p: Path) -> dict:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


rd = read_json(auto / "pwa_final_completion_readiness.json")
bd = read_json(auto / "pwa_final_completion_blockers.json")
recheck = {}
envp = os.environ.get("TENMON_LIVED_RECHECK_FINAL_VERDICT", "").strip()
if envp:
    rp = Path(envp)
    if rp.is_file():
        recheck = read_json(rp)
else:
    rv = auto / "pwa_lived_gate_recheck_final_verdict.json"
    if rv.is_file():
        recheck = read_json(rv)

st_pre = auto / "pwa_final_autoloop_state.json"
state_pre = read_json(st_pre) if st_pre.is_file() else None
snap = {
    "card": "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1",
    "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "source": "pre_autoloop_automation_snapshot",
    "readiness": rd,
    "blockers": bd.get("blockers", []) if isinstance(bd, dict) else [],
    "lived_recheck_verdict": recheck,
    "pwa_final_autoloop_state_pre": state_pre,
}
out = auto / "pwa_seal_lived_snapshot.json"
out.write_text(json.dumps(snap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"[SNAPSHOT] wrote {out}")
PY

echo "===== BUILD / RESTART / GATE ====="
(
  cd "$API"
  npm run build
) | tee "$DIR/build_api.log"
(
  cd "$WEB"
  npm run build
) | tee "$DIR/build_web.log"

sudo systemctl restart tenmon-ark-api.service || true
sleep 2

curl -fsS "$GATE_HEALTH_URL" | tee "$DIR/health.json" || echo '{"ok":false}' > "$DIR/health.json"
curl -fsS "$GATE_AUDIT_URL" | tee "$DIR/audit.json" || echo '{"ok":false}' > "$DIR/audit.json"
curl -fsS "$GATE_AUDIT_BUILD_URL" | tee "$DIR/audit_build.json" || echo '{"ok":false}' > "$DIR/audit_build.json"
echo

echo "===== FINAL AUTOLOOP ====="
set +e
bash "$RUNNER" "${RUNNER_ARGS[@]}" | tee "$DIR/final_autoloop_stdout.json"
AL_EXIT=$?
set -e
echo "[FINAL_AUTOLOOP_EXIT] $AL_EXIT"
export TENMON_AUTOLOOP_EXIT="$AL_EXIT"
cp -f "$API/automation/pwa_final_autoloop_state.json" "$DIR/pwa_final_autoloop_state.json" 2>/dev/null || true
cp -f "$API/automation/pwa_final_completion_readiness.json" "$DIR/pwa_final_completion_readiness.json" 2>/dev/null || true
cp -f "$API/automation/pwa_final_completion_blockers.json" "$DIR/pwa_final_completion_blockers.json" 2>/dev/null || true
echo

echo "===== VERDICT + SEAL + REGRESSION GUARD (integrate) ====="
GIT_SHA="$(git -C "$ROOT" rev-parse HEAD)"
VERDICT_JSON="$API/automation/pwa_final_seal_and_regression_guard_verdict.json"
REG_JSON="$API/automation/pwa_final_regression_guard.json"
SEAL_PATH="$API/automation/pwa_final_completion_seal.md"
RETRY_PATH="$GEN_DIR/TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1.md"
SEAL_MARKER="## Regression guard (TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1)"

set +e
python3 "$INTEGRATE" "$ROOT" \
  --out-verdict "$VERDICT_JSON" \
  --out-regression "$REG_JSON" \
  --git-sha "$GIT_SHA"
INT_EXIT=$?
set -e

cp -f "$VERDICT_JSON" "$DIR/final_verdict.json"

RETRY_WRAP="$API/scripts/tenmon_pwa_final_seal_and_regression_guard_retry_v1.sh"

if [ "$INT_EXIT" -eq 0 ]; then
  FP="$(python3 -c "import json; print(json.load(open('$VERDICT_JSON')).get('unified_fingerprint_sha256',''))" 2>/dev/null || echo "")"
  cat >"$DIR/seal_append_fragment.md" <<EOF

${SEAL_MARKER}

- 単一 verdict: \`api/automation/pwa_final_seal_and_regression_guard_verdict.json\`
- regression guard: \`api/automation/pwa_final_regression_guard.json\`
- unified fingerprint (SHA256): \`${FP}\`
- cosmetic residual は \`cosmetic_residual_only\` で管理
- 以降の変更は lived recheck / final autoloop / handoff の優先順で評価する
- final_ready: true / regression_guard: issued

EOF
  if [ ! -f "$SEAL_PATH" ]; then
    echo "# PWA final completion seal" >"$SEAL_PATH"
  fi
  python3 - "$SEAL_PATH" "$SEAL_MARKER" "$DIR/seal_append_fragment.md" <<'PY'
import sys
from pathlib import Path

p = Path(sys.argv[1])
marker = sys.argv[2]
tail = Path(sys.argv[3]).read_text(encoding="utf-8")
prev = p.read_text(encoding="utf-8") if p.exists() else ""
if marker not in prev:
    p.write_text(prev.rstrip() + tail + "\n", encoding="utf-8")
PY
  echo
  echo "[PASS] PWA final seal + regression guard completed"
  echo "[LOG] $DIR/run.log"
  echo "[VERDICT] $VERDICT_JSON"
  echo "[SEAL] $SEAL_PATH"
  echo "[GUARD] $REG_JSON"
  if [ "$STDOUT_JSON" -eq 1 ]; then
    cat "$VERDICT_JSON"
  fi
  exit 0
fi

note="
## TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1 (FAIL)

- unified_pass=false のため **seal 追記なし** / **regression guard は更新しない**（前回 PASS の guard が残る場合あり）
- 単一 verdict: \`api/automation/pwa_final_seal_and_regression_guard_verdict.json\`（診断用に常に更新）
- autoloop exit: ${AL_EXIT}
- integrate exit: ${INT_EXIT}
- \`TENMON_AUTOLOOP_EXIT\` != 0 のとき JSON が green でも **統合 FAIL**
- verdict source priority: (1) lived recheck (2) final autoloop (3) handoff/stale（参考のみ）
- 再実行: \`bash api/scripts/tenmon_pwa_final_seal_and_regression_guard_v1.sh --stdout-json\`
- lived recheck を先に実行し \`TENMON_LIVED_RECHECK_FINAL_VERDICT\` または \`api/automation/pwa_lived_gate_recheck_final_verdict.json\` を揃えてから再試行すること

"
DIAG_KEY="### TENMON_PWA_FINAL_SEAL_DIAG_${TS}"
if [ -f "$RETRY_PATH" ]; then
  if ! grep -qF "TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_CURSOR_AUTO_V1 (FAIL)" "$RETRY_PATH" 2>/dev/null; then
    printf '%s' "$note" >>"$RETRY_PATH"
  fi
else
  {
    echo "# TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_RETRY_CURSOR_AUTO_V1"
    printf '%s' "$note"
  } >"$RETRY_PATH"
fi
python3 - "$RETRY_PATH" "$VERDICT_JSON" "$AL_EXIT" "$INT_EXIT" "$TS" "$DIAG_KEY" <<'PY'
import json
import sys
from pathlib import Path

retry = Path(sys.argv[1])
verdict_path = Path(sys.argv[2])
al, inte, ts, diag_key = sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
v: dict = {}
try:
    if verdict_path.is_file():
        v = json.loads(verdict_path.read_text(encoding="utf-8"))
except Exception:
    pass
fp = v.get("unified_fingerprint_sha256") or ""
sig = v.get("signals") or {}
block = f"""
{diag_key}

- captured_at_utc: `{ts}`
- tenmon_autoloop_exit (shell): `{al}`
- integrate_exit: `{inte}`
- unified_fingerprint_sha256: `{fp}`
- signals: `{json.dumps(sig, ensure_ascii=False)}`
- sources: `pwa_seal_lived_snapshot.json` → `pwa_final_completion_readiness.json` / blockers → handoff（参考）

"""
prev = retry.read_text(encoding="utf-8") if retry.is_file() else ""
if diag_key not in prev:
    retry.write_text(prev.rstrip() + "\n" + block + "\n", encoding="utf-8")
PY

echo "===== RETRY FORENSIC (TENMON_PWA_FINAL_SEAL_AND_REGRESSION_GUARD_RETRY) ====="
RW_ARGS=()
if [ "$STDOUT_JSON" -eq 1 ]; then RW_ARGS+=( --stdout-json ); fi
set +e
bash "$RETRY_WRAP" "${RW_ARGS[@]}"
RW_EXIT=$?
set -e
echo "[RETRY_WRAP_EXIT] $RW_EXIT"
cp -f "$VERDICT_JSON" "$DIR/final_verdict.json"

echo
echo "[FAIL] seal skipped (unified_pass=false). See $VERDICT_JSON / pwa_final_seal_retry_plan.json"
if [ "$STDOUT_JSON" -eq 1 ]; then
  cat "$VERDICT_JSON"
fi
exit 1
