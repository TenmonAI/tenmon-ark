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


def validate_real_result_ingest_payload(entry: Dict[str, Any]) -> tuple[bool, str]:
    """dry_run でない ingest は acceptance_ok / build_rc を必須（fail-closed）。None を通さない。"""
    if entry.get("dry_run") is True:
        return True, ""
    ao = entry.get("acceptance_ok")
    if ao is not True and ao is not False:
        return False, "acceptance_ok_missing_or_not_bool:expected_true_false"
    br = entry.get("build_rc")
    if br is None:
        return False, "build_rc_missing:real_ingest_requires_int"
    try:
        int(br)
    except (TypeError, ValueError):
        return False, "build_rc_not_int_coercible"
    return True, ""


def normalize_remote_cursor_result_contract(
    entry: Dict[str, Any] | None,
) -> Dict[str, Any]:
    """
    cursor_executor_last_result / 監査用に acceptance_ok・build_rc・result_status を束ねる。
    entry が無い・欠落は fail-closed 表示（捏造で true/0 にしない）。
    """
    hops: list[str] = []
    if entry is None:
        return {
            "acceptance_ok": False,
            "build_rc": -1,
            "result_status": "bundle_entry_missing",
            "result_payload_ref": {
                "payload_contract_ok": False,
                "payload_contract_hops": ["hop:bundle_entry_missing"],
            },
            "payload_contract_ok": False,
            "payload_contract_hops": ["hop:bundle_entry_missing"],
        }

    dry = entry.get("dry_run") is True
    ao: bool | None = entry.get("acceptance_ok") if entry.get("acceptance_ok") in (True, False) else None
    br_raw = entry.get("build_rc")
    br: int | None
    try:
        br = int(br_raw) if br_raw is not None else None
    except (TypeError, ValueError):
        br = None
        if not dry:
            hops.append("hop:build_rc_coerce_failed")

    rs = str(entry.get("result_status") or entry.get("status") or "").strip() or None
    if not dry:
        if ao is None:
            hops.append("hop:acceptance_ok_not_bool")
            ao = False
        if br is None:
            hops.append("hop:build_rc_null_or_invalid")
            br = -1
        if not rs:
            hops.append("hop:result_status_empty")
            rs = "unknown"
    else:
        rs = rs or str(entry.get("status") or "").strip() or None

    rp = entry.get("result_payload")
    ref: Dict[str, Any] = {
        "queue_id": entry.get("queue_id"),
        "command_id": entry.get("command_id"),
        "acceptance_ok": ao,
        "build_rc": br,
        "result_status": rs,
        "dry_run": dry,
        "status": entry.get("status"),
        "payload_contract_ok": len(hops) == 0,
        "payload_contract_hops": list(hops),
    }
    if isinstance(rp, dict) and rp:
        ref["result_payload"] = rp

    return {
        "acceptance_ok": ao,
        "build_rc": br,
        "result_status": rs,
        "result_payload_ref": ref,
        "payload_contract_ok": len(hops) == 0,
        "payload_contract_hops": hops,
    }
