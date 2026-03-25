#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, subprocess, time
from pathlib import Path
from typing import Any

CARD = "TENMON_REAL_AUTONOMY_BOOTSTRAP_MASTER_CHAIN_CURSOR_AUTO_V1"

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    return {"ok": p.returncode == 0, "returncode": p.returncode, "tail": ((p.stdout or "") + (p.stderr or ""))[-1200:]}

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"; auto = api / "automation"; scripts = api / "scripts"
    run_id = f"realboot_{int(time.time())}_{os.getpid()}"
    stages = []
    failed = None
    flow = [
        ("STAGE_1_RUNTIME_CONTRACT", "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_cursor_runtime_execution_contract_v1.sh")]),
        ("STAGE_2_REAL_CLOSED_LOOP", "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")]),
        ("STAGE_3_TRUTH_CANONICALIZE", "TENMON_TRUTH_SOURCE_CANONICALIZATION_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_truth_source_canonicalizer_v1.sh")]),
        ("STAGE_4_OPERATIONS_AUTONOMY", "TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh")]),
        ("STAGE_5_GAP_MINER", "TENMON_AUTONOMY_GAP_MINER_AND_DEFICIT_CLASSIFIER_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_gap_miner_v1.sh")]),
        ("STAGE_6_SAFE_PATCH_PLANNER", "TENMON_AUTONOMY_SAFE_PATCH_PLANNER_AND_GATE_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_safe_patch_planner_v1.sh")]),
        ("STAGE_7_VERIFY_REJUDGE_ROLLBACK", "TENMON_AUTONOMY_VERIFY_REJUDGE_ROLLBACK_LOOP_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_verify_rejudge_rollback_loop_v1.sh")]),
        ("STAGE_8_WORLDCLASS_AUTOPDCA", "TENMON_WORLDCLASS_DIALOGUE_AND_SYSTEM_AUTOPDCA_MASTER_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_worldclass_dialogue_and_system_autopdca_v1.sh")]),
    ]
    for sid, card, cmd in flow:
        if failed:
            stages.append({"stage": sid, "card": card, "pass": False, "skipped": True, "reason": "prior_failed"})
            continue
        rr = run(cmd, repo)
        p = rr["ok"]
        stages.append({"stage": sid, "card": card, "pass": p, **rr})
        if not p:
            failed = card

    # Final acceptance gate is always evaluated for judgeability.
    final_gate_run = run(["bash", str(scripts / "tenmon_full_autonomy_acceptance_gate_v1.sh")], repo)
    stages.append(
        {
            "stage": "FINAL_ACCEPTANCE_GATE",
            "card": "TENMON_FULL_AUTONOMY_ACCEPTANCE_GATE_CURSOR_AUTO_V1",
            "pass": final_gate_run["ok"],
            **final_gate_run,
        }
    )

    # stage outputs snapshot
    runtime = rj(auto / "tenmon_cursor_runtime_execution_contract_summary.json")
    closed = rj(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
    truth = rj(auto / "tenmon_truth_source_summary.json")
    ops = rj(auto / "tenmon_operations_level_autonomy_summary.json")
    gap = rj(auto / "tenmon_gap_miner_summary.json")
    planner = rj(auto / "tenmon_safe_patch_planner_summary.json")
    verify = rj(auto / "tenmon_verify_rejudge_summary.json")
    pdca = rj(auto / "tenmon_worldclass_pdca_summary.json")

    final = {
        "cursor_runtime_execution_contract_pass": bool(runtime.get("runtime_contract_ready")),
        "real_closed_loop_proven": bool(closed.get("real_closed_loop_proven")),
        "truth_source_singleton": bool(truth.get("truth_source_singleton")),
        "operations_autonomy_pass": bool(ops.get("autonomy_cycle_pass")),
        "gap_miner_active": bool(gap.get("gap_inventory_generated")),
        "safe_patch_planner_active": bool(planner.get("safe_patch_queue_present")),
        "verify_rejudge_rollback_active": bool(verify.get("verify_loop_current_run_pass")),
        "dialogue_system_autopdca_active": bool(pdca.get("dialogue_autopdca_ready")) and bool(pdca.get("system_autopdca_ready")),
    }
    final_gate = rj(auto / "tenmon_full_autonomy_acceptance_summary.json")
    final["final_acceptance_gate_pass"] = bool(final_gate.get("pass"))
    master_pass = (failed is None) and all(final.values())
    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "master_pass": master_pass,
        "failed_stage_card": failed,
        "final_acceptance": final,
        "stages": stages,
        "next_on_pass": "TENMON_FULL_AUTONOMY_ACCEPTANCE_GATE_CURSOR_AUTO_V1",
    }
    wj(auto / "tenmon_real_autonomy_bootstrap_master_chain_summary.json", summary)
    (auto / "tenmon_real_autonomy_bootstrap_master_chain_report.md").write_text(
        f"# {CARD}\n\n- master_pass: `{master_pass}`\n- failed_stage_card: `{failed}`\n", encoding="utf-8"
    )
    if not master_pass and failed:
        wj(
            auto / "tenmon_real_autonomy_bootstrap_master_chain_fail_next_card.json",
            {
                "source_master": CARD,
                "failed_stage_card": failed,
                "retry_card_name": failed.replace("_CURSOR_AUTO_V1", "_RETRY_CURSOR_AUTO_V1"),
                "single_retry_only": True,
                "generated_at": utc(),
            },
        )
    return 0 if master_pass else 1

if __name__ == "__main__":
    raise SystemExit(main())

