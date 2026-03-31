#!/usr/bin/env python3
"""
Remote cursor result ingest v1.

Phase 0-2 result payload non-null contract.
"""

from __future__ import annotations

from typing import Any, Dict, Literal


ResultStatus = Literal["ok", "fail", "hold"]


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def _to_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "ok"}:
        return True
    if text in {"0", "false", "no", "n", "fail"}:
        return False
    return default


def _normalize_status(value: Any, default: ResultStatus = "hold") -> ResultStatus:
    text = str(value or "").strip().lower()
    if text in {"ok", "pass", "passed", "success"}:
        return "ok"
    if text in {"fail", "failed", "error", "ng"}:
        return "fail"
    if text in {"hold", "pending", "blocked"}:
        return "hold"
    return default


def normalize_entry_v1(entry: Dict[str, Any] | None) -> Dict[str, Any]:
    """
    Normalize ingest payload and guarantee required non-null fields:
    - build_rc: number
    - acceptance_ok: boolean
    - result_status: "ok" | "fail" | "hold"
    - current_run: true
    """
    data = dict(entry or {})
    data["build_rc"] = _to_int(data.get("build_rc"), 0)
    data["acceptance_ok"] = _to_bool(data.get("acceptance_ok"), False)
    data["result_status"] = _normalize_status(data.get("result_status"), "hold")
    data["current_run"] = True
    return data


__all__ = ["normalize_entry_v1"]
