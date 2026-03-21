#!/usr/bin/env bash
# MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1
# MEMORY_AND_PERSONA_AUTOBUNDLE_V1 の 7 micro-card を固定順で実行し evidenceBundlePath を残す。
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/memory_persona_runtime_micropack_v1.sh [EVIDENCE_ROOT]
#
# 環境変数:
#   TENMON_DATA_DIR — kokuzo.sqlite / persona.sqlite（既定 /opt/tenmon-ark-data）
#   SKIP_MC7_DB_SETUP=1 — MC7 の auth_sessions 一時 INSERT をスキップ（既存セッション手動時）
#
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SAN_TS="$(echo "$TS" | tr -c 'A-Za-z0-9' '_')"
EVIDENCE_ROOT="${1:-/tmp/memory_persona_runtime_micropack_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
MASTER_LOG="$EVIDENCE_ROOT/MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1.log"
exec > >(tee -a "$MASTER_LOG") 2>&1

export BASE
KDATA="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KDB="${KDATA}/kokuzo.sqlite"
PDB="${KDATA}/persona.sqlite"

echo "== MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1 =="
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
  # shellcheck disable=SC2089
  local acc_esc="${acceptance//\"/\\\"}"
  cat >"$dir/envelope.json" <<EOF
{
  "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
  "microCardId": "${id}",
  "microCardSlug": "${slug}",
  "parentCard": "MEMORY_AND_PERSONA_AUTOBUNDLE_V1",
  "runtimePackCard": "MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1",
  "evidenceBundlePath": "${dir}",
  "acceptancePlan": "${acc_esc}",
  "rollbackPlan": "SELF_BUILD_RESTORE_POLICY_V1: remove test auth_sessions / profile rows for this SAN_TS; git restore if code changed.",
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

echo "== 0) build =="
npm run build || fail_mc "pre_build" "npm run build"

echo
echo "== 0b) health =="
mkdir -p "$EVIDENCE_ROOT/_precheck"
health_check "$EVIDENCE_ROOT/_precheck" || fail_mc "pre_health" "health"

if [[ ! -f "$KDB" ]] || [[ ! -f "$PDB" ]]; then
  fail_mc "pre_db" "kokuzo or persona sqlite missing under $KDATA"
fi

# --- テスト用 auth_sessions（MC3–7）。userId はメール形式に寄せず固有 ID。
SESS_MAIN="mpack_sess_main_${SAN_TS}"
SESS_ISO_A="mpack_sess_iso_a_${SAN_TS}"
SESS_ISO_B="mpack_sess_iso_b_${SAN_TS}"
UID_MAIN="mpack_uid_main_${SAN_TS}"
UID_ISO_A="mpack_uid_iso_a_${SAN_TS}"
UID_ISO_B="mpack_uid_iso_b_${SAN_TS}"
EXP="2099-12-31T23:59:59.000Z"

if [[ "${SKIP_MC7_DB_SETUP:-}" != "1" ]]; then
  sqlite3 "$KDB" "DELETE FROM auth_sessions WHERE sessionId IN ('$SESS_MAIN','$SESS_ISO_A','$SESS_ISO_B');" 2>/dev/null || true
  sqlite3 "$KDB" "INSERT INTO auth_sessions (sessionId, userId, expiresAt, createdAt) VALUES ('$SESS_MAIN','$UID_MAIN','$EXP',datetime('now'));" \
    || fail_mc "db_sess" "insert session main"
  sqlite3 "$KDB" "INSERT INTO auth_sessions (sessionId, userId, expiresAt, createdAt) VALUES ('$SESS_ISO_A','$UID_ISO_A','$EXP',datetime('now'));" \
    || fail_mc "db_sess" "insert session iso a"
  sqlite3 "$KDB" "INSERT INTO auth_sessions (sessionId, userId, expiresAt, createdAt) VALUES ('$SESS_ISO_B','$UID_ISO_B','$EXP',datetime('now'));" \
    || fail_mc "db_sess" "insert session iso b"
fi

CHAT_LOCAL_HDR=(-H "x-tenmon-local-test: 1" -H "x-tenmon-local-user: mpack_chat_${SAN_TS}@micropack.local")

# ========== MC1 user_naming_runtime_bind ==========
MC1="$EVIDENCE_ROOT/micro_01_user_naming_runtime_bind"
write_envelope "user_naming_runtime_bind" "naming" "$MC1" "命名3ターン: ku.naming SAVED + persona.user_naming 行" "pending"
echo "== [1/7] user_naming_runtime_bind =="
health_check "$MC1" || { write_envelope "user_naming_runtime_bind" "naming" "$MC1" "health" "fail"; fail_mc "user_naming_runtime_bind" "health"; }

CHAT_UID="mpack_chat_${SAN_TS}@micropack.local"
sqlite3 "$PDB" "DELETE FROM naming_flow WHERE userId='$CHAT_UID'; DELETE FROM user_naming WHERE userId='$CHAT_UID';" 2>/dev/null || true

TID1="mpack-nm-${SAN_TS}-1"
jq -n --arg t "$TID1" '{message:"hello",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC1/step1.json" || fail_mc "user_naming_runtime_bind" "step1 curl"
jq -n --arg m "試験ユーザー${SAN_TS}" --arg t "$TID1" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC1/step2.json" || fail_mc "user_naming_runtime_bind" "step2 curl"
jq -n --arg m "試験アシスタント" --arg t "$TID1" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC1/step3.json" || fail_mc "user_naming_runtime_bind" "step3 curl"

python3 - <<PY "$MC1/step3.json" "$PDB" "$CHAT_UID" || { write_envelope "user_naming_runtime_bind" "naming" "$MC1" "naming bind" "fail"; fail_mc "user_naming_runtime_bind" "naming bind acceptance"; }
import json, sqlite3, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
pdb, uid = sys.argv[2], sys.argv[3]
ku = (j.get("decisionFrame") or {}).get("ku") or {}
nm = ku.get("naming") or {}
if nm.get("step") != "SAVED":
    sys.exit("step3 expected NAMING_SAVED ku.naming, got %r" % nm)
con = sqlite3.connect(pdb)
row = con.execute(
    "SELECT userName, assistantName FROM user_naming WHERE userId=? LIMIT 1", (uid,)
).fetchone()
if not row or not row[0] or not row[1]:
    sys.exit("user_naming row missing for %r" % uid)
if "試験" not in str(row[0]):
    sys.exit("unexpected userName in DB %r" % (row,))
print("[PASS] naming saved: DB userName=%s assistantName=%s" % (row[0], row[1]))
PY
write_envelope "user_naming_runtime_bind" "naming" "$MC1" "命名3ターン: ku.naming SAVED + persona.user_naming 行" "pass"

# ========== MC2 persona_core_runtime_bind ==========
MC2="$EVIDENCE_ROOT/micro_02_persona_core_runtime_bind"
write_envelope "persona_core_runtime_bind" "persona" "$MC2" "personaConstitutionSummary + TENMON_CORE_V1" "pending"
echo "== [2/7] persona_core_runtime_bind =="
health_check "$MC2" || { write_envelope "persona_core_runtime_bind" "persona" "$MC2" "health" "fail"; fail_mc "persona_core_runtime_bind" "health"; }
jq -n --arg t "mpack-pc-${SAN_TS}" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC2/structure.json" || fail_mc "persona_core_runtime_bind" "curl"

python3 - <<'PY' "$MC2/structure.json" || { write_envelope "persona_core_runtime_bind" "persona" "$MC2" "persona core" "fail"; fail_mc "persona_core_runtime_bind" "persona acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
pcs = ku.get("personaConstitutionSummary")
if not pcs or not isinstance(pcs, dict):
    sys.exit("missing personaConstitutionSummary")
if pcs.get("constitutionKey") != "TENMON_CORE_V1":
    sys.exit("constitutionKey want TENMON_CORE_V1 got %r" % pcs.get("constitutionKey"))
ic = pcs.get("identityCore")
if not isinstance(ic, list) or len(ic) < 1:
    sys.exit("identityCore missing or empty")
print("[PASS] persona core bind")
PY
write_envelope "persona_core_runtime_bind" "persona" "$MC2" "personaConstitutionSummary + TENMON_CORE_V1" "pass"

# ========== MC3 inheritance_prompt_structured_runtime_bind ==========
MC3="$EVIDENCE_ROOT/micro_03_inheritance_prompt_structured_runtime_bind"
write_envelope "inheritance_prompt_structured_runtime_bind" "inherit_struct" "$MC3" "save API structured + runtime_chat_injection false" "pending"
echo "== [3/7] inheritance_prompt_structured_runtime_bind =="

RAW_INHERITANCE="## 人格
あなたはマイクロパック検証用の補助人格です。

## メモリ
- MICROPACK_INHERIT_MARKER_${SAN_TS}_ALPHA
- ユーザーは試験コンテキストのみ

## 禁止
generic spiritual への漂流

## 出力形式
短く、質問は1つ。"

jq -n --arg raw "$RAW_INHERITANCE" '{inheritance_prompt_raw:$raw,source:"MEMORY_PERSONA_RUNTIME_MICROPACK_V1"}' \
  | curl -fsS -b "auth_session=$SESS_MAIN" -H "Content-Type: application/json" -d @- \
    "$BASE/api/memory/custom-gpt-import/v1/save" >"$MC3/save.json" || { write_envelope "inheritance_prompt_structured_runtime_bind" "inherit_struct" "$MC3" "save" "fail"; fail_mc "inheritance_prompt_structured_runtime_bind" "save curl"; }

python3 - <<PY "$MC3/save.json" "$SAN_TS" || { write_envelope "inheritance_prompt_structured_runtime_bind" "inherit_struct" "$MC3" "structured" "fail"; fail_mc "inheritance_prompt_structured_runtime_bind" "structured acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
san = sys.argv[2]
if not j.get("ok"):
    sys.exit("save not ok: %r" % j)
st = j.get("inheritance_structured")
if not isinstance(st, dict):
    sys.exit("missing inheritance_structured")
if st.get("renderer_version") != "MEMORY_INHERITANCE_RENDERER_V1":
    sys.exit("bad renderer_version")
note = str(j.get("note") or "")
if "Not applied" not in note or "/api/chat" not in note:
    sys.exit("expected save note about no chat injection, got %r" % note[:200])
marker = "MICROPACK_INHERIT_MARKER_%s_ALPHA" % san
facts = st.get("inherited_memory_facts") or []
if marker not in " | ".join(str(x) for x in facts):
    if marker not in json.dumps(facts, ensure_ascii=False):
        sys.exit("marker not in inherited_memory_facts %r" % facts)
print("[PASS] structured save + non-injection note")
PY
write_envelope "inheritance_prompt_structured_runtime_bind" "inherit_struct" "$MC3" "save API structured + runtime_chat_injection false" "pass"

# ========== MC4 inherited_memory_fact_runtime_bind ==========
MC4="$EVIDENCE_ROOT/micro_04_inherited_memory_fact_runtime_bind"
write_envelope "inherited_memory_fact_runtime_bind" "inherit_facts" "$MC4" "GET status facts non-empty" "pending"
echo "== [4/7] inherited_memory_fact_runtime_bind =="
curl -fsS -b "auth_session=$SESS_MAIN" "$BASE/api/memory/custom-gpt-import/v1/status" >"$MC4/status.json" || { write_envelope "inherited_memory_fact_runtime_bind" "inherit_facts" "$MC4" "status" "fail"; fail_mc "inherited_memory_fact_runtime_bind" "status curl"; }

python3 - <<PY "$MC4/status.json" "$SAN_TS" || { write_envelope "inherited_memory_fact_runtime_bind" "inherit_facts" "$MC4" "facts" "fail"; fail_mc "inherited_memory_fact_runtime_bind" "facts acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
san = sys.argv[2]
if not j.get("ok") or not j.get("saved"):
    sys.exit("expected saved profile: %r" % j)
st = j.get("inheritance_structured")
if not isinstance(st, dict):
    sys.exit("missing inheritance_structured in status")
facts = st.get("inherited_memory_facts") or []
if len(facts) < 1:
    sys.exit("inherited_memory_facts empty")
marker = "MICROPACK_INHERIT_MARKER_%s_ALPHA" % san
blob = json.dumps(facts, ensure_ascii=False)
if marker not in blob:
    sys.exit("marker not in facts")
rci = j.get("runtime_chat_injection")
if rci is True:
    sys.exit("runtime_chat_injection must not be true")
print("[PASS] inherited_memory_facts visible (runtime_chat_injection=%r)" % rci)
PY
write_envelope "inherited_memory_fact_runtime_bind" "inherit_facts" "$MC4" "GET status facts non-empty" "pass"

# ========== MC5 memory_consistency_runtime_audit ==========
MC5="$EVIDENCE_ROOT/micro_05_memory_consistency_runtime_audit"
write_envelope "memory_consistency_runtime_audit" "consistency" "$MC5" "persona user_shared_profile_slice JSON 妥当" "pending"
echo "== [5/7] memory_consistency_runtime_audit =="
sqlite3 "$PDB" "SELECT COUNT(*) FROM user_shared_profile_slice;" >"$MC5/slice_count.txt" || { write_envelope "memory_consistency_runtime_audit" "consistency" "$MC5" "sqlite" "fail"; fail_mc "memory_consistency_runtime_audit" "sqlite list"; }

python3 - <<'PY' "$PDB" || { write_envelope "memory_consistency_runtime_audit" "consistency" "$MC5" "parse" "fail"; fail_mc "memory_consistency_runtime_audit" "consistency audit"; }
import json, sqlite3, sys
pdb = sys.argv[1]
con = sqlite3.connect(pdb)
cur = con.execute("SELECT userId, sliceKey, payloadJson FROM user_shared_profile_slice")
rows = cur.fetchall()
for user_id, sk, pj in rows:
    if not user_id or not str(user_id).strip():
        sys.exit("empty userId row")
    try:
        obj = json.loads(pj)
    except Exception as e:
        sys.exit("invalid JSON userId=%s slice=%s: %s" % (user_id, sk, e))
    if sk == "inheritance" and isinstance(obj, dict):
        if "inheritance_structured" not in obj and "inheritance_prompt_raw" not in obj:
            sys.exit("inheritance slice missing expected keys")
print("[PASS] slice JSON audit rows=%d" % len(rows))
PY
write_envelope "memory_consistency_runtime_audit" "consistency" "$MC5" "persona user_shared_profile_slice JSON 妥当" "pass"

# ========== MC6 longitudinal_persona_stability_probe ==========
MC6="$EVIDENCE_ROOT/micro_06_longitudinal_persona_stability_probe"
write_envelope "longitudinal_persona_stability_probe" "longitudinal" "$MC6" "2 thread identityCore 一致" "pending"
echo "== [6/7] longitudinal_persona_stability_probe =="
for i in 1 2; do
  jq -n --arg t "mpack-long-${SAN_TS}-$i" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
    | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC6/thread_${i}.json" || { write_envelope "longitudinal_persona_stability_probe" "longitudinal" "$MC6" "curl" "fail"; fail_mc "longitudinal_persona_stability_probe" "curl $i"; }
done

python3 - <<'PY' "$MC6" || { write_envelope "longitudinal_persona_stability_probe" "longitudinal" "$MC6" "identityCore" "fail"; fail_mc "longitudinal_persona_stability_probe" "stability"; }
import json, pathlib, sys
d = pathlib.Path(sys.argv[1])
def load_core(i):
    j = json.loads((d / ("thread_%s.json" % i)).read_text(encoding="utf-8"))
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    pcs = ku.get("personaConstitutionSummary") or {}
    return json.dumps(pcs.get("identityCore"), sort_keys=True, ensure_ascii=False)
a = load_core(1)
b = load_core(2)
if a != b:
    sys.exit("identityCore mismatch:\n%s\nvs\n%s" % (a[:400], b[:400]))
print("[PASS] longitudinal persona stability (identityCore match)")
PY
write_envelope "longitudinal_persona_stability_probe" "longitudinal" "$MC6" "2 thread identityCore 一致" "pass"

# ========== MC7 sync_isolation_non_interference_check ==========
MC7="$EVIDENCE_ROOT/micro_07_sync_isolation_non_interference_check"
write_envelope "sync_isolation_non_interference_check" "isolation" "$MC7" "FORBIDDEN_KEY + A/B 非混線" "pending"
echo "== [7/7] sync_isolation_non_interference_check =="

# 7a FORBIDDEN_KEY
jq -n '{crossUserImport:true,deviceId:"dev1"}' \
  | curl -sS -o "$MC7/forbidden_resp.json" -w "%{http_code}" -b "auth_session=$SESS_MAIN" -H "Content-Type: application/json" -d @- \
    "$BASE/api/memory/user-device-sync/v1/push" >"$MC7/forbidden.code"
FC="$(cat "$MC7/forbidden.code")"
if [[ "$FC" != "400" ]]; then
  write_envelope "sync_isolation_non_interference_check" "isolation" "$MC7" "forbidden" "fail"
  fail_mc "sync_isolation_non_interference_check" "expected 400 FORBIDDEN_KEY got $FC"
fi
echo "[PASS] FORBIDDEN_KEY crossUserImport"

# 7b User B save BETA (no overlap with A)
RAW_B="## メモリ
- MICROPACK_ISO_MARKER_${SAN_TS}_BETA
"
jq -n --arg raw "$RAW_B" '{inheritance_prompt_raw:$raw,source:"iso_b"}' \
  | curl -fsS -b "auth_session=$SESS_ISO_B" -H "Content-Type: application/json" -d @- \
    "$BASE/api/memory/custom-gpt-import/v1/save" >"$MC7/save_b.json" || { write_envelope "sync_isolation_non_interference_check" "isolation" "$MC7" "save_b" "fail"; fail_mc "sync_isolation_non_interference_check" "save_b"; }

# 7c Main user status must not contain BETA
curl -fsS -b "auth_session=$SESS_MAIN" "$BASE/api/memory/custom-gpt-import/v1/status" >"$MC7/status_main_after_b.json" || fail_mc "sync_isolation_non_interference_check" "status_main"
MARK_B="MICROPACK_ISO_MARKER_${SAN_TS}_BETA"
if grep -q "$MARK_B" "$MC7/status_main_after_b.json" 2>/dev/null; then
  write_envelope "sync_isolation_non_interference_check" "isolation" "$MC7" "leak B into main" "fail"
  fail_mc "sync_isolation_non_interference_check" "user B data leaked into main user status"
fi

# 7d User B status must not contain ALPHA from main
MARK_A="MICROPACK_INHERIT_MARKER_${SAN_TS}_ALPHA"
curl -fsS -b "auth_session=$SESS_ISO_B" "$BASE/api/memory/custom-gpt-import/v1/status" >"$MC7/status_b.json" || fail_mc "sync_isolation_non_interference_check" "status_b"
if grep -q "$MARK_A" "$MC7/status_b.json" 2>/dev/null; then
  write_envelope "sync_isolation_non_interference_check" "isolation" "$MC7" "leak A into B" "fail"
  fail_mc "sync_isolation_non_interference_check" "user main data leaked into B"
fi
if ! grep -q "$MARK_B" "$MC7/status_b.json" 2>/dev/null; then
  fail_mc "sync_isolation_non_interference_check" "B marker missing in B status"
fi

echo "[PASS] isolation non-interference"

# cleanup test slices for iso users (main left: may keep for audit; optional delete iso test users only)
sqlite3 "$PDB" "DELETE FROM user_shared_profile_slice WHERE userId IN ('$UID_ISO_B','$UID_ISO_A');" 2>/dev/null || true

write_envelope "sync_isolation_non_interference_check" "isolation" "$MC7" "FORBIDDEN_KEY + A/B 非混線" "pass"

cat >"$EVIDENCE_ROOT/MICROPACK_MANIFEST.json" <<EOF
{
  "runtimePackCard": "MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1",
  "parentCard": "MEMORY_AND_PERSONA_AUTOBUNDLE_V1",
  "completedAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "baseUrl": "${BASE}",
  "evidenceRoot": "${EVIDENCE_ROOT}",
  "testSessions": ["$SESS_MAIN", "$SESS_ISO_A", "$SESS_ISO_B"],
  "microCards": [
    "micro_01_user_naming_runtime_bind",
    "micro_02_persona_core_runtime_bind",
    "micro_03_inheritance_prompt_structured_runtime_bind",
    "micro_04_inherited_memory_fact_runtime_bind",
    "micro_05_memory_consistency_runtime_audit",
    "micro_06_longitudinal_persona_stability_probe",
    "micro_07_sync_isolation_non_interference_check"
  ],
  "status": "pass"
}
EOF

echo
echo "== MEMORY_AND_PERSONA_RUNTIME_MICROPACK_V1 PASS =="
echo "master log: $MASTER_LOG"
echo "evidence: $EVIDENCE_ROOT"
echo "Note: auth_sessions $SESS_MAIN / $SESS_ISO_A / $SESS_ISO_B left in kokuzo (delete when done)."
