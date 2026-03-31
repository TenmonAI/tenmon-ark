#!/usr/bin/env python3
"""Cursor executor bridge v1.

result payload の判定責務を持つ最小ブリッジ:
- result_status == "executed" を PASS 条件として扱う
- payload を VPS inbox(JSONL) に記録する
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
class BridgeVerdict:
    ok: bool
    status: str
    reason: str


def _pick_result_status(payload: dict[str, Any]) -> str:
    direct = payload.get("result_status")
    if isinstance(direct, str) and direct.strip():
        return direct.strip().lower()

    result_obj = payload.get("result")
    if isinstance(result_obj, dict):
        nested = result_obj.get("result_status")
        if isinstance(nested, str) and nested.strip():
            return nested.strip().lower()

    meta_obj = payload.get("meta")
    if isinstance(meta_obj, dict):
        nested_meta = meta_obj.get("result_status")
        if isinstance(nested_meta, str) and nested_meta.strip():
            return nested_meta.strip().lower()

    return ""


def evaluate_payload(payload: dict[str, Any]) -> BridgeVerdict:
    status = _pick_result_status(payload)
    if status == "executed":
        return BridgeVerdict(ok=True, status=status, reason="result_status executed accepted")
    if not status:
        return BridgeVerdict(ok=False, status="", reason="result_status missing")
    return BridgeVerdict(ok=False, status=status, reason=f"unsupported result_status: {status}")


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False))
        f.write("\n")


def load_payload(args: argparse.Namespace) -> dict[str, Any]:
    if args.payload:
        parsed = json.loads(args.payload)
        if not isinstance(parsed, dict):
            raise ValueError("--payload must be a JSON object")
        return parsed
    if args.payload_file:
        parsed = json.loads(args.payload_file.read_text(encoding="utf-8"))
        if not isinstance(parsed, dict):
            raise ValueError("--payload-file must contain a JSON object")
        return parsed
    data = sys.stdin.read().strip()
    if not data:
        raise ValueError("payload required via --payload / --payload-file / stdin")
    parsed = json.loads(data)
    if not isinstance(parsed, dict):
        raise ValueError("stdin payload must be JSON object")
    return parsed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cursor executor bridge v1")
    parser.add_argument("--payload", type=str, help="Payload JSON string")
    parser.add_argument("--payload-file", type=Path, help="Payload JSON file path")
    parser.add_argument(
        "--vps-inbox",
        type=Path,
        default=Path("/tmp/tenmon_vps_result_inbox.jsonl"),
        help="VPS inbox JSONL path",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        payload = load_payload(args)
    except Exception as exc:  # noqa: BLE001
        print(f"[bridge] FAIL payload parse error: {exc}")
        print("verdict: FAIL")
        return 2

    verdict = evaluate_payload(payload)
    record = {
        "timestamp": utc_now(),
        "payload": payload,
        "bridge_result": {
            "ok": verdict.ok,
            "status": verdict.status,
            "reason": verdict.reason,
        },
    }
    append_jsonl(args.vps_inbox, record)
    status = "PASS" if verdict.ok else "FAIL"
    print(f"[bridge] {status} status={verdict.status or '<missing>'} reason={verdict.reason}")
    print(f"[bridge] inbox={args.vps_inbox}")
    print(f"verdict: {status}")
    return 0 if verdict.ok else 1


if __name__ == "__main__":
    sys.exit(main())
