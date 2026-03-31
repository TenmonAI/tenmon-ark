#!/usr/bin/env python3
"""
Multi AI autonomy supervisor v1.

Phase 8: strengthen Claude/Gemini structured prompts.
"""

from __future__ import annotations

from dataclasses import dataclass


CLAUDE_AUDIT_SUFFIX = """以下の実装計画について厳格に監査せよ。
JSON形式で返せ:
{
  "design_risks": [{"severity":"high|medium|low","description":"..."}],
  "acceptance_refined": "...",
  "patch_review": "..."
}
空配列禁止。リスクがない場合は severity=low で理由を書け。"""

GEMINI_COMPARE_SUFFIX = """以下を構造化して比較・選択肢を出せ。
JSON形式で返せ:
{
  "options": [...],
  "comparison_table": {...},
  "risk_candidates": [...]
}
空配列禁止。"""


@dataclass(frozen=True)
class SupervisedPrompt:
    provider: str
    prompt: str


def build_claude_prompt(base_prompt: str) -> SupervisedPrompt:
    merged = f"{base_prompt.strip()}\n\n{CLAUDE_AUDIT_SUFFIX}"
    return SupervisedPrompt(provider="claude", prompt=merged)


def build_gemini_prompt(base_prompt: str) -> SupervisedPrompt:
    merged = f"{base_prompt.strip()}\n\n{GEMINI_COMPARE_SUFFIX}"
    return SupervisedPrompt(provider="gemini", prompt=merged)


__all__ = ["SupervisedPrompt", "build_claude_prompt", "build_gemini_prompt"]
