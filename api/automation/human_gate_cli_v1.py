#!/usr/bin/env python3
"""CLI for human gate records (AUTO_BUILD_HUMAN_GATE_UI_V1)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_AUTOMATION_DIR = Path(__file__).resolve().parent
if str(_AUTOMATION_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMATION_DIR))

from human_gate_store_v1 import (
    apply_gate_decision,
    list_gates,
    list_pending_gates,
    resolve_human_gate_root,
)


def cmd_list(args: argparse.Namespace) -> int:
    rows = list_gates(status=None) if args.all_statuses else list_pending_gates()
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0
    if not rows:
        print("(no records)")
        return 0
    for r in rows:
        print(
            f"{r.get('requestId')}\t{r.get('status')}\t{r.get('cardName')}\t{r.get('createdAt')}"
        )
    return 0


def cmd_approve(args: argparse.Namespace) -> int:
    try:
        rec = apply_gate_decision(args.request_id, "approved", args.by, args.note or "")
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1
    print(json.dumps(rec, ensure_ascii=False, indent=2))
    return 0


def cmd_reject(args: argparse.Namespace) -> int:
    try:
        rec = apply_gate_decision(args.request_id, "rejected", args.by, args.note or "")
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1
    print(json.dumps(rec, ensure_ascii=False, indent=2))
    return 0


def cmd_hold(args: argparse.Namespace) -> int:
    try:
        rec = apply_gate_decision(args.request_id, "held", args.by, args.note or "")
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1
    print(json.dumps(rec, ensure_ascii=False, indent=2))
    return 0


def cmd_info(_: argparse.Namespace) -> int:
    print(resolve_human_gate_root())
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="AUTO_BUILD_HUMAN_GATE_UI_V1 CLI")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list", help="List pending gate records (default)")
    p_list.add_argument(
        "--all",
        dest="all_statuses",
        action="store_true",
        help="List all records (any status)",
    )
    p_list.add_argument("--json", action="store_true")
    p_list.set_defaults(func=cmd_list)

    sub.add_parser("info", help="Print resolved human_gate store root").set_defaults(func=cmd_info)

    def add_decision(p: argparse.ArgumentParser, fn):
        p.add_argument("request_id")
        p.add_argument("--by", required=True)
        p.add_argument("--note", default="")
        p.set_defaults(func=fn)

    add_decision(sub.add_parser("approve", help="Approve a pending gate"), cmd_approve)
    add_decision(sub.add_parser("reject", help="Reject a pending gate"), cmd_reject)
    add_decision(sub.add_parser("hold", help="Hold a pending gate"), cmd_hold)

    args = ap.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
