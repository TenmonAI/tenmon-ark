#!/usr/bin/env python3
"""
Minimal regression heuristics (static). Does not execute LLM or smoke servers by default.
v1: conservative — avoids false positives on chat.ts; extend with project smoke later.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class RegressionReport:
    ok: bool
    issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {"ok": self.ok, "issues": self.issues}


def check_build_then_health_anomaly(*, build_ok: bool, health_ok: bool) -> RegressionReport:
    if build_ok and not health_ok:
        return RegressionReport(ok=False, issues=["build_pass_health_fail"])
    return RegressionReport(ok=True, issues=[])


def run_minimal_guards(repo_root: Path, *, build_ok: bool = True, health_ok: bool = True) -> Dict[str, Any]:
    """Placeholder hooks for routeReason / responsePlan / decisionFrame.ku deep checks (smoke-driven)."""
    r_build_health = check_build_then_health_anomaly(build_ok=build_ok, health_ok=health_ok)
    return {
        "ok": r_build_health.ok,
        "routeReason": {"ok": True, "issues": [], "note": "wire_smoke_or_ast_later"},
        "responsePlan": {"ok": True, "issues": [], "note": "wire_smoke_or_ast_later"},
        "decisionFrameKu": {"ok": True, "issues": [], "note": "enforce_object_via_smoke_contract"},
        "buildHealth": r_build_health.to_dict(),
    }


def json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"
