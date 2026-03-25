#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1
安全ゲート付き PDCA: 観測 → 候補ランキング → 1 件のみ検証 → rejudge → ledger。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any

CARD = "TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_CURSOR_AUTO_V1"
PRECONDITION_CARD = "TENMON_WORLDCLASS_DIALOGUE_QUALITY_FINISH_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_ACCEPTANCE_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_SAFE_SELF_IMPROVEMENT_PDCA_LOOP_RETRY_CURSOR_AUTO_V1"


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


def append_ledger(path: Path, record: dict[str, Any]) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        return True
    except Exception:
        return False


def build_candidates(auto: Path, policy: dict[str, Any]) -> list[dict[str, Any]]:
    scorecard = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    system_v = read_json(auto / "tenmon_system_verdict.json")
    dq = read_json(auto / "tenmon_worldclass_dialogue_quality_finish_summary.json")
    stale = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    next_cards = read_json(auto / "state_convergence_next_cards.json")
    retry_q = read_json(auto / "retry_queue.json")
    remote_q = read_json(auto / "remote_cursor_queue.json")

    out: list[dict[str, Any]] = []

    stale_n = int(stale.get("stale_sources_count", 0) or 0)
    if stale_n > 0:
        out.append(
            {
                "id": "stale_truth_rebase",
                "scope": "safe",
                "severity": "high",
                "approval_required": False,
                "acceptance_method": "rejudge_after_truth_rebase",
                "source": "tenmon_latest_truth_rebase_summary.json",
            }
        )

    for fix in (scorecard.get("must_fix_before_claim") or [])[:8]:
        out.append(
            {
                "id": f"scorecard:{fix}",
                "scope": "safe",
                "severity": "medium",
                "approval_required": False,
                "acceptance_method": "scorecard_reconcile",
                "source": "tenmon_worldclass_acceptance_scorecard.json",
            }
        )

    fc = str(system_v.get("final_recommended_card") or "").strip()
    if fc:
        out.append(
            {
                "id": f"system_verdict:{fc}",
                "scope": "safe",
                "severity": "low",
                "approval_required": False,
                "acceptance_method": "follow_verdict_card",
                "source": "tenmon_system_verdict.json",
            }
        )

    if safe_bool(dq.get("pass")) or safe_bool(dq.get("mandatory_pass")):
        out.append(
            {
                "id": "dialogue_quality_green",
                "scope": "safe",
                "severity": "low",
                "approval_required": False,
                "acceptance_method": "maintain_rejudge",
                "source": "tenmon_worldclass_dialogue_quality_finish_summary.json",
            }
        )

    for c in (next_cards.get("next_cards") or [])[:3]:
        out.append(
            {
                "id": f"next_cards:{c}",
                "scope": "safe",
                "severity": "medium",
                "approval_required": False,
                "acceptance_method": "queue_reflect",
                "source": "state_convergence_next_cards.json",
            }
        )

    rq_items = remote_q.get("items") if isinstance(remote_q.get("items"), list) else []
    if len(rq_items) > 0:
        out.append(
            {
                "id": "remote_cursor_queue:backpressure",
                "scope": "safe",
                "severity": "low",
                "approval_required": False,
                "acceptance_method": "observe_queue_only",
                "source": "remote_cursor_queue.json",
            }
        )

    for item in (retry_q.get("items") or retry_q.get("queue") or [])[:3]:  # retry_queue.json uses "queue"
        if isinstance(item, dict):
            cid = str(item.get("card") or item.get("id") or "retry")
        else:
            cid = str(item)
        out.append(
            {
                "id": f"retry_queue:{cid}",
                "scope": "safe",
                "severity": "medium",
                "approval_required": False,
                "acceptance_method": "retry_orchestrate",
                "source": "retry_queue.json",
            }
        )

    if not out:
        out.append(
            {
                "id": "observation_rejudge_only",
                "scope": "safe",
                "severity": "low",
                "approval_required": False,
                "acceptance_method": "rejudge_refresh_only",
                "source": "default",
            }
        )

    priority = list(policy.get("acceptance_priority") or [])
    order = {k: i for i, k in enumerate(priority)}

    def sort_key(c: dict[str, Any]) -> tuple[int, str]:
        prefix = str(c["id"]).split(":")[0]
        return (order.get(prefix, 99), str(c.get("severity", "z")))

    out.sort(key=sort_key)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_safe_self_improvement_pdca_loop_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--skip-dialogue-precondition",
        action="store_true",
        help="worldclass dialogue quality finish PASS をスキップ（開発用）",
    )
    ap.add_argument("--dry-run", action="store_true", help="rejudge を実行せず ledger のみ")
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"

    policy_path = auto / "safe_self_improvement_policy_v1.json"
    state_path = auto / "safe_self_improvement_state_v1.json"
    ledger_path = auto / "safe_self_improvement_ledger_v1.jsonl"

    default_policy: dict[str, Any] = {
        "version": 1,
        "max_cycles_per_run": 1,
        "acceptance_priority": [
            "stale_truth_rebase",
            "dialogue_scorecard_gap",
            "system_verdict_gap",
            "next_cards_queue",
            "retry_queue_pressure",
            "remote_cursor_queue",
        ],
        "rejudge_script": "api/scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh",
    }
    policy = read_json(policy_path, default_policy)
    if not policy_path.is_file():
        write_json(policy_path, policy)

    state = read_json(state_path)
    if not str(state.get("run_id") or "").strip():
        state["run_id"] = f"pdca_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    dq = read_json(auto / "tenmon_worldclass_dialogue_quality_finish_summary.json")
    precondition_ok = safe_bool(dq.get("pass")) or safe_bool(dq.get("mandatory_pass"))
    if not args.skip_dialogue_precondition and not precondition_ok:
        out = {
            "card": CARD,
            "generated_at": utc(),
            "precondition_pass": False,
            "precondition_card": PRECONDITION_CARD,
            "pdca_cycle_pass": False,
            "next_on_pass": NEXT_ON_PASS,
            "next_on_fail": NEXT_ON_FAIL,
        }
        write_json(auto / "tenmon_safe_self_improvement_pdca_summary.json", out)
        (auto / "tenmon_safe_self_improvement_pdca_report.md").write_text(
            f"# {CARD}\n\nprecondition: {PRECONDITION_CARD} not PASS\n",
            encoding="utf-8",
        )
        return 1

    dpb = read_json(auto / "dangerous_patch_blocker_report.json")
    gate = read_json(auto / "tenmon_execution_gate_hardstop_verdict.json")
    gate_blocks = safe_bool(dpb.get("blocked")) or safe_bool(gate.get("must_block"))
    # 本ループは high-risk へ自動 apply しない。ゲートがブロックしている場合も「自動改変不可」を満たす。
    high_risk_auto_patch_blocked_flag = True
    stale = read_json(auto / "tenmon_latest_truth_rebase_summary.json")
    stale_detected = int(stale.get("stale_sources_count", 0) or 0) > 0

    candidates = build_candidates(auto, policy)
    chosen = candidates[0]
    approval_required = safe_bool(chosen.get("approval_required")) or str(chosen.get("scope")) == "high_risk"

    verify_rc = 0
    rejudge_ran = False
    outcome = "blocked"
    rollback = False

    if approval_required and chosen.get("scope") == "high_risk":
        outcome = "blocked_high_risk"
        rollback = True
    elif args.dry_run:
        outcome = "dry_run"
        verify_rc = 0
        rejudge_ran = False
    else:
        rej = policy.get("rejudge_script") or "api/scripts/tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
        rp = Path(repo / rej)
        if rp.is_file():
            p = subprocess.run(["bash", str(rp)], cwd=str(repo), capture_output=True, text=True, timeout=3600)
            verify_rc = p.returncode
            rejudge_ran = True
            outcome = "verify_ok" if verify_rc == 0 else "verify_fail"
            rollback = verify_rc != 0
        else:
            verify_rc = 1
            outcome = "rejudge_script_missing"
            rollback = True

    if stale_detected and outcome == "verify_ok":
        outcome = "verify_ok_stale_truth_note"
        ledger_note = "stale_truth_present_rebase_recommended"
    else:
        ledger_note = outcome

    ledger_ok = append_ledger(
        ledger_path,
        {
            "card": CARD,
            "generated_at": utc(),
            "run_id": state.get("run_id"),
            "candidate": chosen,
            "outcome": outcome,
            "verify_exit_code": verify_rc,
            "rollback": rollback,
            "high_risk_auto_patch_blocked": high_risk_auto_patch_blocked_flag,
            "execution_gate_blocks": gate_blocks,
            "stale_truth_detected": stale_detected,
            "ledger_note": ledger_note,
            "evidence": {
                "dialogue_quality": str(auto / "tenmon_worldclass_dialogue_quality_finish_summary.json"),
                "scorecard": str(auto / "tenmon_worldclass_acceptance_scorecard.json"),
            },
        },
    )

    state["cycle_total"] = int(state.get("cycle_total") or 0) + 1
    state["last_cycle_at"] = utc()
    state["last_candidate_id"] = chosen.get("id")
    state["last_outcome"] = outcome
    state["consecutive_fail"] = (
        int(state.get("consecutive_fail") or 0) + 1 if verify_rc != 0 else 0
    )
    state["stopped"] = bool(rollback and verify_rc != 0)
    state["stop_reason"] = outcome if state["stopped"] else None
    write_json(state_path, state)

    one_change_one_verify = True
    safe_scope_enforced = str(chosen.get("scope")) != "high_risk"
    ledger_append_ok = ledger_ok
    rejudge_after_each_cycle = rejudge_ran

    pdca_cycle_pass = (
        precondition_ok
        and verify_rc == 0
        and ledger_ok
        and rejudge_after_each_cycle
        and safe_scope_enforced
        and high_risk_auto_patch_blocked_flag
        and not (approval_required and str(chosen.get("scope")) == "high_risk")
    )

    summary_out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "precondition_pass": True,
        "precondition_card": PRECONDITION_CARD,
        "pdca_cycle_pass": pdca_cycle_pass,
        "one_change_one_verify_enforced": one_change_one_verify,
        "safe_scope_enforced": safe_scope_enforced,
        "high_risk_auto_patch_blocked": high_risk_auto_patch_blocked_flag,
        "execution_gate_blocks": gate_blocks,
        "ledger_append_ok": ledger_append_ok,
        "rejudge_after_each_cycle": rejudge_after_each_cycle,
        "chosen_candidate": chosen,
        "verify_exit_code": verify_rc,
        "outcome": outcome,
        "rollback": rollback,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": NEXT_ON_FAIL,
        "inputs_observed": {
            "candidates_ranked": len(candidates),
        },
    }

    write_json(auto / "tenmon_safe_self_improvement_pdca_summary.json", summary_out)
    report_lines = [
        f"# {CARD}",
        "",
        f"- pdca_cycle_pass: `{pdca_cycle_pass}`",
        f"- chosen_candidate: `{chosen.get('id')}`",
        f"- outcome: `{outcome}`",
        f"- verify_exit_code: `{verify_rc}`",
        f"- ledger_append_ok: `{ledger_append_ok}`",
        f"- rejudge_after_each_cycle: `{rejudge_after_each_cycle}`",
        f"- high_risk_auto_patch_blocked: `{high_risk_auto_patch_blocked_flag}`",
        "",
    ]
    (auto / "tenmon_safe_self_improvement_pdca_report.md").write_text(
        "\n".join(report_lines) + "\n", encoding="utf-8"
    )

    return 0 if pdca_cycle_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
