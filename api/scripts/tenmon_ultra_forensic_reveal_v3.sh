#!/usr/bin/env bash
# TENMON_ULTRA_FORENSIC_REVEAL_V3 — repo 内一発レントゲン（VPS は本ファイルのみ実行）
# 監査専用・成果物は $DIR に集約。途中失敗でも可能な限りファイルを残す。
set -u
set +H
set +o histexpand
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"

CARD="${CARD:-TENMON_ULTRA_FORENSIC_REVEAL_V3}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

if [[ -n "${TENMON_ULTRA_FORENSIC_OUT_DIR:-}" ]]; then
  DIR="${TENMON_ULTRA_FORENSIC_OUT_DIR}"
  mkdir -p "$DIR"
else
  DIR="/var/log/tenmon/card_${CARD}/${TS}"
  mkdir -p "$DIR"
  ln -sfn "$DIR" "/var/log/tenmon/card_${CARD}/latest" 2>/dev/null || true
fi

exec > >(tee -a "$DIR/run.log") 2>&1

echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] $ROOT"
echo "[API] $API"
echo "[BASE] $BASE"

git -C "$ROOT" rev-parse --short HEAD 2>/dev/null | tee "$DIR/git_sha_short.txt" || true
git -C "$ROOT" status --short 2>/dev/null | tee "$DIR/git_status.txt" || true

cd "$API" || exit 1

WORLD_PY="$API/automation/tenmon_chat_ts_worldclass_completion_report_v1.py"
INTEGRATOR_PY="$API/automation/tenmon_ultra_forensic_integrator_v1.py"
ORCH_PY="$API/automation/full_orchestrator_v1.py"

echo "===== npm run build ====="
npm run build 2>&1 | tee "$DIR/build.log" || true

if [[ "${ULTRA_SKIP_SYSTEMD_RESTART:-0}" != "1" ]]; then
  echo "===== systemctl restart ====="
  sudo systemctl restart tenmon-ark-api.service || true
  sleep 2
else
  echo "[SKIP] ULTRA_SKIP_SYSTEMD_RESTART=1"
fi

echo "===== health / audit ====="
curl -fsS "$BASE/health" | tee "$DIR/health.json" || true
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" || true

echo "===== runtime_matrix (discover /api/chat) ====="
python3 - "$BASE" "$DIR/runtime_matrix.json" <<'PY'
import json, sys, urllib.request, pathlib, time, urllib.error

base = sys.argv[1].rstrip("/")
out = pathlib.Path(sys.argv[2])

tests = [
    {"name":"general_1","message":"AIとは何？"},
    {"name":"support_1","message":"どう進めればいい？"},
    {"name":"selfaware_1","message":"天聞アークに意識はあるの？"},
    {"name":"define_1","message":"言霊とは何？"},
    {"name":"scripture_1","message":"法華経とは何を説くの？"},
    {"name":"continuity_1","message":"さっきの話を踏まえて次の一手をください"},
    {"name":"nextstep_1","message":"次の一手だけを明確にください"},
    {"name":"compare_1","message":"GPTと天聞アークの違いを比較して"},
    {"name":"worldview_1","message":"なぜ文明と言葉は関係するの？"},
    {"name":"longform_1","message":"天聞アークが世界最高AIになるための未達点を詳しく説明して"},
]

def post(url: str, payload: dict, timeout: float = 45.0):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")

def discover_chat_url():
    for path in ("/chat", "/api/chat"):
        url = base + path
        try:
            post(url, {"message": "ping", "threadId": "ultra-discover"}, timeout=12.0)
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
                {"message": t["message"], "threadId": f"ultra-{t['name']}"},
            )
            res[t["name"]] = {"ok": True, "status": status, "body": body}
        except Exception as e:
            res[t["name"]] = {"ok": False, "error": str(e)}
        time.sleep(0.2)

out.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
PY

echo "===== worldclass_report ====="
python3 "$WORLD_PY" --stdout-json > "$DIR/worldclass_report.json" 2> "$DIR/worldclass.stderr" || true
if [[ ! -s "$DIR/worldclass_report.json" ]]; then
  python3 - "$DIR/worldclass_report.json" "$DIR/worldclass.stderr" <<'PY'
import json, pathlib, sys
outp, errp = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
err = errp.read_text(encoding="utf-8", errors="replace")[-8000:] if errp.is_file() else ""
outp.write_text(json.dumps({"error": "worldclass_failed", "stderr_tail": err}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
fi

echo "===== seal_verdict (read-only resolve) ====="
SEAL_RESOLVED=""
if [[ -n "${TENMON_ORCHESTRATOR_SEAL_DIR:-}" && -f "${TENMON_ORCHESTRATOR_SEAL_DIR}/final_verdict.json" ]]; then
  SEAL_RESOLVED="${TENMON_ORCHESTRATOR_SEAL_DIR}"
elif [[ -L /var/log/tenmon/card ]]; then
  _r="$(readlink -f /var/log/tenmon/card 2>/dev/null || true)"
  if [[ -n "$_r" && -f "$_r/final_verdict.json" ]]; then
    SEAL_RESOLVED="$_r"
  fi
fi
if [[ -n "$SEAL_RESOLVED" ]]; then
  cp -a "$SEAL_RESOLVED/final_verdict.json" "$DIR/seal_verdict.json" 2>/dev/null || true
fi
if [[ ! -f "$DIR/seal_verdict.json" ]]; then
  python3 - "$DIR" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1]) / "seal_verdict.json"
p.write_text(json.dumps({"missing": True, "note": "final_verdict.json not resolved; set TENMON_ORCHESTRATOR_SEAL_DIR or run seal"}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY
fi

echo "===== orchestrator (read-only snap) ====="
ORCH_SNAP="$DIR/orchestrator_snap"
mkdir -p "$ORCH_SNAP"
export TENMON_ORCHESTRATOR_SEAL_DIR="${SEAL_RESOLVED:-}"
python3 "$ORCH_PY" --out-dir "$ORCH_SNAP" --stdout-json > "$DIR/orchestrator_run.log" 2>&1 || true

echo "===== storage_backup_nas (short) ====="
python3 - "$DIR" <<'PY'
import json, os, pathlib, subprocess, sys
out = pathlib.Path(sys.argv[1]) / "storage_backup_nas.json"
mount = ""
try:
    mount = subprocess.check_output(["bash", "-lc", "mount 2>/dev/null | head -n 28"], timeout=5).decode()
except Exception:
    mount = ""
data = {
    "mount_head": mount[:4000],
    "env_TENMON_BACKUP_ROOT": os.environ.get("TENMON_BACKUP_ROOT"),
    "env_NAS_MOUNT_PATH": os.environ.get("NAS_MOUNT_PATH"),
    "block": "ultra_short_v1",
}
out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

echo "===== tenmon_ultra_forensic_integrator_v1 ====="
python3 "$INTEGRATOR_PY" --out-dir "$DIR" --stdout-json | tee "$DIR/integrator_stdout.json" || true

echo "===== marker TENMON_ULTRA_FORENSIC_REVEAL_V3_VPS_V1 ====="
printf '{"card":"TENMON_ULTRA_FORENSIC_REVEAL_V3_VPS_V1","dir":"%s","ts":"%s","api":"%s"}\n' "$DIR" "$TS" "$API" | tee "$DIR/TENMON_ULTRA_FORENSIC_REVEAL_V3_VPS_V1"

echo "===== OUTPUT LIST ====="
find "$DIR" -maxdepth 1 -type f | sort

echo "[DONE] run.log: $DIR/run.log"
exit 0
