# -*- coding: utf-8 -*-
"""TENMON_OBSERVATION_OS — 共有定数（read-only 観測用）"""
from __future__ import annotations

from pathlib import Path

VERSION = 1
CARD = "TENMON_OBSERVATION_OS_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_OBSERVATION_OS_VPS_V1"
FAIL_NEXT = "TENMON_OBSERVATION_OS_CURSOR_AUTO_RETRY_V1"

BLOCKER_TAXONOMY_IDS: tuple[str, ...] = (
    "surface",
    "route",
    "longform",
    "density",
    "runtime",
    "learning_input_quality",
    "learning_seed_quality",
    "evidence_grounding",
    "seal_contract",
    "remote_execution",
)


def api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
