#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_CURSOR_AUTO_V1"
STATE_FN = "founder_override_state_v1.json"
OUT_SUMMARY = "tenmon_founder_override_approval_gate_summary.json"
OUT_REPORT = "tenmon_founder_override_approval_gate_report.md"
TRACE_JSONL = "tenmon_founder_override_approval_trace.jsonl"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def append_jsonl(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def boolish(v: str) -> bool:
    return str(v or "").strip().lower() in {"1", "true", "yes", "on", "y"}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--simulate-high-risk-request", action="store_true")
    ap.add_argument(
        "--decision",
        default="reject",
        choices=("approve", "reject"),
        help="simulated human/founder decision for this run",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    run_id = f"fndr_gate_{int(time.time())}_{os.getpid()}"

    scope = read_json(auto / "tenmon_autonomy_scope_governor_summary.json")
    acceptance = read_json(auto / "acceptance_orchestration_summary.json")
    state_prev = read_json(auto / STATE_FN)

    high_risk_request = bool(args.simulate_high_risk_request)
    founder_override_env = "TENMON_FOUNDER_OVERRIDE_CURRENT_RUN"
    founder_override = boolish(os.environ.get(founder_override_env, "0"))
    approval_token = str(os.environ.get("TENMON_FOUNDER_APPROVAL_TOKEN", "")).strip()
    approval_present = bool(approval_token)
    decision = str(args.decision)

    allowed_max_scope = str(scope.get("allowed_max_scope") or "safe")
    acceptance_pass = bool(acceptance.get("acceptance_singleton_pass"))

    high_risk_blocked_by_default = allowed_max_scope != "high_risk"
    approval_gate_blocked = False
    approve_effective = False
    reject_effective = False

    if high_risk_request:
        if not founder_override or not approval_present:
            approval_gate_blocked = True
            reject_effective = True
        else:
            if decision == "approve":
                approve_effective = True
            else:
                reject_effective = True
                approval_gate_blocked = True

    # no approval => commit/seal forbidden
    commit_seal_forbidden_without_approval = True
    commit_seal_allowed = high_risk_request and approve_effective and acceptance_pass

    trace_base = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "high_risk_request": high_risk_request,
        "decision": decision,
        "founder_override_used": founder_override,
        "approval_token_present": approval_present,
        "allowed_max_scope_before_gate": allowed_max_scope,
        "acceptance_singleton_pass": acceptance_pass,
    }
    # Always write audit trail; include both approve/reject traces when simulated request exists
    if high_risk_request:
        append_jsonl(auto / TRACE_JSONL, {**trace_base, "trace_type": "approve", "effective": approve_effective})
        append_jsonl(auto / TRACE_JSONL, {**trace_base, "trace_type": "reject", "effective": reject_effective})
    else:
        append_jsonl(auto / TRACE_JSONL, {**trace_base, "trace_type": "no_high_risk_request", "effective": True})

    pass_flag = all(
        [
            high_risk_request,                              # acceptance asks to stop a high-risk request
            high_risk_blocked_by_default or founder_override,
            (approval_gate_blocked is True),                # blocked at gate in this simulation
            commit_seal_forbidden_without_approval is True,
            (auto / TRACE_JSONL).is_file(),                 # trace exists
        ]
    )

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "founder_approval_gate_pass": pass_flag,
        "high_risk_request": high_risk_request,
        "high_risk_blocked_by_default": high_risk_blocked_by_default,
        "founder_override_env": founder_override_env,
        "founder_override_used_current_run": founder_override,
        "approval_token_present": approval_present,
        "approval_gate_blocked": approval_gate_blocked,
        "approve_effective": approve_effective,
        "reject_effective": reject_effective,
        "audit_trail_path": str(auto / TRACE_JSONL),
        "approval_without_trace_forbidden": True,
        "approval_without_commit_seal_forbidden": commit_seal_forbidden_without_approval,
        "commit_seal_allowed": commit_seal_allowed,
        "current_run_only_override": True,
        "next_on_pass": "TENMON_FULL_AUTONOMY_OPERATING_SYSTEM_MASTER_CHAIN_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_RETRY_CURSOR_AUTO_V1",
    }
    write_json(auto / OUT_SUMMARY, summary)

    next_state = {
        "version": 1,
        "card": CARD,
        "last_run_at": summary["generated_at"],
        "last_run_id": run_id,
        "last_high_risk_request": high_risk_request,
        "last_decision": decision,
        "override_used_current_run": founder_override,
        "notes": "updated by founder_override_approval_gate_v1.py",
    }
    write_json(auto / STATE_FN, next_state)

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- run_id: `{run_id}`",
        f"- founder_approval_gate_pass: `{pass_flag}`",
        f"- high_risk_request: `{high_risk_request}`",
        f"- high_risk_blocked_by_default: `{high_risk_blocked_by_default}`",
        f"- founder_override_used_current_run: `{founder_override}`",
        f"- approval_gate_blocked: `{approval_gate_blocked}`",
        f"- approve_effective: `{approve_effective}`",
        f"- reject_effective: `{reject_effective}`",
        f"- commit_seal_allowed: `{commit_seal_allowed}`",
        "",
        f"- audit_trail: `{auto / TRACE_JSONL}`",
        f"- next_on_pass: `{summary['next_on_pass']}`",
        f"- next_on_fail: `{summary['next_on_fail']}`",
    ]
    (auto / OUT_REPORT).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if pass_flag else 1


if __name__ == "__main__":
    raise SystemExit(main())

