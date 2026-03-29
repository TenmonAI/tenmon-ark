#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA — Cursor 実行カード合成

GPT 採用計画 + Claude acceptance 監査メモを束ね、Cursor へ渡す markdown と acceptance_bundle を生成。
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _ts() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def synthesize_cursor_card(
    *,
    adopted_plan: dict[str, Any],
    claude_audit: dict[str, Any],
    gemini_norm: dict[str, Any],
    next_card_name: str,
) -> tuple[str, dict[str, Any]]:
    targets = adopted_plan.get("target_paths") if isinstance(adopted_plan.get("target_paths"), list) else []
    summary = str(adopted_plan.get("summary") or "")
    acceptance_md = str(claude_audit.get("acceptance_refined") or "")

    md_lines = [
        "# TENMON_MULTI_AI_ORCHESTRA — Cursor execution card",
        "",
        "## 主裁定（GPT/天聞）",
        summary,
        "",
        "## TARGET_PATHS",
        *[f"- `{p}`" for p in targets],
        "",
        "## acceptance（Claude 監査反映）",
        acceptance_md,
        "",
        "## 非目標（自動禁止）",
        "* " + "\n* ".join(str(x) for x in (adopted_plan.get("non_goals") or [])),
        "",
        "## Gemini 構造化メモ（参考）",
        str(gemini_norm.get("structured_summary") or "")[:2000],
        "",
        f"## 次カード候補\n`{next_card_name}`",
        "",
        "## 停止条件",
        "- HOLD: hold_policy の immediate_hold に該当",
        "- dist 直編集禁止",
        "- 正典/正文/persona/canon の意味変更は GPT 裁定なしでは実装しない",
    ]
    md = "\n".join(md_lines)

    bundle = {
        "schema": "MULTI_AI_ACCEPTANCE_BUNDLE_V1",
        "generatedAt": _ts(),
        "acceptance_criteria": [
            "api で npm run check 成功",
            "GET /api/audit が ok",
            "multi_ai 出力が証拠ディレクトリに保存される",
            "HOLD 条件に触れない変更に留まる",
        ],
        "stop_conditions": [
            "target_paths が hold_policy.path_patterns_hold に一致",
            "execution_authority.authorized が false",
            "Claude design_risks に severity=high",
        ],
        "target_paths": targets,
        "next_card": next_card_name,
    }
    return md, bundle


def write_synthesized(out_dir: Path, md: str, bundle: dict[str, Any]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "synthesized_card.md").write_text(md, encoding="utf-8")
    (out_dir / "acceptance_bundle.json").write_text(
        json.dumps(bundle, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
