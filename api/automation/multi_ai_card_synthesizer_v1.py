#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA — Cursor 実行カード合成
TENMON_CURSOR_AUTOBUILD_OPERATOR_BIND_CURSOR_AUTO_V1

GPT 採用計画 + Claude acceptance 監査メモを束ね、Cursor へ渡す markdown と acceptance_bundle を生成。
Notion 由来カードは cursor_executor_bridge_v1 と同基準（allowlist / blocklist / VPS last_judgement PASS）で事前検査する。
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cursor_executor_bridge_v1 as op_bridge


def _ts() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _synth_layer_risk_gate(
    adopted_plan: dict[str, Any],
    claude_audit: dict[str, Any],
) -> tuple[bool, str]:
    auth = adopted_plan.get("execution_authority") if isinstance(adopted_plan.get("execution_authority"), dict) else {}
    if auth and auth.get("authorized") is not True:
        return False, "execution_authority_not_authorized"
    for r in claude_audit.get("design_risks") or []:
        if isinstance(r, dict) and str(r.get("severity") or "").lower() == "high":
            return False, "claude_design_risk_severity_high"
    return True, "ok"


def _cursor_operator_execution_tier_gate(adopted_plan: dict[str, Any]) -> tuple[bool, str]:
    """明示 explicit_tier があるときは A_full_auto_safe のみ Cursor オペレータ経路へ（fail-closed）。"""
    tier = str(adopted_plan.get("explicit_tier") or "").strip()
    if not tier:
        return True, "explicit_tier_absent_ok"
    if "A_full_auto_safe" in tier:
        return True, "explicit_tier_a_full_auto_safe"
    return False, f"explicit_tier_not_cursor_operator_safe:{tier}"


def preflight_notion_to_cursor_operator(
    *,
    adopted_plan: dict[str, Any],
    claude_audit: dict[str, Any],
    next_card_name: str,
    auto_dir: Path | None,
) -> tuple[bool, str, dict[str, Any]]:
    meta: dict[str, Any] = {"operator_bind_card": op_bridge.OPERATOR_BIND_CARD}
    ok_r, why_r = _synth_layer_risk_gate(adopted_plan, claude_audit)
    if not ok_r:
        return False, why_r, meta
    ok_t, why_t = _cursor_operator_execution_tier_gate(adopted_plan)
    if not ok_t:
        return False, why_t, meta
    summary = str(adopted_plan.get("summary") or "")
    import re as _re
    _summary_clean = _re.sub(r"## (?:非目標|停止条件)[\s\S]*?(?=\n##|$)", "", summary, flags=_re.MULTILINE)
    # persona/scripture を「変更しない」文脈で除去
    _summary_clean = _re.sub(r"\b(persona|scripture|canon|正典|正文)\b", "", _summary_clean)
    preview = f"{next_card_name}\n{_summary_clean[:8000]}"
    br = op_bridge.cursor_operator_text_blocked(preview, next_card_name)
    if br:
        return False, br, meta
    if not op_bridge.card_id_cursor_operator_allowlisted(next_card_name):
        return False, "card_id_not_cursor_operator_allowlist", meta
    if auto_dir is None:
        return False, "auto_dir_required_for_vps_acceptance_gate", meta
    vok, vwhy = op_bridge.truth_vps_acceptance_pass_for_cursor(auto_dir)
    if not vok:
        return False, vwhy, meta
    return True, "cursor_operator_preflight_ok", meta


def synthesize_cursor_card(
    *,
    adopted_plan: dict[str, Any],
    claude_audit: dict[str, Any],
    gemini_norm: dict[str, Any],
    next_card_name: str,
    auto_dir: Path | None = None,
) -> tuple[str, dict[str, Any]]:
    ok_g, why_g, gate_meta = preflight_notion_to_cursor_operator(
        adopted_plan=adopted_plan,
        claude_audit=claude_audit,
        next_card_name=next_card_name,
        auto_dir=auto_dir,
    )
    gate_blob: dict[str, Any] = {"ok": ok_g, "reason": why_g, **gate_meta}
    if not ok_g:
        md_hold = "\n".join(
            [
                "# TENMON_CURSOR_AUTOBUILD_OPERATOR — HOLD",
                "",
                f"Cursor オペレータ接続前ゲートで停止（fail-closed）: `{why_g}`",
                "",
                "## 次カード（合成のみ・未送信）",
                f"`{next_card_name}`",
            ]
        )
        bundle_hold: dict[str, Any] = {
            "schema": "MULTI_AI_ACCEPTANCE_BUNDLE_V1",
            "generatedAt": _ts(),
            "acceptance_criteria": [],
            "stop_conditions": [why_g],
            "target_paths": [],
            "next_card": next_card_name,
            "cursor_operator_gate": gate_blob,
            "result_return_contract_file": op_bridge.RESULT_RETURN_CONTRACT_FN,
        }
        return md_hold, bundle_hold

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
        "cursor_operator_gate": gate_blob,
        "result_return_contract_file": op_bridge.RESULT_RETURN_CONTRACT_FN,
    }
    return md, bundle


def write_synthesized(out_dir: Path, md: str, bundle: dict[str, Any]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "synthesized_card.md").write_text(md, encoding="utf-8")
    (out_dir / "acceptance_bundle.json").write_text(
        json.dumps(bundle, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
