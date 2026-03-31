#!/usr/bin/env python3
"""Supervisor preflight for multi-ai autonomy queue.

This module validates queue JSON structure before execution.
`--allow-empty-queue` allows empty `card_order`, matching preflight semantics.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DEFAULT_QUEUE_PATH = Path(__file__).with_name("multi_ai_autonomy_queue.json")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate multi-ai autonomy queue.")
    parser.add_argument(
        "--queue",
        type=Path,
        default=DEFAULT_QUEUE_PATH,
        help=f"Path to queue JSON (default: {DEFAULT_QUEUE_PATH})",
    )
    parser.add_argument(
        "--allow-empty-queue",
        action="store_true",
        help="Allow empty card_order (same behavior as preflight).",
    )
    return parser


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"queue file not found: {path}")
    with path.open("r", encoding="utf-8") as fp:
        data = json.load(fp)
    if not isinstance(data, dict):
        raise ValueError("queue JSON must be an object")
    return data


def _validate_queue(data: dict[str, Any], allow_empty_queue: bool) -> None:
    card_order = data.get("card_order")
    if not isinstance(card_order, list):
        raise ValueError("card_order must be an array")

    if not card_order and not allow_empty_queue:
        raise ValueError(
            "card_order must not be empty (use --allow-empty-queue to bypass)"
        )


def main() -> int:
    args = _build_parser().parse_args()

    try:
        queue_data = _load_json(args.queue)
        _validate_queue(queue_data, allow_empty_queue=args.allow_empty_queue)
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
        print(f"[multi_ai_autonomy_supervisor_v1] ERROR: {exc}")
        return 1

    print("[multi_ai_autonomy_supervisor_v1] preflight ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
