#!/usr/bin/env python3
"""TENMON conversation quality lane v1.

low-risk patch -> build -> audit -> probe -> acceptance の順で1サイクル実行する。
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run_step(name: str, cmd: list[str]) -> bool:
    print(f"[lane-v1] step={name} start")
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.stdout:
        print(proc.stdout.strip())
    if proc.stderr:
        print(proc.stderr.strip())
    ok = proc.returncode == 0
    print(f"[lane-v1] step={name} {'PASS' if ok else 'FAIL'}")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description="TENMON conversation quality lane v1")
    parser.add_argument(
        "--automation-dir",
        type=Path,
        default=Path("/workspace/api/automation"),
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default="http://127.0.0.1:3000",
    )
    parser.add_argument(
        "--probe-output",
        type=Path,
        default=Path("/tmp/tenmon_conversation_probe_v2.json"),
    )
    parser.add_argument(
        "--ledger-file",
        type=Path,
        default=Path("/tmp/tenmon_conversation_regression_ledger_v1.jsonl"),
    )
    args = parser.parse_args()

    probe_script = args.automation_dir / "tenmon_conversation_acceptance_probe_v2.py"
    ledger_script = args.automation_dir / "tenmon_conversation_regression_ledger_v1.py"
    e2e_script = args.automation_dir / "tenmon_result_payload_e2e_v1.py"
    supervisor_script = args.automation_dir / "multi_ai_autonomy_supervisor_v1.py"

    # low-risk patch: queueを上書きせず、存在しない時のみ最低限の1件を追加
    queue_file = Path("/tmp/tenmon_supervisor_queue.jsonl")
    if not queue_file.exists():
        queue_file.write_text('{"task_id":"lane-bootstrap","kind":"quality"}\n', encoding="utf-8")
        print(f"[lane-v1] low-risk patch applied queue_file={queue_file}")
    else:
        print(f"[lane-v1] low-risk patch skipped queue_exists={queue_file}")

    # build: Python laneでは syntax check を build 相当として扱う
    if not run_step("build", [sys.executable, "-m", "py_compile", str(probe_script), str(ledger_script), str(e2e_script), str(supervisor_script)]):
        print("verdict: FAIL")
        return 1

    # audit: supervisor preflight
    if not run_step(
        "audit",
        [
            sys.executable,
            str(supervisor_script),
            "--queue-file",
            str(queue_file),
            "--allow-empty-queue",
            "--preflight-only",
        ],
    ):
        print("verdict: FAIL")
        return 1

    # probe: 7問採点
    if not run_step(
        "probe",
        [
            sys.executable,
            str(probe_script),
            "--base-url",
            args.base_url,
            "--output",
            str(args.probe_output),
        ],
    ):
        print("verdict: FAIL")
        return 1

    # acceptance: payload e2e + ledger更新
    accept_ok = run_step(
        "acceptance-e2e",
        [sys.executable, str(e2e_script), "--queue-file", str(queue_file)],
    )
    ledger_ok = run_step(
        "acceptance-ledger",
        [
            sys.executable,
            str(ledger_script),
            "--current-report",
            str(args.probe_output),
            "--ledger-file",
            str(args.ledger_file),
        ],
    )
    if accept_ok and ledger_ok:
        print("[lane-v1] cycle complete")
        print("verdict: PASS")
        return 0

    print("verdict: FAIL")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
