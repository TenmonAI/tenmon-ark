#!/usr/bin/env python3
"""
TENMON-ARK — patch_executor_v1
class-based patch strategy dispatch (minimal: dry-run logs only; real patch via Cursor/external).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class PatchResult:
    ok: bool
    mode: str
    message: str
    skipped_reason: str | None = None


def _card_get(card: Dict[str, Any], key: str, default: Any = None) -> Any:
    return card.get(key, default)


def execute_patch(card: Dict[str, Any], *, dry_run: bool = True) -> PatchResult:
    """Apply patch per card.class / patchStrategy. No file writes in library mode."""
    cls = _card_get(card, "class", "")
    strategy = _card_get(card, "patchStrategy") or {}
    mode = strategy.get("mode", "none")

    if _card_get(card, "requiresHumanJudgement") or cls == "human_gate":
        return PatchResult(
            ok=False,
            mode=mode,
            message="human_judgement_required",
            skipped_reason="HUMAN_GATE",
        )

    if mode == "none":
        return PatchResult(ok=True, mode=mode, message="no_patch_audit_or_report_only")

    if mode == "human_prompt_only":
        return PatchResult(
            ok=False,
            mode=mode,
            message="prompt_only_stop",
            skipped_reason="HUMAN_PROMPT",
        )

    if dry_run:
        return PatchResult(
            ok=True,
            mode=mode,
            message=f"dry_run_skip class={cls} mode={mode}",
            skipped_reason="DRY_RUN",
        )

    # Non-dry-run: automation does not apply code edits in v1 (Cursor/external).
    return PatchResult(
        ok=False,
        mode=mode,
        message="non_dry_run_not_implemented_use_external_cursor",
        skipped_reason="NOT_IMPLEMENTED",
    )


def describe_allowed_class_behavior(card_class: str) -> str:
    table = {
        "audit": "No repo writes; reports only.",
        "docs": "docs paths only (api/docs/** typically).",
        "runtime_refactor": "allowedPaths only; min_diff.",
        "runtime_safe_patch": "narrow allowedPaths; no chat.ts unless card allows.",
        "client": "client/** only.",
        "quarantine": "move_only under allowedPaths.",
        "archive": "move_only under allowedPaths.",
        "schema": "schema/automation JSON or sql per allowedPaths.",
        "human_gate": "Stop before patch.",
    }
    return table.get(card_class, "unknown_class")
