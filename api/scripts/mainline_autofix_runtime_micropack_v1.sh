#!/usr/bin/env bash
# MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1
# MAINLINE_AUTOFIX_BUNDLE_V1 の 7 micro-card を固定順で実行し、各 micro-card ごとに evidenceBundlePath を残す。
# FAIL 時は即終了（rollback / forensic は運用側。ここは exit 1 + ログパス表示）。
#
# 用法:
#   cd api && BASE=http://127.0.0.1:3000 ./scripts/mainline_autofix_runtime_micropack_v1.sh [EVIDENCE_ROOT]
#
# 環境変数: TENMON_DATA_DIR, SKIP_SQLITE_CHECKS（final_mainline_stability_sweep と同様）
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
EVIDENCE_ROOT="${1:-/tmp/mainline_autofix_runtime_micropack_v1_${TS}}"
mkdir -p "$EVIDENCE_ROOT"
MASTER_LOG="$EVIDENCE_ROOT/MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1.log"
exec > >(tee -a "$MASTER_LOG") 2>&1

export BASE

echo "== MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1 =="
echo "EVIDENCE_ROOT=$EVIDENCE_ROOT BASE=$BASE"
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
  cat >"$dir/envelope.json" <<EOF
{
  "\$schemaHint": "TenmonSelfBuildTaskEnvelopeV1",
  "microCardId": "${id}",
  "microCardSlug": "${slug}",
  "parentCard": "MAINLINE_AUTOFIX_BUNDLE_V1",
  "runtimePackCard": "MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1",
  "evidenceBundlePath": "${dir}",
  "acceptancePlan": "${acceptance}",
  "rollbackPlan": "SELF_BUILD_RESTORE_POLICY_V1: git restore / revert offending commit; re-run this script from failed micro-card after forensic.",
  "status": "${status}",
  "completedAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# --- MC1: mainline_probe_pack ---
MC1="$EVIDENCE_ROOT/micro_01_mainline_probe_pack"
mkdir -p "$MC1"
write_envelope "mainline_probe_pack" "mainline_probe_pack" "$MC1" "final_mainline_stability_sweep_v1.sh 全体 PASS（build/health/PATCH29/WILL/BEAUTY/LANGUAGE/HRL/density/memory）" "pending"
echo "== [1/7] mainline_probe_pack =="
if ! bash scripts/final_mainline_stability_sweep_v1.sh "$MC1"; then
  write_envelope "mainline_probe_pack" "mainline_probe_pack" "$MC1" "同上" "fail"
  fail_mc "mainline_probe_pack" "final_mainline_stability_sweep_v1.sh failed (see $MC1)"
fi
write_envelope "mainline_probe_pack" "mainline_probe_pack" "$MC1" "同上" "pass"

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

# --- MC2: human_readable_law_runtime_check ---
MC2="$EVIDENCE_ROOT/micro_02_human_readable_law_runtime_check"
mkdir -p "$MC2"
write_envelope "human_readable_law_runtime_check" "hrl" "$MC2" "task/followup/thin 代表プローブで KHSL:LAW: なし・routeReason あり・responsePlan 免除ルール準拠" "pending"
echo "== [2/7] human_readable_law_runtime_check =="
health_check "$MC2" || { write_envelope "human_readable_law_runtime_check" "hrl" "$MC2" "同上" "fail"; fail_mc "human_readable_law_runtime_check" "health"; }
HRL_TID="micropack-hrl-${TS}"
for key in task followup thin; do
  case "$key" in
    task)   MSG='いま何を直すべき？' ;;
    followup) MSG='次の一手は？' ;;
    thin)   MSG='なぜ薄くなるの？' ;;
  esac
  TID="${HRL_TID}-${key}"
  jq -n --arg m "$MSG" --arg t "$TID" '{message:$m,threadId:$t,mode:"NATURAL"}' \
    | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$MC2/hrl_${key}.json" || { write_envelope "human_readable_law_runtime_check" "hrl" "$MC2" "同上" "fail"; fail_mc "human_readable_law_runtime_check" "curl hrl_$key"; }
done
python3 - <<'PY' "$MC2" || { write_envelope "human_readable_law_runtime_check" "hrl" "$MC2" "同上" "fail"; fail_mc "human_readable_law_runtime_check" "hrl python acceptance"; }
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
FOLLOWUP_OK_WITHOUT_RP = frozenset({"R22_NEXTSTEP_FOLLOWUP_V1", "NATURAL_FALLBACK"})
for key in ("task", "followup", "thin"):
    j = json.loads((out / f"hrl_{key}.json").read_text(encoding="utf-8"))
    resp = str(j.get("response") or "")
    if "KHSL:LAW:" in resp:
        sys.exit("KHSL:LAW in hrl_%s" % key)
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    rr = ku.get("routeReason")
    rp = ku.get("responsePlan")
    if not rp:
        if rr not in FOLLOWUP_OK_WITHOUT_RP:
            sys.exit("hrl_%s: missing responsePlan routeReason=%r" % (key, rr))
        if len(resp) < 24:
            sys.exit("hrl_%s: empty surface" % key)
    if not rr:
        sys.exit("hrl_%s: missing routeReason" % key)
print("[PASS] HRL runtime surface")
PY
write_envelope "human_readable_law_runtime_check" "hrl" "$MC2" "同上" "pass"

# --- MC3: task_return_surface_cleanup ---
MC3="$EVIDENCE_ROOT/micro_03_task_return_surface_cleanup"
mkdir -p "$MC3"
write_envelope "task_return_surface_cleanup" "task_return" "$MC3" "タスク系短文で KHSL:LAW: なし・本文が空でない（機械キー law: 直露出の簡易検査）" "pending"
echo "== [3/7] task_return_surface_cleanup =="
health_check "$MC3" || { write_envelope "task_return_surface_cleanup" "task_return" "$MC3" "同上" "fail"; fail_mc "task_return_surface_cleanup" "health"; }
TASK_TID="micropack-task-${TS}"
jq -n --arg m 'いま何を直すべき？' --arg t "$TASK_TID" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$MC3/task_surface.json" || { write_envelope "task_return_surface_cleanup" "task_return" "$MC3" "同上" "fail"; fail_mc "task_return_surface_cleanup" "curl"; }
python3 - <<'PY' "$MC3/task_surface.json" || { write_envelope "task_return_surface_cleanup" "task_return" "$MC3" "同上" "fail"; fail_mc "task_return_surface_cleanup" "task acceptance"; }
import json, sys, re
j = json.load(open(sys.argv[1], encoding="utf-8"))
resp = str(j.get("response") or "")
if "KHSL:LAW:" in resp:
    sys.exit("KHSL:LAW leak")
if len(resp.strip()) < 16:
    sys.exit("empty or too thin response")
# 簡易: 内部 law キーっぽい "law:" の連続露出（URL 等は除外しにくいので緩め）
if re.search(r"\blaw:\s*KHSL", resp, re.I):
    sys.exit("machine law key pattern")
ku = (j.get("decisionFrame") or {}).get("ku") or {}
if not ku.get("routeReason"):
    sys.exit("missing routeReason")
print("[PASS] task surface cleanup probe")
PY
write_envelope "task_return_surface_cleanup" "task_return" "$MC3" "同上" "pass"

# --- MC4: will_probe_residual_check ---
MC4="$EVIDENCE_ROOT/micro_04_will_probe_residual_check"
mkdir -p "$MC4"
write_envelope "will_probe_residual_check" "will" "$MC4" "will_core_runtime_probe_v1.sh PASS" "pending"
echo "== [4/7] will_probe_residual_check =="
if ! bash scripts/will_core_runtime_probe_v1.sh "$MC4"; then
  write_envelope "will_probe_residual_check" "will" "$MC4" "同上" "fail"
  fail_mc "will_probe_residual_check" "will_core_runtime_probe_v1.sh (see $MC4)"
fi
write_envelope "will_probe_residual_check" "will" "$MC4" "同上" "pass"

# --- MC5: beauty_surface_residual_check ---
MC5="$EVIDENCE_ROOT/micro_05_beauty_surface_residual_check"
mkdir -p "$MC5"
write_envelope "beauty_surface_residual_check" "beauty" "$MC5" "BEAUTY_COMPILER_PREEMPT_V1 + responsePlan + 応答に KHSL なし" "pending"
echo "== [5/7] beauty_surface_residual_check =="
health_check "$MC5" || { write_envelope "beauty_surface_residual_check" "beauty" "$MC5" "同上" "fail"; fail_mc "beauty_surface_residual_check" "health"; }
BEAUTY_TID="micropack-beauty-${TS}"
BEAUTY_MSG='この文章をもっと美しい日本語に整えてください。'
jq -n --arg m "$BEAUTY_MSG" --arg t "$BEAUTY_TID" '{message:$m,threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$MC5/beauty.json" || { write_envelope "beauty_surface_residual_check" "beauty" "$MC5" "同上" "fail"; fail_mc "beauty_surface_residual_check" "curl"; }
python3 - <<'PY' "$MC5/beauty.json" || { write_envelope "beauty_surface_residual_check" "beauty" "$MC5" "同上" "fail"; fail_mc "beauty_surface_residual_check" "beauty acceptance"; }
import json, sys
j = json.load(open(sys.argv[1], encoding="utf-8"))
ku = (j.get("decisionFrame") or {}).get("ku") or {}
if ku.get("routeReason") != "BEAUTY_COMPILER_PREEMPT_V1":
    sys.exit("routeReason want BEAUTY_COMPILER_PREEMPT_V1 got %r" % ku.get("routeReason"))
if not ku.get("responsePlan"):
    sys.exit("missing responsePlan")
resp = str(j.get("response") or "")
if "KHSL:LAW:" in resp:
    sys.exit("KHSL:LAW leak")
if len(resp.strip()) < 8:
    sys.exit("empty beauty response")
print("[PASS] beauty surface")
PY
write_envelope "beauty_surface_residual_check" "beauty" "$MC5" "同上" "pass"

# --- MC6: density_ledger_runtime_check ---
MC6="$EVIDENCE_ROOT/micro_06_density_ledger_runtime_check"
mkdir -p "$MC6"
write_envelope "density_ledger_runtime_check" "density" "$MC6" "conversation_density_ledger_runtime_v1 に当該 thread_id で 1 行以上（SKIP_SQLITE_CHECKS 時はスキップ可）" "pending"
echo "== [6/7] density_ledger_runtime_check =="
health_check "$MC6" || { write_envelope "density_ledger_runtime_check" "density" "$MC6" "同上" "fail"; fail_mc "density_ledger_runtime_check" "health"; }
DEN_TID="micropack-density-${TS}"
jq -n --arg t "$DEN_TID" '{message:"天聞アークの構造はどうなっている？",threadId:$t,mode:"NATURAL"}' \
  | curl -fsS "$BASE/api/chat" -H "Content-Type: application/json" -d @- >"$MC6/density_chat.json" || { write_envelope "density_ledger_runtime_check" "density" "$MC6" "同上" "fail"; fail_mc "density_ledger_runtime_check" "curl"; }
KDATA="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}/kokuzo.sqlite"
if [[ "${SKIP_SQLITE_CHECKS:-}" == "1" ]]; then
  echo "[SKIP] SKIP_SQLITE_CHECKS=1 — density sqlite not verified"
  write_envelope "density_ledger_runtime_check" "density" "$MC6" "同上（sqlite スキップ）" "pass"
else
  if [[ ! -f "$KDATA" ]]; then
    write_envelope "density_ledger_runtime_check" "density" "$MC6" "同上" "fail"
    fail_mc "density_ledger_runtime_check" "kokuzo.sqlite missing at $KDATA"
  fi
  CNT="$(sqlite3 "$KDATA" "SELECT COUNT(*) FROM conversation_density_ledger_runtime_v1 WHERE thread_id='${DEN_TID}';" 2>/dev/null || echo 0)"
  if [[ "${CNT:-0}" -lt 1 ]]; then
    write_envelope "density_ledger_runtime_check" "density" "$MC6" "同上" "fail"
    fail_mc "density_ledger_runtime_check" "expected ledger row for ${DEN_TID}, count=${CNT}"
  fi
  echo "[PASS] density ledger rows: ${CNT}"
  write_envelope "density_ledger_runtime_check" "density" "$MC6" "同上" "pass"
fi

# --- MC7: null_drop_regression_check ---
MC7="$EVIDENCE_ROOT/micro_07_null_drop_regression_check"
mkdir -p "$MC7"
write_envelope "null_drop_regression_check" "null_drop" "$MC7" "PATCH29 8 本: routeReason 期待・responsePlan・応答 empty なし・KHSL なし" "pending"
echo "== [7/7] null_drop_regression_check =="
health_check "$MC7" || { write_envelope "null_drop_regression_check" "null_drop" "$MC7" "同上" "fail"; fail_mc "null_drop_regression_check" "health"; }
export BASE
bash scripts/patch29_probe_8_sweep.sh "$MC7/patch29" || { write_envelope "null_drop_regression_check" "null_drop" "$MC7" "同上" "fail"; fail_mc "null_drop_regression_check" "patch29 sweep"; }
python3 - <<'PY' "$MC7/patch29" || { write_envelope "null_drop_regression_check" "null_drop" "$MC7" "同上" "fail"; fail_mc "null_drop_regression_check" "patch29 acceptance"; }
import json, pathlib, sys
out = pathlib.Path(sys.argv[1])
expect = {
    "compare":    "RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1",
    "selfaware":  "R22_SELFAWARE_CONSCIOUSNESS_V1",
    "systemdiag": "SYSTEM_DIAGNOSIS_PREEMPT_V1",
    "future":     "R22_FUTURE_OUTLOOK_V1",
    "judgement":  "R22_JUDGEMENT_PREEMPT_V1",
    "essence":    "R22_ESSENCE_ASK_V1",
    "structure":  "TENMON_STRUCTURE_LOCK_V1",
    "explicit":   "EXPLICIT_CHAR_PREEMPT_V1",
}
for name, want_rr in expect.items():
    p = out / f"{name}.json"
    j = json.loads(p.read_text(encoding="utf-8"))
    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    got = ku.get("routeReason")
    if got != want_rr:
        sys.exit("%s: routeReason got %r want %r" % (name, got, want_rr))
    if not ku.get("responsePlan"):
        sys.exit("%s: missing responsePlan" % name)
    resp = str(j.get("response") or "").strip()
    if len(resp) < 4:
        sys.exit("%s: empty drop response" % name)
    if "KHSL:LAW:" in resp:
        sys.exit("%s: KHSL leak" % name)
print("[PASS] PATCH29 + no empty drop + no KHSL")
PY
write_envelope "null_drop_regression_check" "null_drop" "$MC7" "同上" "pass"

# マニフェスト
cat >"$EVIDENCE_ROOT/MICROPACK_MANIFEST.json" <<EOF
{
  "runtimePackCard": "MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1",
  "parentCard": "MAINLINE_AUTOFIX_BUNDLE_V1",
  "completedAtUtc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "baseUrl": "${BASE}",
  "evidenceRoot": "${EVIDENCE_ROOT}",
  "microCards": [
    "micro_01_mainline_probe_pack",
    "micro_02_human_readable_law_runtime_check",
    "micro_03_task_return_surface_cleanup",
    "micro_04_will_probe_residual_check",
    "micro_05_beauty_surface_residual_check",
    "micro_06_density_ledger_runtime_check",
    "micro_07_null_drop_regression_check"
  ],
  "status": "pass"
}
EOF

echo
echo "== MAINLINE_AUTOFIX_RUNTIME_MICROPACK_V1 PASS =="
echo "master log: $MASTER_LOG"
echo "evidence: $EVIDENCE_ROOT"
