#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_MICRO_FORENSIC_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

say(){ printf '\n===== %s =====\n' "$1"; }

wait_http() {
  local url="$1"
  local max="${2:-60}"
  local i
  for i in $(seq 1 "$max"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$i"
      return 0
    fi
    sleep 1
  done
  return 1
}

post_chat() {
  local text="$1"
  local thread="${2:-micro-$RANDOM}"
  curl -fsS "$BASE/api/chat" \
    -H 'content-type: application/json' \
    -d "$(printf '{"message":%s,"threadId":%s}' \
      "$(python3 - <<'PY' "$text"
import json,sys
print(json.dumps(sys.argv[1], ensure_ascii=False))
PY
)" \
      "$(python3 - <<'PY' "$thread"
import json,sys
print(json.dumps(sys.argv[1], ensure_ascii=False))
PY
)")"
}

say "CARD / IDENTITY"
echo "[CARD] $CARD"
echo "[TIME_UTC] $TS"
echo "[DIR] $DIR"
echo "[ROOT] $ROOT"
echo "[API]  $API"
echo "[BASE] $BASE"
git -C "$ROOT" rev-parse --short HEAD | tee "$DIR/git_sha_short.txt"
git -C "$ROOT" rev-parse HEAD | tee "$DIR/git_sha_full.txt"
git -C "$ROOT" status --short | tee "$DIR/git_status.txt"

say "BUILD / RESTART"
npm run build | tee "$DIR/build.log"
sudo systemctl restart tenmon-ark-api.service
sudo systemctl status tenmon-ark-api.service --no-pager | tee "$DIR/systemctl_status.txt"
journalctl -u tenmon-ark-api.service -n 200 --no-pager | tee "$DIR/journal_tail.txt"

say "READINESS TIMING"
{
  echo "{"
  echo "  \"health_ready_sec\": $(wait_http "$BASE/health" 60 || echo null),"
  echo "  \"audit_ready_sec\": $(wait_http "$BASE/api/audit" 60 || echo null)"
  echo "}"
} | tee "$DIR/readiness_timing.json"

say "HEALTH / AUDIT"
curl -fsS "$BASE/health" | tee "$DIR/health.json"
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" || true
(curl -fsS "$BASE/api/audit.build" | tee "$DIR/audit_build.json") || true

say "AUDIT BUILD MICRO"
python3 - <<'PY' > "$DIR/audit_build_route_scan.json"
import os,re,json
targets=[
  "/opt/tenmon-ark-repo/api/src/routes/audit.ts",
  "/opt/tenmon-ark-repo/api/src/index.ts",
]
out=[]
for p in targets:
  if not os.path.exists(p):
    out.append({"file":p,"exists":False})
    continue
  txt=open(p,encoding="utf-8",errors="ignore").read()
  out.append({
    "file":p,
    "exists":True,
    "contains_audit_build_literal": "/api/audit.build" in txt or "audit.build" in txt,
    "router_paths": re.findall(r'router\.(?:get|post|put|delete|patch)\(\s*[\'"`]([^\'"`]+)', txt)[:100],
    "mount_lines": [line for line in txt.splitlines() if "audit" in line.lower()][:80]
  })
print(json.dumps(out, ensure_ascii=False, indent=2))
PY

say "CHAT.TS MICRO WINDOWS"
python3 - <<'PY' > "$DIR/chat_micro_windows.json"
import json, os
p="/opt/tenmon-ark-repo/api/src/routes/chat.ts"
txt=open(p,encoding="utf-8",errors="ignore").read().splitlines()
keys=[
  "GEN_GENERAL_RAW",
  "GEN_GENERAL_COMPOSED",
  "GEN_GENERAL_BYPASS_V1",
  "PROJECTOR_GENERAL_BIND",
  "PROJECTOR_AUDIT",
  "R22_COMPARE_ASK_V1",
  "R22_NEXTSTEP_FOLLOWUP_V1",
  "K1_TRACE_EMPTY_GATED_V1",
  "TENMON_SCRIPTURE_CANON_V1",
  "EXPLICIT_CHAR_PREEMPT_V1",
]
out={}
for k in keys:
  hits=[]
  for i,line in enumerate(txt, start=1):
    if k in line:
      s=max(1,i-6); e=min(len(txt),i+12)
      hits.append({
        "line": i,
        "window": [{"n":n,"t":txt[n-1]} for n in range(s,e+1)]
      })
      if len(hits)>=5:
        break
  out[k]=hits
print(json.dumps(out, ensure_ascii=False, indent=2))
PY

say "GENERAL / SCRIPTURE BLEED PROBE"
THREAD="micro-scripture-bleed-$TS"
post_chat "いろは言霊解を土台に見ています" "$THREAD" > "$DIR/bleed_seed.json" || true
post_chat "形はまだありません。その時時によって、最適な方法と形にしたいです。" "$THREAD" > "$DIR/bleed_followup.json" || true

say "COMPARE / CONTINUITY / GENERAL NOISE PROBES"
post_chat "AとBを比較して" "micro-compare-$TS" > "$DIR/compare_probe.json" || true
post_chat "次の一手だけをください" "micro-nextstep-$TS" > "$DIR/nextstep_probe.json" || true
post_chat "AIとは何ですか" "micro-general-$TS" > "$DIR/general_probe.json" || true

say "OUTPUT CONTRACT PATH MISMATCH"
python3 - <<'PY' > "$DIR/output_contract_path_mismatch.json"
import os, json, glob
base="/opt/tenmon-ark-repo/api"
expected = {
  "chat_refactor_os": f"{base}/automation/out/tenmon_chat_refactor_os_v1",
  "self_improvement_os": f"{base}/automation/out/tenmon_self_improvement_os_v1",
  "kokuzo_learning_os": f"{base}/automation/out/tenmon_kokuzo_learning_improvement_os_v1",
}
found = {
  "chat_refactor_os_logs": sorted(glob.glob("/var/log/tenmon/card_TENMON_CHAT_REFACTOR_OS_INTEGRATION_AND_SEAL_VPS_V1/*"))[-5:],
  "self_improvement_logs": sorted(glob.glob("/var/log/tenmon/card_TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1/*"))[-5:],
  "chat_ts_runtime_logs": sorted(glob.glob("/var/log/tenmon/card_CHAT_TS_RUNTIME_ACCEPTANCE_AND_WORLDCLASS_SEAL_V1/*"))[-5:],
}
out = {"expected": {}, "found_logs": found}
for k,p in expected.items():
  out["expected"][k] = {
    "path": p,
    "exists": os.path.exists(p),
    "files": sorted(os.listdir(p))[:200] if os.path.isdir(p) else []
  }
print(json.dumps(out, ensure_ascii=False, indent=2))
PY

say "SELF IMPROVEMENT / LEARNING MICRO"
python3 - <<'PY' > "$DIR/self_improve_learning_micro.json"
import os, json
base="/opt/tenmon-ark-repo/api/automation/out/tenmon_kokuzo_learning_improvement_os_v1"
paths = {
  "base_exists": os.path.exists(base),
  "integrated_learning_verdict": os.path.exists(f"{base}/integrated_learning_verdict.json"),
  "learning_improvement_os_manifest": os.path.exists(f"{base}/learning_improvement_os_manifest.json"),
  "integrated_final_verdict_top": os.path.exists(f"{base}/integrated_final_verdict.json"),
  "learning_steps_top": os.path.exists(f"{base}/learning_steps.json"),
  "nested_integrated_final_verdict": os.path.exists(f"{base}/_learning_improvement_os/integrated_final_verdict.json"),
  "nested_self_improvement_manifest": os.path.exists(f"{base}/_learning_improvement_os/self_improvement_os_manifest.json"),
}
print(json.dumps(paths, ensure_ascii=False, indent=2))
PY

say "MICRO VERDICT"
python3 - <<'PY' > "$DIR/micro_verdict.json"
import json, os
verdict = {
  "version": 1,
  "card": "TENMON_MICRO_FORENSIC_V1",
  "main_findings": [
    "restart直後readiness待ちが必要",
    "audit.build 404 の原因切り分けが必要",
    "contract missing の一部は path mismatch の可能性",
    "general/projector/scripture bleed の微細観測が必要",
    "surface duplication の局所修正余地あり"
  ],
  "next_cards": [
    "TENMON_READINESS_GATE_LOCK_V1",
    "TENMON_AUDIT_BUILD_ROUTE_RESTORE_OBSERVE_V1",
    "TENMON_OUTPUT_CONTRACT_PATH_NORMALIZE_V1",
    "TENMON_GENERAL_PROJECTOR_BLEED_FORENSIC_V1",
    "TENMON_SURFACE_DUP_MICRO_POLISH_V1"
  ]
}
print(json.dumps(verdict, ensure_ascii=False, indent=2))
PY

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort | tee "$DIR/output_list.txt"

echo
echo "[RUN_LOG] $DIR/run.log"
