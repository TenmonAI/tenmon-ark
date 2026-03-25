#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_DEEP_SYSTEM_REVEAL_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

WORLDCLASS="$API/automation/tenmon_chat_ts_worldclass_completion_report_v1.py"
SEAL="$API/scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh"
ORCH="$API/scripts/full_orchestrator_v1.sh"
SELF_IMPROVE="$API/scripts/self_improvement_os_run_v1.sh"
CHAT_REFACTOR_OS="$API/scripts/chat_refactor_os_run_v1.sh"
KOKUZO_OS="$API/scripts/kokuzo_learning_improvement_os_integrated_v1.sh"

OUT_ORCH="${TENMON_FULL_ORCHESTRATOR_OUT_DIR:-$API/automation/out/tenmon_full_orchestrator_v1}"
OUT_SELF="${TENMON_SELF_IMPROVEMENT_OS_OUT_DIR:-$API/automation/out/tenmon_self_improvement_os_v1}"
OUT_CHAT_REFACTOR="${TENMON_CHAT_REFACTOR_OS_OUT_DIR:-$API/automation/out/tenmon_chat_refactor_os_v1}"
OUT_KOKUZO="${TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR:-$API/automation/out/tenmon_kokuzo_learning_improvement_os_v1}"

say(){ printf '\n===== %s =====\n' "$1"; }

run_optional () {
  local script="$1"
  local logfile="$2"
  local rcfile="$3"
  if [ -x "$script" ]; then
    set +e
    "$script" 2>&1 | tee "$logfile"
    local rc=${PIPESTATUS[0]}
    set -e
    echo "$rc" > "$rcfile"
  else
    echo "missing:$script" | tee "$logfile"
    echo "127" > "$rcfile"
  fi
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

cd "$API"

say "BUILD / RESTART / HEALTH / AUDIT"
set +e
npm run build | tee "$DIR/build.log"
BUILD_RC=${PIPESTATUS[0]}
sudo systemctl restart tenmon-ark-api.service
RESTART_RC=$?
sleep 2
systemctl --no-pager --full status tenmon-ark-api.service | sed -n '1,180p' | tee "$DIR/systemctl_status.txt"
journalctl -u tenmon-ark-api.service -n 300 --no-pager | tee "$DIR/journal_tail.txt"
ss -lntp | tee "$DIR/ss_lntp.txt"
curl -fsS "$BASE/health" | tee "$DIR/health.json"
HEALTH_RC=${PIPESTATUS[0]}
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json"
AUDIT_RC=${PIPESTATUS[0]}
set -e

say "CHAT STATIC FORENSIC"
python3 - "$API/src/routes/chat.ts" "$DIR/chat_static_forensic.json" <<'PY'
import json, pathlib, re, sys
p = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])
txt = p.read_text(encoding="utf-8", errors="replace")

route_reasons = sorted(set(re.findall(r'routeReason\s*:\s*"([^"]+)"', txt)))
terms = [
    "threadCore","threadCenter","responsePlan","synapse","seed",
    "NATURAL_GENERAL_LLM_TOP","SYSTEM_DIAGNOSIS_PREEMPT_V1","AI_DEF_LOCK_V1",
    "DEF_LLM_TOP","DEF_FASTPATH_VERIFIED_V1","R22_COMPARE_ASK_V1",
    "R22_NEXTSTEP_FOLLOWUP_V1","K1_TRACE_EMPTY_GATED_V1","SCRIPTURE_LOCAL_RESOLVER_V4",
    "res.json","(res as any).json","responseProjector",
    "applyFinalAnswerConstitutionAndWisdomReducerV1",
    "heart","intention","meaningFrame","thoughtCoreSummary",
    "brainstemDecision","personaConstitutionSummary","detailPlan"
]

def hot_windows(lines, width=180, stride=60):
    res = []
    for i in range(0, len(lines), stride):
        chunk = "\n".join(lines[i:i+width])
        hit = {}
        total = 0
        for t in ["threadCore","responsePlan","synapse","seed","NATURAL_GENERAL_LLM_TOP","res.json"]:
            c = chunk.count(t)
            if c:
                hit[t] = c
                total += c
        if total:
            res.append({"start": i+1, "end": min(i+width, len(lines)), "hit_count": total, "terms": hit})
    return sorted(res, key=lambda x: x["hit_count"], reverse=True)[:20]

lines = txt.splitlines()
data = {
    "line_count": len(lines),
    "import_count": len(re.findall(r'^\s*import\s+', txt, flags=re.M)),
    "route_reason_unique_count": len(route_reasons),
    "route_reason_sample": route_reasons[:120],
    "counts": {t: txt.count(t) for t in terms},
    "res_json_reassign_count": len(re.findall(r'\(res as any\)\.json\s*=', txt)),
    "orig_json_bind_count": len(re.findall(r'__TENMON_NATIVE_RES_JSON\s*=', txt)) + len(re.findall(r'\b(?:const|let)\s+\w+\s*=\s*res\.json\s*\(', txt)),
    "hot_windows": hot_windows(lines),
}
dst.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(data, ensure_ascii=False, indent=2))
PY

say "CHAT RUNTIME MATRIX / INTERNAL COGNITION"
python3 - "$BASE" "$DIR/runtime_matrix.json" <<'PY'
import json, pathlib, sys, urllib.request, time
base = sys.argv[1].rstrip("/")
dst = pathlib.Path(sys.argv[2])

tests = [
    ("general_1","AIとは何？"),
    ("support_1","どう進めればいい？"),
    ("selfaware_1","天聞アークに意識はあるの？"),
    ("define_1","言霊とは何？"),
    ("scripture_1","法華経とは何を説くの？"),
    ("continuity_1","さっきの話を踏まえて次の一手をください"),
    ("nextstep_1","次の一手だけを明確にください"),
    ("compare_1","GPTと天聞アークの違いを比較して"),
    ("worldview_1","なぜ文明と言葉は関係するの？"),
    ("longform_1","天聞アークが世界最高AIになるための未達点を詳しく説明して"),
]

res = {}
for name, msg in tests:
    try:
        body = json.dumps({"message": msg, "threadId": f"deep-reveal-{name}"}).encode("utf-8")
        req = urllib.request.Request(
            base + "/api/chat",
            data=body,
            method="POST",
            headers={"Content-Type":"application/json","Accept":"application/json"}
        )
        with urllib.request.urlopen(req, timeout=45) as r:
            raw = r.read().decode("utf-8", errors="replace")
            obj = json.loads(raw)
            ku = ((obj.get("decisionFrame") or {}).get("ku") or {}) if isinstance(obj.get("decisionFrame"), dict) else {}
            res[name] = {
                "ok": True,
                "status": r.status,
                "routeReason": ku.get("routeReason"),
                "answerMode": ku.get("answerMode"),
                "answerLength": ku.get("answerLength"),
                "answerFrame": ku.get("answerFrame"),
                "has_detailPlan": isinstance(obj.get("detailPlan"), dict),
                "has_threadCore": isinstance(ku.get("threadCore"), dict),
                "has_heart": isinstance(ku.get("heart"), dict),
                "has_intention": ku.get("intention") is not None,
                "has_meaningFrame": ku.get("meaningFrame") is not None,
                "has_thoughtCoreSummary": isinstance(ku.get("thoughtCoreSummary"), dict),
                "has_personaConstitutionSummary": isinstance(ku.get("personaConstitutionSummary"), dict),
                "has_brainstemDecision": ku.get("brainstemDecision") is not None,
                "response_len": len(str(obj.get("response") or "")),
                "response_head": str(obj.get("response") or "")[:1200],
            }
    except Exception as e:
        res[name] = {"ok": False, "error": str(e)}
    time.sleep(0.2)

dst.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(res, ensure_ascii=False, indent=2))
PY

say "WORLDCLASS / SEAL"
set +e
CHAT_TS_PROBE_BASE_URL="$BASE" python3 "$WORLDCLASS" --stdout-json --write-next-pdca | tee "$DIR/worldclass_report.json"
WORLDCLASS_RC=${PIPESTATUS[0]}
CARD="TENMON_DEEP_SYSTEM_REVEAL_SEAL_V1" CHAT_TS_PROBE_BASE_URL="$BASE" "$SEAL" 2>&1 | tee "$DIR/seal_stdout.log"
SEAL_RC=${PIPESTATUS[0]}
set -e
echo "$WORLDCLASS_RC" > "$DIR/worldclass_report.rc"
echo "$SEAL_RC" > "$DIR/seal.rc"

python3 - "$DIR/seal_stdout.log" "$DIR/seal_verdict.json" <<'PY'
import json, pathlib, re, sys
txt = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
m = re.findall(r'SEAL_VERDICT_JSON=(\{.*\})', txt)
obj = {"found": False}
if m:
    try:
        obj = json.loads(m[-1]); obj["found"] = True
    except Exception:
        obj = {"found": False, "parse_error": True}
pathlib.Path(sys.argv[2]).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(obj, ensure_ascii=False, indent=2))
PY

say "OPTIONAL RUNNERS"
run_optional "$ORCH" "$DIR/orchestrator_run.log" "$DIR/orchestrator.rc"
run_optional "$CHAT_REFACTOR_OS" "$DIR/chat_refactor_os_run.log" "$DIR/chat_refactor_os.rc"
run_optional "$SELF_IMPROVE" "$DIR/self_improvement_os_run.log" "$DIR/self_improvement_os.rc"
run_optional "$KOKUZO_OS" "$DIR/kokuzo_learning_os_run.log" "$DIR/kokuzo_learning_os.rc"

say "OUTPUT CONTRACTS"
python3 - "$OUT_ORCH" "$OUT_CHAT_REFACTOR" "$OUT_SELF" "$OUT_KOKUZO" "$DIR/output_contracts.json" <<'PY'
import json, pathlib, sys
outs = {
    "full_orchestrator": pathlib.Path(sys.argv[1]),
    "chat_refactor_os": pathlib.Path(sys.argv[2]),
    "self_improvement_os": pathlib.Path(sys.argv[3]),
    "kokuzo_learning_os": pathlib.Path(sys.argv[4]),
}
dst = pathlib.Path(sys.argv[5])

expected = {
    "full_orchestrator": ["full_orchestrator_manifest.json","full_orchestrator_queue.json","blocked_cards.json","integrated_final_verdict.json"],
    "chat_refactor_os": ["chat_refactor_os_manifest.json","governance_verdict.json","card_manifest.json","integrated_final_verdict.json"],
    "self_improvement_os": ["self_improvement_os_manifest.json","seal_governor_verdict.json","next_card_dispatch.json","integrated_final_verdict.json"],
    "kokuzo_learning_os": ["integrated_learning_verdict.json","integrated_final_verdict.json","learning_improvement_os_manifest.json","learning_steps.json"],
}

data = {}
for k, p in outs.items():
    info = {"exists": p.exists(), "path": str(p), "files": [], "present": {}, "missing": []}
    if p.exists():
        info["files"] = sorted([x.name for x in p.glob("*")])
    for name in expected[k]:
        q = p / name
        info["present"][name] = q.exists()
        if not q.exists():
            info["missing"].append(name)
    data[k] = info

dst.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(data, ensure_ascii=False, indent=2))
PY

say "REPO / AUTOMATION INVENTORY"
python3 - "$API" "$DIR/artifact_inventory.json" <<'PY'
import json, pathlib, sys
api = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])

def ls(rel):
    p = api / rel
    return sorted([str(x.relative_to(api)) for x in p.glob("*")]) if p.exists() else []

data = {
    "automation_out": ls("automation/out"),
    "generated_cursor_apply": ls("automation/generated_cursor_apply"),
    "generated_vps_cards": ls("automation/generated_vps_cards"),
    "scripts": ls("scripts"),
    "constitutions": ls("docs/constitution"),
    "routes_admin": ls("src/routes"),
    "founder": ls("src/founder"),
}
dst.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(data, ensure_ascii=False, indent=2))
PY

say "NAS / BACKUP / SYNC"
python3 - "$ROOT" "$DIR/storage_backup_nas.json" <<'PY'
import json, pathlib, subprocess, sys
root = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])

candidates = [
    "/mnt/nas",
    "/Volumes/NAS",
    "/opt/tenmon-backup",
    "/backup",
    "/data/backup",
]

scripts = [
    "api/scripts/vps_sync_and_verify.sh",
    "api/scripts/vps_reclone_and_switch.sh",
    "api/scripts/vps_fix_live_directory.sh",
    "api/scripts/obs_evidence_bundle.sh",
]

def mount_info(path: str):
    p = pathlib.Path(path)
    return {
        "path": path,
        "exists": p.exists(),
        "is_dir": p.is_dir() if p.exists() else False,
        "contents_sample": sorted([x.name for x in p.iterdir()])[:20] if p.exists() and p.is_dir() else []
    }

mount_text = ""
try:
    mount_text = subprocess.run(["mount"], capture_output=True, text=True, check=False).stdout
except Exception:
    pass

data = {
    "mount_candidates": [mount_info(x) for x in candidates],
    "scripts_present": {s: (root / s).exists() for s in scripts},
    "mount_output_head": mount_text[:4000],
}
dst.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(data, ensure_ascii=False, indent=2))
PY

say "IMPROVEMENT RECOMMENDATIONS"
python3 - "$DIR/runtime_matrix.json" "$DIR/chat_static_forensic.json" "$DIR/output_contracts.json" "$DIR/storage_backup_nas.json" "$DIR/improvement_recommendations.json" "$DIR/improvement_recommendations.md" <<'PY'
import json, pathlib, sys
runtime = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
staticf = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
contracts = json.loads(pathlib.Path(sys.argv[3]).read_text(encoding="utf-8"))
storage = json.loads(pathlib.Path(sys.argv[4]).read_text(encoding="utf-8"))
out_json = pathlib.Path(sys.argv[5])
out_md = pathlib.Path(sys.argv[6])

recs = []

if staticf["counts"]["threadCore"] > 220 or staticf["counts"]["synapse"] > 100:
    recs.append({
        "axis": "chat_density",
        "why": "threadCore/synapse density remains high",
        "recommend_card": "CHAT_TS_STAGE4_DENSITY_TRUNK_LOCK_CURSOR_AUTO_V2"
    })

if not contracts["self_improvement_os"]["exists"] or contracts["self_improvement_os"]["missing"]:
    recs.append({
        "axis": "self_improvement_os",
        "why": "integrated outputs are missing",
        "recommend_card": "TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1"
    })

if not contracts["kokuzo_learning_os"]["exists"] or contracts["kokuzo_learning_os"]["missing"]:
    recs.append({
        "axis": "kokuzo_learning_os",
        "why": "learning outputs remain partial",
        "recommend_card": "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1"
    })

if not any(x["exists"] for x in storage["mount_candidates"]):
    recs.append({
        "axis": "storage_backup_nas",
        "why": "NAS mount not confirmed",
        "recommend_card": "TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1"
    })

if recs == []:
    recs.append({
        "axis": "maintenance",
        "why": "major blockers not detected in this pass",
        "recommend_card": "TENMON_POSTLOCK_MAINTENANCE_CURSOR_AUTO_V1"
    })

out_json.write_text(json.dumps(recs, ensure_ascii=False, indent=2), encoding="utf-8")
md = ["# IMPROVEMENT RECOMMENDATIONS", ""]
for r in recs:
    md.append(f"- [{r['axis']}] {r['why']} -> {r['recommend_card']}")
out_md.write_text("\n".join(md), encoding="utf-8")
print(json.dumps(recs, ensure_ascii=False, indent=2))
PY

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort

say "PASS CONDITION"
cat <<'EOF'
1. build / restart / health / audit が観測される
2. runtime_matrix.json が出る
3. worldclass_report.json と seal_verdict.json が出る
4. output_contracts.json が出る
5. storage_backup_nas.json が出る
6. improvement_recommendations.json が出る
EOF

echo
echo "[RUN_LOG] $DIR/run.log"
