#!/usr/bin/env bash
# TENMON_FINAL_REPO_HYGIENE_WATCHDOG_FINISHER_CURSOR_AUTO_V1
# 封印前の最終衛生監査: watchdog verdict → git status → final_verdict
set -euo pipefail
set +H
set +o histexpand

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"

CARD="TENMON_FINAL_REPO_HYGIENE_WATCHDOG_FINISHER_CURSOR_AUTO_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ROOT="${TENMON_FINAL_REPO_HYGIENE_FINISHER_LOG_ROOT:-/var/log/tenmon}"
LOG_DIR="${LOG_ROOT}/card_${CARD}/${TS}"

STDOUT_JSON=0
for a in "$@"; do
  if [[ "$a" == "--stdout-json" ]]; then
    STDOUT_JSON=1
  fi
done

mkdir -p "$LOG_DIR"

emit_final_verdict() {
  python3 - "$REPO" "$LOG_DIR" "$CARD" <<'PY'
import json
import sys
from datetime import datetime, timezone

repo, log_dir, card = sys.argv[1], sys.argv[2], sys.argv[3]
path = __import__("pathlib").Path(repo) / "api" / "automation" / "tenmon_repo_hygiene_watchdog_verdict.json"

def utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

w = {}
if path.is_file():
    try:
        w = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        w = {}

# verdict 欠落は封印ブロック（fail-closed）
if not w:
    must_block = True
else:
    must_block = bool(w.get("must_block_seal"))
final_status = "FAIL" if must_block else "PASS"
rec = None if final_status == "PASS" else "TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_RETRY_CURSOR_AUTO_V1"

out = {
    "version": 1,
    "card": card,
    "generated_at": utc(),
    "watchdog_clean": bool(w.get("watchdog_clean", not must_block)),
    "must_block_seal": must_block,
    "untracked_count": int(w.get("untracked_count", 0)),
    "suspicious_count": int(w.get("suspicious_count", 0)),
    "bak_noise_count": int(w.get("bak_noise_count", 0)),
    "final_status": final_status,
    "recommended_next_card": rec,
    "source_watchdog_verdict": str(path),
}
final_path = __import__("pathlib").Path(log_dir) / "final_verdict.json"
final_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
# リポジトリ直下の automation にもミラー（単一参照用）
mirror = __import__("pathlib").Path(repo) / "api" / "automation" / "tenmon_final_repo_hygiene_watchdog_finisher_verdict.json"
mirror.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(str(final_path))
PY
}

cd "$REPO"

# pipefail 下では watchdog が非0でも tee が成功しうるため、明示的に rc を取る
set +e
python3 "$REPO/api/automation/tenmon_repo_hygiene_watchdog_v1.py" 2>&1 | tee "$LOG_DIR/watchdog_stdout.txt"
WD_RC="${PIPESTATUS[0]}"
set -e
echo "{\"watchdog_exit_rc\": $WD_RC}" >>"$LOG_DIR/watchdog_meta.json"

# 公式 verdict（automation 配下）
if [[ -f "$REPO/api/automation/tenmon_repo_hygiene_watchdog_verdict.json" ]]; then
  cp -f "$REPO/api/automation/tenmon_repo_hygiene_watchdog_verdict.json" "$LOG_DIR/repo_hygiene_watchdog_verdict.json"
fi

if [[ -f "$REPO/api/automation/tenmon_repo_hygiene_watchdog_verdict.json" ]]; then
  if [[ "$STDOUT_JSON" -eq 1 ]]; then
    echo "--- tenmon_repo_hygiene_watchdog_verdict.json ---" >&2
    cat "$REPO/api/automation/tenmon_repo_hygiene_watchdog_verdict.json" | tee "$LOG_DIR/watchdog_verdict_cat.txt" >&2
  else
    echo "--- tenmon_repo_hygiene_watchdog_verdict.json ---"
    cat "$REPO/api/automation/tenmon_repo_hygiene_watchdog_verdict.json" | tee "$LOG_DIR/watchdog_verdict_cat.txt"
  fi
else
  echo '{"error":"watchdog_verdict_missing"}' | tee "$LOG_DIR/watchdog_verdict_cat.txt" | if [[ "$STDOUT_JSON" -eq 1 ]]; then cat >&2; else cat; fi
fi

git -C "$REPO" status --short >"$LOG_DIR/git_status_short.txt" 2>&1 || true
if [[ "$STDOUT_JSON" -ne 1 ]]; then
  cat "$LOG_DIR/git_status_short.txt"
fi

FINAL_PATH="$(emit_final_verdict)"
if [[ ! -f "$FINAL_PATH" ]]; then
  echo "emit_final_verdict failed" >&2
  exit 1
fi

if [[ "$STDOUT_JSON" -eq 1 ]]; then
  cat "$FINAL_PATH"
fi

# watchdog 由来の final_verdict: FAIL なら exit 1
if python3 -c "import json,sys; p=sys.argv[1]; d=json.load(open(p,encoding='utf-8')); sys.exit(0 if d.get('final_status')=='PASS' else 1)" "$FINAL_PATH"; then
  exit 0
fi
exit 1
