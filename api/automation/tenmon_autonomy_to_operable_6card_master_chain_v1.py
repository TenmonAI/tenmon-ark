#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_AUTONOMY_TO_OPERABLE_6CARD_MASTER_CHAIN_CURSOR_AUTO_V1 — 6 カードを順に実行し fail-fast。"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_TO_OPERABLE_6CARD_MASTER_CHAIN_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_WORLDCLASS_DIALOGUE_AND_SAFE_SELF_IMPROVEMENT_PDCA_CURSOR_AUTO_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_autonomy_to_operable_6card_master_chain_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    scripts = repo / "api" / "scripts"

    steps: list[tuple[str, list[str], str]] = [
        (
            "TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1",
            ["python3", str(auto / "tenmon_mac_cursor_executor_runtime_bind_v1.py")],
            "TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_RETRY_CURSOR_AUTO_V1",
        ),
        (
            "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_AND_SAFE_RUN_CURSOR_AUTO_V1",
            ["bash", str(scripts / "tenmon_autonomy_first_live_bootstrap_v1.sh")],
            "TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1",
        ),
        (
            "TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_CURSOR_AUTO_V1",
            ["bash", str(scripts / "tenmon_real_closed_loop_current_run_acceptance_v1.sh")],
            "TENMON_REAL_CLOSED_LOOP_CURRENT_RUN_ACCEPTANCE_RETRY_CURSOR_AUTO_V1",
        ),
        (
            "TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_CURSOR_AUTO_V1",
            ["python3", str(auto / "tenmon_overnight_full_autonomy_resume_after_first_live_pass_v1.py")],
            "TENMON_OVERNIGHT_FULL_AUTONOMY_RESUME_AFTER_FIRST_LIVE_PASS_RETRY_CURSOR_AUTO_V1",
        ),
        (
            "TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_CURSOR_AUTO_V1",
            ["python3", str(auto / "tenmon_high_risk_approval_contract_v1.py")],
            "TENMON_HIGH_RISK_APPROVAL_CONTRACT_AND_SEAL_GATE_RETRY_CURSOR_AUTO_V1",
        ),
        (
            "TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_CURSOR_AUTO_V1",
            ["python3", str(auto / "tenmon_autonomy_final_operable_acceptance_v1.py")],
            "TENMON_AUTONOMY_FINAL_OPERABLE_ACCEPTANCE_RETRY_CURSOR_AUTO_V1",
        ),
    ]

    step_results: list[dict[str, Any]] = []
    failed_at: str | None = None
    retry_card: str | None = None

    for card_id, cmd, retry in steps:
        p = subprocess.run(cmd, cwd=str(repo), env={**os.environ, "TENMON_OPERABLE_6CARD_MODE": "1"})
        step_results.append({"card": card_id, "exit_code": p.returncode, "pass": p.returncode == 0})
        if p.returncode != 0:
            failed_at = card_id
            retry_card = retry
            break

    master_pass = failed_at is None

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": utc(),
        "master_pass": master_pass,
        "steps": step_results,
        "failed_card": failed_at,
        "retry_card": retry_card,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail": retry_card,
        "single_retry_only": True,
    }

    summary_path = auto / "tenmon_autonomy_to_operable_6card_master_chain_summary.json"
    report_path = auto / "tenmon_autonomy_to_operable_6card_master_chain_report.md"
    write_json(summary_path, out)

    lines = [
        f"# {CARD}",
        "",
        f"- master_pass: `{master_pass}`",
        f"- failed_card: `{failed_at}`",
        f"- retry_card: `{retry_card}`",
        "",
        "## Steps",
        "",
    ]
    for s in step_results:
        lines.append(f"- `{s['card']}` exit={s['exit_code']} pass={s['pass']}")
    lines.extend(["", f"- next_on_pass: `{NEXT_ON_PASS}`", ""])
    report_path.write_text("\n".join(lines), encoding="utf-8")

    return 0 if master_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
