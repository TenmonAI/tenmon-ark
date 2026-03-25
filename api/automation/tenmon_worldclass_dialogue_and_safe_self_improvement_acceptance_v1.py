#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_CURSOR_AUTO_V1
会話品質 finish + 安全 PDCA + autonomy 系の統合最終 acceptance。
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_CURSOR_AUTO_V1"
PRECONDITION_CARD = "TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_AUTONOMY_CONTINUOUS_OPERATION_MODE_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_RETRY_CURSOR_AUTO_V1"


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
    ap = argparse.ArgumentParser(description="tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--skip-pdca-precondition",
        action="store_true",
        help="PDCA pdca_cycle_pass を検証しない（開発用）",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    pdca = read_json(auto / "tenmon_safe_self_improvement_pdca_summary.json")
    raw_pdca_pass = safe_bool(pdca.get("pdca_cycle_pass"))
    dq = read_json(auto / "tenmon_worldclass_dialogue_quality_finish_summary.json")
    fo = read_json(auto / "tenmon_autonomy_final_operable_acceptance_summary.json")
    rcl = read_json(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json")
    ovr = read_json(auto / "tenmon_overnight_resume_summary.json")
    hr = read_json(auto / "tenmon_high_risk_approval_contract_summary.json")
    stale = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    verdict = read_json(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json")
    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    if not args.skip_pdca_precondition and not raw_pdca_pass:
        out = {
            "card": CARD,
            "generated_at": utc(),
            "precondition_pass": False,
            "precondition_card": PRECONDITION_CARD,
            "pass": False,
            "next_on_pass": NEXT_ON_PASS,
            "next_on_fail": NEXT_ON_FAIL,
        }
        write_json(auto / "tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_summary.json", out)
        (auto / "tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_report.md").write_text(
            f"# {CARD}\n\nprecondition: {PRECONDITION_CARD} pdca_cycle_pass not true\n",
            encoding="utf-8",
        )
        return 1

    precondition_pdca = raw_pdca_pass or args.skip_pdca_precondition

    sources_ok = all(
        has_generated_at(x)
        for x in (pdca, dq, fo, rcl, hr, stale, verdict, scorecard)
    )

    meta_leak_count = int(dq.get("meta_leak_count", 0) or 0)
    technical_misroute_count = int(dq.get("technical_misroute_count", 0) or 0)
    k1_short = int(dq.get("k1_short_or_fragment_count", 0) or 0)
    greeting_drift = int(dq.get("greeting_generic_drift_count", 0) or 0)
    threadid_ok = safe_bool(dq.get("threadid_surface_consistent"))

    dialogue_ready = (
        sources_ok
        and safe_bool(dq.get("mandatory_pass"))
        and safe_bool(dq.get("pass"))
        and meta_leak_count == 0
        and technical_misroute_count == 0
        and k1_short == 0
        and greeting_drift == 0
        and threadid_ok
    )

    real_closed_loop_proven = safe_bool(rcl.get("real_closed_loop_proven"))
    overnight_cycle_alive = safe_bool(fo.get("overnight_cycle_alive")) or (
        has_generated_at(ovr)
        and safe_bool(ovr.get("overnight_resumed"))
        and int(ovr.get("cycle_count") or 0) >= 1
    )

    autonomy_ready = real_closed_loop_proven and overnight_cycle_alive

    stale_truth_zero_or_contained = int(stale.get("stale_sources_count", 0) or 0) == 0

    high_risk_approval_enforced = safe_bool(hr.get("approval_contract_pass"))

    safe_self_improvement_ready = (
        precondition_pdca
        and safe_bool(pdca.get("one_change_one_verify_enforced"))
        and safe_bool(pdca.get("ledger_append_ok"))
        and safe_bool(pdca.get("rejudge_after_each_cycle"))
        and safe_bool(pdca.get("high_risk_auto_patch_blocked"))
        and high_risk_approval_enforced
    )

    service_operable = (
        safe_bool(verdict.get("health_ok"))
        and not safe_bool(verdict.get("env_failure"))
        and safe_bool(verdict.get("audit_ok"))
        and safe_bool(verdict.get("audit_build_ok"))
    )
    product_ok = not safe_bool(verdict.get("product_failure"))
    continuity_ok = safe_bool(verdict.get("continuity_ok", True))
    operability_ready = service_operable and product_ok and continuity_ok

    # D 軸 + 合成: stale / HR / サービス健全性（「理論上だけ」でなく運用面の門）
    overall_worldclass_operable_ready = (
        operability_ready
        and stale_truth_zero_or_contained
        and high_risk_approval_enforced
    )

    score_pct = float(scorecard.get("score_percent") or 0)
    must_fix = scorecard.get("must_fix_before_claim") or []
    must_fix_count = len(must_fix) if isinstance(must_fix, list) else 0
    desirable_score = score_pct >= 88.0
    desirable_must_fix = must_fix_count <= 8
    recommended = str(scorecard.get("recommended_next_card") or "").strip()
    desirable_next = recommended == "" or "PWA_RUNTIME" in recommended or "RESTORE" in recommended

    desirable_pass = desirable_score and desirable_must_fix and desirable_next

    pass_final = (
        dialogue_ready
        and autonomy_ready
        and safe_self_improvement_ready
        and overall_worldclass_operable_ready
        and sources_ok
    )

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "precondition_pass": True,
        "precondition_card": PRECONDITION_CARD,
        "sources_current_run_evidence_ok": sources_ok,
        "dialogue_ready": dialogue_ready,
        "autonomy_ready": autonomy_ready,
        "safe_self_improvement_ready": safe_self_improvement_ready,
        "operability_ready": operability_ready,
        "overall_worldclass_operable_ready": overall_worldclass_operable_ready,
        "continuity_ok": continuity_ok,
        "pass": pass_final,
        "desirable_pass": desirable_pass,
        "meta_leak_count": meta_leak_count,
        "technical_misroute_count": technical_misroute_count,
        "real_closed_loop_proven": real_closed_loop_proven,
        "overnight_cycle_alive": overnight_cycle_alive,
        "pdca_cycle_pass": precondition_pdca,
        "high_risk_approval_enforced": high_risk_approval_enforced,
        "stale_truth_zero_or_contained": stale_truth_zero_or_contained,
        "worldclass_score_percent": score_pct,
        "must_fix_before_claim_count": must_fix_count,
        "recommended_next_card": recommended or None,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "inputs": {
            "pdca": str(auto / "tenmon_safe_self_improvement_pdca_summary.json"),
            "dialogue_quality": str(auto / "tenmon_worldclass_dialogue_quality_finish_summary.json"),
            "final_operable": str(auto / "tenmon_autonomy_final_operable_acceptance_summary.json"),
            "real_closed_loop": str(auto / "tenmon_real_closed_loop_current_run_acceptance_summary.json"),
            "overnight_resume": str(auto / "tenmon_overnight_resume_summary.json"),
            "high_risk_contract": str(auto / "tenmon_high_risk_approval_contract_summary.json"),
            "stale_truth": str(auto / "tenmon_latest_truth_rebase_summary.json"),
            "rejudge_verdict": str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
            "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
        },
    }

    summary_path = auto / "tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_summary.json"
    report_path = auto / "tenmon_worldclass_dialogue_and_safe_self_improvement_acceptance_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- pass: `{pass_final}`",
                f"- dialogue_ready: `{dialogue_ready}`",
                f"- autonomy_ready: `{autonomy_ready}`",
                f"- safe_self_improvement_ready: `{safe_self_improvement_ready}`",
                f"- overall_worldclass_operable_ready: `{overall_worldclass_operable_ready}`",
                f"- desirable_pass: `{desirable_pass}`",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return 0 if pass_final else 1


if __name__ == "__main__":
    raise SystemExit(main())
