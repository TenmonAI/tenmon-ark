#!/usr/bin/env bash
# STAGE3/5: runtime 10 本 + surface + worldclass report + Stage5 merge（overall 束ね）
set -euo pipefail
set +H
set +o histexpand

# CARD 環境変数を優先（未設定時のみ第1引数 → 既定）
if [ -z "${CARD:-}" ]; then
  if [ "${1:-}" != "" ]; then
    CARD="$1"
  else
    CARD="CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1"
  fi
fi
# Stage5 merge の JSON 内 card 名（既定は worldclass seal。exit contract ラッパで上書き）
export CHAT_TS_STAGE5_CARD_NAME="${CHAT_TS_STAGE5_CARD_NAME:-CHAT_TS_STAGE5_WORLDCLASS_SEAL_V1}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
# 統合ランナー等: 任意ディレクトリへ seal を直書き（symlink /var/log は作らない）
if [ -n "${TENMON_SEAL_DIR_OVERRIDE:-}" ]; then
  DIR="${TENMON_SEAL_DIR_OVERRIDE}"
  mkdir -p "$DIR"
else
  DIR="/var/log/tenmon/card_${CARD}/${TS}"
  mkdir -p "$DIR"
  ln -sfn "$DIR" /var/log/tenmon/card
fi
exec > >(tee -a "$DIR/run.log") 2>&1

ROOT="${ROOT:-/opt/tenmon-ark-repo}"
API="$ROOT/api"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
REPORT="$API/automation/tenmon_chat_ts_worldclass_completion_report_v1.py"
STAGE5_MERGE="$API/scripts/chat_ts_stage5_verdict_merge_v1.py"
ROUTE_SNAP="$API/scripts/chat_ts_stage2_route_snapshot_v1.py"
LF_AUDIT="$API/scripts/chat_ts_longform_audit_v1.py"
NEXT_STAGE5="${CHAT_TS_STAGE5_NEXT_MD:-$API/automation/generated_cursor_apply/CHAT_TS_STAGE5_WORLDCLASS_NEXT_PDCA_AUTO_V1.md}"
MAINT_PY="$API/automation/tenmon_chat_ts_postlock_maintenance_v1.py"
POSTLOCK_OUT="$DIR/_postlock_maintenance"
RESIDUAL_PY="$API/automation/tenmon_chat_ts_residual_quality_score_v1.py"
RESIDUAL_OUT="$DIR/_residual_improvement"
SUPP_PY="$API/automation/tenmon_chat_ts_completion_supplement_v1.py"
SUPP_OUT="$DIR/_completion_supplement"

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[BASE] $BASE"

cd "$API"

npm run build | tee "$DIR/build.log"
if [ "${CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART:-0}" = "1" ]; then
  echo "[SKIP] CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART=1 — systemd restart なし（API は既に起動している前提）"
else
  sudo systemctl restart tenmon-ark-api.service
  sleep 2
fi
curl -fsS "$BASE/health" | tee "$DIR/health.json" >/dev/null
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" >/dev/null

CANON_JSON="${CHAT_TS_PROBE_CANON_JSON:-$API/automation/chat_ts_probe_canon_v1.json}"
python3 - <<'PY' "$BASE" "$DIR/runtime_matrix.json" "$CANON_JSON"
import json, sys, urllib.request, pathlib, time, urllib.error

base = sys.argv[1].rstrip("/")
out = pathlib.Path(sys.argv[2])
canon = json.loads(pathlib.Path(sys.argv[3]).read_text(encoding="utf-8"))
full10 = canon.get("runtime_probe_full_10") or {}
tests = [{"name": k, "message": v} for k, v in full10.items()]


def post(url: str, payload: dict, timeout: float = 40.0):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")


def discover_chat_url() -> str | None:
    for path in ("/chat", "/api/chat"):
        url = base + path
        try:
            post(url, {"message": "ping", "threadId": "seal-discover"}, timeout=12.0)
            return url
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
            continue
    return None


chat_url = discover_chat_url()
res = {"_meta": {"chat_url_used": chat_url}}
if not chat_url:
    for t in tests:
        res[t["name"]] = {"ok": False, "error": "no_chat_url"}
else:
    for t in tests:
        try:
            status, body = post(
                chat_url,
                {"message": t["message"], "threadId": f"seal-{t['name']}"},
            )
            res[t["name"]] = {"ok": True, "status": status, "body": body}
        except Exception as e:
            res[t["name"]] = {"ok": False, "error": str(e)}
        time.sleep(0.2)

out.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: {"ok": v["ok"], "status": v.get("status")} for k, v in res.items() if k != "_meta"}, ensure_ascii=False, indent=2))
PY

python3 - <<'PY' "$DIR/runtime_matrix.json" "$DIR/surface_audit.json"
import json, pathlib, re, sys
src = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
out = pathlib.Path(sys.argv[2])

noise_patterns = [
    "この問いについて、今回は",
    "一貫の手がかりは、",
    "いまの答えは、典拠は",
    "（補助）次の一手:",
    "還元として、いまの主題を一句に圧し",
]

data = {}
for name, row in src.items():
    if name == "_meta":
        continue
    item = {"ok": row.get("ok", False)}
    if row.get("ok"):
        body = row["body"]
        rr = re.findall(r'"routeReason"\s*:\s*"([^"]+)"', body)
        response_match = re.findall(r'"response"\s*:\s*"(.+?)","evidence"', body, flags=re.S)
        response_text = response_match[0] if response_match else ""
        response_text = response_text.replace("\\n", "\n")
        item["routeReason"] = rr[:5]
        item["response_len"] = len(response_text)
        item["noise_hits"] = [p for p in noise_patterns if p in response_text]
        item["response_head"] = response_text[:700]
    else:
        item["error"] = row.get("error")
    data[name] = item

out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(data, ensure_ascii=False, indent=2))
PY

python3 "$REPORT" --stdout-json | tee "$DIR/worldclass_report.json" || true

python3 "$ROUTE_SNAP" "$DIR/runtime_matrix.json" "$DIR/route_reason_extract.json" "$DIR/route_authority_audit.json" || true
python3 "$LF_AUDIT" "$DIR/runtime_matrix.json" "$DIR/longform_audit.json" || true
# VPS 成果物名（route_authority_probe / longform_quality_probe）— 中身は audit と同一
cp -f "$DIR/route_authority_audit.json" "$DIR/route_authority_probe.json" 2>/dev/null || true
cp -f "$DIR/longform_audit.json" "$DIR/longform_quality_probe.json" 2>/dev/null || true

set +e
python3 "$STAGE5_MERGE" \
  "$DIR/runtime_matrix.json" \
  "$DIR/surface_audit.json" \
  "$DIR/worldclass_report.json" \
  "$DIR/route_authority_audit.json" \
  "$DIR/longform_audit.json" \
  "$DIR/final_verdict.json" \
  "$DIR/density_lock_verdict.json" \
  "$NEXT_STAGE5"
MERGE_RC=$?
set -e

if [ "$MERGE_RC" -ne 0 ]; then
  echo "[FAIL] Stage5 overall 未達 → $NEXT_STAGE5 を確認"
  # 未達時も supplement で report/seal 差分を記録（追従用）
  if [ "${CHAT_TS_COMPLETION_SUPPLEMENT_SKIP:-0}" != "1" ]; then
    mkdir -p "$SUPP_OUT"
    python3 "$SUPP_PY" --seal-dir "$DIR" --out-dir "$SUPP_OUT" --copy-worldclass || true
  fi
  exit 1
fi

echo "[PASS] runtime acceptance + Stage5 worldclass overall"

# CHAT_TS_COMPLETION_SUPPLEMENT: canonical / mismatch / next_card_dispatch
if [ "${CHAT_TS_COMPLETION_SUPPLEMENT_SKIP:-0}" != "1" ]; then
  mkdir -p "$SUPP_OUT"
  python3 "$SUPP_PY" --seal-dir "$DIR" --out-dir "$SUPP_OUT" --copy-worldclass || true
  echo "[SUPPLEMENT] completion → $SUPP_OUT"
fi

# CHAT_TS_POSTLOCK_MAINTENANCE: 退行検出（既定で実行、baseline 未初期化時は自動作成）
if [ "${CHAT_TS_POSTLOCK_MAINTENANCE_SKIP:-0}" != "1" ]; then
  mkdir -p "$POSTLOCK_OUT"
  set +e
  python3 "$MAINT_PY" \
    --seal-dir "$DIR" \
    --baseline "${CHAT_TS_POSTLOCK_BASELINE:-$API/automation/postlock_maintenance_baseline.json}" \
    --out-dir "$POSTLOCK_OUT" \
    --stdout-json | tee "$POSTLOCK_OUT/maintenance_stdout.json" || true
  _MRC=$?
  set -e
  if [ "${CHAT_TS_POSTLOCK_MAINTENANCE_ENFORCE:-0}" = "1" ] && [ "$_MRC" -ne 0 ]; then
    echo "[FAIL] POSTLOCK maintenance regression → $POSTLOCK_OUT/next_pdca_auto.md"
    exit 1
  fi
  if [ "$_MRC" -ne 0 ]; then
    echo "[WARN] POSTLOCK maintenance: regression detected (non-fatal; set CHAT_TS_POSTLOCK_MAINTENANCE_ENFORCE=1 to fail seal)"
  else
    echo "[POSTLOCK] maintenance maintained=true → $POSTLOCK_OUT"
  fi
  if [ "${CHAT_TS_POSTLOCK_UPDATE_BASELINE:-0}" = "1" ] && [ "$_MRC" -eq 0 ]; then
    python3 "$MAINT_PY" \
      --seal-dir "$DIR" \
      --baseline "${CHAT_TS_POSTLOCK_BASELINE:-$API/automation/postlock_maintenance_baseline.json}" \
      --write-baseline
    echo "[POSTLOCK] baseline updated"
  fi
fi

# CHAT_TS_RESIDUAL_IMPROVEMENT: 残差採点 + manifest（会話ロジックは変更しない）
if [ "${CHAT_TS_RESIDUAL_SCORE_SKIP:-0}" != "1" ]; then
  mkdir -p "$RESIDUAL_OUT"
  _RS_EXTRA=()
  if [ "${CHAT_TS_RESIDUAL_MIRROR_ARTIFACTS:-1}" = "1" ]; then
    _RS_EXTRA+=(--mirror-artifacts)
  fi
  if [ "${CHAT_TS_RESIDUAL_WRITE_STUBS:-0}" = "1" ]; then
    _RS_EXTRA+=(--write-stubs)
  fi
  python3 "$RESIDUAL_PY" \
    --seal-dir "$DIR" \
    --out-dir "$RESIDUAL_OUT" \
    "${_RS_EXTRA[@]}" \
    || true
  echo "[RESIDUAL] scores → $RESIDUAL_OUT (set CHAT_TS_RESIDUAL_WRITE_STUBS=1 for focused stubs)"
fi

echo "[LOG] $DIR/run.log"
