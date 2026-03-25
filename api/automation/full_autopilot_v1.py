#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_FULL_AUTOPILOT_V1 — end-to-end summary wiring queue, gates, planner chain, applier, replay, campaign.
Read-only; does not execute runner or apply patches.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(_AUTOMATION_DIR))

from campaign_executor_v1 import build_campaign_report
from execution_gate_v1 import evaluate_gate
from human_gate_store_v1 import list_pending_gates
from queue_scheduler_v1 import compute_next_runnable, load_queue_spine_v1
from queue_store_v1 import load_snapshot, snapshot_path
from repo_resolve_v1 import repo_root_from
from workspace_observer_v1 import build_snapshot as build_workspace_snapshot

CARD_NAME = "AUTO_BUILD_FULL_AUTOPILOT_V1"
VERSION = 1
# Catalog cards treated as completed for surfaced mainline nextCard when queue is not updated yet.
_PROVISIONAL_MAINLINE_PASS = frozenset(
    {
        "CHAT_TRUNK_SCRIPTURE_SPLIT_V1",
        "CHAT_TRUNK_CONTINUITY_SPLIT_V1",
    }
)
_MAINLINE_FINAL_FOUR = frozenset(
    {
        "CHAT_TRUNK_SUPPORT_SELFDIAG_SPLIT_V1_FINAL",
        "CHAT_TRUNK_GENERAL_SPLIT_V1_FINAL",
        "CHAT_TRUNK_INFRA_WRAPPER_SPLIT_V1_FINAL",
        "CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL",
    }
)
_MAINLINE_SEAL_CARD = "MAINLINE_COMPLETED_READ_ONLY_SEAL_V1"
REPORT_JSON = "full_autopilot_v1.json"
REPORT_MD = "full_autopilot_v1.md"

_TOUCH_FILES = {
    "patchPlanReport": "api/automation/reports/patch_plan_v1_report.json",
    "patchRecipesManifest": "api/automation/generated_patch_recipes/patch_recipes_manifest_v1.json",
    "cursorTasksManifest": "api/automation/generated_cursor_tasks/cursor_tasks_manifest_v1.json",
    "workspaceSnapshot": "api/automation/reports/workspace_snapshot_v1.json",
    "executionGateReport": "api/automation/reports/execution_gate_v1.json",
    "cursorApplierReport": "api/automation/reports/cursor_applier_v1.json",
    "cursorApplyManifest": "api/automation/generated_cursor_apply/cursor_apply_manifest_v1.json",
    "replayAuditReport": "api/automation/reports/replay_audit_v1.json",
    "campaignState": "api/automation/_campaign/campaign_state_v1.json",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _catalog_card(repo: Path, name: str) -> Optional[Dict[str, Any]]:
    data = _load_json(repo / "api" / "automation" / "card_catalog_v1.json")
    if not data:
        return None
    for c in data.get("cards") or []:
        if isinstance(c, dict) and c.get("cardName") == name:
            return c
    return None


def _catalog_next_on_pass(repo: Path, card: str) -> Optional[str]:
    c = _catalog_card(repo, card)
    if not c:
        return None
    nxt = c.get("nextOnPass")
    if isinstance(nxt, str) and nxt.strip() and nxt.strip() != "STOP":
        return nxt.strip()
    return None


def _mainline_next_after_completed_walk(
    repo: Path,
    snap: Optional[Dict[str, Any]],
    planner_recommended: Any,
) -> Optional[str]:
    """
    Advance along catalog nextOnPass while queue snapshot marks those cards completed.
    Surfaces trunk mainline head after provisional passes (e.g. CONTINUITY completed → SUPPORT_FINAL).
    """
    if not isinstance(planner_recommended, str) or not planner_recommended.strip():
        return None
    cur = planner_recommended.strip()
    qc = (snap.get("cards") or {}) if isinstance(snap, dict) else {}
    for _ in range(96):
        info = qc.get(cur) if isinstance(qc.get(cur), dict) else {}
        st = info.get("state")
        done = st == "completed"
        if not done and cur in _PROVISIONAL_MAINLINE_PASS:
            done = True
        if not done:
            return cur
        nxt = _catalog_next_on_pass(repo, cur)
        if not nxt:
            return cur
        cur = nxt
    return cur


def _mainline_final_four_queue_complete(cards: Dict[str, Any]) -> bool:
    for name in _MAINLINE_FINAL_FOUR:
        info = cards.get(name)
        st = info.get("state") if isinstance(info, dict) else None
        if st != "completed":
            return False
    return True


def _mainline_completion_sentinel_ok(repo: Path) -> bool:
    p = repo / "api" / "automation" / "reports" / "mainline_runtime_acceptance_complete_v1.json"
    data = _load_json(p)
    if not isinstance(data, dict):
        return False
    return bool(data.get("mainlineFinalTrunkComplete"))


def _subsystem_touch(repo: Path) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for key, rel in _TOUCH_FILES.items():
        p = repo / rel
        out[key] = {"relative": rel.replace("\\", "/"), "exists": p.is_file()}
    return out


def _stop_reasons(
    repo: Path,
    *,
    gate: Dict[str, Any],
    pending_hg: int,
    next_card: Optional[str],
) -> List[str]:
    reasons: List[str] = []
    if pending_hg > 0:
        reasons.append("human_gate_pending")
    dec = str(gate.get("decision") or "")
    if dec == "invalid_scope":
        reasons.append("prohibited_path_execution_gate_invalid_scope")
    if dec == "waiting_human_gate":
        reasons.append("execution_gate_waiting_human_gate")
    if dec == "blocked":
        reasons.append("execution_gate_blocked")
    if next_card:
        cat = _catalog_card(repo, next_card)
        if cat and bool(cat.get("requiresHumanJudgement")):
            reasons.append(f"next_card_requires_human_judgement:{next_card}")
    return reasons


def build_full_summary(
    repo: Path,
    *,
    skip_heavy: bool,
) -> Dict[str, Any]:
    root = repo.resolve()
    gate = evaluate_gate(root)
    pending = list_pending_gates()
    snap = load_snapshot(root)
    running = []
    if snap:
        for name, info in (snap.get("cards") or {}).items():
            if isinstance(info, dict) and info.get("state") == "running":
                running.append(str(name))
    running = sorted(running)

    rn_sched = compute_next_runnable(root)
    plan_rep = _load_json(root / "api/automation/reports/patch_plan_v1_report.json")
    planner_rec = (
        plan_rep.get("recommendedNextCard") if isinstance(plan_rep, dict) else None
    )
    walked = _mainline_next_after_completed_walk(root, snap, planner_rec)
    rn: Dict[str, Any]
    if isinstance(rn_sched, dict):
        rn = dict(rn_sched)
        rn["queueSchedulerNextCard"] = rn_sched.get("nextCard")
        rn["plannerRecommendedNextCard"] = planner_rec
        if isinstance(walked, str) and walked.strip():
            rn["nextCard"] = walked.strip()
            if walked.strip() != rn_sched.get("nextCard"):
                rn["reason"] = "mainline_spine_planner_walk_after_queue_completed_v1"
    else:
        rn = rn_sched if isinstance(rn_sched, dict) else {}
    qc_snap = (snap.get("cards") or {}) if isinstance(snap, dict) else {}
    spine_list = load_queue_spine_v1(root)
    spine_next_incomplete: Optional[str] = None
    for cn in spine_list:
        info = qc_snap.get(cn) if isinstance(qc_snap.get(cn), dict) else None
        st = info.get("state") if isinstance(info, dict) else None
        if st != "completed":
            spine_next_incomplete = cn
            break
    if isinstance(rn, dict):
        rn = dict(rn)
        rn["queueSpineV1"] = {
            "head": spine_list[0] if spine_list else None,
            "length": len(spine_list),
            "cards": spine_list,
            "nextIncompleteInQueueSnapshot": spine_next_incomplete,
        }
    if _mainline_final_four_queue_complete(qc_snap) or _mainline_completion_sentinel_ok(root):
        if isinstance(rn, dict):
            rn = dict(rn)
            rn["nextCard"] = _MAINLINE_SEAL_CARD
            rn["mainlineFinalTrunkComplete"] = True
            rn["reason"] = "mainline_final_four_queue_or_sentinel_completion_v1"
    next_card = rn.get("nextCard") if isinstance(rn, dict) else None
    stops = _stop_reasons(root, gate=gate, pending_hg=len(pending), next_card=next_card)

    qpath = snapshot_path(root)

    def _rel_or_abs(p: Path) -> str:
        try:
            return str(p.resolve().relative_to(root))
        except ValueError:
            return str(p.resolve())

    single_flight = {
        "runningCards": running,
        "runningCount": len(running),
        "parallelPolicy": (snap or {}).get("parallelPolicy"),
        "snapshotPath": _rel_or_abs(qpath),
    }

    campaign_state_path = root / _TOUCH_FILES["campaignState"]
    camp_state = _load_json(campaign_state_path)
    campaign_snap = build_campaign_report(root, state=camp_state)

    workspace_light: Dict[str, Any] = {}
    if not skip_heavy:
        try:
            workspace_light = build_workspace_snapshot(root, skip_api_build=True)
        except OSError:
            workspace_light = {"error": "workspace_snapshot_failed"}

    if skip_heavy:
        ws_obs: Dict[str, Any] = {"skipped": True}
    else:
        ws_obs = {
            "readyForApply": workspace_light.get("readyForApply"),
            "readyForApplyApplySafe": workspace_light.get("readyForApplyApplySafe"),
            "readyViolations": workspace_light.get("readyViolations"),
        }
        if workspace_light.get("error"):
            ws_obs["error"] = workspace_light["error"]

    sub = {
        "touchFiles": _subsystem_touch(root),
        "queueSnapshotLoaded": snap is not None,
        "humanGatePendingCount": len(pending),
        "executionGate": {
            "decision": gate.get("decision"),
            "reasonCategories": list(gate.get("reasonCategories") or []),
        },
        "workspaceObserver": ws_obs,
    }

    would_proceed = (
        len(stops) == 0
        and gate.get("decision") == "executable"
        and len(running) <= 1
        and not (len(running) == 1)
    )
    if len(running) == 1:
        would_proceed = False

    return {
        "version": VERSION,
        "cardName": CARD_NAME,
        "generatedAt": _utc_now_iso(),
        "repoRoot": str(root),
        "subsystems": sub,
        "singleFlight": single_flight,
        "stopReasons": stops,
        "runNext": rn,
        "campaignSnapshot": campaign_snap,
        "wouldAutopilotProceed": would_proceed,
        "meta": {
            "schemaRelative": "api/automation/full_autopilot_schema_v1.json",
            "reportJsonRelative": f"api/automation/reports/{REPORT_JSON}",
            "reportMdRelative": f"api/automation/reports/{REPORT_MD}",
        },
    }


def emit_markdown(rep: Dict[str, Any]) -> str:
    lines = [
        f"# {rep.get('cardName')}",
        "",
        f"- **wouldAutopilotProceed**: `{rep.get('wouldAutopilotProceed')}`",
        f"- **stopReasons**: `{rep.get('stopReasons')}`",
        f"- **executionGate**: `{rep.get('subsystems', {}).get('executionGate')}`",
        f"- **runNext**: `{rep.get('runNext')}`",
        "",
        "## touchFiles",
        "```json",
        json.dumps(
            (rep.get("subsystems") or {}).get("touchFiles") or {},
            ensure_ascii=False,
            indent=2,
        ),
        "```",
        "",
    ]
    return "\n".join(lines)


def load_schema_required(schema_path: Path) -> List[str]:
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    req = data.get("required")
    if not isinstance(req, list):
        raise ValueError("schema missing required array")
    return [str(x) for x in req]


def check_report(rep: Dict[str, Any], schema_path: Path) -> Tuple[bool, List[str]]:
    errs: List[str] = []
    for k in load_schema_required(schema_path):
        if k not in rep:
            errs.append(f"missing:{k}")
    if rep.get("version") != VERSION:
        errs.append("bad_version")
    if rep.get("cardName") != CARD_NAME:
        errs.append("bad_cardName")
    if not isinstance(rep.get("stopReasons"), list):
        errs.append("stopReasons")
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    ap.add_argument(
        "--run-next",
        action="store_true",
        help="(Deprecated: always on) Reserved for CLI compatibility.",
    )
    ap.add_argument(
        "--run-campaign",
        action="store_true",
        help="(Deprecated: always on) Reserved for CLI compatibility.",
    )
    ap.add_argument(
        "--skip-heavy",
        action="store_true",
        help="Skip live workspace_observer build_snapshot (faster).",
    )
    args = ap.parse_args()

    root = (args.repo_root or repo_root_from(Path.cwd())).resolve()
    rep = build_full_summary(
        root,
        skip_heavy=bool(args.skip_heavy),
    )
    schema_path = root / "api" / "automation" / "full_autopilot_schema_v1.json"

    if args.check_json:
        if not schema_path.is_file():
            print(json.dumps({"ok": False, "error": "schema_missing"}, indent=2))
            return 1
        ok, errs = check_report(rep, schema_path)
        if not ok:
            print(json.dumps({"ok": False, "checkErrors": errs}, indent=2))
            return 1

    if args.emit_report:
        rdir = root / "api" / "automation" / "reports"
        _atomic_write_text(rdir / REPORT_JSON, json.dumps(rep, ensure_ascii=False, indent=2) + "\n")
        _atomic_write_text(rdir / REPORT_MD, emit_markdown(rep))

    if args.stdout_json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))

    if not args.stdout_json and not args.emit_report:
        print(
            json.dumps(
                {
                    "ok": True,
                    "wouldAutopilotProceed": rep.get("wouldAutopilotProceed"),
                    "hint": "use --stdout-json --run-next --run-campaign",
                },
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
