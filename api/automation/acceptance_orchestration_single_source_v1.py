#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_CURSOR_AUTO_V1"
OUT_SUMMARY = "acceptance_orchestration_summary.json"


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


def now_epoch() -> float:
    return time.time()


def is_fresh(summary: dict[str, Any], max_age_s: int = 86400) -> tuple[bool, str]:
    if not summary:
        return False, "missing"
    ts = str(summary.get("generated_at") or "").strip()
    if not ts:
        return False, "missing_generated_at"
    try:
        st = time.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
        age = now_epoch() - time.mktime(st)
        return age <= max_age_s, f"age_seconds={int(age)}"
    except Exception:
        return False, "invalid_generated_at"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    auto = repo / "api" / "automation"
    run_id = f"acceptance_{int(time.time())}_{os.getpid()}"

    hygiene = read_json(auto / "tenmon_repo_hygiene_final_seal_summary.json")
    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    chat_surface = read_json(auto / "tenmon_chat_surface_stopbleed_summary.json")
    scripture = read_json(auto / "tenmon_scripture_naturalizer_summary.json")
    truth = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    queue = read_json(auto / "remote_cursor_queue.json")
    bundle = read_json(auto / "remote_cursor_result_bundle.json")
    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")

    # stale source exclusion policy comes from latest rejudge/truth summaries
    stale_sources = [str(x) for x in (rejudge.get("stale_sources") or []) if str(x).strip()]
    excluded_truth_sources = [str(x) for x in (rejudge.get("truth_excluded_sources") or []) if str(x).strip()]

    # acceptance dimensions
    build_acceptance = bool((hygiene.get("build") or {}).get("ok") is True)
    gate_acceptance = bool(hygiene.get("gates_all_pass") is True)
    lived_acceptance = bool((hygiene.get("http") or {}).get("health_ok") and (hygiene.get("http") or {}).get("audit_ok") and (hygiene.get("http") or {}).get("audit_build_ok"))
    conversation_acceptance = bool(chat_surface.get("meta_leak_count") == 0 and chat_surface.get("natural_misdrop_count") == 0)
    scripture_acceptance = bool(scripture.get("autoprobe_pass") is True and scripture.get("need_context_count") == 0)
    q_items = queue.get("items") if isinstance(queue.get("items"), list) else []
    b_entries = bundle.get("entries") if isinstance(bundle.get("entries"), list) else []
    executed_nonfixture_ids = {
        str(x.get("id"))
        for x in q_items
        if isinstance(x, dict) and x.get("fixture") is False and str(x.get("state") or "") == "executed"
    }
    current_run_bundle_ids = {
        str(x.get("queue_id"))
        for x in b_entries
        if isinstance(x, dict) and x.get("current_run") is True
    }
    current_run_nonfixture_executed = bool(executed_nonfixture_ids & current_run_bundle_ids)

    fresh_hygiene, fresh_hygiene_note = is_fresh(hygiene)
    fresh_rejudge, fresh_rejudge_note = is_fresh(rejudge)
    fresh_chat, fresh_chat_note = is_fresh(chat_surface)
    fresh_scripture, fresh_scripture_note = is_fresh(scripture)
    fresh_truth, fresh_truth_note = is_fresh(truth)

    current_run_evidence_ready = all([fresh_hygiene, fresh_rejudge, fresh_chat, fresh_scripture, fresh_truth])
    stale_truth_excluded = bool(truth.get("latest_truth_rebased") is True and truth.get("truth_source_singleton") is True)

    remaining_blockers = [str(x) for x in (rejudge.get("remaining_blockers") or []) if str(x).strip()]
    acceptance_pass = all(
        [
            build_acceptance,
            gate_acceptance,
            lived_acceptance,
            conversation_acceptance,
            scripture_acceptance,
            current_run_nonfixture_executed,
            stale_truth_excluded,
            current_run_evidence_ready,
            len(remaining_blockers) == 0,
        ]
    )

    singleton = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "acceptance_singleton_pass": acceptance_pass,
        "single_source_of_truth": True,
        "acceptance_dimensions": {
            "build_acceptance": build_acceptance,
            "gate_acceptance": gate_acceptance,
            "lived_acceptance": lived_acceptance,
            "conversation_acceptance": conversation_acceptance,
            "scripture_acceptance": scripture_acceptance
            ,
            "current_run_nonfixture_executed": current_run_nonfixture_executed
        },
        "truth_policy": {
            "current_run_evidence_priority": True,
            "stale_truth_excluded": stale_truth_excluded,
            "stale_sources": stale_sources,
            "truth_excluded_sources": excluded_truth_sources
        },
        "rejudge": {
            "remaining_blockers": remaining_blockers,
            "recommended_next_card": rejudge.get("recommended_next_card"),
        },
        "scorecard": {
            "score_percent": scorecard.get("score_percent"),
            "next_best_card": scorecard.get("next_best_card") or scorecard.get("recommended_next_card"),
        },
        "current_run_freshness": {
            "hygiene": {"fresh": fresh_hygiene, "note": fresh_hygiene_note},
            "rejudge": {"fresh": fresh_rejudge, "note": fresh_rejudge_note},
            "chat_surface": {"fresh": fresh_chat, "note": fresh_chat_note},
            "scripture": {"fresh": fresh_scripture, "note": fresh_scripture_note},
            "truth_rebase": {"fresh": fresh_truth, "note": fresh_truth_note}
        },
        "source_paths": {
            "hygiene": str(auto / "tenmon_repo_hygiene_final_seal_summary.json"),
            "rejudge": str(auto / "tenmon_latest_state_rejudge_summary.json"),
            "chat_surface": str(auto / "tenmon_chat_surface_stopbleed_summary.json"),
            "scripture": str(auto / "tenmon_scripture_naturalizer_summary.json"),
            "truth_rebase": str(auto / "tenmon_latest_truth_rebase_summary.json")
        },
        "for_reference": {
            "autonomy_scope_governor": str(auto / "tenmon_autonomy_scope_governor_summary.json"),
            "product_patch_planner": str(auto / "tenmon_product_patch_planner_min_diff_summary.json")
        },
        "seal_allowed": acceptance_pass,
        "next_on_pass": "TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_RETRY_CURSOR_AUTO_V1",
        "next_best_card": (
            rejudge.get("recommended_next_card")
            or scorecard.get("next_best_card")
            or scorecard.get("recommended_next_card")
            or "TENMON_ACCEPTANCE_ORCHESTRATION_SINGLE_SOURCE_RETRY_CURSOR_AUTO_V1"
        ),
    }

    write_json(auto / OUT_SUMMARY, singleton)

    if args.stdout_json:
        print(json.dumps(singleton, ensure_ascii=False, indent=2))
    return 0 if acceptance_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

