#!/usr/bin/env bash
# WILL_CORE_RUNTIME_PROBE_V1 — FORENSIC: WILL_CORE_PREEMPT / sourcePack / ku 観測固定
# 用法: BASE=http://127.0.0.1:3000 ./scripts/will_core_runtime_probe_v1.sh [OUT_DIR]
# 注意: デプロイ直後は API を再起動しないと古い dist のまま WILL_CORE に入らず FAIL する
set -u
BASE="${BASE:-http://127.0.0.1:3000}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${1:-/tmp/will_core_probe_${TS}}"
mkdir -p "${OUT_DIR}"
OBS_LOG="${OUT_DIR}/WILL_CORE_RUNTIME_PROBE_V1.observation.log"

run_one() {
  local name="$1"
  local message="$2"
  local out="${OUT_DIR}/${name}.json"
  local payload
  payload="$(jq -n --arg m "${message}" --arg t "willcore-${name}-${TS}" '{message:$m, threadId:$t, mode:"NATURAL"}')" || return 1
  if curl -fsS --max-time 60 "${BASE}/api/chat" \
    -H "Content-Type: application/json" \
    -d "${payload}" > "${out}" 2>/dev/null; then
    echo "ok ${out}"
  else
    echo "{\"error\":\"curl_failed\",\"name\":\"${name}\"}" > "${out}"
    echo "fail ${out}"
  fi
}

echo "== WILL_CORE_RUNTIME_PROBE_V1 (FORENSIC) =="
echo "BASE=${BASE} OUT_DIR=${OUT_DIR}"
echo "observation_log=${OBS_LOG}"
echo ": > ${OBS_LOG}"
: > "${OBS_LOG}"

run_one "will1" "天聞アークの意志とは何？"
run_one "will2" "ARKの存在目的は？"
run_one "will3" "原点の契約は何？"
run_one "will4" "何のために存在するの？"
run_one "will5" "天聞アークは何を守るために答えるの？"

echo
echo "== acceptance + observation (python) =="
python3 - "${OUT_DIR}" "${OBS_LOG}" <<'PY'
import json
import pathlib
import sys

out = pathlib.Path(sys.argv[1])
obs_path = pathlib.Path(sys.argv[2])
names = ["will1", "will2", "will3", "will4", "will5"]
fail = 0
bad_routes = []


def need(cond, msg):
    global fail
    if not cond:
        print("FAIL:", msg)
        fail += 1


def flatten_persona(ku):
    pcs = ku.get("personaConstitutionSummary") or {}
    parts = []
    for k in ("identityCore", "nonNegotiables", "canonicalAuthorities", "judgementDiscipline", "antiGenericDrift"):
        v = pcs.get(k)
        if isinstance(v, list):
            parts.extend(str(x) for x in v)
        elif v is not None:
            parts.append(str(v))
    return "\n".join(parts)


def source_kind_trace_ok(ku, ss):
    """gate 後に sourceStackSummary.sourceKinds が落ちる場合の FORENSIC 代替。"""
    sk = ss.get("sourceKinds")
    if isinstance(sk, list) and "will_core" in sk and "constitution" in sk and "intention" in sk:
        return True
    if ku.get("intention") and (ku.get("binderSummary") or {}).get("hasConstitution"):
        stk = ss.get("sourceStack") if isinstance(ss, dict) else None
        if isinstance(stk, list) and len(stk) > 0:
            return True
    return False


def append_obs(name, lines):
    with obs_path.open("a", encoding="utf-8") as f:
        f.write(f"=== {name} ===\n")
        for line in lines:
            f.write(line + "\n")
        f.write("\n")

for n in names:
    p = out / f"{n}.json"
    if not p.exists():
        need(False, f"missing {p}")
        continue
    try:
        j = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        need(False, f"{n} json: {e}")
        continue
    if j.get("error"):
        need(False, f"{n} error: {j}")
        continue

    ku = (j.get("decisionFrame") or {}).get("ku") or {}
    resp = str(j.get("response") or "")
    ss = ku.get("sourceStackSummary")
    bs = ku.get("binderSummary") or {}
    rp = ku.get("responsePlan") or {}
    rr = ku.get("routeReason")
    semantic = str(rp.get("semanticBody") or "")
    persona_flat = flatten_persona(ku)
    body_axis_text = resp + "\n" + semantic + "\n" + persona_flat

    obs_lines = [
        f"rr:{rr}",
        f"center:{ku.get('centerKey')}",
        f"sourcePack:{ku.get('sourcePack')}",
        f"sourceKinds:{json.dumps((ss or {}).get('sourceKinds'), ensure_ascii=False)}",
        f"binder:{json.dumps(bs, ensure_ascii=False)}",
        f"rp:{rp.get('routeReason')}",
        f"body:{resp}",
    ]
    append_obs(n, obs_lines)

    need(rr == "WILL_CORE_PREEMPT_V1", f"{n} routeReason want WILL_CORE_PREEMPT_V1 got {rr}")
    if rr != "WILL_CORE_PREEMPT_V1":
        bad_routes.append((n, rr))

    need(ku.get("centerKey") == "will_core", f"{n} centerKey want will_core got {ku.get('centerKey')}")
    need(ku.get("sourcePack") == "will_core", f"{n} sourcePack want will_core got {ku.get('sourcePack')}")

    need(isinstance(ss, dict), f"{n} sourceStackSummary missing")
    need(isinstance(ss.get("sourceStack"), list) and len(ss["sourceStack"]) > 0, f"{n} sourceStack empty")

    need(source_kind_trace_ok(ku, ss), f"{n} sourceKinds trace (will_core/constitution/intention 相当) missing")

    need(len(bs) > 0, f"{n} binderSummary empty")
    need(bool(bs.get("hasPersonaConstitution")), f"{n} binderSummary.hasPersonaConstitution")
    need(bool(bs.get("hasConstitution")), f"{n} binderSummary.hasConstitution")

    need(rp is not None and isinstance(rp, dict) and len(rp) > 0, f"{n} responsePlan empty")
    need(rp.get("routeReason") == "WILL_CORE_PREEMPT_V1", f"{n} responsePlan.routeReason got {rp.get('routeReason')}")

    need("存在目的" in resp, f"{n} body.response 存在目的")
    need("不変法" in resp, f"{n} body.response 不変法")
    need("会話への還元" in resp, f"{n} body.response 会話への還元")
    need("次軸" in body_axis_text, f"{n} 次軸 (response / semanticBody / personaConstitution 同梱テキスト)")

if bad_routes:
    print("observed_non_will:", bad_routes)

if fail:
    print(f"\nRESULT: FAIL ({fail} checks)")
    sys.exit(1)
print("\nRESULT: PASS (all WILL_CORE probes)")
PY

exit_code=$?
echo
echo "artifacts: ${OUT_DIR}"
echo "observation_log: ${OBS_LOG}"
exit "${exit_code}"
