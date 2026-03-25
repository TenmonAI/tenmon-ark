#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_BRAINSTEM_6IN1_MASTER_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(p: Path) -> dict[str, Any]:
    try:
        o = json.loads(p.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def wj(p: Path, o: dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(o, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(argv: list[str], cwd: Path, timeout: int = 1800) -> dict[str, Any]:
    p = subprocess.run(argv, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    return {"ok": p.returncode == 0, "returncode": p.returncode, "tail": ((p.stdout or "") + (p.stderr or ""))[-1000:]}


def http_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            return int(r.status) == 200
    except Exception:
        return False


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    scripts = api / "scripts"

    steps = [
        ("step1_truth_lock", ["bash", str(scripts / "tenmon_single_truth_runtime_lock_v1.sh")]),
        ("step2_scope_gate", ["bash", str(scripts / "tenmon_scope_gate_autonomy_policy_v1.sh")]),
        ("step3_result_verifier", ["bash", str(scripts / "tenmon_autonomy_result_verifier_v1.sh")]),
        ("step4_worldclass_oracle", ["bash", str(scripts / "tenmon_worldclass_completion_oracle_v1.sh")]),
        ("step5_campaign_orchestrator", ["bash", str(scripts / "tenmon_autonomy_campaign_orchestrator_v1.sh")]),
        ("step6_final_sweep", ["bash", str(scripts / "tenmon_final_autonomous_completion_sweep_v1.sh")]),
    ]
    stage_results = []
    failed = None
    for name, cmd in steps:
        r = run(cmd, repo)
        stage_results.append({"name": name, **r})
        if not r["ok"] and failed is None:
            failed = name
            break

    step7 = {
        "build_ok": False,
        "health_ok": False,
        "audit_ok": False,
        "audit_build_ok": False,
        "rejudge_ok": False,
    }
    if failed is None:
        b = run(["npm", "--prefix", str(api), "run", "build"], repo, 1200)
        step7["build_ok"] = b["ok"]
        step7["health_ok"] = http_ok("http://127.0.0.1:3000/api/health")
        step7["audit_ok"] = http_ok("http://127.0.0.1:3000/api/audit")
        step7["audit_build_ok"] = http_ok("http://127.0.0.1:3000/api/audit.build")
        rejudge_run = run(["bash", str(scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh")], repo, 2400)
        step7["rejudge_ok"] = rejudge_run["ok"]

    truth = read_json(auto / "tenmon_single_truth_runtime_lock_summary.json")
    scope = read_json(auto / "tenmon_scope_gate_autonomy_policy_summary.json")
    ver = read_json(auto / "tenmon_autonomy_result_verifier_summary.json")
    oracle = read_json(auto / "tenmon_worldclass_completion_oracle_summary.json")
    orch = read_json(auto / "tenmon_autonomy_campaign_orchestrator_summary.json")
    sweep = read_json(auto / "tenmon_final_autonomous_completion_sweep_summary.json")

    single_truth_locked = bool(truth.get("single_truth_locked"))
    scope_gate_enforced = bool(scope.get("scope_gate_enforced"))
    result_verifier_ready = bool(ver.get("verifier_ready")) and bool(ver.get("current_run_consistent"))
    completion_oracle_ready = bool(oracle.get("overall_band"))
    campaign_orchestrator_ready = bool(orch.get("campaign_orchestrator_ready"))
    final_sweep_ready = bool(sweep.get("final_sweep_ready"))

    autonomy_brainstem_ready = (
        failed is None
        and single_truth_locked
        and scope_gate_enforced
        and result_verifier_ready
        and completion_oracle_ready
        and campaign_orchestrator_ready
        and final_sweep_ready
        and all(step7.values())
    )
    next_card = str(sweep.get("first_candidate") or "TENMON_CHAT_FINALIZE_META_BLACKOUT_AND_TECH_ROUTE_RELOCK_CURSOR_AUTO_V1")
    overall_band = "AUTONOMY_BRAINSTEM_READY" if autonomy_brainstem_ready else "AUTONOMY_BRAINSTEM_PARTIAL"

    summary = {
        "card": CARD,
        "generated_at": utc(),
        "single_truth_locked": single_truth_locked,
        "scope_gate_enforced": scope_gate_enforced,
        "result_verifier_ready": result_verifier_ready,
        "completion_oracle_ready": completion_oracle_ready,
        "campaign_orchestrator_ready": campaign_orchestrator_ready,
        "final_sweep_ready": final_sweep_ready,
        "autonomy_brainstem_ready": autonomy_brainstem_ready,
        "next_first_improvement_card": next_card,
        "overall_band": overall_band,
        "stages": stage_results,
        "step7": step7,
        "failed_stage": failed,
    }
    wj(auto / "tenmon_autonomy_brainstem_6in1_master_summary.json", summary)
    (auto / "tenmon_autonomy_brainstem_6in1_master_report.md").write_text(
        f"# {CARD}\n\n- autonomy_brainstem_ready: `{autonomy_brainstem_ready}`\n- overall_band: `{overall_band}`\n"
        f"- next_first_improvement_card: `{next_card}`\n",
        encoding="utf-8",
    )
    return 0 if autonomy_brainstem_ready else 1


if __name__ == "__main__":
    raise SystemExit(main())

