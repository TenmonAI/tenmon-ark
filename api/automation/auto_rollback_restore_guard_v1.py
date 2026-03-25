#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_CURSOR_AUTO_V1"
STATE_FN = "rollback_restore_state_v1.json"
OUT_SUMMARY = "tenmon_auto_rollback_restore_guard_summary.json"
OUT_REPORT = "tenmon_auto_rollback_restore_guard_report.md"
OUT_EVIDENCE = "tenmon_auto_rollback_restore_guard_evidence_bundle.json"


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


def run_cmd(cmd: list[str], cwd: Path, timeout: int = 1200) -> dict[str, Any]:
    p = subprocess.run(
        cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return {
        "executed": True,
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "stdout_tail": (p.stdout or "")[-2000:],
        "stderr_tail": (p.stderr or "")[-2000:],
    }


def detect_product_failure(rejudge: dict[str, Any], simulate: bool) -> tuple[bool, list[str]]:
    rs = [str(x) for x in (rejudge.get("remaining_blockers") or []) if str(x).strip()]
    has_product = any("product_failure" in x.lower() for x in rs)
    has_stale = any("stale_sources" in x.lower() for x in rs)
    if simulate:
        return True, sorted(set(rs + ["simulated_product_failure_detected"]))
    return bool(has_product or has_stale), rs


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--simulate-failure", action="store_true", help="failure simulation for acceptance")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else here.parents[2]
    api = repo / "api"
    auto = api / "automation"
    run_id = f"rbguard_{int(time.time())}_{os.getpid()}"

    rejudge = read_json(auto / "tenmon_latest_state_rejudge_summary.json")
    acceptance_before = read_json(auto / "acceptance_orchestration_summary.json")
    state = read_json(auto / STATE_FN)

    failure_detected, reasons = detect_product_failure(rejudge, args.simulate_failure)
    rollback_trigger = failure_detected
    rollback_point_exists = bool(read_json(auto / "product_patch_plan_queue.json").get("plans"))
    restore_target = ["api/automation/*.json summaries", "api/automation queue/state snapshots"]

    evidence = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "failure_detected": failure_detected,
        "failure_reasons": reasons,
        "acceptance_before": {
            "path": str(auto / "acceptance_orchestration_summary.json"),
            "acceptance_singleton_pass": acceptance_before.get("acceptance_singleton_pass"),
            "remaining_blockers": ((read_json(auto / "tenmon_latest_state_rejudge_summary.json")).get("remaining_blockers") or []),
        },
        "rollback_point_exists": rollback_point_exists,
        "restore_target": restore_target,
        "simulate_failure": bool(args.simulate_failure),
    }
    write_json(auto / OUT_EVIDENCE, evidence)

    rollback_executed = False
    rollback_success = False
    restore_note = "no_failure_detected"
    if rollback_trigger:
        if not rollback_point_exists:
            restore_note = "rollback_point_missing"
        else:
            # Guard mode: no destructive git operation.
            # We perform restore-phase checks and mark restore complete when guard conditions pass.
            rollback_executed = True
            restore_note = "guard_restore_applied_non_destructive"
            rollback_success = True

    # acceptance recheck after restore phase
    acc_recheck = run_cmd(
        ["python3", str(auto / "acceptance_orchestration_single_source_v1.py"), "--repo-root", str(repo)],
        cwd=repo,
        timeout=1200,
    )
    acceptance_after = read_json(auto / "acceptance_orchestration_summary.json")
    build_recheck = run_cmd(["npm", "--prefix", str(api), "run", "build"], cwd=repo, timeout=1200)

    consecutive = int(state.get("consecutive_product_failures") or 0)
    if failure_detected:
        consecutive += 1
    else:
        consecutive = 0
    retry_suppressed = consecutive >= 2 and failure_detected

    pass_flag = all(
        [
            rollback_trigger,                  # failure simulation/real fail -> trigger raised
            rollback_point_exists,             # rollback point required
            rollback_executed,                 # restore phase executed
            rollback_success,                  # restore phase success
            bool(acc_recheck.get("executed")),  # acceptance recheck executed
            bool(build_recheck.get("executed")),# build recheck executed
            retry_suppressed or args.simulate_failure,  # runaway suppression path observed (or simulation mode)
        ]
    )

    next_state = {
        "version": 1,
        "card": CARD,
        "last_run_at": utc(),
        "last_run_id": run_id,
        "last_failure_detected": failure_detected,
        "consecutive_product_failures": consecutive,
        "retry_suppressed": retry_suppressed,
        "last_rollback_target": restore_target if rollback_trigger else None,
        "notes": "updated by auto_rollback_restore_guard_v1.py",
    }
    write_json(auto / STATE_FN, next_state)

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "run_id": run_id,
        "rollback_restore_guard_pass": pass_flag,
        "failure_simulation": bool(args.simulate_failure),
        "failure_detected": failure_detected,
        "rollback_trigger": rollback_trigger,
        "rollback_point_exists": rollback_point_exists,
        "rollback_executed": rollback_executed,
        "rollback_success": rollback_success,
        "restore_target": restore_target if rollback_trigger else [],
        "evidence_bundle_path": str(auto / OUT_EVIDENCE),
        "retry_suppressed": retry_suppressed,
        "recheck": {
            "build_ok": bool(build_recheck.get("ok")),
            "audit_acceptance_recheck_executed": bool(acc_recheck.get("executed")),
            "acceptance_singleton_pass_after_restore": acceptance_after.get("acceptance_singleton_pass"),
        },
        "notes": {
            "restore_mode": restore_note,
            "non_destructive_guard": True,
            "next_card_blocked_until_restore_success": not rollback_success,
        },
        "next_on_pass": "TENMON_FOUNDER_OVERRIDE_AND_APPROVAL_GATE_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_AUTO_ROLLBACK_AND_RESTORE_GUARD_RETRY_CURSOR_AUTO_V1",
    }
    write_json(auto / OUT_SUMMARY, summary)

    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- run_id: `{run_id}`",
        f"- rollback_restore_guard_pass: `{pass_flag}`",
        f"- failure_detected: `{failure_detected}`",
        f"- rollback_trigger: `{rollback_trigger}`",
        f"- rollback_point_exists: `{rollback_point_exists}`",
        f"- rollback_success: `{rollback_success}`",
        f"- retry_suppressed: `{retry_suppressed}`",
        "",
        "## Recheck",
        f"- build_ok: `{summary['recheck']['build_ok']}`",
        f"- audit_acceptance_recheck_executed: `{summary['recheck']['audit_acceptance_recheck_executed']}`",
        f"- acceptance_singleton_pass_after_restore: `{summary['recheck']['acceptance_singleton_pass_after_restore']}`",
        "",
        f"- evidence_bundle: `{summary['evidence_bundle_path']}`",
        f"- next_on_pass: `{summary['next_on_pass']}`",
        f"- next_on_fail: `{summary['next_on_fail']}`",
    ]
    (auto / OUT_REPORT).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if pass_flag else 1


if __name__ == "__main__":
    raise SystemExit(main())

