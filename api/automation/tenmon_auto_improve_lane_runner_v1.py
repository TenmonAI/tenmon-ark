#!/usr/bin/env python3
"""TENMON AUTO-IMPROVE LANE runner v1.

conversation quality lane を繰り返し実行する常時運転ランナー。
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_log(log_file: Path, message: str) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with log_file.open("a", encoding="utf-8") as f:
        f.write(f"{utc_now()} {message}\n")


def run_lane_once(lane_script: Path, base_url: str, probe_output: Path, ledger_file: Path) -> subprocess.CompletedProcess[str]:
    cmd = [
        sys.executable,
        str(lane_script),
        "--base-url",
        base_url,
        "--probe-output",
        str(probe_output),
        "--ledger-file",
        str(ledger_file),
    ]
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def main() -> int:
    parser = argparse.ArgumentParser(description="TENMON auto-improve lane runner v1")
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
    parser.add_argument(
        "--log-file",
        type=Path,
        default=Path("/tmp/tenmon_auto_improve_lane.log"),
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=0,
        help="0 means infinite loop",
    )
    parser.add_argument(
        "--interval-sec",
        type=float,
        default=20.0,
    )
    args = parser.parse_args()

    lane_script = args.automation_dir / "tenmon_conversation_quality_lane_v1.py"
    if not lane_script.exists():
        append_log(args.log_file, f"[runner] FAIL lane script missing: {lane_script}")
        print(f"[runner] FAIL lane script missing: {lane_script}")
        print("verdict: FAIL")
        return 2

    cycle = 0
    while True:
        cycle += 1
        append_log(args.log_file, f"[runner] cycle={cycle} start")
        proc = run_lane_once(lane_script, args.base_url, args.probe_output, args.ledger_file)
        if proc.stdout:
            append_log(args.log_file, proc.stdout.strip())
        if proc.stderr:
            append_log(args.log_file, proc.stderr.strip())
        ok = proc.returncode == 0
        append_log(args.log_file, f"[runner] cycle={cycle} {'PASS' if ok else 'FAIL'}")
        if not ok:
            print(f"[runner] cycle={cycle} FAIL")
            print("verdict: FAIL")
            return 1
        if args.cycles > 0 and cycle >= args.cycles:
            break
        time.sleep(args.interval_sec)

    print(f"[runner] cycles={cycle} PASS")
    print(f"[runner] log={args.log_file}")
    print("verdict: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
