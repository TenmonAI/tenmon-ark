#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_CURSOR_AUTO_V1 — registry + trace + gate 整合。"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_bool(x: Any) -> bool:
    return bool(x is True or x == 1 or x == "true")


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_high_risk_approval_contract_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    policy_path = auto / "high_risk_approval_policy_v1.json"
    default_policy = {
        "card": CARD,
        "generated_at": utc(),
        "high_risk_globs": [
            "api/src/routes/chat.ts",
            "api/src/routes/chat_refactor/finalize.ts",
            "web/src/**",
        ],
        "approval_required": True,
        "seal_only_after_acceptance_pass": True,
    }
    if not policy_path.is_file():
        write_json(policy_path, default_policy)
    policy = read_json(policy_path, default_policy)

    registry = policy.get("high_risk_globs") or []
    high_risk_registry_fixed = len(registry) >= 3 and any("chat.ts" in str(x) for x in registry)

    explicit = read_json(auto / "tenmon_high_risk_explicit_approval_v1.json")
    explicit_ok = safe_bool(explicit.get("approved")) and has_generated_at_explicit(explicit)

    gate = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")
    dpb = read_json(auto / "dangerous_patch_blocker_report.json")

    # seal gate: hardstop が high-risk をブロックしている、または明示承認
    seal_gate_bound = (
        explicit_ok
        or (safe_bool(gate.get("must_block")) and bool(gate.get("high_risk_targets")))
        or safe_bool(dpb.get("blocked"))
    )

    trace_path = auto / "tenmon_high_risk_approval_trace_v1.json"
    trace = {
        "card": CARD,
        "generated_at": utc(),
        "policy_path": str(policy_path),
        "explicit_approval_present": explicit_ok,
        "gate_must_block": safe_bool(gate.get("must_block")),
        "dangerous_patch_blocked": safe_bool(dpb.get("blocked")),
        "no_auto_apply_without_approval": True,
    }
    write_json(trace_path, trace)

    approval_required_for_high_risk = safe_bool(policy.get("approval_required"))
    approval_trace_persisted = trace_path.is_file() and bool(read_json(trace_path).get("generated_at"))

    out = {
        "card": CARD,
        "generated_at": utc(),
        "high_risk_registry_fixed": high_risk_registry_fixed,
        "approval_required_for_high_risk": approval_required_for_high_risk,
        "approval_trace_persisted": approval_trace_persisted,
        "seal_gate_bound": seal_gate_bound,
        "approval_contract_pass": False,
    }
    out["approval_contract_pass"] = (
        high_risk_registry_fixed
        and approval_required_for_high_risk
        and approval_trace_persisted
        and seal_gate_bound
    )

    summary_path = auto / "tenmon_high_risk_approval_contract_summary.json"
    report_path = auto / "tenmon_high_risk_approval_contract_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- high_risk_registry_fixed: `{out['high_risk_registry_fixed']}`",
                f"- approval_required_for_high_risk: `{out['approval_required_for_high_risk']}`",
                f"- approval_trace_persisted: `{out['approval_trace_persisted']}`",
                f"- seal_gate_bound: `{out['seal_gate_bound']}`",
                f"- approval_contract_pass: `{out['approval_contract_pass']}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return 0 if out["approval_contract_pass"] else 1


def has_generated_at_explicit(obj: dict[str, Any]) -> bool:
    return bool(obj.get("generated_at") or obj.get("generatedAt"))


if __name__ == "__main__":
    raise SystemExit(main())
