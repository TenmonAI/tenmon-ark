#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MULTI_AI_ORCHESTRA — result normalizer

各 AI 層の生出力をスキーマ付き dict に正規化（dry-run では決定的スタブも生成）。
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def _ts() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_observation_bundle(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema": "NORMALIZED_OBSERVATION_V1",
        "generatedAt": _ts(),
        "git_porcelain_lines": int(raw.get("git_porcelain_lines") or 0),
        "issue_text": str(raw.get("issue_text") or "")[:8000],
        "repo_root": str(raw.get("repo_root") or ""),
        "sources": raw.get("sources") or ["git", "user_request"],
    }


def normalize_gemini_structure(
    raw: dict[str, Any],
    *,
    dry_run: bool,
) -> dict[str, Any]:
    if dry_run and not raw.get("structured_summary"):
        raw = {
            **raw,
            "structured_summary": "## 構造化要約（DRY-RUN）\n- 観測: git / 課題テキスト\n- 論点: 実装スコープを automation に限定推奨\n",
            "options": [
                {"id": "A", "title": "automation のみ最小追加", "risk": "low"},
                {"id": "B", "title": "スケジューラ連携拡張", "risk": "medium"},
            ],
            "comparison_table": [
                {"axis": "scope", "A": "最小", "B": "広い"},
                {"axis": "HOLD リスク", "A": "低", "B": "中"},
            ],
            "risk_candidates": [
                {"id": "R1", "description": "範囲肥大化", "severity": "low"},
            ],
        }
    return {
        "schema": "NORMALIZED_GEMINI_STRUCTURE_V1",
        "generatedAt": _ts(),
        "agent": "gemini",
        "structured_summary": str(raw.get("structured_summary") or ""),
        "options": raw.get("options") if isinstance(raw.get("options"), list) else [],
        "comparison_table": raw.get("comparison_table") if isinstance(raw.get("comparison_table"), list) else [],
        "risk_candidates": raw.get("risk_candidates") if isinstance(raw.get("risk_candidates"), list) else [],
    }


def normalize_claude_audit(
    raw: dict[str, Any],
    *,
    dry_run: bool,
) -> dict[str, Any]:
    if dry_run and not raw.get("acceptance_refined"):
        raw = {
            **raw,
            "acceptance_refined": "- build: `npm run check` in api/\n- audit: GET /api/audit ok\n- 正典/正文/persona 自動変更なし\n",
            "design_risks": [
                {"id": "D1", "area": "scope", "severity": "low", "note": "multi_ai のみに留める"},
            ],
            "failure_explanation": "",
            "patch_review": "N/A（dry-run）",
        }
    risks = raw.get("design_risks") if isinstance(raw.get("design_risks"), list) else []
    return {
        "schema": "NORMALIZED_CLAUDE_AUDIT_V1",
        "generatedAt": _ts(),
        "agent": "claude",
        "acceptance_refined": str(raw.get("acceptance_refined") or ""),
        "design_risks": risks,
        "failure_explanation": str(raw.get("failure_explanation") or ""),
        "patch_review": str(raw.get("patch_review") or ""),
    }


def normalize_gpt_arbitration(
    raw: dict[str, Any],
    *,
    dry_run: bool,
    default_targets: list[str] | None = None,
) -> dict[str, Any]:
    if dry_run and not raw.get("adopted_plan"):
        opts = raw.get("gemini_options") or []
        adopt = "A"
        if isinstance(opts, list) and opts:
            adopt = str(opts[0].get("id") or "A")
        raw = {
            **raw,
            "adopted_plan": {
                "option_id": adopt,
                "summary": "主裁定（DRY-RUN）: 最小スコープで multi-ai オーケストラ骨格のみ追加。正典・正文は不触。",
                "target_paths": default_targets
                or [
                    "api/automation/multi_ai_orchestra_executor_v1.py",
                    "api/automation/multi_ai_task_router_v1.py",
                ],
                "non_goals": ["canon_change", "persona_change", "scripture_meaning_change"],
            },
            "rejected_options": [{"id": "B", "reason": "初回導入範囲外"}],
            "center_decision": "天聞主権: 補助AIの候補のうち最小・fail-closed 案のみ採用。",
            "execution_authority": {
                "authorized": True,
                "arbiter": "gpt_tenmon_stub",
                "constraints": ["minimal_diff", "no_canon_auto", "acceptance_required"],
            },
        }
    adopted = raw.get("adopted_plan") if isinstance(raw.get("adopted_plan"), dict) else {}
    auth = raw.get("execution_authority") if isinstance(raw.get("execution_authority"), dict) else {}
    return {
        "schema": "NORMALIZED_GPT_ARBITRATION_V1",
        "generatedAt": _ts(),
        "agent": "gpt_tenmon",
        "adopted_plan": adopted,
        "rejected_options": raw.get("rejected_options") if isinstance(raw.get("rejected_options"), list) else [],
        "center_decision": str(raw.get("center_decision") or ""),
        "execution_authority": auth,
    }


def merge_normalized(
    parts: dict[str, Any],
) -> dict[str, Any]:
    return {
        "schema": "MULTI_AI_NORMALIZED_RESULTS_V1",
        "generatedAt": _ts(),
        "layers": parts,
    }
