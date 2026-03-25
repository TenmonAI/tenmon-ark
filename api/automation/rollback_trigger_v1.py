#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""rollback 実行候補 + 実施条件（自動実行はしない）"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from self_repair_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def build(fc: Dict[str, Any]) -> Dict[str, Any]:
    primary = fc.get("primary_fail_type") or "runtime_regression"
    candidates: List[Dict[str, Any]] = [
        {
            "action": "git_reset_soft",
            "command_hint": "git reset --soft HEAD~1",
            "when": ["build_fail", "dangerous_patch", "learning_quality_fail"],
            "requires_human_approval": True,
        },
        {
            "action": "systemd_restart_only",
            "command_hint": "sudo systemctl restart tenmon-ark-api.service",
            "when": ["health_fail", "audit_fail", "restart_fail"],
            "requires_human_approval": True,
        },
        {
            "action": "revert_last_commit",
            "command_hint": "git revert --no-commit HEAD",
            "when": [
                "surface_regression",
                "surface_noise_fail",
                "runtime_regression",
                "route_probe_fail",
                "runtime_probe_fail",
                "route_authority_fail",
            ],
            "requires_human_approval": True,
        },
    ]
    eligible = [c for c in candidates if primary in (c.get("when") or [])]
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "primary_fail_type": primary,
        "execution_candidates": eligible or candidates[:1],
        "conditions": {
            "may_execute": False,
            "policy": "proposal_only_until_TENMON_ROLLBACK_APPROVED=1",
            "note": "本番での自動 rollback は既定禁止。VPS で承認後に手動実行。",
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="rollback_trigger_v1")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    auto = api_automation()
    fc = _read(auto / "fail_classification.json")
    body = build(fc)
    out = Path(args.out) if args.out else auto / "rollback_trigger_report.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
