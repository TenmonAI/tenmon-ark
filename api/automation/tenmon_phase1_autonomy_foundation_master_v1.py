#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_COMPLETION_PHASE1_FOUNDATION_AND_LIVE_BOOT_CURSOR_AUTO_V1"


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
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "tail": ((p.stdout or "") + (p.stderr or ""))[-1200:],
    }


def stage_result(stage_id: str, card: str, passed: bool, detail: dict[str, Any]) -> dict[str, Any]:
    return {"stage": stage_id, "card": card, "pass": passed, **detail}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"
    run_id = f"phase1_{int(time.time())}_{os.getpid()}"

    stages: list[dict[str, Any]] = []
    failed_card: str | None = None

    # CARD 1: runtime contract retry
    c1 = "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY_CURSOR_AUTO_V1"
    r1 = run(["bash", str(scripts / "tenmon_cursor_runtime_execution_contract_v1.sh")], repo)
    s1 = read_json(auto / "tenmon_cursor_runtime_execution_contract_summary.json")
    p1 = bool(s1.get("runtime_contract_ready"))
    stages.append(stage_result("CARD_1", c1, p1, {**r1, "runtime_contract_ready": bool(s1.get("runtime_contract_ready"))}))
    if not p1:
        failed_card = c1

    # CARD 2: founder key/runtime bind
    c2 = "TENMON_REMOTE_CURSOR_FOUNDER_KEY_RUNTIME_BIND_CURSOR_AUTO_V1"
    founder = (os.environ.get("FOUNDER_KEY") or os.environ.get("TENMON_REMOTE_CURSOR_FOUNDER_KEY") or "").strip()
    if failed_card is None:
        p2 = bool(founder)
        stages.append(stage_result("CARD_2", c2, p2, {"founder_key_present": p2}))
        if not p2:
            failed_card = c2
    else:
        stages.append(stage_result("CARD_2", c2, False, {"skipped": True, "reason": "prior_failed"}))

    # CARD 3: stale invalidation + truth rebase
    c3 = "TENMON_STALE_EVIDENCE_INVALIDATION_AND_TRUTH_REBASE_CURSOR_AUTO_V1"
    if failed_card is None:
        r3 = run(["bash", str(scripts / "tenmon_truth_source_canonicalizer_v1.sh")], repo)
        ts = read_json(auto / "tenmon_truth_source_summary.json")
        p3 = bool(ts.get("truth_source_singleton")) and not bool(ts.get("stale_truth_blocking"))
        stages.append(stage_result("CARD_3", c3, p3, {**r3, "truth_source_singleton": bool(ts.get("truth_source_singleton"))}))
        if not p3:
            failed_card = c3
    else:
        stages.append(stage_result("CARD_3", c3, False, {"skipped": True, "reason": "prior_failed"}))

    # CARD 4: real closed loop retry
    c4 = "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1"
    if failed_card is None:
        r4 = run(["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")], repo)
        cl = read_json(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
        p4 = bool(cl.get("real_closed_loop_proven"))
        stages.append(stage_result("CARD_4", c4, p4, {**r4, "real_closed_loop_proven": p4}))
        if not p4:
            failed_card = c4
    else:
        stages.append(stage_result("CARD_4", c4, False, {"skipped": True, "reason": "prior_failed"}))

    # CARD 5: first live bootstrap retry
    c5 = "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1"
    if failed_card is None:
        r5 = run(["bash", str(scripts / "tenmon_autonomy_first_live_bootstrap_v1.sh")], repo)
        fl = read_json(auto / "tenmon_autonomy_first_live_summary.json")
        p5 = bool(fl.get("first_live_cycle_pass"))
        stages.append(stage_result("CARD_5", c5, p5, {**r5, "first_live_cycle_pass": p5}))
        if not p5:
            failed_card = c5
    else:
        stages.append(stage_result("CARD_5", c5, False, {"skipped": True, "reason": "prior_failed"}))

    # final acceptance snapshot
    runtime = read_json(auto / "tenmon_cursor_runtime_execution_contract_summary.json")
    truth = read_json(auto / "tenmon_truth_source_summary.json")
    closed = read_json(auto / "tenmon_self_build_real_closed_loop_proof_summary.json")
    first = read_json(auto / "tenmon_autonomy_first_live_summary.json")

    final = {
        "cursor_runtime_execution_contract_pass": bool(runtime.get("runtime_contract_ready")),
        "founder_key_present": bool(founder),
        "stale_truth_used_zero": bool(truth.get("truth_source_singleton")) and not bool(truth.get("stale_truth_blocking")),
        "real_closed_loop_proven": bool(closed.get("real_closed_loop_proven")),
        "first_live_cycle_pass": bool(first.get("first_live_cycle_pass")),
        "safe_scope_enforced": bool(first.get("safe_scope_enforced", True)),
        "high_risk_not_touched": bool(first.get("high_risk_not_touched", True)),
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
        "next_on_pass": "TENMON_AUTONOMY_COMPLETION_PHASE2_OPERATIONS_AND_SAFE_SELF_IMPROVEMENT_CURSOR_AUTO_V1",
    }
    write_json(auto / "tenmon_phase1_autonomy_foundation_summary.json", summary)
    (auto / "tenmon_phase1_autonomy_foundation_report.md").write_text(
        f"# {CARD}\n\n- master_pass: `{master_pass}`\n- failed_card: `{failed_card}`\n",
        encoding="utf-8",
    )

    if not master_pass and failed_card:
        retry_map = {
            c1: "TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_RETRY2_CURSOR_AUTO_V1",
            c2: "TENMON_REMOTE_CURSOR_FOUNDER_KEY_RUNTIME_BIND_RETRY_CURSOR_AUTO_V1",
            c3: "TENMON_STALE_EVIDENCE_INVALIDATION_AND_TRUTH_REBASE_RETRY_CURSOR_AUTO_V1",
            c4: "TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY2_CURSOR_AUTO_V1",
            c5: "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY2_CURSOR_AUTO_V1",
        }
        write_json(
            auto / "tenmon_phase1_autonomy_foundation_fail_next_card.json",
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

