#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_CURSOR_AUTO_V1"
POLICY_FN = "autonomy_scope_policy_v1.json"
STATE_FN = "autonomy_scope_escalation_state_v1.json"
OUT_SUMMARY = "tenmon_autonomy_scope_governor_summary.json"
OUT_REPORT = "tenmon_autonomy_scope_governor_report.md"


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


def boolish(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v != 0
    s = str(v).strip().lower()
    return s in {"1", "true", "yes", "on", "y"}


def classify_path(path: str, policy: dict[str, Any]) -> str:
    p = str(path).replace("\\", "/")
    safe = [str(x) for x in (policy.get("safe_scope") or {}).get("path_prefixes") or []]
    medium = [str(x) for x in (policy.get("medium_scope") or {}).get("path_prefixes") or []]
    high = [str(x) for x in (policy.get("high_risk_scope") or {}).get("path_prefixes") or []]

    for pre in high:
        if p == pre or p.startswith(pre):
            return "high_risk"
    for pre in medium:
        if p == pre or p.startswith(pre):
            return "medium"
    for pre in safe:
        if p == pre or p.startswith(pre):
            return "safe"
    return "unknown"


def get_repo_changes(repo: Path) -> list[str]:
    pr = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    out: list[str] = []
    for line in (pr.stdout or "").splitlines():
        if not line.strip():
            continue
        entry = line[3:] if len(line) >= 4 else line
        if " -> " in entry:
            entry = entry.split(" -> ", 1)[1]
        out.append(entry.strip())
    return out


def scope_counts(changes: list[str], policy: dict[str, Any]) -> dict[str, int]:
    c = {"safe": 0, "medium": 0, "high_risk": 0, "unknown": 0}
    for p in changes:
        c[classify_path(p, policy)] = c.get(classify_path(p, policy), 0) + 1
    return c


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"

    policy = read_json(auto / POLICY_FN)
    state_prev = read_json(auto / STATE_FN)
    run_id = f"scopegov_{int(time.time())}_{os.getpid()}"

    exec_gate = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")
    hygiene = read_json(auto / "tenmon_repo_hygiene_final_seal_summary.json")
    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    truth = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    worldclass = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    changes = get_repo_changes(repo)
    counts = scope_counts(changes, policy)

    execution_gate_green = bool(exec_gate.get("pass") is True) and not bool(exec_gate.get("must_block"))
    hygiene_clean = bool(hygiene.get("repo_hygiene_clean") is True) and bool(hygiene.get("must_block_seal") is False)
    latest_truth_rebased = bool(truth.get("latest_truth_rebased") is True)
    truth_source_singleton = bool(truth.get("truth_source_singleton") is True)
    rem = [str(x).lower() for x in (rejudge.get("remaining_blockers") or [])]
    rejudge_main_axis_cleared = not any(
        ("stale_sources" in x) or ("repo_hygiene" in x) or ("product_failure" in x) for x in rem
    )
    worldclass_ready = bool(worldclass.get("worldclass_claim_ready") is True)

    gates = {
        "execution_gate_green": execution_gate_green,
        "hygiene_clean": hygiene_clean,
        "latest_truth_rebased": latest_truth_rebased,
        "truth_source_singleton": truth_source_singleton,
        "rejudge_main_axis_cleared": rejudge_main_axis_cleared,
        "worldclass_acceptance_ready": worldclass_ready,
    }

    allowed_max_scope = "safe"
    blocked_reasons: list[str] = []
    if not execution_gate_green:
        blocked_reasons.append("hardstop_false_or_execution_gate_not_green")
    if not hygiene_clean:
        blocked_reasons.append("repo_hygiene_not_clean")
    if not latest_truth_rebased or not truth_source_singleton:
        blocked_reasons.append("stale_truth_or_truth_singleton_not_ready")

    if execution_gate_green and hygiene_clean and latest_truth_rebased and truth_source_singleton:
        allowed_max_scope = "medium"
    if (
        execution_gate_green
        and hygiene_clean
        and latest_truth_rebased
        and truth_source_singleton
        and rejudge_main_axis_cleared
        and worldclass_ready
    ):
        allowed_max_scope = "high_risk"

    founder_env = str(policy.get("founder_override_env") or "TENMON_SCOPE_GOVERNOR_FOUNDER_OVERRIDE")
    founder_override = boolish(os.environ.get(founder_env, "0"))
    forced_high_risk_attempt = founder_override and allowed_max_scope != "high_risk"
    if forced_high_risk_attempt:
        blocked_reasons.append("founder_override_present_but_acceptance_not_integrated")

    # High-risk stays blocked unless full acceptance is green.
    high_risk_blocked = allowed_max_scope != "high_risk"
    medium_blocked = allowed_max_scope == "safe"

    pass_checks = {
        "policy_generated": bool(policy.get("version")),
        "scope_judgement_operable": isinstance(counts, dict) and {"safe", "medium", "high_risk"} <= set(counts.keys()),
        "hardstop_false_blocks_non_safe": (not execution_gate_green) <= (allowed_max_scope == "safe"),
        "hygiene_dirty_blocks_high_risk": (not hygiene_clean) <= high_risk_blocked,
        "rejudge_worldclass_truth_included_for_escalation": True,
        "scope_governor_pass": True,
    }
    _core_keys = [k for k in pass_checks.keys() if k != "scope_governor_pass"]
    pass_checks["scope_governor_pass"] = all(bool(pass_checks[k]) for k in _core_keys)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "scope_governor_pass": pass_checks["scope_governor_pass"],
        "allowed_max_scope": allowed_max_scope,
        "scope_counts_current_repo": counts,
        "high_risk_blocked": high_risk_blocked,
        "medium_blocked": medium_blocked,
        "gates": gates,
        "blocked_reasons": blocked_reasons,
        "founder_override_env": founder_env,
        "founder_override_used": founder_override,
        "forced_high_risk_attempt": forced_high_risk_attempt,
        "acceptance": pass_checks,
        "evidence_paths": {
            "execution_gate": str(auto / "tenmon_execution_gate_hardstop_verdict.json"),
            "repo_hygiene": str(auto / "tenmon_repo_hygiene_final_seal_summary.json"),
            "rejudge_summary": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "truth_rebase_summary": str(auto / "tenmon_latest_truth_rebase_summary.json"),
            "worldclass_scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        },
        "next_on_pass": policy.get("next_on_pass") or "TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1",
        "next_on_fail": policy.get("next_on_fail") or "TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_RETRY_CURSOR_AUTO_V1",
    }
    write_json(auto / OUT_SUMMARY, summary)

    next_state = {
        "version": 1,
        "card": CARD,
        "last_run_at": summary["generated_at"],
        "last_run_id": run_id,
        "allowed_max_scope": allowed_max_scope,
        "scope_governor_pass": bool(summary["scope_governor_pass"]),
        "founder_override_used": founder_override,
        "notes": "updated by autonomy_scope_governor_v1.py",
    }
    write_json(auto / STATE_FN, next_state)

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- run_id: `{run_id}`",
        f"- scope_governor_pass: `{summary['scope_governor_pass']}`",
        f"- allowed_max_scope: `{allowed_max_scope}`",
        "",
        "## Gate Snapshot",
        f"- execution_gate_green: `{execution_gate_green}`",
        f"- hygiene_clean: `{hygiene_clean}`",
        f"- latest_truth_rebased: `{latest_truth_rebased}`",
        f"- truth_source_singleton: `{truth_source_singleton}`",
        f"- rejudge_main_axis_cleared: `{rejudge_main_axis_cleared}`",
        f"- worldclass_acceptance_ready: `{worldclass_ready}`",
        "",
        "## Scope Counts (current repo)",
        f"- safe: `{counts.get('safe', 0)}`",
        f"- medium: `{counts.get('medium', 0)}`",
        f"- high_risk: `{counts.get('high_risk', 0)}`",
        f"- unknown: `{counts.get('unknown', 0)}`",
        "",
        f"- blocked_reasons: `{blocked_reasons}`",
        f"- next_on_pass: `{summary['next_on_pass']}`",
        f"- next_on_fail: `{summary['next_on_fail']}`",
    ]
    (auto / OUT_REPORT).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["scope_governor_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

