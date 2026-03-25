# -*- coding: utf-8 -*-
"""TENMON_LEARNING_INTEGRATION_OS — 共有定数・パス・JSON 読取"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict

VERSION = 1
CARD = "TENMON_LEARNING_INTEGRATION_OS_CURSOR_AUTO_V1"
VPS_CARD = "TENMON_LEARNING_INTEGRATION_OS_VPS_V1"
FAIL_NEXT = "TENMON_LEARNING_INTEGRATION_OS_CURSOR_AUTO_RETRY_V1"

METRICS = (
    "learning_input_quality",
    "seed_quality",
    "evidence_grounding_quality",
    "route_learning_relevance",
    "conversation_return_quality",
)


def api_automation() -> Path:
    return Path(__file__).resolve().parent


def api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def utc_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def orchestrator_dir() -> Path:
    env = os.environ.get("TENMON_OBSERVATION_ORCH_DIR", "").strip()
    if env:
        return Path(env).resolve()
    return api_automation() / "out" / "tenmon_full_orchestrator_v1"


def priority_queue_path() -> Path:
    return api_automation() / "priority_queue.json"


def baseline_path() -> Path:
    return api_automation() / "learning_integration_baseline_v1.json"


def score_from_blockers(count: int, weight: float = 5.0, cap: int = 100) -> int:
    """ブロッカー件数から 0-cap のスコア（read-only 近似）。"""
    raw = cap - int(count * weight)
    return max(0, min(cap, raw))


def status_multiplier(unified: str) -> float:
    u = (unified or "").lower()
    if u == "green":
        return 1.0
    if u == "yellow":
        return 0.92
    if u == "red":
        return 0.75
    return 0.88
