#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTO_BUILD_MULTI_CARD_CAMPAIGN_V1 — multi-card campaign planner (single_flight aware).
Read-only integration with queue, human gate, execution gate, replay audit pointers.
Does not execute runner or modify runtime services.
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

from execution_gate_v1 import evaluate_gate
from human_gate_store_v1 import list_pending_gates
from queue_store_v1 import load_snapshot
from repo_resolve_v1 import repo_root_from

CARD_NAME = "AUTO_BUILD_MULTI_CARD_CAMPAIGN_V1"
VERSION = 1
STATE_REL = "api/automation/_campaign/campaign_state_v1.json"
REPORT_JSON = "campaign_executor_v1.json"
REPORT_MD = "campaign_executor_v1.md"
REPLAY_AUDIT_REL = "api/automation/reports/replay_audit_v1.json"
DEFAULT_CARDS = [
    "CHAT_TRUNK_SUPPORT_SELFDIAG_SPLIT_V1_FINAL",
    "CHAT_TRUNK_GENERAL_SPLIT_V1_FINAL",
    "CHAT_TRUNK_INFRA_WRAPPER_SPLIT_V1_FINAL",
    "CHAT_TRUNK_RUNTIME_ACCEPTANCE_LOCK_V1_FINAL",
]


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


def _queue_running(snap: Optional[Dict[str, Any]]) -> Tuple[List[str], bool]:
    if not snap:
        return [], False
    running: List[str] = []
    cards = snap.get("cards") or {}
    for name, info in cards.items():
        if isinstance(info, dict) and info.get("state") == "running":
            running.append(str(name))
    running = sorted(running)
    bad = len(running) > 1
    pol = snap.get("parallelPolicy")
    if pol is not None and pol != "single_flight":
        bad = True
    return running, bad


def _campaign_phase(
    state: Optional[Dict[str, Any]],
    *,
    gate: Dict[str, Any],
    pending_hg: int,
    running: List[str],
    queue_bad: bool,
) -> str:
    if state is None:
        return "idle"
    if state.get("stopped"):
        return "stopped"
    cards = list(state.get("cards") or [])
    idx = int(state.get("index") or 0)
    if idx >= len(cards) and cards:
        return "completed"
    if pending_hg > 0:
        return "waiting_human_gate"
    dec = str(gate.get("decision") or "")
    if dec in ("invalid_scope", "blocked", "waiting_human_gate"):
        if dec == "waiting_human_gate":
            return "waiting_human_gate"
        return "blocked"
    if queue_bad or len(running) > 1:
        return "blocked"
    if len(running) == 1:
        return "blocked"
    if not cards:
        return "stopped"
    return "ready"


def _transition_preview(
    cards: List[str],
    phase: str,
    gate: Dict[str, Any],
    pending_hg: int,
    running: List[str],
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    gate_dec = gate.get("decision")
    for i, c in enumerate(cards):
        if pending_hg > 0:
            st = "would_pause_waiting_human_gate"
        elif gate_dec == "invalid_scope":
            st = "would_block_invalid_scope"
        elif gate_dec == "blocked":
            st = "would_block_execution_gate"
        elif len(running) > 1:
            st = "would_block_queue_corrupt"
        elif len(running) == 1:
            st = "would_block_single_flight_busy"
        else:
            st = "eligible_when_prior_steps_complete"
        out.append(
            {
                "step": i,
                "cardName": c,
                "transitionNote": st,
            }
        )
    if phase == "completed":
        out.append(
            {
                "step": len(cards),
                "cardName": "__CAMPAIGN_END__",
                "transitionNote": "completed",
            }
        )
    return out


def build_campaign_report(
    repo: Path,
    *,
    state: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    root = repo.resolve()
    gate = evaluate_gate(root)
    pending = list_pending_gates()
    snap = load_snapshot(root)
    running, q_bad = _queue_running(snap)

    phase = _campaign_phase(
        state,
        gate=gate,
        pending_hg=len(pending),
        running=running,
        queue_bad=q_bad,
    )
    cards = list((state or {}).get("cards") or [])
    preview_cards = cards if cards else list(DEFAULT_CARDS)

    replay_ptr = {
        "replayAuditReportRelative": REPLAY_AUDIT_REL,
        "exists": (root / REPLAY_AUDIT_REL).is_file(),
    }

    md_hint = (
        "キャンペーンは single_flight を前提に 1 カードずつ進行。human gate pending または "
        "execution gate が executable でない間は blocked / waiting。キューに running がある間は次に進めない。"
    )

    return {
        "version": VERSION,
        "cardName": CARD_NAME,
        "generatedAt": _utc_now_iso(),
        "repoRoot": str(root),
        "campaignPhase": phase,
        "cards": cards,
        "currentIndex": int((state or {}).get("index") or 0),
        "singleFlight": {
            "runningCards": running,
            "runningCount": len(running),
            "queueViolation": q_bad,
        },
        "executionGate": {
            "decision": gate.get("decision"),
            "reasonCategories": list(gate.get("reasonCategories") or []),
            "gateAllowsApply": gate.get("decision") == "executable",
        },
        "humanGate": {
            "pendingCount": len(pending),
            "pendingCardNames": [str(p.get("cardName", "")) for p in pending][:30],
        },
        "replayAuditPointer": replay_ptr,
        "transitionPreview": _transition_preview(
            preview_cards, phase, gate, len(pending), running
        ),
        "markdownHint": md_hint,
        "stateFileRelative": STATE_REL,
        "meta": {
            "schemaRelative": "api/automation/campaign_schema_v1.json",
            "reportJsonRelative": f"api/automation/reports/{REPORT_JSON}",
            "reportMdRelative": f"api/automation/reports/{REPORT_MD}",
        },
    }


def emit_markdown(rep: Dict[str, Any]) -> str:
    lines = [
        f"# {rep.get('cardName')}",
        "",
        f"- **phase**: `{rep.get('campaignPhase')}`",
        f"- **cards**: `{rep.get('cards')}`",
        f"- **executionGate**: `{rep.get('executionGate', {}).get('decision')}`",
        f"- **humanGate pending**: `{rep.get('humanGate', {}).get('pendingCount')}`",
        f"- **queue running**: `{rep.get('singleFlight', {}).get('runningCards')}`",
        "",
        "## transitionPreview",
        "```json",
        json.dumps(rep.get("transitionPreview") or [], ensure_ascii=False, indent=2),
        "```",
        "",
        rep.get("markdownHint") or "",
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
    return len(errs) == 0, errs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD_NAME)
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--emit-report", action="store_true")
    ap.add_argument("--check-json", action="store_true")
    ap.add_argument(
        "--campaign-start",
        action="store_true",
        help="Write campaign state with --cards (or defaults).",
    )
    ap.add_argument(
        "--campaign-status",
        action="store_true",
        help="Print phase (implicit when using --stdout-json with existing state).",
    )
    ap.add_argument(
        "--cards",
        default="",
        help="Comma-separated card names for --campaign-start.",
    )
    ap.add_argument("--stop", action="store_true", help="Mark campaign stopped in state file.")
    args = ap.parse_args()

    root = (args.repo_root or repo_root_from(Path.cwd())).resolve()
    state_path = root / Path(STATE_REL)
    state = _load_json(state_path)

    if args.campaign_start:
        raw = [c.strip() for c in str(args.cards).split(",") if c.strip()]
        seq = raw if raw else list(DEFAULT_CARDS)
        state = {
            "version": 1,
            "cards": seq,
            "index": 0,
            "stopped": False,
            "startedAt": _utc_now_iso(),
            "updatedAt": _utc_now_iso(),
        }
        _atomic_write_text(state_path, json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    elif args.stop and state:
        state = dict(state)
        state["stopped"] = True
        state["updatedAt"] = _utc_now_iso()
        _atomic_write_text(state_path, json.dumps(state, ensure_ascii=False, indent=2) + "\n")

    state = _load_json(state_path)
    rep = build_campaign_report(root, state=state)
    schema_path = root / "api" / "automation" / "campaign_schema_v1.json"

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

    if args.stdout_json or args.campaign_status:
        print(json.dumps(rep, ensure_ascii=False, indent=2))

    if not args.stdout_json and not args.emit_report and not args.campaign_status:
        print(
            json.dumps(
                {
                    "ok": True,
                    "campaignPhase": rep.get("campaignPhase"),
                    "hint": "use --campaign-start, --stdout-json, or --emit-report",
                },
                indent=2,
            )
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
