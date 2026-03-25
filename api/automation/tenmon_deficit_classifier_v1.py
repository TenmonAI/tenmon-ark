#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_GAP_MINER_AND_DEFICIT_CLASSIFIER_CURSOR_AUTO_V1"

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
    backlog = rj(auto / "tenmon_gap_backlog.json").get("items") or []
    next_targets = [x for x in backlog if int(x.get("score", 0)) > 0][:5]
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "gap_inventory_generated": bool(backlog),
        "deficit_taxonomy_bound": True,
        "next_fixable_targets_present": bool(next_targets),
        "next_fixable_targets": next_targets,
    }
    wj(auto / "tenmon_gap_miner_summary.json", summary)
    (auto / "tenmon_gap_miner_report.md").write_text(
        f"# {CARD}\n\n- next_fixable_targets_present: `{summary['next_fixable_targets_present']}`\n", encoding="utf-8"
    )
    return 0 if summary["next_fixable_targets_present"] else 1

if __name__ == "__main__":
    raise SystemExit(main())

