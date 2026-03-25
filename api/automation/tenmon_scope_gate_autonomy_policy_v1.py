#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SCOPE_GATE_AUTONOMY_POLICY_CURSOR_AUTO_V1"


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
    hard = rj(auto / "tenmon_execution_gate_hardstop_verdict.json")
    hyg = rj(auto / "tenmon_repo_hygiene_final_seal_summary.json")
    wc = rj(auto / "tenmon_worldclass_completion_oracle_summary.json")

    hardstop = bool(hard.get("pass"))
    clean = bool(hyg.get("repo_hygiene_clean"))
    route_surface_only = bool((wc.get("route_surface_only") if wc else False))
    if not hardstop:
        allowed = "safe"
    elif hardstop and clean and route_surface_only:
        allowed = "high_risk"
    elif hardstop and clean:
        allowed = "medium"
    else:
        allowed = "safe"

    policy = {
        "version": 1,
        "card": CARD,
        "generated_at": utc(),
        "safe_scope": ["api/automation/**", "api/scripts/**", "api/docs/constitution/**"],
        "medium_scope": ["api/src/core/**", "api/src/kokuzo/**", "api/src/routes/chat_refactor/**"],
        "high_risk_scope": ["api/src/routes/chat.ts", "api/src/routes/chat_refactor/finalize.ts", "web/src/**"],
        "gate_state": {
            "hardstop_true": hardstop,
            "repo_hygiene_clean": clean,
            "worldclass_route_surface_only": route_surface_only,
            "allowed_max_scope": allowed,
        },
    }
    wj(auto / "operations_scope_policy_v1.json", policy)
    wj(
        auto / "tenmon_scope_gate_autonomy_policy_summary.json",
        {
            "card": CARD,
            "generated_at": utc(),
            "scope_gate_enforced": True,
            "allowed_max_scope": allowed,
        },
    )
    (auto / "tenmon_scope_gate_autonomy_policy_report.md").write_text(
        f"# {CARD}\n\n- allowed_max_scope: `{allowed}`\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

