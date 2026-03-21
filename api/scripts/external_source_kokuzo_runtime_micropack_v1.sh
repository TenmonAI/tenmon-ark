#!/usr/bin/env bash
# EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1
# EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1 の 12 micro-card を固定順で実行し evidenceBundlePath / envelope を残す。
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/external_source_kokuzo_runtime_micropack_v1.sh [EVIDENCE_ROOT]
#
# 環境変数:
#   TENMON_DATA_DIR — kokuzo.sqlite（既定 /opt/tenmon-ark-data）
#
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
SAN_TS="$(echo "$TS" | tr -c 'A-Za-z0-9' '_')"
EVIDENCE_ROOT="${1:-/tmp/external_source_kokuzo_runtime_micropack_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
MASTER_LOG="$EVIDENCE_ROOT/EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1.log"
exec > >(tee -a "$MASTER_LOG") 2>&1

export BASE
KDATA="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KDB="${KDATA}/kokuzo.sqlite"

POLICY_MD="$ROOT/docs/constitution/EXTERNAL_SOURCE_PRIORITY_AND_ISOLATION_POLICY_V1.md"
CONNECTOR_MD="$ROOT/docs/constitution/EXTERNAL_CONNECTOR_SCOPE_DECLARATIONS_V1.md"
KOKUZO_SCHEMA_MD="$ROOT/docs/khs/KOKUZO_SEED_MIN_SCHEMA_v1.md"

echo "== EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1 =="
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
  "parentCard": "EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1",
  "runtimePackCard": "EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1",
  "evidenceBundlePath": "${dir}",
  "acceptancePlan": "${acc_esc}",
  "rollbackPlan": "SELF_BUILD_RESTORE_POLICY_V1: 証跡のみの場合はフォルダ削除; DB 変更なし（本スクリプト既定）。",
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

CHAT_LOCAL_HDR=(-H "x-tenmon-local-test: 1" -H "x-tenmon-local-user: eskok_${SAN_TS}@micropack.local")

echo "== 0) build =="
npm run build || fail_mc "pre_build" "npm run build"

echo
echo "== 0b) health =="
mkdir -p "$EVIDENCE_ROOT/_precheck"
health_check "$EVIDENCE_ROOT/_precheck" || fail_mc "pre_health" "health"

if [[ ! -f "$KDB" ]]; then
  fail_mc "pre_db" "kokuzo sqlite missing under $KDATA"
fi

# ローカルテストユーザー: 命名3ターンで NAMING_STEP を消費（以降の thread は通常ルートへ）
BOOT_TID="eskok_boot_${SAN_TS}"
echo "== 0c) bootstrap naming (x-tenmon-local-user) =="
mkdir -p "$EVIDENCE_ROOT/_bootstrap"
jq -n --arg t "$BOOT_TID" '{message:"hello",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/_bootstrap/n1.json" || fail_mc "bootstrap" "n1 curl"
jq -n --arg t "$BOOT_TID" --arg m "マイクロ検証ユーザー${SAN_TS}" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/_bootstrap/n2.json" || fail_mc "bootstrap" "n2 curl"
jq -n --arg t "$BOOT_TID" --arg m "マイクロ検証アシスタント" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$EVIDENCE_ROOT/_bootstrap/n3.json" || fail_mc "bootstrap" "n3 curl"

# ========== MC1 external_source_priority_policy_bind ==========
MC1="$EVIDENCE_ROOT/micro_01_external_source_priority_policy_bind"
write_envelope "external_source_priority_policy_bind" "policy" "$MC1" "policy md に priority / isolation / quarantine 語" "pending"
echo "== [1/12] external_source_priority_policy_bind =="
health_check "$MC1" || { write_envelope "external_source_priority_policy_bind" "policy" "$MC1" "health" "fail"; fail_mc "external_source_priority_policy_bind" "health"; }

python3 - <<PY "$POLICY_MD" || { write_envelope "external_source_priority_policy_bind" "policy" "$MC1" "policy keywords" "fail"; fail_mc "external_source_priority_policy_bind" "policy acceptance"; }
import pathlib, sys
p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
need = ["quarantine", "exclude", "BAD", "generic drift", "汚染", "cross-user", "cross-source", "USER_SCOPE_REQUIRED", "隔離", "優先"]
missing = [k for k in need if k.lower() not in t.lower() and k not in t]
if missing:
    sys.exit("missing keywords: %s" % missing)
print("[PASS] policy md keywords")
PY
write_envelope "external_source_priority_policy_bind" "policy" "$MC1" "policy md に priority / isolation / quarantine 語" "pass"

# ========== MC2 notion_source_panel_runtime_check ==========
MC2="$EVIDENCE_ROOT/micro_02_notion_source_panel_runtime_check"
write_envelope "notion_source_panel_runtime_check" "notion" "$MC2" "chat で notionCanon / notion 系メタ（user scope 宣言と整合）" "pending"
echo "== [2/12] notion_source_panel_runtime_check =="
health_check "$MC2" || { write_envelope "notion_source_panel_runtime_check" "notion" "$MC2" "health" "fail"; fail_mc "notion_source_panel_runtime_check" "health"; }

python3 - <<PY "$CONNECTOR_MD" "NOTION_MEMORY_SOURCE_PANEL_V1" "USER_SCOPE_REQUIRED" "CROSS_USER_FORBIDDEN" "BAD_SOURCE_QUARANTINE" \
  || { write_envelope "notion_source_panel_runtime_check" "notion" "$MC2" "notion declaration" "fail"; fail_mc "notion_source_panel_runtime_check" "declaration"; }
import pathlib, sys
path, title = sys.argv[1], sys.argv[2]
keys = sys.argv[3:]
text = pathlib.Path(path).read_text(encoding="utf-8")
i = text.find("## " + title)
if i < 0:
    sys.exit("section not found: %s" % title)
j = text.find("\n## ", i + 3)
block = text[i:j] if j >= 0 else text[i:]
for k in keys:
    if k not in block:
        sys.exit("missing %s in %s" % (k, title))
print("[PASS] notion panel declaration section")
PY

jq -n --arg t "es-mc2-${SAN_TS}" '{message:"カタカムナとは何ですか",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC2/chat.json" \
  || fail_mc "notion_source_panel_runtime_check" "curl"

python3 - <<'PY' "$MC2/chat.json" || { write_envelope "notion_source_panel_runtime_check" "notion" "$MC2" "notion meta" "fail"; fail_mc "notion_source_panel_runtime_check" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
nc = ku.get("notionCanon")
syn = (ku.get("synapseTop") or {})
nh = syn.get("notionHint") if isinstance(syn, dict) else None
if nc is None and not (isinstance(nh, str) and "notion" in nh.lower()):
    sys.exit("expected notionCanon or synapseTop.notionHint")
rr = ku.get("routeReason") or ""
if "KATAKAMUNA" not in rr and "CANON" not in rr:
    sys.exit("unexpected routeReason %r" % rr)
print("[PASS] notion bridge meta present")
PY
write_envelope "notion_source_panel_runtime_check" "notion" "$MC2" "chat で notionCanon / notion 系メタ（user scope 宣言と整合）" "pass"

# ========== MC3 gdocs_local_connector_scope_check ==========
MC3="$EVIDENCE_ROOT/micro_03_gdocs_local_connector_scope_check"
write_envelope "gdocs_local_connector_scope_check" "gdocs" "$MC3" "GOOGLE_DOCS 宣言セクション" "pending"
echo "== [3/12] gdocs_local_connector_scope_check =="
python3 - <<PY "$CONNECTOR_MD" "GOOGLE_DOCS_LOCAL_CONNECTOR_V1" "USER_SCOPE_REQUIRED" "CROSS_SOURCE_FORBIDDEN" "BAD_SOURCE_QUARANTINE" \
  || { write_envelope "gdocs_local_connector_scope_check" "gdocs" "$MC3" "section" "fail"; fail_mc "gdocs_local_connector_scope_check" "acceptance"; }
import pathlib, sys
path, title = sys.argv[1], sys.argv[2]
keys = sys.argv[3:]
text = pathlib.Path(path).read_text(encoding="utf-8")
i = text.find("## " + title)
if i < 0:
    sys.exit("section not found: %s" % title)
j = text.find("\n## ", i + 3)
block = text[i:j] if j >= 0 else text[i:]
for k in keys:
    if k not in block:
        sys.exit("missing %s in %s" % (k, title))
print("[PASS] gdocs scope declaration")
PY
write_envelope "gdocs_local_connector_scope_check" "gdocs" "$MC3" "GOOGLE_DOCS 宣言セクション" "pass"

# ========== MC4 dropbox_local_connector_scope_check ==========
MC4="$EVIDENCE_ROOT/micro_04_dropbox_local_connector_scope_check"
write_envelope "dropbox_local_connector_scope_check" "dropbox" "$MC4" "DROPBOX 宣言セクション" "pending"
echo "== [4/12] dropbox_local_connector_scope_check =="
python3 - <<PY "$CONNECTOR_MD" "DROPBOX_LOCAL_CONNECTOR_V1" "USER_SCOPE_REQUIRED" "CROSS_USER_FORBIDDEN" "BAD_SOURCE_QUARANTINE" \
  || { write_envelope "dropbox_local_connector_scope_check" "dropbox" "$MC4" "section" "fail"; fail_mc "dropbox_local_connector_scope_check" "acceptance"; }
import pathlib, sys
path, title = sys.argv[1], sys.argv[2]
keys = sys.argv[3:]
text = pathlib.Path(path).read_text(encoding="utf-8")
i = text.find("## " + title)
if i < 0:
    sys.exit("section not found: %s" % title)
j = text.find("\n## ", i + 3)
block = text[i:j] if j >= 0 else text[i:]
for k in keys:
    if k not in block:
        sys.exit("missing %s in %s" % (k, title))
print("[PASS] dropbox scope declaration")
PY
write_envelope "dropbox_local_connector_scope_check" "dropbox" "$MC4" "DROPBOX 宣言セクション" "pass"

# ========== MC5 icloud_local_bridge_scope_check ==========
MC5="$EVIDENCE_ROOT/micro_05_icloud_local_bridge_scope_check"
write_envelope "icloud_local_bridge_scope_check" "icloud" "$MC5" "ICLOUD 宣言セクション" "pending"
echo "== [5/12] icloud_local_bridge_scope_check =="
python3 - <<PY "$CONNECTOR_MD" "ICLOUD_LOCAL_FOLDER_BRIDGE_V1" "USER_SCOPE_REQUIRED" "LOCAL_ONLY_PATH" "BAD_SOURCE_QUARANTINE" \
  || { write_envelope "icloud_local_bridge_scope_check" "icloud" "$MC5" "section" "fail"; fail_mc "icloud_local_bridge_scope_check" "acceptance"; }
import pathlib, sys
path, title = sys.argv[1], sys.argv[2]
keys = sys.argv[3:]
text = pathlib.Path(path).read_text(encoding="utf-8")
i = text.find("## " + title)
if i < 0:
    sys.exit("section not found: %s" % title)
j = text.find("\n## ", i + 3)
block = text[i:j] if j >= 0 else text[i:]
for k in keys:
    if k not in block:
        sys.exit("missing %s in %s" % (k, title))
print("[PASS] icloud scope declaration")
PY
write_envelope "icloud_local_bridge_scope_check" "icloud" "$MC5" "ICLOUD 宣言セクション" "pass"

# ========== MC6 notebooklm_source_scope_check ==========
MC6="$EVIDENCE_ROOT/micro_06_notebooklm_source_scope_check"
write_envelope "notebooklm_source_scope_check" "notebooklm" "$MC6" "NOTEBOOKLM GENERIC_DRIFT_EXCLUDE" "pending"
echo "== [6/12] notebooklm_source_scope_check =="
python3 - <<PY "$CONNECTOR_MD" "NOTEBOOKLM_SOURCE_IMPORT_SCOPE_V1" "GENERIC_DRIFT_EXCLUDE" "QUARANTINE_UNVERIFIED" \
  || { write_envelope "notebooklm_source_scope_check" "notebooklm" "$MC6" "section" "fail"; fail_mc "notebooklm_source_scope_check" "acceptance"; }
import pathlib, sys
path, title = sys.argv[1], sys.argv[2]
keys = sys.argv[3:]
text = pathlib.Path(path).read_text(encoding="utf-8")
i = text.find("## " + title)
if i < 0:
    sys.exit("section not found: %s" % title)
j = text.find("\n## ", i + 3)
block = text[i:j] if j >= 0 else text[i:]
for k in keys:
    if k not in block:
        sys.exit("missing %s in %s" % (k, title))
print("[PASS] notebooklm scope declaration")
PY
write_envelope "notebooklm_source_scope_check" "notebooklm" "$MC6" "NOTEBOOKLM GENERIC_DRIFT_EXCLUDE" "pass"

# ========== MC7 external_knowledge_binder_probe ==========
MC7="$EVIDENCE_ROOT/micro_07_external_knowledge_binder_probe"
write_envelope "external_knowledge_binder_probe" "binder" "$MC7" "binderSummary（sourcePack/notion）+ 応答に KHSL:LAW: 生露出なし" "pending"
echo "== [7/12] external_knowledge_binder_probe =="
health_check "$MC7" || { write_envelope "external_knowledge_binder_probe" "binder" "$MC7" "health" "fail"; fail_mc "external_knowledge_binder_probe" "health"; }

jq -n --arg t "es-mc7-${SAN_TS}" '{message:"カタカムナの本質は何ですか",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC7/binder_katakamuna.json" \
  || fail_mc "external_knowledge_binder_probe" "curl"

python3 - <<'PY' "$MC7/binder_katakamuna.json" || { write_envelope "external_knowledge_binder_probe" "binder" "$MC7" "binder" "fail"; fail_mc "external_knowledge_binder_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
resp = j.get("response") or ""
rr = ku.get("routeReason") or ""
if rr != "KATAKAMUNA_CANON_ROUTE_V1":
    sys.exit("want KATAKAMUNA_CANON_ROUTE_V1, got %r" % rr)
bs = ku.get("binderSummary") or {}
if bs.get("sourcePack") != "scripture":
    sys.exit("binderSummary.sourcePack want scripture, got %r" % bs.get("sourcePack"))
if not bs.get("hasNotionCanon"):
    sys.exit("expected binderSummary.hasNotionCanon")
if "KHSL:LAW:" in resp:
    sys.exit("KHSL:LAW leaked into user-visible response")
pcs = ku.get("personaConstitutionSummary")
if pcs and isinstance(pcs, dict) and pcs.get("constitutionKey") and pcs.get("constitutionKey") != "TENMON_CORE_V1":
    sys.exit("persona constitution drift %r" % pcs.get("constitutionKey"))
print("[PASS] external binder (katakamuna+notion) + no KHSL leak in response")
PY
write_envelope "external_knowledge_binder_probe" "binder" "$MC7" "binderSummary（sourcePack/notion）+ 応答に KHSL:LAW: 生露出なし" "pass"

# ========== MC8 kotodama_rule_index_runtime_probe ==========
MC8="$EVIDENCE_ROOT/micro_08_kotodama_rule_index_runtime_probe"
write_envelope "kotodama_rule_index_runtime_probe" "kotodama_idx" "$MC8" "言霊一音経路 + lawIndexHit または KOTODAMA 系 route" "pending"
echo "== [8/12] kotodama_rule_index_runtime_probe =="
jq -n --arg t "es-mc8-${SAN_TS}" '{message:"ヒの言霊の意味は？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC8/kotodama.json" \
  || fail_mc "kotodama_rule_index_runtime_probe" "curl"

python3 - <<'PY' "$MC8/kotodama.json" || { write_envelope "kotodama_rule_index_runtime_probe" "kotodama_idx" "$MC8" "kotodama" "fail"; fail_mc "kotodama_rule_index_runtime_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
rr = str(ku.get("routeReason") or "")
laws = ku.get("lawsUsed") or []
idx_hit = bool(ku.get("lawIndexHit") or (ku.get("sourceStackSummary") or {}).get("lawIndexHit"))
if rr == "DEF_FASTPATH_VERIFIED_V1":
    if len(laws) < 1:
        sys.exit("DEF_FASTPATH requires lawsUsed")
elif "KOTODAMA" in rr or "TENMON_KOTODAMA" in rr:
    # 一音 FRONT / ONE_SOUND GROUNDED は索引レール到達で PASS（辞書未命中でも可）
    if not (idx_hit or len(laws) >= 1 or "FRONT" in rr or "ONE_SOUND" in rr or "GROUNDED" in rr):
        sys.exit("kotodama route without index signal: %r" % rr)
else:
    sys.exit("unexpected routeReason %r" % rr)
print("[PASS] kotodama rule index rail")
PY
write_envelope "kotodama_rule_index_runtime_probe" "kotodama_idx" "$MC8" "言霊一音経路 + lawIndexHit または KOTODAMA 系 route" "pass"

# ========== MC9 structural_crosswalk_probe ==========
MC9="$EVIDENCE_ROOT/micro_09_structural_crosswalk_probe"
write_envelope "structural_crosswalk_probe" "crosswalk" "$MC9" "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1" "pending"
echo "== [9/12] structural_crosswalk_probe =="
jq -n --arg t "es-mc9-${SAN_TS}" '{message:"言霊とカタカムナの違いは？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC9/compare.json" \
  || fail_mc "structural_crosswalk_probe" "curl"

python3 - <<'PY' "$MC9/compare.json" || { write_envelope "structural_crosswalk_probe" "crosswalk" "$MC9" "compare route" "fail"; fail_mc "structural_crosswalk_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
rr = ku.get("routeReason") or ""
if rr != "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1":
    sys.exit("want STRICT_COMPARE, got %r" % rr)
print("[PASS] structural crosswalk (strict compare)")
PY
write_envelope "structural_crosswalk_probe" "crosswalk" "$MC9" "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1" "pass"

# ========== MC10 ark_scripture_guide_probe ==========
MC10="$EVIDENCE_ROOT/micro_10_ark_scripture_guide_probe"
write_envelope "ark_scripture_guide_probe" "scripture" "$MC10" "TENMON_SCRIPTURE_CANON_V1" "pending"
echo "== [10/12] ark_scripture_guide_probe =="
jq -n --arg t "es-mc10-${SAN_TS}" '{message:"法華経とは何ですか",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC10/scripture.json" \
  || fail_mc "ark_scripture_guide_probe" "curl"

python3 - <<'PY' "$MC10/scripture.json" || { write_envelope "ark_scripture_guide_probe" "scripture" "$MC10" "scripture" "fail"; fail_mc "ark_scripture_guide_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
rr = ku.get("routeReason") or ""
ok = rr in ("TENMON_SCRIPTURE_CANON_V1", "SCRIPTURE_LOCAL_RESOLVER_V4") or (
    "SCRIPTURE" in rr and "CANON" in rr
)
if not ok:
    sys.exit("want scripture guide rail, got %r" % rr)
sk = ku.get("scriptureKey") or (ku.get("scriptureCanon") or {}).get("scriptureKey")
if not sk and rr != "SCRIPTURE_LOCAL_RESOLVER_V4":
    sys.exit("missing scriptureKey")
print("[PASS] ark scripture guide route (%s)" % rr)
PY
write_envelope "ark_scripture_guide_probe" "scripture" "$MC10" "TENMON_SCRIPTURE_CANON_V1" "pass"

# ========== MC11 kokuzo_seed_bridge_probe ==========
MC11="$EVIDENCE_ROOT/micro_11_kokuzo_seed_bridge_probe"
write_envelope "kokuzo_seed_bridge_probe" "seed_bridge" "$MC11" "POST /api/memory/seed が DETERMINISTIC + kokuzo_seeds 表実在" "pending"
echo "== [11/12] kokuzo_seed_bridge_probe =="
jq -n --arg t "es-mc11-${SAN_TS}" '{threadId:$t}' \
  | curl -fsS -H "Content-Type: application/json" -d @- "$BASE/api/memory/seed" >"$MC11/seed.json" \
  || fail_mc "kokuzo_seed_bridge_probe" "curl seed"

sqlite3 "$KDB" "SELECT 1 FROM sqlite_master WHERE type='table' AND name='kokuzo_seeds' LIMIT 1;" >"$MC11/kokuzo_seeds_table.txt" \
  || fail_mc "kokuzo_seed_bridge_probe" "sqlite"

python3 - <<'PY' "$MC11/seed.json" "$MC11/kokuzo_seeds_table.txt" || { write_envelope "kokuzo_seed_bridge_probe" "seed_bridge" "$MC11" "seed" "fail"; fail_mc "kokuzo_seed_bridge_probe" "acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
if not j.get("ok"):
    sys.exit("seed response not ok")
df = j.get("decisionFrame") or {}
if df.get("mode") != "DETERMINISTIC":
    sys.exit("want DETERMINISTIC decisionFrame.mode")
if df.get("llm") is not None:
    sys.exit("seed bridge must not invoke llm in stub")
tab = open(sys.argv[2], encoding="utf-8").read().strip()
if tab != "1":
    sys.exit("kokuzo_seeds table missing")
print("[PASS] seed bridge stub + table exists")
PY
write_envelope "kokuzo_seed_bridge_probe" "seed_bridge" "$MC11" "POST /api/memory/seed が DETERMINISTIC + kokuzo_seeds 表実在" "pass"

# ========== MC12 kokuzo_guardian_integrity_probe ==========
MC12="$EVIDENCE_ROOT/micro_12_kokuzo_guardian_integrity_probe"
write_envelope "kokuzo_guardian_integrity_probe" "guardian" "$MC12" "KOKUZO schema guardian 語 + audit readiness + 人格核回帰" "pending"
echo "== [12/12] kokuzo_guardian_integrity_probe =="

python3 - <<PY "$KOKUZO_SCHEMA_MD" || { write_envelope "kokuzo_guardian_integrity_probe" "guardian" "$MC12" "schema" "fail"; fail_mc "kokuzo_guardian_integrity_probe" "schema"; }
import pathlib, sys
t = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
for k in ["guardian", "quarantineReasons", "quarantined"]:
    if k not in t:
        sys.exit("missing %r in kokuzo seed schema doc" % k)
print("[PASS] kokuzo schema guardian keywords")
PY

curl -fsS "$BASE/api/audit" >"$MC12/audit.json" || { write_envelope "kokuzo_guardian_integrity_probe" "guardian" "$MC12" "audit" "fail"; fail_mc "kokuzo_guardian_integrity_probe" "audit curl"; }

jq -n --arg t "es-mc12-${SAN_TS}" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "${CHAT_LOCAL_HDR[@]}" -H "Content-Type: application/json" -d @- "$BASE/api/chat" >"$MC12/persona_regress.json" \
  || { write_envelope "kokuzo_guardian_integrity_probe" "guardian" "$MC12" "persona curl" "fail"; fail_mc "kokuzo_guardian_integrity_probe" "persona curl"; }

python3 - <<'PY' "$MC12/audit.json" "$MC12/persona_regress.json" || { write_envelope "kokuzo_guardian_integrity_probe" "guardian" "$MC12" "integrity bundle" "fail"; fail_mc "kokuzo_guardian_integrity_probe" "acceptance"; }
import json, sys
aud = json.load(open(sys.argv[1], encoding="utf-8"))
if not aud.get("ok"):
    sys.exit("audit not ok / not ready: %r" % aud)
r = (aud.get("readiness") or {})
if not r.get("ready"):
    sys.exit("readiness.ready false: %r" % r)
j = json.load(open(sys.argv[2], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
pcs = ku.get("personaConstitutionSummary")
if not pcs or not isinstance(pcs, dict):
    sys.exit("missing personaConstitutionSummary (memory inheritance regress)")
if pcs.get("constitutionKey") != "TENMON_CORE_V1":
    sys.exit("constitutionKey want TENMON_CORE_V1 got %r" % pcs.get("constitutionKey"))
print("[PASS] guardian + readiness + persona core regress")
PY
write_envelope "kokuzo_guardian_integrity_probe" "guardian" "$MC12" "KOKUZO schema guardian 語 + audit readiness + 人格核回帰" "pass"

# --- Manifest + 親 envelope ---
python3 - <<PY "$EVIDENCE_ROOT"
import json, os, pathlib, datetime, sys
root = pathlib.Path(sys.argv[1])
micros = sorted([p.name for p in root.iterdir() if p.is_dir() and p.name.startswith("micro_")])
manifest = {
    "runtimePackCard": "EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1",
    "parentCard": "EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1",
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
  "microCardId": "EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1",
  "parentCard": "EXTERNAL_SOURCE_AND_KOKUZO_AUTOBUNDLE_V1",
  "runtimePackCard": "EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1",
  "evidenceBundlePath": "${EVIDENCE_ROOT}",
  "acceptancePlan": "12/12 micro-cards PASS; build+health; policy+connector docs; binder+probes+seed+guardian",
  "status": "pass",
  "completedAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo
echo "== ALL PASS: EXTERNAL_SOURCE_AND_KOKUZO_RUNTIME_MICROPACK_V1 =="
echo "EVIDENCE_ROOT=$EVIDENCE_ROOT"
