#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""alternate_strategy.json — 失敗型ごとの代替戦略 + rollback 提案"""
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


def strategies_for(ft: str) -> List[Dict[str, Any]]:
    m: Dict[str, List[Dict[str, Any]]] = {
        "build_fail": [
            {"id": "fix_types_then_rebuild", "steps": ["npm run check", "npm run build"], "one_change_per_round": True},
        ],
        "health_fail": [
            {"id": "restart_then_probe", "steps": ["systemctl restart", "curl /health"], "one_change_per_round": True},
        ],
        "audit_fail": [
            {"id": "verify_db_readiness", "steps": ["check audit logs", "readiness stage"], "one_change_per_round": True},
        ],
        "route_probe_fail": [
            {"id": "isolate_chat_route", "steps": ["verify /api/chat discover", "no contract change"], "one_change_per_round": True},
        ],
        "runtime_probe_fail": [
            {"id": "runtime_matrix_minimal_diff", "steps": ["runtime_probe_matrix.json", "1 route / 1 timeout fix"], "one_change_per_round": True},
        ],
        "surface_regression": [
            {"id": "stage1_surface_card", "steps": ["CHAT_TS_STAGE1_SURFACE_POLISH_CURSOR_AUTO_V1"], "one_change_per_round": True},
        ],
        "surface_noise_fail": [
            {"id": "surface_noise_isolation", "steps": ["seal_contract diff", "stage1 surface polish"], "one_change_per_round": True},
        ],
        "route_authority_fail": [
            {"id": "auth_boundary_probe", "steps": ["verify 401/403 source", "route middleware read-only"], "one_change_per_round": True},
        ],
        "learning_quality_fail": [
            {"id": "purge_low_quality_learning_inputs", "steps": ["priority_queue taxonomy", "seed/evidence scorer green"], "one_change_per_round": True},
        ],
        "runtime_regression": [
            {"id": "runtime_seal_then_residual", "steps": ["vps_acceptance_os", "residual manifest"], "one_change_per_round": True},
        ],
        "dangerous_patch": [
            {"id": "revert_minimal_diff", "steps": ["git revert", "re-run dangerous_patch_blocker"], "one_change_per_round": True},
        ],
        "restart_fail": [
            {"id": "journal_then_unit_check", "steps": ["journalctl -u", "systemctl status"], "one_change_per_round": True},
        ],
    }
    return m.get(ft, [{"id": "generic_repair", "steps": ["read fail_classification", "retry_queue"], "one_change_per_round": True}])


def build() -> Dict[str, Any]:
    auto = api_automation()
    fc = _read(auto / "fail_classification.json")
    primary = fc.get("primary_fail_type") or "runtime_regression"
    rb = {
        "execution_candidates": [
            {
                "action": "git_reset_soft",
                "when": ["build_fail", "dangerous_patch", "learning_quality_fail"],
                "requires_human_approval": True,
            },
            {
                "action": "systemd_restart_only",
                "when": ["health_fail", "audit_fail", "restart_fail"],
                "requires_human_approval": True,
            },
            {
                "action": "git_checkout_paths",
                "when": ["dangerous_patch"],
                "requires_human_approval": False,
                "env_auto": "TENMON_AUTO_ROLLBACK_DANGEROUS=1",
            },
        ],
        "conditions": {
            "auto_execute": False,
            "approval_env": "TENMON_ROLLBACK_APPROVED=1",
        },
    }
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "primary_fail_type": primary,
        "alternate_strategies": strategies_for(primary),
        "rollback_trigger": rb,
        "c14b3_note": "最小 diff で 1 変更=1 検証 (retry queue)",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="alternate_strategy_generator_v1")
    ap.add_argument("--out", type=str, default="")
    args = ap.parse_args()
    body = build()
    out = Path(args.out) if args.out else api_automation() / "alternate_strategy.json"
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
