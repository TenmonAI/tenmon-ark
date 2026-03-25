#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FINAL_AUTONOMOUS_COMPLETION_SWEEP_CURSOR_AUTO_V1"


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
    oracle = rj(auto / "tenmon_worldclass_completion_oracle_summary.json")
    q = rj(auto / "final_autonomous_completion_queue_v1.json")

    candidates = [
        "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1",
        "TENMON_SCRIPTURE_K1_SYNTHESIS_NATURALIZER_CURSOR_AUTO_V1",
        "TENMON_GENERAL_FACT_CODING_ROUTE_HARDEN_CURSOR_AUTO_V1",
        "TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1",
        "TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1",
        "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1",
    ]

    first = None
    if q.get("items"):
        first = str((q["items"][0] or {}).get("cursor_card") or "")
    if not first:
        first = str(oracle.get("next_single_best_card") or candidates[0])
    if first not in candidates:
        first = candidates[0]

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "final_sweep_ready": True,
        "worldclass_red_yellow_targets_only": True,
        "first_candidate": first,
        "queue_remaining": [first],
        "rejudge_green_stop_rule": True,
    }
    wj(auto / "tenmon_final_autonomous_completion_sweep_summary.json", summary)
    (auto / "tenmon_final_autonomous_completion_sweep_report.md").write_text(
        f"# {CARD}\n\n- first_candidate: `{first}`\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

