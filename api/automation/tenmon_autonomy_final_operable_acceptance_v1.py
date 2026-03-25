#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aggregate current-run evidence into final operable acceptance (not worldclass claim)."""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1"
OVERNIGHT_RESUME_CARD = "TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1"
DEFAULT_NEXT_FRONTIER = "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1"

BAND_SAFE = "OPERABLE_SAFE_AUTONOMY"
BAND_PARTIAL = "PARTIAL_OPERABLE_NEEDS_MANUAL_REVIEW"
BAND_NOT = "NOT_OPERABLE"


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


def has_generated_at(obj: dict[str, Any]) -> bool:
    return bool(obj.get("generated_at") or obj.get("timestamp") or obj.get("generatedAt"))


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_autonomy_final_operable_acceptance_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    sixchain = os.environ.get("TENMON_OPERABLE_6CARD_MODE", "").strip().lower() in ("1", "true", "yes")

    fl = read_json(auto / "tenmon_autonomy_first_live_summary.json")
    rcl = read_json(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json")
    ov = read_json(auto / "tenmon_overnight_full_autonomy_summary.json")
    rejudge = read_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    system_v = read_json(auto / "tenmon_system_verdict.json")
    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    dpb = read_json(auto / "dangerous_patch_blocker_report.json")
    stale_rebase = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    stale_inv = read_json(auto / "tenmon_stale_evidence_invalidation_verdict.json")
    gate = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")

    mac = read_json(auto / "tenmon_mac_cursor_executor_runtime_bind_summary.json")
    hr = read_json(auto / "tenmon_high_risk_approval_contract_summary.json")
    ov_resume = read_json(auto / "tenmon_overnight_resume_summary.json")

    sources_ok = all(
        has_generated_at(x)
        for x in (fl, rcl, ov, rejudge, system_v, scorecard, dpb, stale_rebase)
    )
    if sixchain:
        sources_ok = sources_ok and all(
            has_generated_at(x) for x in (mac, hr, ov_resume)
        )

    first_live_bootstrap_proven = (
        safe_bool(fl.get("bootstrap_validation_pass"))
        and safe_bool(fl.get("first_live_cycle_pass"))
        and safe_bool(fl.get("current_run_evidence_ok"))
    )

    real_closed_loop_proven = safe_bool(rcl.get("real_closed_loop_proven"))

    overnight_resume_proven = (
        str(ov.get("card") or "").strip() == OVERNIGHT_RESUME_CARD
        and safe_bool(ov.get("precondition_pass"))
        and int(ov.get("cycle_count") or 0) >= 1
        and safe_bool(ov.get("current_run_evidence_ok"))
        and safe_bool(ov.get("safe_scope_enforced"))
        and safe_bool(ov.get("resume_possible"))
    )

    if has_generated_at(ov_resume):
        overnight_cycle_alive = (
            safe_bool(ov_resume.get("overnight_resumed"))
            and int(ov_resume.get("cycle_count") or 0) >= 1
            and safe_bool(ov_resume.get("current_run_evidence_ok"))
            and safe_bool(ov_resume.get("safe_scope_enforced"))
        )
    else:
        overnight_cycle_alive = overnight_resume_proven

    mac_bind_ok = has_generated_at(mac) and safe_bool(mac.get("current_run_bind_ok"))
    if sixchain and not has_generated_at(mac):
        mac_bind_ok = False

    high_risk_approval_enforced = has_generated_at(hr) and safe_bool(hr.get("approval_contract_pass"))
    if sixchain and not has_generated_at(hr):
        high_risk_approval_enforced = False

    service_operable = (
        safe_bool(rejudge.get("health_ok"))
        and not safe_bool(rejudge.get("env_failure"))
        and safe_bool(rejudge.get("audit_ok"))
    )

    stale_count = int(stale_rebase.get("stale_sources_count", 0) or 0)
    stale_fatal = bool(stale_inv) and safe_bool(stale_inv.get("fatal"))
    stale_truth_not_fatal = stale_count == 0 and not stale_fatal

    safe_scope_operable = safe_bool(fl.get("safe_scope_enforced")) and safe_bool(ov.get("safe_scope_enforced"))

    dpb_blocked = safe_bool(dpb.get("blocked"))
    gate_pass = safe_bool(gate.get("pass"))
    gate_must_block = safe_bool(gate.get("must_block"))
    high_risk_auto_patch_still_blocked_or_explicitly_green = dpb_blocked or (
        not dpb_blocked and gate_pass and not gate_must_block
    )

    next_from_sys = str(system_v.get("final_recommended_card") or "").strip()
    next_from_score = str(scorecard.get("recommended_next_card") or "").strip()
    next_frontier_candidate = next_from_sys or next_from_score or DEFAULT_NEXT_FRONTIER
    next_frontier_clear = bool(next_from_sys or next_from_score)

    high_risk_auto_patch_allowed = not dpb_blocked

    next_frontier = next_frontier_candidate

    first_live_pass = first_live_bootstrap_proven
    current_run_evidence_ok_chain = (
        sources_ok
        and safe_bool(fl.get("current_run_evidence_ok"))
        and safe_bool(rcl.get("current_run_evidence_ok", True))
    )

    if sixchain:
        core_flags = [
            first_live_bootstrap_proven,
            real_closed_loop_proven,
            overnight_cycle_alive,
            mac_bind_ok,
            high_risk_approval_enforced,
            service_operable,
            stale_truth_not_fatal,
            safe_scope_operable,
            high_risk_auto_patch_still_blocked_or_explicitly_green,
        ]
    else:
        core_flags = [
            first_live_bootstrap_proven,
            real_closed_loop_proven,
            overnight_resume_proven,
            service_operable,
            stale_truth_not_fatal,
            safe_scope_operable,
            high_risk_auto_patch_still_blocked_or_explicitly_green,
        ]
    core_count = sum(1 for x in core_flags if x)

    pass_strict = all(core_flags) and sources_ok
    if sixchain:
        pass_strict = pass_strict and current_run_evidence_ok_chain

    if pass_strict:
        operable_band = BAND_SAFE
    elif core_count >= (6 if sixchain else 5) and sources_ok:
        operable_band = BAND_PARTIAL
    else:
        operable_band = BAND_NOT

    conditional_pass = (not pass_strict) and (operable_band == BAND_PARTIAL)

    operable_autonomy_ready = pass_strict and operable_band == BAND_SAFE

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "six_card_chain_mode": sixchain,
        "sources_current_run_evidence_ok": sources_ok,
        "first_live_bootstrap_proven": first_live_bootstrap_proven,
        "first_live_pass": first_live_pass,
        "real_closed_loop_proven": real_closed_loop_proven,
        "overnight_resume_proven": overnight_resume_proven,
        "overnight_cycle_alive": overnight_cycle_alive,
        "mac_bind_ok": mac_bind_ok,
        "high_risk_approval_enforced": high_risk_approval_enforced,
        "service_operable": service_operable,
        "stale_truth_not_fatal": stale_truth_not_fatal,
        "safe_scope_operable": safe_scope_operable,
        "high_risk_auto_patch_still_blocked_or_explicitly_green": high_risk_auto_patch_still_blocked_or_explicitly_green,
        "next_frontier_clear": next_frontier_clear,
        "high_risk_auto_patch_allowed": high_risk_auto_patch_allowed,
        "operable_band": operable_band,
        "pass": pass_strict,
        "conditional_pass": conditional_pass,
        "current_run_evidence_ok": current_run_evidence_ok_chain,
        "operable_autonomy_ready": operable_autonomy_ready,
        "next_frontier": next_frontier,
        "inputs": {
            "first_live": str(auto / "tenmon_autonomy_first_live_summary.json"),
            "real_closed_loop": str(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json"),
            "overnight": str(auto / "tenmon_overnight_full_autonomy_summary.json"),
            "overnight_resume": str(auto / "tenmon_overnight_resume_summary.json"),
            "mac_bind": str(auto / "tenmon_mac_cursor_executor_runtime_bind_summary.json"),
            "high_risk_contract": str(auto / "tenmon_high_risk_approval_contract_summary.json"),
            "rejudge": str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
            "system_verdict": str(auto / "tenmon_system_verdict.json"),
            "worldclass_scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            "dangerous_patch_blocker": str(auto / "dangerous_patch_blocker_report.json"),
        },
    }

    summary_path = auto / "tenmon_autonomy_final_operable_acceptance_summary.json"
    report_path = auto / "tenmon_autonomy_final_operable_acceptance_report.md"
    write_json(summary_path, out)

    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{out['generated_at']}`",
        f"- sources_current_run_evidence_ok: `{out['sources_current_run_evidence_ok']}`",
        "",
        "## Criteria",
        "",
        f"- first_live_bootstrap_proven: `{first_live_bootstrap_proven}`",
        f"- real_closed_loop_proven: `{real_closed_loop_proven}`",
        f"- overnight_resume_proven: `{overnight_resume_proven}`",
        f"- overnight_cycle_alive: `{overnight_cycle_alive}`",
        f"- mac_bind_ok: `{mac_bind_ok}`",
        f"- high_risk_approval_enforced: `{high_risk_approval_enforced}`",
        f"- service_operable: `{service_operable}`",
        f"- stale_truth_not_fatal: `{stale_truth_not_fatal}`",
        f"- safe_scope_operable: `{safe_scope_operable}`",
        f"- high_risk_auto_patch_still_blocked_or_explicitly_green: `{high_risk_auto_patch_still_blocked_or_explicitly_green}`",
        f"- next_frontier_clear: `{next_frontier_clear}`",
        "",
        "## Band",
        "",
        f"- operable_band: `{operable_band}`",
        f"- pass: `{pass_strict}`",
        f"- conditional_pass: `{conditional_pass}`",
        f"- operable_autonomy_ready: `{operable_autonomy_ready}`",
        f"- six_card_chain_mode: `{sixchain}`",
        f"- next_frontier: `{next_frontier}`",
        "",
        "## Policy",
        "",
        "Operable acceptance は worldclass 完了宣言ではない。safe autonomy の実運用可否と frontier の明示のみを固定する。",
        "",
    ]
    report_path.write_text("\n".join(lines), encoding="utf-8")

    if pass_strict:
        return 0
    if conditional_pass:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
