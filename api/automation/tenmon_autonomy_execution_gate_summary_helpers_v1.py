#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""execution gate / result return 用のスナップショット整形（最小）。"""
from __future__ import annotations

from typing import Any


def extract_started_ended(e: dict[str, Any]) -> tuple[str, str]:
    s = str(e.get("started_at") or e.get("ingested_at") or e.get("ingestedAt") or "").strip()
    end = str(e.get("ended_at") or e.get("completed_at") or e.get("completedAt") or "").strip()
    return s, end


def bridge_next_card(policy: dict[str, Any], enriched_latest: dict[str, Any] | None) -> str:
    npass = str(policy.get("nextOnPass") or "").strip()
    nfail = str(policy.get("nextOnFail") or "").strip()
    if not enriched_latest:
        return nfail
    eg = enriched_latest.get("execution_gate")
    if isinstance(eg, dict) and eg.get("gate_success") is True:
        return npass or nfail
    return nfail or npass


def execution_gate_snapshot_v1(
    *,
    card: str,
    enriched_latest: dict[str, Any] | None,
    policy: dict[str, Any],
    summary_path: str | None,
    generated_at: str,
) -> dict[str, Any]:
    st = "no_current_run"
    started_at = ""
    ended_at = ""
    if enriched_latest:
        st = str(enriched_latest.get("normalized_status") or enriched_latest.get("status") or "unknown")
        started_at, ended_at = extract_started_ended(enriched_latest)
        if not ended_at and st in ("failed", "success", "blocked"):
            ended_at = generated_at
    nc = bridge_next_card(policy, enriched_latest)
    return {
        "version": 1,
        "card": card,
        "status": st,
        "started_at": started_at or None,
        "ended_at": ended_at or None,
        "summary_path": summary_path,
        "next_card": nc or None,
    }
