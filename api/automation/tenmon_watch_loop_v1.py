#!/usr/bin/env python3
"""Mac側 watch_loop の最小再現。

queueの各タスクに result_status="executed" を付与して VPS 側へ送る。
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class WatchResult:
    sent: int
    outbox: Path


def load_queue(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw:
            continue
        obj = json.loads(raw)
        if not isinstance(obj, dict):
            obj = {"raw": obj}
        rows.append(obj)
    return rows


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False))
        f.write("\n")


def run_watch_loop(queue_file: Path, outbox_file: Path, cycle_label: str) -> WatchResult:
    queue = load_queue(queue_file)
    if not queue:
        queue = [{"task_id": f"watch-heartbeat-{cycle_label}"}]
    sent = 0
    for i, task in enumerate(queue, start=1):
        payload = dict(task)
        payload["result_status"] = "executed"
        payload.setdefault("task_id", f"{cycle_label}-{i}")
        payload["source"] = "mac_watch_loop"
        payload["sent_at"] = utc_now()
        append_jsonl(outbox_file, payload)
        sent += 1
    return WatchResult(sent=sent, outbox=outbox_file)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="TENMON watch loop v1")
    parser.add_argument(
        "--queue-file",
        type=Path,
        default=Path("/tmp/tenmon_supervisor_queue.jsonl"),
        help="Input queue JSONL",
    )
    parser.add_argument(
        "--outbox-file",
        type=Path,
        default=Path("/tmp/tenmon_mac_to_vps_results.jsonl"),
        help="Output payload JSONL for VPS bridge",
    )
    parser.add_argument("--cycle-label", type=str, default="cycle1")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        result = run_watch_loop(args.queue_file, args.outbox_file, args.cycle_label)
    except Exception as exc:  # noqa: BLE001
        print(f"[watch_loop] FAIL {exc}")
        print("verdict: FAIL")
        return 2
    print(f"[watch_loop] sent={result.sent} outbox={result.outbox}")
    print("verdict: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
