#!/usr/bin/env python3
"""
TENMON Phase 5: Notion writeback fail-soft helper.

Rules implemented:
- Transport I/O error -> append to pending queue.
- Do not force parent loop HOLD by this error alone.
- Keep existing HOLD logic untouched by exposing result payload.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
PENDING_QUEUE_PATH = BASE_DIR / "notion_pending_writeback_queue.json"
RUNTIME_STATE_PATH = BASE_DIR / "multi_ai_autonomy_runtime_state.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def append_pending(entry: Dict[str, Any]) -> None:
    queue = read_json(PENDING_QUEUE_PATH, [])
    if not isinstance(queue, list):
        queue = []
    queue.append(entry)
    write_json(PENDING_QUEUE_PATH, queue)


@dataclass
class WritebackResult:
    ok: bool
    hold: bool
    reason: str
    queued: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ok": self.ok,
            "hold": self.hold,
            "reason": self.reason,
            "queued": self.queued,
        }


def _post_notion(payload: Dict[str, Any], token: str) -> None:
    body = json.dumps(payload).encode("utf-8")
    req = Request(
        "https://api.notion.com/v1/pages",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        },
    )
    with urlopen(req, timeout=10) as _:
        return


def writeback_once(args: Dict[str, Any]) -> WritebackResult:
    notion_page_id = str(args.get("notion_page_id", "")).strip()
    payload = args.get("payload", {})
    payload_ref = str(args.get("payload_ref", "")).strip() or "inline_payload"
    attempt = int(args.get("attempt", 1) or 1)
    token = str(args.get("notion_token", "")).strip()

    if not notion_page_id or not isinstance(payload, dict):
        return WritebackResult(ok=False, hold=True, reason="invalid_input", queued=False)
    if not token:
        return WritebackResult(ok=False, hold=True, reason="missing_token", queued=False)

    try:
        _post_notion(payload, token)
        return WritebackResult(ok=True, hold=False, reason="ok", queued=False)
    except (URLError, HTTPError, TimeoutError, OSError) as exc:
        retry_at = datetime.now(timezone.utc) + timedelta(minutes=min(60, 5 * attempt))
        append_pending(
            {
                "notion_page_id": notion_page_id,
                "payload_ref": payload_ref,
                "payload": payload,
                "hold_reason": f"transport_io_error:{type(exc).__name__}",
                "retry_at": retry_at.isoformat(),
                "attempt": attempt,
                "created_at": now_iso(),
            }
        )
        return WritebackResult(
            ok=False,
            hold=False,
            reason="queued_transport_error",
            queued=True,
        )


def _demo_inputs() -> Dict[str, Any]:
    return {
        "notion_page_id": "demo-page-id",
        "payload_ref": "demo_payload",
        "payload": {"parent": {"page_id": "demo-page-id"}, "properties": {}},
        "attempt": 1,
        "notion_token": "DUMMY_TOKEN",
    }


if __name__ == "__main__":
    result = writeback_once(_demo_inputs())
    print(json.dumps(result.to_dict(), ensure_ascii=False))
