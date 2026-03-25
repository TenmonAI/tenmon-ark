#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_SAFE_PATCH_PLANNER_AND_GATE_CURSOR_AUTO_V1"

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    gaps = rj(auto / "tenmon_gap_backlog.json").get("items") or []
    gate = rj(auto / "tenmon_execution_gate_hardstop_verdict.json")
    green = bool(gate.get("pass")) and not bool(gate.get("must_block"))
    scope_policy = {
        "safe_scope": ["api/automation/**", "api/scripts/**", "api/docs/constitution/**"],
        "medium_scope": ["api/src/core/**", "api/src/kokuzo/**", "api/src/routes/chat_refactor/**"],
        "high_risk_scope": ["api/src/routes/chat.ts", "api/src/routes/chat_refactor/finalize.ts", "web/src/**"],
        "high_risk_requires_green_gate": True,
    }
    wj(auto / "tenmon_scope_gate_v1.json", scope_policy)
    safe_families = {"stale_truth", "repo_hygiene", "autonomy_runtime_gap", "route_contract_gap"}
    items = []
    for g in gaps:
        fam = str(g.get("family") or "")
        if fam in safe_families:
            items.append({"family": fam, "scope": "safe", "plan": "automation/scripts/docs only"})
        else:
            if green:
                items.append({"family": fam, "scope": "medium", "plan": "gated medium patch"})
    wj(auto / "tenmon_patch_candidate_queue.json", {"generated_at": utc(), "items": items})
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "safe_patch_queue_present": bool(items),
        "unsafe_patch_candidates_blocked": True,
        "high_risk_requires_green_gate": True,
    }
    wj(auto / "tenmon_safe_patch_planner_summary.json", summary)
    (auto / "tenmon_safe_patch_planner_report.md").write_text(
        f"# {CARD}\n\n- safe_patch_queue_present: `{summary['safe_patch_queue_present']}`\n",
        encoding="utf-8",
    )
    return 0 if summary["safe_patch_queue_present"] else 1

if __name__ == "__main__":
    raise SystemExit(main())

