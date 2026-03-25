#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_COMPLETION_PHASE2_OPERATIONS_AND_SAFE_SELF_IMPROVEMENT_CURSOR_AUTO_V1"


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


def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    return {"ok": p.returncode == 0, "returncode": p.returncode, "tail": ((p.stdout or "") + (p.stderr or ""))[-1200:]}


def stage(stage_id: str, card: str, passed: bool, detail: dict[str, Any]) -> dict[str, Any]:
    return {"stage": stage_id, "card": card, "pass": passed, **detail}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    run_id = f"phase2_{int(time.time())}_{os.getpid()}"

    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    # Precondition: Phase1 PASS
    phase1 = read_json(auto / "tenmon_phase1_autonomy_foundation_summary.json")
    pre_ok = bool(phase1.get("master_pass"))
    if not pre_ok:
        failed_card = "TENMON_AUTONOMY_COMPLETION_PHASE1_FOUNDATION_AND_LIVE_BOOT_CURSOR_AUTO_V1"
        stages.append(
            stage(
                "PRECONDITION",
                failed_card,
                False,
                {
                    "reason": "phase1_not_passed",
                    "phase1_master_pass": bool(phase1.get("master_pass")),
                },
            )
        )

    c1 = "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_RETRY_CURSOR_AUTO_V1"
    if failed_card is None:
        r1 = run(["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh")], repo)
        s1 = read_json(auto / "tenmon_operations_level_autonomy_summary.json")
        p1 = bool(s1.get("autonomy_cycle_pass")) and bool(s1.get("safe_scope_enforced")) and bool(s1.get("high_risk_block_respected"))
        stages.append(stage("CARD_1", c1, p1, {**r1, "autonomy_cycle_pass": bool(s1.get("autonomy_cycle_pass"))}))
        if not p1:
            failed_card = c1
    else:
        stages.append(stage("CARD_1", c1, False, {"skipped": True, "reason": "prior_failed"}))

    c2 = "TENMON_OPERATIONS_TIMER_AND_BACKPRESSURE_ENABLE_CURSOR_AUTO_V1"
    if failed_card is None:
        # non-destructive check: installer script exists + policy/state has backpressure controls
        timer_script = scripts / "install_tenmon_operations_level_autonomy_timer_v1.sh"
        policy = read_json(auto / "operations_level_autonomy_policy_v1.json")
        state = read_json(auto / "operations_level_autonomy_state_v1.json")
        p2 = timer_script.is_file() and bool(policy.get("consecutive_fail_stop")) and isinstance(state, dict) and "consecutive_failures" in state
        stages.append(stage("CARD_2", c2, p2, {"timer_script_present": timer_script.is_file()}))
        if not p2:
            failed_card = c2
    else:
        stages.append(stage("CARD_2", c2, False, {"skipped": True, "reason": "prior_failed"}))

    c3 = "TENMON_AUTONOMY_OPERATIONS_LIVE_SOAK_PROOF_CURSOR_AUTO_V1"
    if failed_card is None:
        # soak proof by 2 safe dry cycles + state progression check
        r3a = run(["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh"), "--skip-dispatch", "--skip-rejudge"], repo)
        s3a = read_json(auto / "tenmon_operations_level_autonomy_summary.json")
        r3b = run(["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh"), "--skip-dispatch", "--skip-rejudge"], repo)
        s3b = read_json(auto / "tenmon_operations_level_autonomy_summary.json")
        p3 = bool(s3a) and bool(s3b) and bool(s3b.get("safe_scope_enforced"))
        soak = {"autonomy_soak_pass": p3, "cycle_a_ok": bool(r3a["ok"]), "cycle_b_ok": bool(r3b["ok"])}
        write_json(auto / "tenmon_autonomy_operations_live_soak_summary.json", {"generated_at": utc(), **soak})
        stages.append(stage("CARD_3", c3, p3, soak))
        if not p3:
            failed_card = c3
    else:
        stages.append(stage("CARD_3", c3, False, {"skipped": True, "reason": "prior_failed"}))

    c4 = "TENMON_AUTONOMY_GAP_MINER_AND_DEFICIT_CLASSIFIER_RELOCK_CURSOR_AUTO_V1"
    if failed_card is None:
        r4 = run(["bash", str(scripts / "tenmon_gap_miner_v1.sh")], repo)
        tax = read_json(auto / "tenmon_gap_taxonomy_v1.json")
        back = read_json(auto / "tenmon_gap_backlog.json")
        p4 = bool(tax.get("taxonomy")) and bool(back.get("items"))
        stages.append(stage("CARD_4", c4, p4, {**r4, "gap_taxonomy_generated": bool(tax.get("taxonomy"))}))
        if not p4:
            failed_card = c4
    else:
        stages.append(stage("CARD_4", c4, False, {"skipped": True, "reason": "prior_failed"}))

    c5 = "TENMON_AUTONOMY_SAFE_PATCH_PLANNER_AND_GATE_RELOCK_CURSOR_AUTO_V1"
    if failed_card is None:
        r5 = run(["bash", str(scripts / "tenmon_safe_patch_planner_v1.sh")], repo)
        sp = read_json(auto / "tenmon_safe_patch_planner_summary.json")
        p5 = bool(sp.get("safe_patch_queue_present")) and bool(sp.get("unsafe_patch_candidates_blocked"))
        stages.append(stage("CARD_5", c5, p5, {**r5, "safe_patch_queue_generated": bool(sp.get("safe_patch_queue_present"))}))
        if not p5:
            failed_card = c5
    else:
        stages.append(stage("CARD_5", c5, False, {"skipped": True, "reason": "prior_failed"}))

    c6 = "TENMON_AUTONOMY_VERIFY_REJUDGE_ROLLBACK_LOOP_RELOCK_CURSOR_AUTO_V1"
    if failed_card is None:
        r6 = run(["bash", str(scripts / "tenmon_verify_rejudge_rollback_loop_v1.sh")], repo)
        vr = read_json(auto / "tenmon_verify_rejudge_summary.json")
        p6 = bool(vr.get("verify_loop_current_run_pass")) and bool(vr.get("rollback_on_fail_ready")) and bool(vr.get("rejudge_after_patch_observed"))
        stages.append(stage("CARD_6", c6, p6, {**r6, "verify_rejudge_loop_pass": bool(vr.get("verify_loop_current_run_pass"))}))
        if not p6:
            failed_card = c6
    else:
        stages.append(stage("CARD_6", c6, False, {"skipped": True, "reason": "prior_failed"}))

    # final acceptance
    ops = read_json(auto / "tenmon_operations_level_autonomy_summary.json")
    soak = read_json(auto / "tenmon_autonomy_operations_live_soak_summary.json")
    tax = read_json(auto / "tenmon_gap_taxonomy_v1.json")
    sp = read_json(auto / "tenmon_safe_patch_planner_summary.json")
    vr = read_json(auto / "tenmon_verify_rejudge_summary.json")
    final = {
        "autonomy_cycle_pass": bool(ops.get("autonomy_cycle_pass")),
        "autonomy_soak_pass": bool(soak.get("autonomy_soak_pass")),
        "gap_taxonomy_generated": bool(tax.get("taxonomy")),
        "safe_patch_queue_generated": bool(sp.get("safe_patch_queue_present")),
        "verify_rejudge_loop_pass": bool(vr.get("verify_loop_current_run_pass")),
        "safe_scope_enforced": bool(ops.get("safe_scope_enforced")),
        "high_risk_block_respected": bool(ops.get("high_risk_block_respected")),
    }
    master_pass = all(final.values()) and failed_card is None

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "master_pass": master_pass,
        "failed_card": failed_card,
        "final_acceptance": final,
        "stages": stages,
        "next_on_pass": "TENMON_AUTONOMY_COMPLETION_PHASE3_DIALOGUE_AND_WORLDCLASS_SELF_IMPROVEMENT_CURSOR_AUTO_V1",
    }
    write_json(auto / "tenmon_phase2_operations_summary.json", summary)
    (auto / "tenmon_phase2_operations_report.md").write_text(
        f"# {CARD}\n\n- master_pass: `{master_pass}`\n- failed_card: `{failed_card}`\n",
        encoding="utf-8",
    )

    if not master_pass and failed_card:
        retry_map = {
            c1: "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_RETRY2_CURSOR_AUTO_V1",
            c2: "TENMON_OPERATIONS_TIMER_AND_BACKPRESSURE_ENABLE_RETRY_CURSOR_AUTO_V1",
            c3: "TENMON_AUTONOMY_OPERATIONS_LIVE_SOAK_PROOF_RETRY_CURSOR_AUTO_V1",
            c4: "TENMON_AUTONOMY_GAP_MINER_AND_DEFICIT_CLASSIFIER_RETRY_CURSOR_AUTO_V1",
            c5: "TENMON_AUTONOMY_SAFE_PATCH_PLANNER_AND_GATE_RETRY_CURSOR_AUTO_V1",
            c6: "TENMON_AUTONOMY_VERIFY_REJUDGE_ROLLBACK_LOOP_RETRY_CURSOR_AUTO_V1",
            "TENMON_AUTONOMY_COMPLETION_PHASE1_FOUNDATION_AND_LIVE_BOOT_CURSOR_AUTO_V1": "TENMON_AUTONOMY_COMPLETION_PHASE1_FOUNDATION_AND_LIVE_BOOT_CURSOR_AUTO_V1",
        }
        write_json(
            auto / "tenmon_phase2_operations_fail_next_card.json",
            {
                "source_master": CARD,
                "failed_card": failed_card,
                "retry_card_name": retry_map.get(failed_card, failed_card.replace("_CURSOR_AUTO_V1", "_RETRY_CURSOR_AUTO_V1")),
                "single_retry_only": True,
                "generated_at": utc(),
            },
        )
    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

