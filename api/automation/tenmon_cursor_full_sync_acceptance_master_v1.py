#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations
import json, os, subprocess, time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_FULL_SYNC_ACCEPTANCE_AND_WORLDCLASS_COMPLETION_MASTER_CURSOR_AUTO_V1"

def utc() -> str: return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
def rj(p: Path) -> dict[str, Any]:
    try:
        x = json.loads(p.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}
def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
def run(cmd: list[str], cwd: Path, timeout: int = 2400) -> dict[str, Any]:
    p = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    return {"ok": p.returncode == 0, "returncode": p.returncode, "tail": ((p.stdout or "") + (p.stderr or ""))[-1000:]}

def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"; auto = api / "automation"; scripts = api / "scripts"
    run_id = f"syncmaster_{int(time.time())}_{os.getpid()}"
    stages: list[dict[str, Any]] = []
    failed = None

    flow = [
        ("TENMON_CURSOR_RUNTIME_EXECUTION_CONTRACT_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_cursor_runtime_execution_contract_v1.sh")]),
        ("TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_self_build_real_closed_loop_proof_v1.sh")]),
        ("TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_repo_hygiene_final_seal_v1.sh"), "--stdout-json"]),
        ("TENMON_OPERATIONS_LEVEL_AUTONOMY_ENABLE_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_operations_level_autonomy_v1.sh")]),
        ("TENMON_CURSOR_FULL_SYNC_ACCEPTANCE_GATE_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_cursor_full_sync_acceptance_gate_v1.sh")]),
        ("TENMON_CONVERSATION_WORLDCLASS_AUTOFIX_ORCHESTRATOR_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_conversation_worldclass_autofix_orchestrator_v1.sh")]),
        ("TENMON_FINAL_COMPLETION_AND_WORLDCLASS_REFRESH_ONECARD_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_final_completion_and_worldclass_refresh_onecard_v1.sh")]),
        ("TENMON_CURSOR_FULL_SYNC_WORLDCLASS_FINAL_ACCEPTANCE_CURSOR_AUTO_V1", ["bash", str(scripts / "tenmon_cursor_full_sync_worldclass_final_acceptance_v1.sh")]),
    ]
    for name, cmd in flow:
        if failed:
            stages.append({"card": name, "pass": False, "skipped": True, "reason": "prior_failed"})
            continue
        rr = run(cmd, repo)
        p = rr["ok"]
        stages.append({"card": name, "pass": p, **rr})
        if not p:
            failed = name

    gate = rj(auto / "tenmon_cursor_full_sync_acceptance_gate_summary.json")
    final = rj(auto / "tenmon_cursor_full_sync_worldclass_final_acceptance_summary.json")
    hygiene = rj(auto / "tenmon_repo_hygiene_final_seal_summary.json")
    truth = rj(auto / "tenmon_latest_truth_rebase_summary.json")
    conv = rj(auto / "tenmon_conversation_worldclass_autofix_summary.json")
    ops = rj(auto / "tenmon_operations_level_autonomy_summary.json")

    summary = {
        "card": CARD, "generated_at": utc(), "run_id": run_id,
        "full_sync_gate_pass": bool(gate.get("pass")),
        "cursor_full_sync_established": bool(gate.get("cursor_full_sync_established")),
        "autonomy_running": bool(ops.get("autonomy_cycle_pass")),
        "conversation_autofix_running": bool(conv.get("conversation_autofix_running")),
        "current_run_truth_locked": bool(truth.get("truth_source_singleton")),
        "repo_hygiene_clean": bool(hygiene.get("repo_hygiene_clean")),
        "tenmon_autonomous_audit_build_loop_live": bool(ops.get("verify", {}).get("npm_build_ok", True)),
        "tenmon_cursor_fully_synced": bool(final.get("tenmon_cursor_fully_synced")),
        "autonomous_improvement_live": bool(conv.get("conversation_autofix_running")) and bool(ops),
        "master_pass": bool(final.get("pass")) and bool(gate.get("pass")) and (failed is None),
        "failed_child": failed,
        "stages": stages,
        "next_on_pass": "TENMON_WORLDCLASS_DIALOGUE_PDCA_AUTOLOOP_CURSOR_AUTO_V1",
    }
    wj(auto / "tenmon_cursor_full_sync_acceptance_master_summary.json", summary)
    (auto / "tenmon_cursor_full_sync_acceptance_master_report.md").write_text(
        f"# {CARD}\n\n- master_pass: `{summary['master_pass']}`\n- failed_child: `{failed}`\n", encoding="utf-8"
    )
    if not summary["master_pass"] and failed:
        wj(
            auto / "tenmon_cursor_full_sync_acceptance_master_fail_next_card.json",
            {
                "source_master": CARD,
                "failed_child": failed,
                "retry_card_name": failed.replace("_CURSOR_AUTO_V1", "_RETRY_CURSOR_AUTO_V1"),
                "single_retry_only": True,
                "generated_at": utc(),
            },
        )
    state = rj(auto / "tenmon_cursor_full_sync_acceptance_state_v1.json")
    state.update(
        {
            "last_run_at": utc(),
            "last_run_id": run_id,
            "last_failed_child": failed,
            "consecutive_failures": (int(state.get("consecutive_failures") or 0) + (0 if summary["master_pass"] else 1)),
        }
    )
    wj(auto / "tenmon_cursor_full_sync_acceptance_state_v1.json", state)
    return 0 if summary["master_pass"] else 1

if __name__ == "__main__":
    raise SystemExit(main())

