#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_CAMPAIGN_ORCHESTRATOR_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"

    truth = rj(auto / "tenmon_single_truth_runtime_lock_summary.json")
    scope = rj(auto / "tenmon_scope_gate_autonomy_policy_summary.json")
    oracle = rj(auto / "tenmon_worldclass_completion_oracle_summary.json")
    rejudge = rj(auto / "tenmon_latest_state_rejudge_summary.json")

    blocked: list[str] = []
    if not truth.get("single_truth_locked"):
        blocked.append("single_truth_not_locked")
    if not scope.get("scope_gate_enforced"):
        blocked.append("scope_gate_not_enforced")

    if blocked:
        next_card = None
    else:
        if any("stale" in str(x).lower() for x in (rejudge.get("remaining_blockers") or [])):
            next_card = "TENMON_LATEST_TRUTH_REBASE_AND_STALE_EVIDENCE_CLOSE_CURSOR_AUTO_V1"
        else:
            next_card = str(oracle.get("next_single_best_card") or "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1")

    policy = {
        "version": 1,
        "card": CARD,
        "generated_at": utc(),
        "priority_order": [
            "stale truth lock",
            "repo hygiene",
            "closed loop proof",
            "autonomy result verifier",
            "worldclass oracle",
            "conversation/meta leak fixes",
            "scripture naturalization",
            "technical/factual hardening",
            "final sweep"
        ],
        "one_card_only": True,
        "single_retry_lineage_only": True,
    }
    queue = {
        "version": 1,
        "card": CARD,
        "generated_at": utc(),
        "items": ([{"cursor_card": next_card, "reason": "single_best_card"}] if next_card else []),
        "blocked_reasons": blocked,
    }
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "campaign_orchestrator_ready": True,
        "blocked_reasons": blocked,
        "next_card_selected": next_card,
        "queue_size": len(queue["items"]),
    }
    wj(auto / "autonomy_campaign_policy_v1.json", policy)
    wj(auto / "final_autonomous_completion_queue_v1.json", queue)
    wj(auto / "tenmon_autonomy_campaign_orchestrator_summary.json", summary)
    (auto / "tenmon_autonomy_campaign_orchestrator_report.md").write_text(
        f"# {CARD}\n\n- next_card_selected: `{next_card}`\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

