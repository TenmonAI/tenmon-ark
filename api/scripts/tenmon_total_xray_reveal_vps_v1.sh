#!/usr/bin/env bash
# TENMON_TOTAL_XRAY_REVEAL_VPS_V1 — 会話 runtime / build / health / 12 系統ヒューリスティクスを束ねた VPS 監査
# read-only 原則: リポジトリ改変なし（systemd restart のみ本番に依る）
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_TOTAL_XRAY_REVEAL_VPS_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

ROOT="/opt/tenmon-ark-repo"
API="$ROOT/api"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"

OUT_JSON="$DIR/total_xray_reveal.json"
OUT_MD="$DIR/total_xray_reveal.md"
OUT_MATRIX="$DIR/subsystem_readiness_matrix.json"
OUT_CROUCH="$DIR/crouching_functions.json"
OUT_MISSING="$DIR/missing_runners.json"
OUT_MISMATCH="$DIR/output_contract_mismatches.json"
OUT_VERDICT="$DIR/integrated_master_verdict.json"
OUT_NEXT="$DIR/next_priority_cards.json"

say(){ printf '\n===== %s =====\n' "$1"; }

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
systemctl --no-pager --full status tenmon-ark-api.service | sed -n '1,120p' | tee "$DIR/systemctl_status.txt"
journalctl -u tenmon-ark-api.service -n 200 --no-pager | tee "$DIR/journal_tail.txt"
ss -lntp | tee "$DIR/ss_lntp.txt"
curl -fsS "$BASE/health" | tee "$DIR/health.json"
HEALTH_RC=${PIPESTATUS[0]}
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json"
AUDIT_RC=${PIPESTATUS[0]}
set -e

say "CHAT RUNTIME MATRIX"
python3 - "$BASE" "$DIR/runtime_matrix.json" <<'PY'
import json, sys, urllib.request, pathlib, time
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
res = {}
for t in tests:
    try:
        body = json.dumps({"message": t["message"], "threadId": f"xray-{t['name']}"}).encode("utf-8")
        req = urllib.request.Request(base + "/api/chat", data=body, method="POST", headers={"Content-Type":"application/json","Accept":"application/json"})
        with urllib.request.urlopen(req, timeout=45) as r:
            raw = r.read().decode("utf-8", errors="replace")
            obj = json.loads(raw)
            ku = ((obj.get("decisionFrame") or {}).get("ku") or {}) if isinstance(obj.get("decisionFrame"), dict) else {}
            res[t["name"]] = {
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
        res[t["name"]] = {"ok": False, "error": str(e)}
    time.sleep(0.2)

out.write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(res, ensure_ascii=False, indent=2))
PY

say "ARTIFACT INVENTORY"
python3 - "$API" "$DIR/artifact_inventory.json" <<'PY'
import json, pathlib, sys
api = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])

def list_glob(rel):
    p = api / rel
    if not p.exists():
        return []
    return sorted([str(x.relative_to(api)) for x in p.glob("*")])

data = {
    "automation": list_glob("automation"),
    "automation_out": list_glob("automation/out"),
    "generated_cursor_apply": list_glob("automation/generated_cursor_apply"),
    "generated_vps_cards": list_glob("automation/generated_vps_cards"),
    "scripts": list_glob("scripts"),
    "constitutions": list_glob("docs/constitution"),
}
dst.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"ok": True}, ensure_ascii=False))
PY

say "TOTAL XRAY ANALYSIS"
python3 - "$API" "$DIR/runtime_matrix.json" "$DIR/artifact_inventory.json" "$OUT_JSON" "$OUT_MATRIX" "$OUT_CROUCH" "$OUT_MISSING" "$OUT_MISMATCH" "$OUT_VERDICT" "$OUT_NEXT" "$OUT_MD" <<'PY'
import json, pathlib, re, sys

api = pathlib.Path(sys.argv[1])
runtime = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
inventory = json.loads(pathlib.Path(sys.argv[3]).read_text(encoding="utf-8"))
out_json = pathlib.Path(sys.argv[4])
out_matrix = pathlib.Path(sys.argv[5])
out_crouch = pathlib.Path(sys.argv[6])
out_missing = pathlib.Path(sys.argv[7])
out_mismatch = pathlib.Path(sys.argv[8])
out_verdict = pathlib.Path(sys.argv[9])
out_next = pathlib.Path(sys.argv[10])
out_md = pathlib.Path(sys.argv[11])

def file_exists(rel):
    return (api / rel).exists()

systems = {
    "conversation_system": {
        "expected_files": [
            "src/routes/chat.ts",
            "automation/tenmon_chat_ts_worldclass_completion_report_v1.py",
            "scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh",
        ]
    },
    "chat_architecture": {
        "expected_files": [
            "automation/chat_architecture_observer_v1.py",
            "scripts/chat_architecture_observer_v1.sh",
        ]
    },
    "self_improvement_os": {
        "expected_files": [
            "automation/improvement_ledger_v1.py",
            "automation/residual_quality_scorer_v1.py",
            "automation/card_auto_generator_v1.py",
            "automation/seal_governor_v1.py",
            "automation/self_improvement_os_runner_v1.py",
            "scripts/self_improvement_os_run_v1.sh",
        ]
    },
    "chat_refactor_os": {
        "expected_files": [
            "automation/chat_refactor_planner_v1.py",
            "automation/chat_refactor_card_generator_v1.py",
            "automation/chat_refactor_governor_v1.py",
            "automation/chat_refactor_os_runner_v1.py",
            "scripts/chat_refactor_os_run_v1.sh",
        ]
    },
    "kokuzo_learning_os": {
        "expected_files": [
            "automation/kokuzo_bad_observer_v1.py",
            "automation/khs_health_gate_v1.py",
            "automation/deterministic_seed_generator_v1.py",
            "automation/kokuzo_learning_improvement_os_integrated_v1.py",
            "scripts/kokuzo_bad_observer_v1.sh",
            "scripts/khs_health_gate_v1.sh",
            "scripts/deterministic_seed_generator_v1.sh",
            "scripts/kokuzo_learning_improvement_os_integrated_v1.sh",
        ]
    },
    "storage_backup_nas": {
        "expected_files": [
            "scripts/vps_sync_and_verify.sh",
            "scripts/vps_reclone_and_switch.sh",
            "scripts/vps_fix_live_directory.sh",
            "scripts/obs_evidence_bundle.sh",
        ]
    },
    "acceptance_runtime": {
        "expected_files": [
            "scripts/chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh",
            "scripts/probe_matrix.sh",
            "scripts/run_restart_and_route_bleed_check.sh",
        ]
    },
    "cursor_autobuild": {
        "expected_files": [
            "automation/cursor_bridge_v1.py",
            "automation/patch_planner_v1.py",
            "automation/queue_scheduler_v1.py",
            "automation/cursor_applier_v1.py",
            "automation/execution_gate_v1.py",
        ]
    },
    "feature_autobuild": {
        "expected_files": [
            "automation/feature_intent_parser_v1.py",
            "automation/spec_generator_v1.py",
            "automation/card_splitter_v1.py",
            "automation/dependency_aware_campaign_orchestrator_v1.py",
            "automation/deployment_gate_v1.py",
        ]
    },
    "remote_admin": {
        "expected_files": [
            "automation/remote_cursor_command_center_v1.py",
            "automation/remote_cursor_result_ingest_v1.py",
            "scripts/remote_cursor_agent_mac_v1.sh",
            "scripts/remote_cursor_submit_v1.sh",
            "src/routes/adminCursorCommand.ts",
            "src/routes/adminCursorResult.ts",
        ]
    },
    "internal_cognition": {
        "expected_files": [
            "src/core/threadCore.ts",
            "src/core/tenmonBrainstem.ts",
            "src/planning/responsePlanCore.ts",
            "src/core/tenmonGateThreadContextV1.ts",
            "src/core/threadCoreLinkSurfaceV1.ts",
        ]
    },
    "constitution_governance": {
        "expected_files": [
            "docs/constitution/TENMON_CONVERSATION_CONSTITUTION_V1.md",
            "docs/constitution/TENMON_CHAT_REFACTOR_OS_V1.md",
            "docs/constitution/TENMON_SELF_IMPROVEMENT_OS_V1.md",
            "docs/constitution/TENMON_CONVERSATION_AND_LEARNING_FULL_ORCHESTRATOR_V1.md",
        ]
    },
}

readiness = {}
crouching = []
missing_runners = []
mismatches = []

def _ok_entries(rt):
    for v in rt.values():
        if isinstance(v, dict) and "ok" in v:
            yield v

# runtime cognition exposure
cognition_flags = {
    "threadCore_runtime_exposed": any(v.get("has_threadCore") for v in _ok_entries(runtime) if v.get("ok")),
    "heart_runtime_exposed": any(v.get("has_heart") for v in _ok_entries(runtime) if v.get("ok")),
    "intention_runtime_exposed": any(v.get("has_intention") for v in _ok_entries(runtime) if v.get("ok")),
    "meaningFrame_runtime_exposed": any(v.get("has_meaningFrame") for v in _ok_entries(runtime) if v.get("ok")),
    "thoughtCoreSummary_runtime_exposed": any(v.get("has_thoughtCoreSummary") for v in _ok_entries(runtime) if v.get("ok")),
    "personaConstitutionSummary_runtime_exposed": any(v.get("has_personaConstitutionSummary") for v in _ok_entries(runtime) if v.get("ok")),
    "brainstemDecision_runtime_exposed": any(v.get("has_brainstemDecision") for v in _ok_entries(runtime) if v.get("ok")),
}

for name, spec in systems.items():
    expected = spec["expected_files"]
    exists_count = sum(1 for p in expected if file_exists(p))
    exists_ratio = exists_count / max(1, len(expected))
    state = "absent"
    if exists_ratio == 0:
        state = "absent"
    elif exists_ratio < 0.4:
        state = "file_only"
    elif exists_ratio < 0.75:
        state = "partial_impl"
    else:
        state = "implemented"

    connected = False
    running = False
    producing_outputs = False

    if name == "conversation_system":
        connected = True
        running = all(v.get("ok") for v in _ok_entries(runtime))
        producing_outputs = True
    elif name == "internal_cognition":
        connected = True
        running = any(cognition_flags.values())
        producing_outputs = running
    else:
        out_hits = [p for p in inventory.get("automation_out", []) if name.split("_")[0] in p or name in p]
        producing_outputs = len(out_hits) > 0

    if state == "implemented" and not producing_outputs and name not in ("conversation_system","internal_cognition","storage_backup_nas","acceptance_runtime","constitution_governance","cursor_autobuild"):
        crouching.append({
            "system": name,
            "reason": "implemented_but_outputless",
            "status": "crouching"
        })

    for p in expected:
        if p.endswith(".sh") and not file_exists(p):
            missing_runners.append({"system": name, "missing_runner": p})

    readiness_score = int(exists_ratio * 55)
    if connected: readiness_score += 10
    if running: readiness_score += 15
    if producing_outputs: readiness_score += 20
    readiness_score = min(100, readiness_score)

    risk = "low"
    if name in ("chat_refactor_os","self_improvement_os","kokuzo_learning_os","remote_admin"):
        risk = "high"
    elif name in ("feature_autobuild","internal_cognition","cursor_autobuild"):
        risk = "medium"

    readiness[name] = {
        "exists": exists_ratio > 0,
        "implemented": state in ("partial_impl","implemented"),
        "connected": connected,
        "running": running,
        "producing_outputs": producing_outputs,
        "completedness_score": readiness_score,
        "risk_level": risk,
        "state": state,
        "evidence_paths": expected,
    }

# output mismatches based on current known reality
if readiness["self_improvement_os"]["implemented"] and not readiness["self_improvement_os"]["producing_outputs"]:
    mismatches.append({"system":"self_improvement_os","mismatch":"files_exist_but_integrated_outputs_missing"})
if readiness["chat_refactor_os"]["implemented"] and not readiness["chat_refactor_os"]["producing_outputs"]:
    mismatches.append({"system":"chat_refactor_os","mismatch":"files_exist_but_integrated_outputs_missing"})
if readiness["kokuzo_learning_os"]["implemented"] and not readiness["kokuzo_learning_os"]["producing_outputs"]:
    mismatches.append({"system":"kokuzo_learning_os","mismatch":"files_exist_but_integrated_outputs_missing"})

overall = round(sum(v["completedness_score"] for v in readiness.values()) / len(readiness), 1)

primary_breakers = []
for sysn, rv in readiness.items():
    if rv["completedness_score"] < 60:
        primary_breakers.append(f"{sysn}:readiness_low")
if crouching:
    primary_breakers.append("crouching_functions_present")
if missing_runners:
    primary_breakers.append("missing_runners_present")
if mismatches:
    primary_breakers.append("output_contract_mismatches_present")

# breakout proximity heuristic
if overall >= 85 and len(primary_breakers) <= 2:
    breakout = "near_breakpoint"
elif overall >= 70:
    breakout = "approaching_breakpoint"
else:
    breakout = "pre_breakpoint"

next_cards = []
if readiness["self_improvement_os"]["completedness_score"] < 60:
    next_cards.append("TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1")
if readiness["kokuzo_learning_os"]["completedness_score"] < 60:
    next_cards.append("TENMON_KOKUZO_SELF_LEARNING_AND_SELF_IMPROVEMENT_PARENT_CURSOR_AUTO_V1")
if readiness["chat_refactor_os"]["completedness_score"] < 60:
    next_cards.append("TENMON_CHAT_REFACTOR_AUTONOMOUS_GOVERNOR_CURSOR_AUTO_V1")
if readiness["conversation_system"]["completedness_score"] >= 80:
    next_cards.append("CHAT_TS_STAGE4_DENSITY_TRUNK_LOCK_CURSOR_AUTO_V2")
if readiness["remote_admin"]["completedness_score"] < 50:
    next_cards.append("TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1")
next_cards = next_cards[:5]

xray = {
    "card": "TENMON_TOTAL_XRAY_REVEAL_VPS_V1",
    "systems": readiness,
    "internal_cognition_runtime": cognition_flags,
    "crouching_functions": crouching,
    "missing_runners": missing_runners,
    "output_contract_mismatches": mismatches,
}

verdict = {
    "conversation_readiness": readiness["conversation_system"]["completedness_score"],
    "chat_architecture_readiness": readiness["chat_architecture"]["completedness_score"],
    "self_improvement_os_readiness": readiness["self_improvement_os"]["completedness_score"],
    "chat_refactor_os_readiness": readiness["chat_refactor_os"]["completedness_score"],
    "kokuzo_learning_os_readiness": readiness["kokuzo_learning_os"]["completedness_score"],
    "storage_backup_nas_readiness": readiness["storage_backup_nas"]["completedness_score"],
    "acceptance_runtime_readiness": readiness["acceptance_runtime"]["completedness_score"],
    "cursor_autobuild_readiness": readiness["cursor_autobuild"]["completedness_score"],
    "feature_autobuild_readiness": readiness["feature_autobuild"]["completedness_score"],
    "remote_admin_readiness": readiness["remote_admin"]["completedness_score"],
    "internal_cognition_readiness": readiness["internal_cognition"]["completedness_score"],
    "constitution_governance_readiness": readiness["constitution_governance"]["completedness_score"],
    "overall_system_readiness": overall,
    "breakout_proximity": breakout,
    "primary_breakers": primary_breakers,
    "manual_gate_required": [c["system"] for c in crouching if c["system"] in ("remote_admin","kokuzo_learning_os","chat_refactor_os","self_improvement_os")],
}

out_json.write_text(json.dumps(xray, ensure_ascii=False, indent=2), encoding="utf-8")
out_matrix.write_text(json.dumps(readiness, ensure_ascii=False, indent=2), encoding="utf-8")
out_crouch.write_text(json.dumps(crouching, ensure_ascii=False, indent=2), encoding="utf-8")
out_missing.write_text(json.dumps(missing_runners, ensure_ascii=False, indent=2), encoding="utf-8")
out_mismatch.write_text(json.dumps(mismatches, ensure_ascii=False, indent=2), encoding="utf-8")
out_verdict.write_text(json.dumps(verdict, ensure_ascii=False, indent=2), encoding="utf-8")
out_next.write_text(json.dumps({"next_priority_cards": next_cards}, ensure_ascii=False, indent=2), encoding="utf-8")

md = [
    "# TENMON TOTAL XRAY REVEAL",
    "",
    f"- overall_system_readiness: **{overall}**",
    f"- breakout_proximity: **{breakout}**",
    "",
    "## Primary Breakers",
]
for b in primary_breakers:
    md.append(f"- {b}")
md.append("")
md.append("## Next Priority Cards")
for c in next_cards:
    md.append(f"- {c}")
out_md.write_text("\n".join(md), encoding="utf-8")

print(json.dumps(xray, ensure_ascii=False, indent=2))
print(json.dumps(verdict, ensure_ascii=False, indent=2))
print(json.dumps({"next_priority_cards": next_cards}, ensure_ascii=False, indent=2))
PY

say "MARKER"
printf '{"card":"%s","ts":"%s","dir":"%s","build_rc":%s,"health_rc":%s,"audit_rc":%s}\n' \
  "$CARD" "$TS" "$DIR" "${BUILD_RC:-null}" "${HEALTH_RC:-null}" "${AUDIT_RC:-null}" \
  | tee "$DIR/TENMON_TOTAL_XRAY_REVEAL_VPS_V1"

say "OUTPUT FILES"
find "$DIR" -maxdepth 1 -type f | sort

say "PASS CONDITION"
cat <<'EOF'
1. 全12系統の readiness が採点される
2. crouching_functions.json が出る
3. missing_runners.json が出る
4. output_contract_mismatches.json が出る
5. integrated_master_verdict.json が出る
6. next_priority_cards.json が出る
EOF

echo
echo "[RUN_LOG] $DIR/run.log"
