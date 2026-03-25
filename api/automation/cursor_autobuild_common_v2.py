# -*- coding: utf-8 -*-
"""TENMON_CURSOR_AUTOBUILD_BRIDGE v2 — 共有定数"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

VERSION = 2
CARD = "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_CURSOR_AUTOBUILD_BRIDGE_VPS_V1"
FAIL_NEXT = "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_RETRY_V1"

REQUIRED_CARD_FIELDS: tuple[str, ...] = (
    "CARD_NAME",
    "OBJECTIVE",
    "WHY_NOW",
    "EDIT_SCOPE",
    "DO_NOT_TOUCH",
    "IMPLEMENTATION_POLICY",
    "ACCEPTANCE",
    "VPS_VALIDATION_OUTPUTS",
    "FAIL_NEXT_CARD",
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def repo_root() -> Path:
    return api_automation().parents[1]


def gen_apply_dir() -> Path:
    return api_automation() / "generated_cursor_apply"
