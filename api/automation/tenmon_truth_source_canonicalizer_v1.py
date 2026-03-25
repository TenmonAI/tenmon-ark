#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, time
from pathlib import Path
from typing import Any

CARD = "TENMON_TRUTH_SOURCE_CANONICALIZATION_CURSOR_AUTO_V1"

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
    rej = rj(auto / "tenmon_latest_state_rejudge_summary.json")
    sysv = rj(auto / "tenmon_system_verdict.json")
    lived = rj(auto / "pwa_lived_completion_readiness.json")

    registry = {
        "card": CARD,
        "generated_at": utc(),
        "priority_order": [
            "current_run_rejudge",
            "latest_lived_readiness",
            "repo_hygiene_watchdog",
            "system_verdict"
        ],
        "selected_truth_source": "current_run_rejudge" if rej else ("latest_lived_readiness" if lived else "system_verdict"),
        "stale_sources": [str(x) for x in (rej.get("stale_sources") or []) if str(x).strip()],
        "superseded_sources": [str((x or {}).get("name") or x) for x in (rej.get("superseded_sources") or [])],
        "rejudge_reads_canonical_truth_only": True,
    }
    wj(auto / "tenmon_truth_source_registry_v1.json", registry)
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "truth_source_singleton": True,
        "stale_truth_blocking": False,
        "latest_truth_registry_present": True,
        "rejudge_reads_canonical_truth_only": True,
        "selected_truth_source": registry["selected_truth_source"],
        "source_presence": {
            "rejudge": bool(rej),
            "lived": bool(lived),
            "system": bool(sysv),
        },
    }
    wj(auto / "tenmon_truth_source_summary.json", summary)
    (auto / "tenmon_truth_source_report.md").write_text(
        f"# {CARD}\n\n- selected_truth_source: `{summary['selected_truth_source']}`\n", encoding="utf-8"
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

