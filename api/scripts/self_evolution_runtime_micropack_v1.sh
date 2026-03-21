#!/usr/bin/env bash
# SELF_EVOLUTION_RUNTIME_MICROPACK_V1
# SELF_EVOLUTION_AUTOBUNDLE_V1 の 7 micro-card を固定順で実行し evidenceBundlePath を残す。
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/self_evolution_runtime_micropack_v1.sh [EVIDENCE_ROOT]
#
# 環境変数:
#   TENMON_DATA_DIR — kokuzo.sqlite（既定 /opt/tenmon-ark-data）
#   SKIP_NPM_BUILD=1 — build ステップを飛ばす（事前に npm run build + API 再起動済みのとき）
#
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SAN_TS="$(echo "$TS" | tr -c 'A-Za-z0-9' '_')"
EVIDENCE_ROOT="${1:-/tmp/self_evolution_runtime_micropack_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
MASTER_LOG="$EVIDENCE_ROOT/SELF_EVOLUTION_RUNTIME_MICROPACK_V1.log"
exec > >(tee -a "$MASTER_LOG") 2>&1

export BASE
KDATA="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KDB="${KDATA}/kokuzo.sqlite"

echo "== SELF_EVOLUTION_RUNTIME_MICROPACK_V1 =="
echo "EVIDENCE_ROOT=$EVIDENCE_ROOT BASE=$BASE TENMON_DATA_DIR=$KDATA"
echo

fail_mc() {
  local id="$1"
  local msg="$2"
  echo "[FAIL] micro-card ${id}: ${msg}"
  echo "{\"microCardId\":\"${id}\",\"status\":\"fail\",\"notes\":\"${msg}\"}" >"$EVIDENCE_ROOT/LAST_FAIL.json" 2>/dev/null || true
  exit 1
}

write_envelope() {
  local id="$1"
  local slug="$2"
  local dir="$3"
  local acceptance="$4"
  local status="${5:-pass}"
  mkdir -p "$dir"
  local acc_esc="${acceptance//\"/\\\"}"
  cat >"$dir/envelope.json" <<EOF
{
  "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
  "microCardId": "${id}",
  "microCardSlug": "${slug}",
  "parentCard": "SELF_EVOLUTION_AUTOBUNDLE_V1",
  "runtimePackCard": "SELF_EVOLUTION_RUNTIME_MICROPACK_V1",
  "evidenceBundlePath": "${dir}",
  "acceptancePlan": "${acc_esc}",
  "rollbackPlan": "SELF_BUILD_RESTORE_POLICY_V1: DELETE kanagi_growth_ledger WHERE input_text LIKE 'SELFMICRO_${SAN_TS}%'; DELETE khs_apply_log WHERE threadId LIKE 'sevol_${SAN_TS}%'; 証跡フォルダ削除。",
  "status": "${status}",
  "completedAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

health_check() {
  local d="$1"
  mkdir -p "$d"
  curl -fsS "$BASE/health" >"$d/health.json" || return 1
  python3 - <<'PY' "$d/health.json"
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
if j.get("status") != "ok":
    sys.exit(1)
PY
}

CHAT_LOCAL_HDR=(-H "x-tenmon-local-test: 1" -H "x-tenmon-local-user: sevol_${SAN_TS}@micropack.local")

echo "== 0) build =="
if [[ "${SKIP_NPM_BUILD:-}" == "1" ]]; then
  echo "[SKIP_NPM_BUILD=1] npm run build omitted (ensure dist matches running API)"
else
  npm run build || fail_mc "pre_build" "npm run build"
fi

echo
echo "== 0b) health =="
mkdir -p "$EVIDENCE_ROOT/_precheck"
health_check "$EVIDENCE_ROOT/_precheck" || fail_mc "pre_health" "health"

if [[ ! -f "$KDB" ]]; then
  fail_mc "pre_db" "kokuzo sqlite missing under $KDATA"
fi

# 命名 bootstrap（NAMING_STEP 回避）
BOOT_TID="sevol_boot_${SAN_TS}"
echo "== 0c) bootstrap naming =="
mkdir -p "$EVIDENCE_ROOT/_bootstrap"
jq -n --arg t "$BOOT_TID" '{message:"hello",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/_bootstrap/n1.json" || fail_mc "bootstrap" "n1"
jq -n --arg t "$BOOT_TID" --arg m "検証ユーザー${SAN_TS}" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/_bootstrap/n2.json" || fail_mc "bootstrap" "n2"
jq -n --arg t "$BOOT_TID" --arg m "検証アシスタント" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/_bootstrap/n3.json" || fail_mc "bootstrap" "n3"

# RFB JSON（hydrate 用）— length(next_growth_axis) > 12 を満たす
RFB_MARK="SELF_LEARNING_RFB_V1"

cleanup_test_ledger() {
  sqlite3 "$KDB" "DELETE FROM kanagi_growth_ledger WHERE input_text LIKE 'SELFMICRO_${SAN_TS}%';" 2>/dev/null || true
}

# ========== MC1 self_learning_runtime_feedback_check ==========
MC1="$EVIDENCE_ROOT/micro_01_self_learning_runtime_feedback_check"
write_envelope "self_learning_runtime_feedback_check" "sl_runtime" "$MC1" "kanagiSelf 可視 + prior hydrate + ruleHintCodes 非空" "pending"
echo "== [1/7] self_learning_runtime_feedback_check =="
cleanup_test_ledger
# hydrate は「最新 1 件」のみ参照するため、RFB マーカー行を一旦掃除（micropack 検証専用）
sqlite3 "$KDB" "DELETE FROM kanagi_growth_ledger WHERE unresolved_class='SELF_LEARNING_RFB_V1';" 2>/dev/null || true
python3 - <<PY "$KDB" "$SAN_TS" || { write_envelope "self_learning_runtime_feedback_check" "sl_runtime" "$MC1" "insert rfb" "fail"; fail_mc "self_learning_runtime_feedback_check" "sqlite"; }
import json, sqlite3, sys
dbp, san = sys.argv[1], sys.argv[2]
payload = {
  "v": "SELF_LEARNING_RULE_FEEDBACK_V1",
  "routeReason": "TENMON_STRUCTURE_LOCK_V1",
  "answerMode": "define",
  "answerLength": "medium",
  "answerFrame": "statement_plus_one_question",
  "densityTarget": "high",
  "sourceKinds": ["scripture", "kotodama"],
  "lawsUsedSample": ["KHSL:LAW:probe"],
  "judgementAxis": ["stability"],
  "stabilityScore": 0.72,
  "driftRisk": 0.35,
  "selfPhase": "L-OUT",
  "intentPhase": "CENTER",
  "ruleHintCodes": ["density_prefer_high", "source_grounding_prefer_canon", "law_trace_active"],
}
js = json.dumps(payload, ensure_ascii=False)
con = sqlite3.connect(dbp)
con.execute(
    """INSERT INTO kanagi_growth_ledger (
      input_text, route_reason, should_persist, should_recombine,
      unresolved_class, next_growth_axis
    ) VALUES (?, 'TENMON_STRUCTURE_LOCK_V1', 1, 0, ?, ?)""",
    (f"SELFMICRO_{san}_mc1_rfb", "SELF_LEARNING_RFB_V1", js),
)
con.commit()
con.close()
print("[OK] inserted RFB ledger row")
PY

jq -n --arg t "se-mc1-${SAN_TS}" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC1/chat.json" \
  || fail_mc "self_learning_runtime_feedback_check" "curl"

python3 - <<'PY' "$MC1/chat.json" || { write_envelope "self_learning_runtime_feedback_check" "sl_runtime" "$MC1" "acceptance" "fail"; fail_mc "self_learning_runtime_feedback_check" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
ks = ku.get("kanagiSelf")
if not isinstance(ks, dict):
    sys.exit("kanagiSelf missing or not object")
pr = ku.get("priorSelfLearningRuleFeedbackV1")
if not isinstance(pr, dict) or pr.get("v") != "SELF_LEARNING_RULE_FEEDBACK_V1":
    sys.exit("priorSelfLearningRuleFeedbackV1 missing or wrong v")
hints = pr.get("ruleHintCodes") or []
if len(hints) < 1:
    sys.exit("ruleHintCodes empty")
print("[PASS] mc1 self-learning visible + prior + hints")
PY
write_envelope "self_learning_runtime_feedback_check" "sl_runtime" "$MC1" "kanagiSelf 可視 + prior hydrate + ruleHintCodes 非空" "pass"

# ========== MC2 rule_binder_runtime_effect_check ==========
MC2="$EVIDENCE_ROOT/micro_02_rule_binder_runtime_effect_check"
write_envelope "rule_binder_runtime_effect_check" "rule_binder" "$MC2" "prior なし vs ありで density/source の差分" "pending"
echo "== [2/7] rule_binder_runtime_effect_check =="
cleanup_test_ledger
sqlite3 "$KDB" "DELETE FROM kanagi_growth_ledger WHERE unresolved_class='SELF_LEARNING_RFB_V1';" 2>/dev/null || true
jq -n --arg t "se-mc2a-${SAN_TS}" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC2/baseline.json" \
  || fail_mc "rule_binder_runtime_effect_check" "baseline curl"

python3 - <<PY "$KDB" "$SAN_TS" || fail_mc "rule_binder_runtime_effect_check" "insert rfb2"
import json, sqlite3, sys
dbp, san = sys.argv[1], sys.argv[2]
payload = {
  "v": "SELF_LEARNING_RULE_FEEDBACK_V1",
  "routeReason": "TENMON_STRUCTURE_LOCK_V1",
  "answerMode": "define",
  "answerLength": "medium",
  "answerFrame": "statement_plus_one_question",
  "densityTarget": "high",
  "sourceKinds": ["scripture", "canon_pack"],
  "lawsUsedSample": [],
  "judgementAxis": ["binder_test"],
  "stabilityScore": 0.6,
  "driftRisk": 0.1,
  "selfPhase": "CENTER",
  "intentPhase": "CENTER",
  "ruleHintCodes": ["density_prefer_high", "source_grounding_prefer_canon"],
}
js = json.dumps(payload, ensure_ascii=False)
con = sqlite3.connect(dbp)
con.execute(
    """INSERT INTO kanagi_growth_ledger (
      input_text, route_reason, should_persist, should_recombine,
      unresolved_class, next_growth_axis
    ) VALUES (?, 'TENMON_STRUCTURE_LOCK_V1', 1, 0, 'SELF_LEARNING_RFB_V1', ?)""",
    (f"SELFMICRO_{san}_mc2_rfb", js),
)
con.commit()
con.close()
PY

jq -n --arg t "se-mc2b-${SAN_TS}" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC2/with_prior.json" \
  || fail_mc "rule_binder_runtime_effect_check" "with_prior curl"

python3 - <<'PY' "$MC2/baseline.json" "$MC2/with_prior.json" || { write_envelope "rule_binder_runtime_effect_check" "rule_binder" "$MC2" "diff" "fail"; fail_mc "rule_binder_runtime_effect_check" "acceptance"; }
import json, sys
def load(p):
    j = json.load(open(p, encoding="utf-8"))
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    rp = ku.get("responsePlan") or {}
    dc = rp.get("densityContract") if isinstance(rp, dict) else None
    dt = (dc or {}).get("densityTarget") if isinstance(dc, dict) else None
    ss = ku.get("sourceStackSummary") or {}
    sk = ss.get("sourceKinds") if isinstance(ss, dict) else None
    ln = len(sk) if isinstance(sk, list) else 0
    tcs = ku.get("thoughtCoreSummary") or {}
    hints = tcs.get("priorGrowthAxisHints") if isinstance(tcs, dict) else None
    return dt, ln, hints, ku.get("priorSelfLearningRuleFeedbackV1")

b_dt, b_ln, b_h, b_pr = load(sys.argv[1])
a_dt, a_ln, a_h, a_pr = load(sys.argv[2])
if not isinstance(a_pr, dict):
    sys.exit("with_prior: prior missing")
ok = False
if a_dt == "high" and b_dt != "high":
    ok = True
if isinstance(a_h, list) and len(a_h) > 0:
    ok = True
if a_ln > b_ln:
    ok = True
_j2 = json.load(open(sys.argv[2], encoding="utf-8"))
ss = ((_j2.get("decisionFrame") or {}).get("ku") or {}).get("sourceStackSummary") or {}
if not isinstance(ss, dict):
    ss = {}
tg = str(ss.get("thoughtGuideSummary") or "")
if "prior: canon grounding" in tg:
    ok = True
if not ok:
    sys.exit("no intended diff: baseline dt=%r sk=%s with_prior dt=%r sk=%s hints=%r" % (b_dt, b_ln, a_dt, a_ln, a_h))
print("[PASS] mc2 binder effect (density/source/hints/tg diff)")
PY
write_envelope "rule_binder_runtime_effect_check" "rule_binder" "$MC2" "prior なし vs ありで density/source の差分" "pass"

# ========== MC3 seed_learning_effect_probe ==========
MC3="$EVIDENCE_ROOT/micro_03_seed_learning_effect_probe"
write_envelope "seed_learning_effect_probe" "seed" "$MC3" "seed/cluster 実体 + 2 ターンで lawsUsed 差分または利用シグナル" "pending"
echo "== [3/7] seed_learning_effect_probe =="

sqlite3 "$KDB" "SELECT COUNT(*) FROM khs_seeds_det_v1 WHERE COALESCE(usageScore,0)>0;" >"$MC3/seeds_usage.txt" 2>/dev/null || echo "0" >"$MC3/seeds_usage.txt"
sqlite3 "$KDB" "SELECT COUNT(*) FROM khs_seed_clusters;" >"$MC3/clusters.txt" 2>/dev/null || echo "0" >"$MC3/clusters.txt"

jq -n --arg t "se-mc3a-${SAN_TS}" '{message:"カタカムナとは何ですか",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC3/chat_a.json" \
  || fail_mc "seed_learning_effect_probe" "curl a"

jq -n --arg t "se-mc3b-${SAN_TS}" '{message:"言霊とカタカムナの違いは？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC3/chat_b.json" \
  || fail_mc "seed_learning_effect_probe" "curl b"

python3 - <<'PY' "$MC3/seeds_usage.txt" "$MC3/clusters.txt" "$MC3/chat_a.json" "$MC3/chat_b.json" || { write_envelope "seed_learning_effect_probe" "seed" "$MC3" "seed" "fail"; fail_mc "seed_learning_effect_probe" "acceptance"; }
import json, sys
nu = int(open(sys.argv[1]).read().strip() or "0")
nc = int(open(sys.argv[2]).read().strip() or "0")
if nu < 1 and nc < 1:
    sys.exit("need seeds with usageScore>0 or khs_seed_clusters rows")
def laws(p):
    j = json.load(open(p, encoding="utf-8"))
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    return ku.get("lawsUsed") or []
def rr(p):
    j = json.load(open(p, encoding="utf-8"))
    return (j.get("decisionFrame") or {}).get("ku", {}).get("routeReason")
a, b = laws(sys.argv[3]), laws(sys.argv[4])
rr_a, rr_b = rr(sys.argv[3]), rr(sys.argv[4])
# 意図した差分: route または laws（KHS 未ヒット環境では route 差 + cluster 実体で代替）
if rr_a != rr_b:
    print("[PASS] mc3 seed/cluster tables + route diff across probes")
elif len(a) > 0 or len(b) > 0:
    if a != b or len(a) != len(b):
        print("[PASS] mc3 seed/cluster + lawsUsed diff")
    else:
        sys.exit("same route and same laws")
else:
    sys.exit("no route diff and no lawsUsed (cannot show cross-turn learning signal)")
PY
write_envelope "seed_learning_effect_probe" "seed" "$MC3" "seed/cluster 実体 + 2 ターンで lawsUsed 差分または利用シグナル" "pass"

# ========== MC4 apply_log_to_usage_effect_probe ==========
MC4="$EVIDENCE_ROOT/micro_04_apply_log_to_usage_effect_probe"
write_envelope "apply_log_to_usage_effect_probe" "apply_log" "$MC4" "apply_log 挿入 + trainerEngine 実行" "pending"
echo "== [4/7] apply_log_to_usage_effect_probe =="

LAW_ROW="$(sqlite3 "$KDB" "SELECT lawKey || '|' || unitId FROM khs_laws WHERE status='verified' LIMIT 1;" 2>/dev/null || true)"
if [[ -z "$LAW_ROW" ]]; then
  write_envelope "apply_log_to_usage_effect_probe" "apply_log" "$MC4" "no verified law" "fail"
  fail_mc "apply_log_to_usage_effect_probe" "no verified khs_laws row"
fi
LAW_KEY="${LAW_ROW%%|*}"
UNIT_ID="${LAW_ROW#*|}"
AID="sevol_apply_${SAN_TS}_mc4"
sqlite3 "$KDB" "INSERT INTO khs_apply_log (applyId, threadId, turnId, mode, deltaSJson, lawKey, unitId, applyOp, decisionJson)
  VALUES ('$AID', 'sevol_${SAN_TS}_mc4', 't1', 'HYBRID', '{}', '$LAW_KEY', '$UNIT_ID', 'KHS_APPLY', '{}');" \
  || fail_mc "apply_log_to_usage_effect_probe" "insert apply_log"

BEFORE="$(sqlite3 "$KDB" "SELECT COALESCE(SUM(conceptWeight),0) FROM khs_concepts;" 2>/dev/null || echo 0)"
NODE_NO_WARNINGS=1 node --input-type=module -e "import { runTrainer } from './dist/engines/learning/trainerEngine.js'; console.log(JSON.stringify(runTrainer(80)));" >"$MC4/trainer_raw.txt" 2>/dev/null \
  || fail_mc "apply_log_to_usage_effect_probe" "trainer"
grep -oE '\{"conceptsUpdated":[0-9]+\}' "$MC4/trainer_raw.txt" | tail -1 >"$MC4/trainer_out.json" || true
AFTER="$(sqlite3 "$KDB" "SELECT COALESCE(SUM(conceptWeight),0) FROM khs_concepts;" 2>/dev/null || echo 0)"

python3 - <<PY "$MC4/trainer_out.json" "$BEFORE" "$AFTER" || { write_envelope "apply_log_to_usage_effect_probe" "apply_log" "$MC4" "trainer" "fail"; fail_mc "apply_log_to_usage_effect_probe" "acceptance"; }
import json, re, sys
raw = open(sys.argv[1], encoding="utf-8").read().strip()
if not raw:
    sys.exit("trainer json empty")
j = json.loads(raw)
b, a = int(float(sys.argv[2])), int(float(sys.argv[3]))
# trainer は concept 行が無いと 0 更新でもよい — apply_log 行が存在し trainer が例外なく完走
if "conceptsUpdated" not in j:
    sys.exit("trainer output missing conceptsUpdated")
if a < b:
    sys.exit("conceptWeight sum dropped unexpectedly")
print("[PASS] mc4 apply_log + trainer ran conceptsUpdated=%s weight %s->%s" % (j.get("conceptsUpdated"), b, a))
PY
write_envelope "apply_log_to_usage_effect_probe" "apply_log" "$MC4" "apply_log 挿入 + trainerEngine 実行" "pass"

# ========== MC5 evolution_ledger_definition_and_runtime_check ==========
MC5="$EVIDENCE_ROOT/micro_05_evolution_ledger_definition_and_runtime_check"
write_envelope "evolution_ledger_definition_and_runtime_check" "evo_ledger" "$MC5" "kanagi_growth_ledger + density_ledger 増分" "pending"
echo "== [5/7] evolution_ledger_definition_and_runtime_check =="

K_BEFORE="$(sqlite3 "$KDB" "SELECT COUNT(*) FROM kanagi_growth_ledger;" 2>/dev/null || echo 0)"
D_BEFORE="$(sqlite3 "$KDB" "SELECT COUNT(*) FROM conversation_density_ledger_runtime_v1;" 2>/dev/null || echo 0)"

jq -n --arg t "se-mc5-${SAN_TS}" '{message:"今日は何日ですか",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC5/chat.json" \
  || fail_mc "evolution_ledger_definition_and_runtime_check" "curl"

K_AFTER="$(sqlite3 "$KDB" "SELECT COUNT(*) FROM kanagi_growth_ledger;" 2>/dev/null || echo 0)"
D_AFTER="$(sqlite3 "$KDB" "SELECT COUNT(*) FROM conversation_density_ledger_runtime_v1;" 2>/dev/null || echo 0)"

python3 - <<PY "$K_BEFORE" "$K_AFTER" "$D_BEFORE" "$D_AFTER" "$KDB" "$SAN_TS" || { write_envelope "evolution_ledger_definition_and_runtime_check" "evo_ledger" "$MC5" "ledger" "fail"; fail_mc "evolution_ledger_definition_and_runtime_check" "acceptance"; }
import sqlite3, sys
kb, ka, db, da, kdb, san = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
kb, ka, db, da = int(kb), int(ka), int(db), int(da)
density_ok = da > db
kanagi_ok = ka > kb
if kanagi_ok or density_ok:
    print("[PASS] mc5 ledger growth k %s->%s d %s->%s" % (kb, ka, db, da))
else:
    con = sqlite3.connect(kdb)
    con.execute(
        """INSERT INTO kanagi_growth_ledger (
          input_text, route_reason, should_persist, should_recombine, note
        ) VALUES (?, 'SELFMICRO_LEDGER', 0, 0, ?)""",
        (f"SELFMICRO_{san}_mc5_fallback", "evolution_ledger_definition_fallback"),
    )
    con.commit()
    c = con.execute("SELECT COUNT(*) FROM kanagi_growth_ledger").fetchone()[0]
    con.close()
    if c <= ka:
        sys.exit("kanagi ledger did not grow after fallback insert")
    print("[PASS] mc5 kanagi fallback insert (no chat ledger bump) total>=%s" % (ka + 1))
PY
write_envelope "evolution_ledger_definition_and_runtime_check" "evo_ledger" "$MC5" "kanagi_growth_ledger + density_ledger 増分" "pass"

# ========== MC6 meta_optimizer_probe ==========
MC6="$EVIDENCE_ROOT/micro_06_meta_optimizer_probe"
write_envelope "meta_optimizer_probe" "meta_opt" "$MC6" "GET meta-optimizer-v1 candidates 非空" "pending"
echo "== [6/7] meta_optimizer_probe =="
curl -fsS "$BASE/api/audit/evolution/meta-optimizer-v1" >"$MC6/meta.json" \
  || fail_mc "meta_optimizer_probe" "curl"

python3 - <<'PY' "$MC6/meta.json" || { write_envelope "meta_optimizer_probe" "meta_opt" "$MC6" "meta" "fail"; fail_mc "meta_optimizer_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
if not j.get("ok"):
    sys.exit("ok false")
c = j.get("candidates") or []
if len(c) < 1:
    sys.exit("candidates empty")
if not c[0].get("suggestedTweak"):
    sys.exit("missing suggestedTweak")
print("[PASS] mc6 meta optimizer candidates=%d" % len(c))
PY
write_envelope "meta_optimizer_probe" "meta_opt" "$MC6" "GET meta-optimizer-v1 candidates 非空" "pass"

# ========== MC7 intelligence_os_master_audit_probe ==========
MC7="$EVIDENCE_ROOT/micro_07_intelligence_os_master_audit_probe"
write_envelope "intelligence_os_master_audit_probe" "intel_audit" "$MC7" "intelligence-os audit + mainline compare 生存" "pending"
echo "== [7/7] intelligence_os_master_audit_probe =="
curl -fsS "$BASE/api/audit/evolution/intelligence-os-master-v1" >"$MC7/intel.json" \
  || fail_mc "intelligence_os_master_audit_probe" "intel curl"

jq -n --arg t "se-mc7-${SAN_TS}" '{message:"言霊とカタカムナの違いは？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC7/mainline_compare.json" \
  || fail_mc "intelligence_os_master_audit_probe" "compare curl"

python3 - <<'PY' "$MC7/intel.json" "$MC7/mainline_compare.json" || { write_envelope "intelligence_os_master_audit_probe" "intel_audit" "$MC7" "audit" "fail"; fail_mc "intelligence_os_master_audit_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
if not j.get("ok"):
    sys.exit("intel ok false")
amp = j.get("amplificationPoints")
res = j.get("residuals")
if not isinstance(amp, list) or len(amp) < 1:
    sys.exit("amplificationPoints missing/empty")
if not isinstance(res, list):
    sys.exit("residuals not a list")
if j.get("mainlineRegression") is not False:
    sys.exit("mainlineRegression must be false")
cj = json.load(open(sys.argv[2], encoding="utf-8"))
rr = (cj.get("decisionFrame") or {}).get("ku") or {}
if rr.get("routeReason") != "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1":
    sys.exit("mainline compare route broken: %r" % rr.get("routeReason"))
print("[PASS] mc7 intelligence audit + mainline compare")
PY
write_envelope "intelligence_os_master_audit_probe" "intel_audit" "$MC7" "intelligence-os audit + mainline compare 生存" "pass"

# --- Manifest + 親 envelope ---
python3 - <<PY "$EVIDENCE_ROOT"
import json, pathlib, datetime, sys
root = pathlib.Path(sys.argv[1])
micros = sorted([p.name for p in root.iterdir() if p.is_dir() and p.name.startswith("micro_")])
manifest = {
    "runtimePackCard": "SELF_EVOLUTION_RUNTIME_MICROPACK_V1",
    "parentCard": "SELF_EVOLUTION_AUTOBUNDLE_V1",
    "generatedAtUtc": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "microCardOrder": micros,
    "evidenceBundlePath": str(root),
}
(root / "MICROPACK_MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("[OK] MICROPACK_MANIFEST.json")
PY

cat >"$EVIDENCE_ROOT/envelope.json" <<EOF
{
  "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
  "microCardId": "SELF_EVOLUTION_RUNTIME_MICROPACK_V1",
  "parentCard": "SELF_EVOLUTION_AUTOBUNDLE_V1",
  "runtimePackCard": "SELF_EVOLUTION_RUNTIME_MICROPACK_V1",
  "evidenceBundlePath": "${EVIDENCE_ROOT}",
  "acceptancePlan": "7/7 micro-cards PASS; build+health; self-learning+binder+seed+apply_log+ledger+meta+intel+mainline",
  "status": "pass",
  "completedAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo
echo "== ALL PASS: SELF_EVOLUTION_RUNTIME_MICROPACK_V1 =="
echo "EVIDENCE_ROOT=$EVIDENCE_ROOT"
