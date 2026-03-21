#!/usr/bin/env python3
"""FAIL taxonomy for Build Automation Supervisor."""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional


class FailClass(str, Enum):
    BUILD_FAILURE = "build_failure"
    TYPE_ERROR = "type_error"
    ROUTE_REGRESSION = "route_regression"
    HEALTH_FAILURE = "health_failure"
    ACCEPTANCE_FAILURE = "acceptance_failure"
    FORBIDDEN_DIFF = "forbidden_diff"
    MIXED_COMMIT = "mixed_commit"
    HUMAN_JUDGEMENT_REQUIRED = "human_judgement_required"
    UNKNOWN = "unknown"


def classify_failure(
    *,
    exit_code: int,
    stderr: str = "",
    stdout: str = "",
    flags: Optional[Dict[str, Any]] = None,
) -> FailClass:
    flags = flags or {}
    if flags.get("human_judgement_required"):
        return FailClass.HUMAN_JUDGEMENT_REQUIRED
    if flags.get("mixed_commit"):
        return FailClass.MIXED_COMMIT
    if flags.get("forbidden_diff"):
        return FailClass.FORBIDDEN_DIFF
    if flags.get("acceptance_failure"):
        return FailClass.ACCEPTANCE_FAILURE
    if flags.get("health_failure"):
        return FailClass.HEALTH_FAILURE
    if flags.get("route_regression"):
        return FailClass.ROUTE_REGRESSION
    if exit_code == 0:
        return FailClass.UNKNOWN
    text = (stderr + stdout).lower()
    if "health" in text and ("fail" in text or "curl" in text):
        return FailClass.HEALTH_FAILURE
    if "tsc" in text or "typescript" in text or "type error" in text:
        return FailClass.TYPE_ERROR
    if "route" in text and "regress" in text:
        return FailClass.ROUTE_REGRESSION
    if "build" in text or "error" in text:
        return FailClass.BUILD_FAILURE
    return FailClass.UNKNOWN


def to_json_dict(fc: FailClass, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    out: Dict[str, Any] = {"failClass": fc.value}
    if extra:
        out.update(extra)
    return out
