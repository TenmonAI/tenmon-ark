#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CARD="TENMON_STATE_CONVERGENCE_REPORT_V1"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="/var/log/tenmon/card_${CARD}/${TS}"
mkdir -p "$DIR"
ln -sfn "$DIR" /var/log/tenmon/card
exec > >(tee -a "$DIR/run.log") 2>&1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="$(cd "$API/.." && pwd)"
BASE="${CHAT_TS_PROBE_BASE_URL:-${TENMON_API_BASE:-http://127.0.0.1:3000}}"

DEEP="$API/scripts/tenmon_deep_system_reveal_v1.sh"
MICRO="$API/scripts/tenmon_micro_forensic_v1.sh"

OUT_ORCH="${TENMON_FULL_ORCHESTRATOR_OUT_DIR:-$API/automation/out/tenmon_full_orchestrator_v1}"
OUT_SELF="${TENMON_SELF_IMPROVEMENT_OS_OUT_DIR:-$API/automation/out/tenmon_self_improvement_os_v1}"
OUT_KOKUZO="${TENMON_ORCHESTRATOR_KOKUZO_OUT_DIR:-$API/automation/out/tenmon_kokuzo_learning_improvement_os_v1}"
OUT_FORENSIC_SINGLE="${TENMON_FORENSIC_SINGLE_SOURCE_OUT_DIR:-$API/automation/out/forensic_single_source_normalize_v1}"

say(){ printf '\n===== %s =====\n' "$1"; }

latest_card_dir() {
  local card="$1"
  local base="/var/log/tenmon/card_${card}"
  if [[ -d "$base" ]]; then
    ls -1dt "$base"/* 2>/dev/null | head -n 1 || true
  else
    true
  fi
}

run_optional_forensic() {
  local script="$1"
  local name="$2"
  local logfile="$DIR/${name}.log"
  local rcfile="$DIR/${name}.rc"
  if [[ "${TENMON_STATE_CONVERGENCE_SKIP_FORENSIC:-0}" == "1" ]]; then
    echo "skip_by_env TENMON_STATE_CONVERGENCE_SKIP_FORENSIC=1" | tee "$logfile"
    echo "0" > "$rcfile"
    return 0
  fi
  if [[ -x "$script" ]]; then
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
curl -fsS "$BASE/health" | tee "$DIR/health.json"
HEALTH_RC=${PIPESTATUS[0]}
curl -fsS "$BASE/api/audit" | tee "$DIR/audit.json"
AUDIT_RC=${PIPESTATUS[0]}
set -e

{
  echo "BUILD_RC=$BUILD_RC"
  echo "RESTART_RC=$RESTART_RC"
  echo "HEALTH_RC=$HEALTH_RC"
  echo "AUDIT_RC=$AUDIT_RC"
} > "$DIR/system_state_codes.txt"

say "DEEP / MICRO FORENSIC (OBSERVE-ONLY)"
run_optional_forensic "$DEEP" "deep_forensic"
run_optional_forensic "$MICRO" "micro_forensic"

say "LATEST FORENSIC DIRECTORIES"
LATEST_DEEP="$(latest_card_dir TENMON_DEEP_SYSTEM_REVEAL_V1)"
LATEST_MICRO="$(latest_card_dir TENMON_MICRO_FORENSIC_V1)"
LATEST_DEEP_SEAL="$(latest_card_dir TENMON_DEEP_SYSTEM_REVEAL_SEAL_V1)"
LATEST_ULTRA="$(latest_card_dir TENMON_ULTRA_FORENSIC_REVEAL_V3)"
{
  echo "LATEST_DEEP=$LATEST_DEEP"
  echo "LATEST_MICRO=$LATEST_MICRO"
  echo "LATEST_DEEP_SEAL=$LATEST_DEEP_SEAL"
  echo "LATEST_ULTRA=$LATEST_ULTRA"
} | tee "$DIR/latest_forensic_dirs.txt"

say "STATE CONVERGENCE SUMMARIZE"
python3 - "$API" "$DIR" "$OUT_ORCH" "$OUT_SELF" "$OUT_KOKUZO" "$OUT_FORENSIC_SINGLE" <<'PY'
import json
import pathlib
import sys
from datetime import datetime, timezone

api = pathlib.Path(sys.argv[1])
out_dir = pathlib.Path(sys.argv[2])
out_orch = pathlib.Path(sys.argv[3])
out_self = pathlib.Path(sys.argv[4])
out_kokuzo = pathlib.Path(sys.argv[5])
out_forensic = pathlib.Path(sys.argv[6])


def read_json(p: pathlib.Path):
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


summary = {
    "version": 1,
    "card": "TENMON_STATE_CONVERGENCE_REPORT_V1",
    "generatedAt": now(),
    "canonical": {},
    "blockers": [],
    "recommendations": [],
    "latest_cards": {},
    "paths": {
        "full_orchestrator": str(out_orch),
        "self_improvement_os": str(out_self),
        "kokuzo_learning_os": str(out_kokuzo),
        "forensic_single_source": str(out_forensic),
    },
}

full_orch_exists = (out_orch / "full_orchestrator_queue.json").is_file() and (out_orch / "full_orchestrator_manifest.json").is_file()
summary["canonical"]["full_orchestrator_exists"] = full_orch_exists

self_required = [
    "self_improvement_os_manifest.json",
    "integrated_final_verdict.json",
    "next_card_dispatch.json",
]
self_missing = [x for x in self_required if not (out_self / x).is_file()]
self_ok = len(self_missing) == 0
summary["canonical"]["self_improvement_os"] = {
    "exists": out_self.is_dir(),
    "required_files_ok": self_ok,
    "missing": self_missing,
}
if not self_ok:
    summary["blockers"].append("self_improvement_os_output_contract_incomplete")

kokuzo_required = [
    "integrated_learning_verdict.json",
    "integrated_final_verdict.json",
    "learning_improvement_os_manifest.json",
    "learning_steps.json",
]
kokuzo_missing = [x for x in kokuzo_required if not (out_kokuzo / x).is_file()]
kokuzo_ok = len(kokuzo_missing) == 0
summary["canonical"]["kokuzo_learning_os"] = {
    "exists": out_kokuzo.is_dir(),
    "required_files_ok": kokuzo_ok,
    "missing": kokuzo_missing,
}
if not kokuzo_ok:
    summary["blockers"].append("kokuzo_learning_os_output_contract_incomplete")

ssv = read_json(out_forensic / "forensic_single_source_verdict.json")
summary["canonical"]["chat_ts_worldclass_canonicalized"] = bool(ssv)
summary["canonical"]["chat_ts_overall_100"] = ssv.get("chat_ts_overall_100_canonical")
if not ssv:
    summary["blockers"].append("chat_ts_worldclass_not_canonicalized")

nas_candidates = [
    pathlib.Path("/mnt/nas"),
    pathlib.Path("/mnt/tenmon-nas"),
    pathlib.Path("/Volumes/NAS"),
]
nas_confirmed = any(p.exists() for p in nas_candidates)
summary["canonical"]["nas_mount_confirmed"] = nas_confirmed
summary["canonical"]["nas_mount_candidates"] = [str(p) for p in nas_candidates]
if not nas_confirmed:
    summary["blockers"].append("nas_mount_unconfirmed")


def latest_dir(card: str):
    base = pathlib.Path("/var/log/tenmon") / f"card_{card}"
    if not base.is_dir():
        return None
    dirs = sorted([p for p in base.iterdir() if p.is_dir()], key=lambda p: p.stat().st_mtime, reverse=True)
    return dirs[0] if dirs else None


latest_deep = latest_dir("TENMON_DEEP_SYSTEM_REVEAL_V1")
latest_micro = latest_dir("TENMON_MICRO_FORENSIC_V1")
latest_deep_seal = latest_dir("TENMON_DEEP_SYSTEM_REVEAL_SEAL_V1")
latest_ultra = latest_dir("TENMON_ULTRA_FORENSIC_REVEAL_V3")
summary["latest_cards"] = {
    "deep_reveal": str(latest_deep) if latest_deep else None,
    "micro_forensic": str(latest_micro) if latest_micro else None,
    "deep_seal": str(latest_deep_seal) if latest_deep_seal else None,
    "ultra_forensic": str(latest_ultra) if latest_ultra else None,
}

deep_reco = []
if latest_deep:
    p = latest_deep / "deep_recommendations.json"
    obj = read_json(p)
    if isinstance(obj.get("next_cards"), list):
        deep_reco = [str(x) for x in obj["next_cards"] if x]
    elif isinstance(obj.get("recommendations"), list):
        deep_reco = [str(x) for x in obj["recommendations"] if x]
summary["canonical"]["deep_recommendations"] = deep_reco[:20]

mapping = {
    "self_improvement_os_output_contract_incomplete": "TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_CURSOR_AUTO_V1",
    "kokuzo_learning_os_output_contract_incomplete": "TENMON_KOKUZO_LEARNING_OS_CONTRACT_CLOSE_CURSOR_AUTO_V1",
    "nas_mount_unconfirmed": "TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1",
    "chat_ts_worldclass_not_canonicalized": "TENMON_FORENSIC_SINGLE_SOURCE_NORMALIZE_CURSOR_AUTO_V1",
}

seen = set()
next_cards = []
for b in summary["blockers"]:
    c = mapping.get(b)
    if c and c not in seen:
        seen.add(c)
        next_cards.append({"source": "canonical_blocker_mapping", "blocker": b, "cursor_card": c})
for c in deep_reco:
    if c not in seen:
        seen.add(c)
        next_cards.append({"source": "deep_recommendations", "cursor_card": c})
    if len(next_cards) >= 5:
        break

summary["recommendations"] = next_cards[:5]
summary["overall_converged"] = len(summary["blockers"]) == 0

(out_dir / "state_convergence_summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
(out_dir / "state_convergence_next_cards.json").write_text(
    json.dumps(
        {
            "version": 1,
            "card": summary["card"],
            "generatedAt": summary["generatedAt"],
            "next_cards": next_cards[:5],
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
print(
    json.dumps(
        {
            "ok": True,
            "overall_converged": summary["overall_converged"],
            "blockers": summary["blockers"],
            "next_cards": next_cards[:5],
        },
        ensure_ascii=False,
        indent=2,
    )
)
PY

printf '%s\n' "TENMON_STATE_CONVERGENCE_REPORT_V1" "$TS" "dir=$DIR" > "$DIR/TENMON_STATE_CONVERGENCE_REPORT_V1"

say "OUTPUT LIST"
ls -1 "$DIR" | sort | tee "$DIR/output_list.txt"

echo
echo "[RUN_LOG] $DIR/run.log"
