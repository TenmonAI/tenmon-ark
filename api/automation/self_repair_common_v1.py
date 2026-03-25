# -*- coding: utf-8 -*-
"""TENMON_SELF_REPAIR_OS — 共有定数・パス"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

VERSION = 1
CARD = "TENMON_SELF_REPAIR_OS_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_SELF_REPAIR_OS_VPS_V1"
FAIL_NEXT = "TENMON_SELF_REPAIR_OS_CURSOR_AUTO_RETRY_V1"

# PARENT_05 正規分類 + 既存互換（route_probe_fail / surface_regression は別名として残す）
FAIL_TYPES = (
    "build_fail",
    "restart_fail",
    "health_fail",
    "audit_fail",
    "runtime_probe_fail",
    "surface_noise_fail",
    "route_authority_fail",
    "learning_quality_fail",
    "dangerous_patch",
    "runtime_regression",
    "route_probe_fail",
    "surface_regression",
)

# primary_fail_type の優先順（高リスク・学習汚染を先に）
FAIL_PRIMARY_ORDER = (
    "dangerous_patch",
    "learning_quality_fail",
    "build_fail",
    "route_authority_fail",
    "runtime_probe_fail",
    "route_probe_fail",
    "health_fail",
    "audit_fail",
    "restart_fail",
    "surface_noise_fail",
    "surface_regression",
    "runtime_regression",
)


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
