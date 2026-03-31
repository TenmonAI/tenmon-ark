#!/usr/bin/env python3
"""TENMON multi-AI autonomy supervisor v1.

Phase1の要求に合わせ、--allow-empty-queue を preflight 判定へ接続する。
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class PreflightResult:
    ok: bool
    queue_count: int
    allow_empty_queue: bool
    reason: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_queue(queue_file: Path) -> list[dict[str, Any]]:
    if not queue_file.exists():
        return []
    items: list[dict[str, Any]] = []
    for line in queue_file.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw:
            continue
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict):
                items.append(obj)
            else:
                items.append({"raw": obj})
        except json.JSONDecodeError:
            items.append({"raw_line": raw})
    return items


def run_preflight(queue_file: Path, allow_empty_queue: bool) -> PreflightResult:
    queue_items = load_queue(queue_file)
    if queue_items:
        return PreflightResult(
            ok=True,
            queue_count=len(queue_items),
            allow_empty_queue=allow_empty_queue,
            reason="queue has tasks",
        )
    if allow_empty_queue:
        return PreflightResult(
            ok=True,
            queue_count=0,
            allow_empty_queue=True,
            reason="queue is empty but allowed",
        )
    return PreflightResult(
        ok=False,
        queue_count=0,
        allow_empty_queue=False,
        reason="queue is empty (set --allow-empty-queue to bypass)",
    )


def print_preflight(result: PreflightResult) -> None:
    status = "PASS" if result.ok else "FAIL"
    print(
        f"[preflight] {status} queue_count={result.queue_count} "
        f"allow_empty_queue={str(result.allow_empty_queue).lower()} reason={result.reason}"
    )


def run_orchestra(task: dict[str, Any], cycle: int, idx: int) -> None:
    task_id = task.get("task_id", f"cycle-{cycle}-task-{idx}")
    print(f"[orchestra] reached task_id={task_id}")


def run_bridge(bridge_script: Path, task: dict[str, Any], inbox: Path) -> bool:
    if not bridge_script.exists():
        print(f"[bridge] SKIP script-not-found path={bridge_script}")
        return True
    cmd = [
        sys.executable,
        str(bridge_script),
        "--payload",
        json.dumps(task, ensure_ascii=False),
        "--vps-inbox",
        str(inbox),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip())
    return result.returncode == 0


def supervisor_loop(args: argparse.Namespace) -> int:
    preflight = run_preflight(args.queue_file, args.allow_empty_queue)
    print_preflight(preflight)
    if not preflight.ok:
        print("verdict: FAIL")
        return 2
    if args.preflight_only:
        print("verdict: PASS")
        return 0

    for cycle in range(1, args.cycles + 1):
        queue_items = load_queue(args.queue_file)
        if not queue_items:
            queue_items = [
                {
                    "task_id": f"heartbeat-{cycle}",
                    "result_status": "executed",
                    "kind": "heartbeat",
                    "created_at": utc_now(),
                }
            ]
        print(f"[supervisor] cycle={cycle} tasks={len(queue_items)}")
        for idx, task in enumerate(queue_items, start=1):
            task.setdefault("result_status", "executed")
            run_orchestra(task, cycle, idx)
            if not run_bridge(args.bridge_script, task, args.vps_inbox):
                print("verdict: FAIL")
                return 1

    print("verdict: PASS")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="TENMON autonomy supervisor v1")
    parser.add_argument(
        "--queue-file",
        type=Path,
        default=Path("/tmp/tenmon_supervisor_queue.jsonl"),
        help="JSONL queue file path",
    )
    parser.add_argument(
        "--allow-empty-queue",
        action="store_true",
        help="Allow empty queue (same preflight bypass behavior)",
    )
    parser.add_argument(
        "--preflight-only",
        action="store_true",
        help="Run only preflight checks",
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=1,
        help="Number of supervisor cycles",
    )
    parser.add_argument(
        "--bridge-script",
        type=Path,
        default=Path("/workspace/api/automation/cursor_executor_bridge_v1.py"),
        help="Bridge script path",
    )
    parser.add_argument(
        "--vps-inbox",
        type=Path,
        default=Path("/tmp/tenmon_vps_result_inbox.jsonl"),
        help="Bridge inbox file path",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.cycles < 1:
        print("[supervisor] cycles must be >= 1")
        return 2
    return supervisor_loop(args)


if __name__ == "__main__":
    sys.exit(main())
