#!/usr/bin/env python3
"""
Cursor executor bridge v1.

Phase 0-1 allowlist gate utility.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable


ALLOWLIST_PATH = Path(__file__).with_name("multi_ai_autonomy_allowlist_v1.json")


def _load_allowlist_ids() -> set[str]:
    if not ALLOWLIST_PATH.exists():
        return set()
    try:
        data = json.loads(ALLOWLIST_PATH.read_text(encoding="utf-8"))
    except Exception:
        return set()
    values = data.get("allowlisted_card_ids", [])
    if not isinstance(values, list):
        return set()
    return {str(v).strip().upper() for v in values if str(v).strip()}


def _matches_phase_suffixes(card_id: str, prefixes: Iterable[str]) -> bool:
    cid = card_id.upper()
    suffixes = ("", "_V2", "_V3", "_PATCH")
    for p in prefixes:
        pu = p.upper()
        if pu in cid:
            return True
        for s in suffixes:
            if f"{pu}{s}" in cid:
                return True
    return False


def card_id_cursor_operator_allowlisted(card_id: str) -> bool:
    """
    Return True when the card id is allowlisted for cursor operator execution.

    Required keyword support:
    - HYGIENE (including V2/V3 variants)
    - WORKTREE
    - RELOCK
    - BUILD_GREEN
    - ACCEPTANCE_PROBE
    - also accepts *_V2 / *_V3 / *_PATCH suffix-style ids.
    """
    cid = str(card_id or "").strip().upper()
    if not cid:
        return False

    allow_ids = _load_allowlist_ids()
    if cid in allow_ids:
        return True

    required_keywords = ("HYGIENE", "WORKTREE", "RELOCK", "BUILD_GREEN", "ACCEPTANCE_PROBE")
    if _matches_phase_suffixes(cid, required_keywords):
        return True

    # Acceptance-oriented broad rule: if any allowlisted id is a substring match.
    for allowed in allow_ids:
        if allowed and allowed in cid:
            return True

    return False


__all__ = ["card_id_cursor_operator_allowlisted"]
