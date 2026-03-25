#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SEAL_CONTRACT_NORMALIZE_V1 — replay / workspace JSON の真偽を cwd やスキーマ版差で誤認しない。
null を True 相当にしない（明示的 True のみ）。
"""
from __future__ import annotations

from typing import Any, Dict


def replay_acceptance_ok(ra: Dict[str, Any] | None) -> bool:
    """replay_audit_v1 --stdout-json の acceptanceOk または acceptance.ok を厳密に読む。"""
    if not ra or not isinstance(ra, dict):
        return False
    v = ra.get("acceptanceOk")
    if v is True:
        return True
    if v is False:
        return False
    acc = ra.get("acceptance")
    if isinstance(acc, dict):
        ok = acc.get("ok")
        if ok is True:
            return True
        if ok is False:
            return False
    return False


def workspace_ready_strict(wo: Dict[str, Any] | None) -> bool:
    if not wo or not isinstance(wo, dict):
        return False
    return wo.get("readyForApply") is True


def workspace_ready_apply_safe(wo: Dict[str, Any] | None) -> bool:
    """厳密 ready または apply-safe（生成物・レポートのみ dirty 等）。"""
    if workspace_ready_strict(wo):
        return True
    if not wo or not isinstance(wo, dict):
        return False
    return wo.get("readyForApplyApplySafe") is True


def workspace_classified_apply_safe(wo: Dict[str, Any] | None) -> bool:
    dc = (wo or {}).get("dirtyClassification") if isinstance(wo, dict) else None
    if not isinstance(dc, dict):
        return False
    return dc.get("applySafeForAutonomousSeal") is True
