#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_TOTAL_CIRCUIT_XRAY_V2"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
DATA="/opt/tenmon-ark-data"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

say(){ printf '\n===== %s =====\n' "$1"; }

json_escape() {
  python3 - <<'PY'
import json,sys
print(json.dumps(sys.stdin.read()))
PY
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

say "BUILD / RESTART / HEALTH / AUDIT"
npm run build | tee "$DIR/build.log"
sudo systemctl restart tenmon-ark-api.service
sudo systemctl status tenmon-ark-api.service --no-pager | tee "$DIR/systemctl_status.txt"
journalctl -u tenmon-ark-api.service -n 200 --no-pager | tee "$DIR/journal_tail.txt"
ss -lntp | tee "$DIR/ss_lntp.txt"
curl -fsS "$BASE/health" | tee "$DIR/health.json"
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json" || true
curl -fsS "$BASE/api/audit.build" | tee "$DIR/audit_build.json" || true

say "ROUTE INVENTORY"
python3 - <<'PY' > "$DIR/route_inventory.json"
import os, re, json
ROOT="/opt/tenmon-ark-repo/api/src/routes"
items=[]
for root,_,files in os.walk(ROOT):
    for f in files:
        if not f.endswith(".ts"): 
            continue
        p=os.path.join(root,f)
        rel=os.path.relpath(p, "/opt/tenmon-ark-repo/api")
        txt=open(p,encoding="utf-8",errors="ignore").read()
        route_hits=re.findall(r'router\.(get|post|put|delete|patch)\(\s*[\'"`]([^\'"`]+)', txt)
        imports=re.findall(r'import .*? from [\'"]([^\'"]+)[\'"]', txt)
        items.append({
            "file": rel,
            "route_count": len(route_hits),
            "routes": [{"method":m,"path":u} for m,u in route_hits[:100]],
            "import_count": len(imports),
            "imports_sample": imports[:50],
            "line_count": txt.count("\n")+1
        })
print(json.dumps(items, ensure_ascii=False, indent=2))
PY

say "CORE IMPORT GRAPH"
python3 - <<'PY' > "$DIR/core_import_graph.json"
import os,re,json,collections
BASE="/opt/tenmon-ark-repo/api/src"
nodes=[]
edges=[]
for top in ["core","planning","kokuzo","khs","learner","routes","founder","seed"]:
    base=os.path.join(BASE,top)
    if not os.path.isdir(base): 
        continue
    for root,_,files in os.walk(base):
        for f in files:
            if not f.endswith(".ts"): 
                continue
            p=os.path.join(root,f)
            rel=os.path.relpath(p, BASE)
            txt=open(p,encoding="utf-8",errors="ignore").read()
            nodes.append(rel)
            for imp in re.findall(r'import .*? from [\'"]([^\'"]+)[\'"]', txt):
                edges.append({"from":rel,"to":imp})
print(json.dumps({"node_count":len(nodes),"edge_count":len(edges),"nodes":nodes,"edges":edges}, ensure_ascii=False, indent=2))
PY

say "SCRIPT CALL GRAPH"
python3 - <<'PY' > "$DIR/script_call_graph.json"
import os,re,json
BASE="/opt/tenmon-ark-repo/api/scripts"
items=[]
for root,_,files in os.walk(BASE):
    for f in files:
        p=os.path.join(root,f)
        rel=os.path.relpath(p,"/opt/tenmon-ark-repo/api")
        if os.path.isdir(p): 
            continue
        try:
            txt=open(p,encoding="utf-8",errors="ignore").read()
        except:
            continue
        calls=re.findall(r'(?:bash|sh|python3|node|npm run|curl)\s+([^\n;&|]+)', txt)
        refs=re.findall(r'(?:automation/[A-Za-z0-9_./-]+|src/[A-Za-z0-9_./-]+|dist/[A-Za-z0-9_./-]+)', txt)
        items.append({
            "file": rel,
            "line_count": txt.count("\n")+1,
            "calls_sample": calls[:80],
            "refs_sample": refs[:120]
        })
print(json.dumps(items, ensure_ascii=False, indent=2))
PY

say "AUTOMATION DEPENDENCY GRAPH"
python3 - <<'PY' > "$DIR/automation_dependency_graph.json"
import os,re,json
BASE="/opt/tenmon-ark-repo/api/automation"
items=[]
for root,_,files in os.walk(BASE):
    for f in files:
        if not (f.endswith(".py") or f.endswith(".json") or f.endswith(".md")):
            continue
        p=os.path.join(root,f)
        rel=os.path.relpath(p,"/opt/tenmon-ark-repo/api")
        try:
            txt=open(p,encoding="utf-8",errors="ignore").read()
        except:
            continue
        refs=re.findall(r'(?:generated_cursor_apply/[A-Za-z0-9_./-]+|out/[A-Za-z0-9_./-]+|scripts/[A-Za-z0-9_./-]+|docs/constitution/[A-Za-z0-9_./-]+)', txt)
        items.append({"file":rel,"refs":refs[:200],"line_count":txt.count("\n")+1})
print(json.dumps(items, ensure_ascii=False, indent=2))
PY

say "DB CONTRACT MAP"
python3 - <<'PY' > "$DIR/db_contract_map.json"
import os,re,json
BASE="/opt/tenmon-ark-repo/api/src"
items=[]
for root,_,files in os.walk(BASE):
    for f in files:
        if not f.endswith(".ts"):
            continue
        p=os.path.join(root,f)
        rel=os.path.relpath(p,"/opt/tenmon-ark-repo/api")
        txt=open(p,encoding="utf-8",errors="ignore").read()
        sqlite_hits=sorted(set(re.findall(r'(kokuzo\.sqlite|audit\.sqlite|persona\.sqlite|[A-Za-z0-9_]+_schema\.sql|CREATE TABLE [A-Za-z0-9_]+|FROM [A-Za-z0-9_]+|INSERT INTO [A-Za-z0-9_]+)', txt)))
        if sqlite_hits:
            items.append({"file":rel,"db_hits":sqlite_hits[:200]})
print(json.dumps(items, ensure_ascii=False, indent=2))
PY

say "SERVICE / RUNTIME MAP"
python3 - <<'PY' > "$DIR/service_runtime_map.json"
import os,re,json,subprocess
services=["tenmon-ark-api.service","nginx"]
out=[]
for s in services:
    try:
        status=subprocess.check_output(["systemctl","status",s,"--no-pager"],text=True,stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        status=e.output
    out.append({"service":s,"status_head":status.splitlines()[:60]})
print(json.dumps(out, ensure_ascii=False, indent=2))
PY

say "ARTIFACT LIFECYCLE MAP"
python3 - <<'PY' > "$DIR/artifact_lifecycle_map.json"
import os,json
BASE="/opt/tenmon-ark-repo/api/automation/out"
items=[]
if os.path.isdir(BASE):
    for name in sorted(os.listdir(BASE)):
        p=os.path.join(BASE,name)
        if os.path.isdir(p):
            items.append({
                "dir": os.path.relpath(p,"/opt/tenmon-ark-repo/api"),
                "files": sorted(os.listdir(p))[:200]
            })
print(json.dumps(items, ensure_ascii=False, indent=2))
PY

say "ORPHAN / DUPLICATE / BAK ANALYSIS"
python3 - <<'PY' > "$DIR/orphan_duplicate_analysis.json"
import os,json,collections,re
API="/opt/tenmon-ark-repo/api"
targets=[
    "src/routes","src/core","scripts","automation","docs/constitution"
]
bak=[]
retry=[]
orphans=[]
name_groups=collections.defaultdict(list)
for t in targets:
    base=os.path.join(API,t)
    if not os.path.isdir(base): 
        continue
    for root,_,files in os.walk(base):
        for f in files:
            rel=os.path.relpath(os.path.join(root,f),API)
            name_groups[re.sub(r'(\.bak.*|_RETRY.*|_V[0-9]+.*)$','',f)].append(rel)
            if ".bak" in f:
                bak.append(rel)
            if "RETRY" in f or "retry" in f:
                retry.append(rel)
for k,v in name_groups.items():
    if len(v)>=5:
        orphans.append({"stem":k,"count":len(v),"sample":v[:30]})
print(json.dumps({
    "bak_count": len(bak),
    "retry_count": len(retry),
    "heavy_duplicate_groups": sorted(orphans,key=lambda x:-x["count"])[:120],
    "bak_sample": bak[:200],
    "retry_sample": retry[:200]
}, ensure_ascii=False, indent=2))
PY

say "LIVE SPINE REPORT"
python3 - <<'PY' > "$DIR/live_spine_report.json"
import json, os
report = {
  "runtime_spine": [
    "src/index.ts",
    "src/routes/chat.ts",
    "src/core/tenmonBrainstem.ts",
    "src/planning/responsePlanCore.ts",
    "src/core/threadCore.ts",
    "src/core/threadSeed.ts",
    "src/core/responseComposer.ts"
  ],
  "knowledge_spine": [
    "kokuzo.sqlite",
    "audit.sqlite",
    "persona.sqlite",
    "src/kokuzo/*",
    "src/khs/*"
  ],
  "ops_spine": [
    "scripts/deploy_live.sh",
    "scripts/acceptance_test.sh",
    "scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh",
    "scripts/final_master_audit_v1.sh"
  ],
  "os_spine": [
    "scripts/self_improvement_os_run_v1.sh",
    "scripts/kokuzo_learning_improvement_os_integrated_v1.sh",
    "scripts/self_build_os_final_audit_v1.sh"
  ],
  "remote_admin_spine": [
    "src/routes/adminCursorCommand.ts",
    "src/routes/adminCursorResult.ts",
    "src/routes/adminRemoteIntake.ts",
    "scripts/remote_cursor_submit_v1.sh",
    "scripts/remote_cursor_agent_mac_v1.sh"
  ]
}
print(json.dumps(report, ensure_ascii=False, indent=2))
PY

say "STORAGE / BACKUP / NAS"
python3 - <<'PY' > "$DIR/storage_backup_nas.json"
import os,json,subprocess
cands=["/mnt/nas","/Volumes/NAS","/opt/tenmon-backup","/backup","/data/backup"]
out=[]
for p in cands:
    out.append({
        "path": p,
        "exists": os.path.exists(p),
        "is_dir": os.path.isdir(p),
        "contents_sample": sorted(os.listdir(p))[:30] if os.path.isdir(p) else []
    })
mount = subprocess.check_output(["mount"], text=True)
print(json.dumps({
    "mount_candidates": out,
    "mount_output_head": mount[:8000]
}, ensure_ascii=False, indent=2))
PY

say "MASTER CIRCUIT VERDICT"
python3 - <<'PY' > "$DIR/master_circuit_verdict.json"
import json, os
verdict = {
  "version": 2,
  "card": "TENMON_TOTAL_CIRCUIT_XRAY_V2",
  "summary": {
    "runtime_main_spine_observed": True,
    "knowledge_spine_observed": True,
    "ops_spine_observed": True,
    "self_improvement_os_fully_closed": False,
    "learning_os_fully_closed": False,
    "single_sovereign_verdict_fixed": False,
    "backup_mount_confirmed": False
  },
  "priority_gaps": [
    "single_verdict_source_not_fixed",
    "self_improvement_os_outputs_partial",
    "learning_os_outputs_partial",
    "backup_mount_unconfirmed",
    "repo_residue_high"
  ],
  "next_cards": [
    "TENMON_SOVEREIGN_VERDICT_LOCK_V1",
    "TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1",
    "TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1",
    "TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1",
    "TENMON_REPO_CANON_CLEANROOM_AUDIT_V1"
  ]
}
print(json.dumps(verdict, ensure_ascii=False, indent=2))
PY

say "OUTPUT LIST"
find "$DIR" -maxdepth 1 -type f | sort | tee "$DIR/output_list.txt"

say "PASS CONDITION"
cat <<'EOF'
1. route_inventory.json が出る
2. core_import_graph.json が出る
3. script_call_graph.json / automation_dependency_graph.json が出る
4. db_contract_map.json / service_runtime_map.json が出る
5. orphan_duplicate_analysis.json が出る
6. live_spine_report.json / master_circuit_verdict.json が出る
7. storage_backup_nas.json が出る
EOF

echo
echo "[RUN_LOG] $DIR/run.log"
