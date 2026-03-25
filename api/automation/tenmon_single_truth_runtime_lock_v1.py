#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SINGLE_TRUTH_RUNTIME_LOCK_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(p: Path) -> dict[str, Any]:
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"

    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    lived = read_json(auto / "pwa_lived_completion_readiness.json")
    hygiene = read_json(auto / "tenmon_repo_hygiene_watchdog_verdict.json")
    system = read_json(auto / "tenmon_system_verdict.json")

    stale = [str(x) for x in (rejudge.get("stale_sources") or []) if str(x).strip()]
    superseded = [str((x or {}).get("name") or x) for x in (rejudge.get("superseded_sources") or [])]

    sources = [
        {"name": "current_run_runtime_gate", "path": "http://127.0.0.1:3000/api/health|audit|audit.build", "priority": 1, "valid": True},
        {"name": "current_run_rejudge", "path": str(auto / "tenmon_latest_state_rejudge_summary.json"), "priority": 2, "valid": bool(rejudge)},
        {"name": "latest_lived_readiness", "path": str(auto / "pwa_lived_completion_readiness.json"), "priority": 3, "valid": bool(lived)},
        {"name": "latest_repo_hygiene_watchdog", "path": str(auto / "tenmon_repo_hygiene_watchdog_verdict.json"), "priority": 4, "valid": bool(hygiene)},
        {"name": "latest_system_verdict", "path": str(auto / "tenmon_system_verdict.json"), "priority": 5, "valid": bool(system)},
    ]
    selected = next((s for s in sources if s["valid"]), sources[0])
    conflicts = [s["name"] for s in sources if s["valid"] and s["name"] != selected["name"]]

    registry = {
        "card": CARD,
        "generated_at": utc(),
        "truth_source_selected": selected["name"],
        "truth_source_selected_path": selected["path"],
        "truth_conflict_detected": len(conflicts) > 0,
        "truth_conflict_sources": conflicts,
        "stale_sources": stale,
        "superseded_sources": superseded,
        "stale_risk": {
            "missing_generated_at": any("missing_generated_at" in x for x in stale),
            "older_than_latest_refresh": len(stale) > 0,
        },
        "priority_order": [s["name"] for s in sorted(sources, key=lambda x: x["priority"])],
    }
    write_json(auto / "single_truth_registry_v1.json", registry)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "single_truth_locked": True,
        "truth_source_selected": registry["truth_source_selected"],
        "truth_conflict_detected": registry["truth_conflict_detected"],
        "stale_count": len(stale),
        "superseded_count": len(superseded),
    }
    write_json(auto / "tenmon_single_truth_runtime_lock_summary.json", summary)
    (auto / "tenmon_single_truth_runtime_lock_report.md").write_text(
        f"# {CARD}\n\n- truth_source_selected: `{summary['truth_source_selected']}`\n"
        f"- truth_conflict_detected: `{summary['truth_conflict_detected']}`\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

