#!/usr/bin/env python3
"""result payload end-to-end checker v1.

Mac watch_loop -> VPS bridge を直結し、verdict を返す。
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw:
            continue
        obj = json.loads(raw)
        if isinstance(obj, dict):
            rows.append(obj)
    return rows


def run_cmd(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def main() -> int:
    parser = argparse.ArgumentParser(description="TENMON result payload e2e v1")
    parser.add_argument(
        "--queue-file",
        type=Path,
        default=Path("/tmp/tenmon_supervisor_queue.jsonl"),
    )
    parser.add_argument(
        "--mac-outbox",
        type=Path,
        default=Path("/tmp/tenmon_mac_to_vps_results.jsonl"),
    )
    parser.add_argument(
        "--vps-inbox",
        type=Path,
        default=Path("/tmp/tenmon_vps_result_inbox.jsonl"),
    )
    parser.add_argument(
        "--watch-script",
        type=Path,
        default=Path("/workspace/api/automation/tenmon_watch_loop_v1.py"),
    )
    parser.add_argument(
        "--bridge-script",
        type=Path,
        default=Path("/workspace/api/automation/cursor_executor_bridge_v1.py"),
    )
    args = parser.parse_args()

    # clean old artifacts for deterministic e2e check
    if args.mac_outbox.exists():
        args.mac_outbox.unlink()
    if args.vps_inbox.exists():
        args.vps_inbox.unlink()

    watch = run_cmd(
        [
            sys.executable,
            str(args.watch_script),
            "--queue-file",
            str(args.queue_file),
            "--outbox-file",
            str(args.mac_outbox),
            "--cycle-label",
            "e2e",
        ]
    )
    if watch.stdout:
        print(watch.stdout.strip())
    if watch.stderr:
        print(watch.stderr.strip())
    if watch.returncode != 0:
        print("verdict: FAIL")
        return 1

    payloads = read_jsonl(args.mac_outbox)
    if not payloads:
        print("[e2e] FAIL no payload from watch_loop")
        print("verdict: FAIL")
        return 1

    all_ok = True
    for payload in payloads:
        bridge = run_cmd(
            [
                sys.executable,
                str(args.bridge_script),
                "--payload",
                json.dumps(payload, ensure_ascii=False),
                "--vps-inbox",
                str(args.vps_inbox),
            ]
        )
        if bridge.stdout:
            print(bridge.stdout.strip())
        if bridge.stderr:
            print(bridge.stderr.strip())
        if bridge.returncode != 0:
            all_ok = False

    inbox_rows = read_jsonl(args.vps_inbox)
    accepted = [
        row
        for row in inbox_rows
        if isinstance(row.get("bridge_result"), dict)
        and row["bridge_result"].get("ok") is True
        and row["bridge_result"].get("status") == "executed"
    ]

    if all_ok and len(accepted) == len(payloads):
        print(f"[e2e] PASS payloads={len(payloads)} accepted={len(accepted)}")
        print("verdict: PASS")
        return 0

    print(
        f"[e2e] FAIL payloads={len(payloads)} accepted={len(accepted)} "
        f"all_ok={str(all_ok).lower()}"
    )
    print("verdict: FAIL")
    return 1


if __name__ == "__main__":
    sys.exit(main())
