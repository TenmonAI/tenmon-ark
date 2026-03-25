# -*- coding: utf-8 -*-
"""TENMON_REMOTE_CURSOR_COMMAND_CENTER — 共有定数"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

VERSION = 1
CARD = "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_REMOTE_CURSOR_COMMAND_CENTER_VPS_V1"
FAIL_NEXT = "TENMON_REMOTE_CURSOR_COMMAND_CENTER_CURSOR_AUTO_RETRY_V1"


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
