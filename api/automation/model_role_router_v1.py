#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1

構築相談を chatgpt / claude / gemini のどれに回すかを決定論的に決める role router。
成功の捏造はせず、ルーティング不能時は manual_review_required で止める。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_GPT_CLAUDE_GEMINI_ROLE_ROUTER_CURSOR_AUTO_V1"

VALID_PROVIDERS = frozenset({"chatgpt", "claude", "gemini"})


def _norm(s: str) -> str:
    return " ".join(str(s or "").lower().split())


def _parse_target_files(raw: str) -> list[str]:
    if not raw or not str(raw).strip():
        return []
    parts = re.split(r"[\n,;]+", str(raw))
    return [p.strip() for p in parts if p.strip()]


def _fail(reason: str) -> dict[str, Any]:
    return {
        "primary_provider": None,
        "secondary_providers": [],
        "reason": reason,
        "task_class": "unroutable",
        "requires_consensus": True,
        "manual_review_required": True,
    }


def _ok(
    primary: str,
    secondary: list[str],
    *,
    reason: str,
    task_class: str,
    requires_consensus: bool,
) -> dict[str, Any]:
    sec = [x for x in secondary if x in VALID_PROVIDERS and x != primary]
    return {
        "primary_provider": primary,
        "secondary_providers": sec,
        "reason": reason,
        "task_class": task_class,
        "requires_consensus": bool(requires_consensus),
        "manual_review_required": False,
    }


def _consensus_from_risk(risk_class: str) -> bool:
    r = _norm(risk_class)
    return r in ("high", "critical", "escrow", "high_risk")


def route_model_role_v1(
    objective: str,
    target_files: list[str],
    risk_class: str,
    domain: str,
) -> dict[str, Any]:
    obj = _norm(objective)
    dom = _norm(domain)
    files = [_norm(f).replace("\\", "/") for f in target_files]
    joined = " ".join(files)

    if not obj and not joined and not dom:
        return _fail("empty_objective_target_files_and_domain")

    base_consensus = _consensus_from_risk(risk_class)

    # --- 1) 会話・chat 表層 / 品質（例: chat.ts, finalize.ts）→ Claude primary, GPT secondary
    conv_path_hit = any(
        re.search(r"(^|/)chat\.ts$", f) or re.search(r"(^|/)finalize\.ts$", f) or "/chat/" in f for f in files
    )
    conv_kw = any(
        k in obj
        for k in (
            "会話品質",
            "conversation quality",
            "dialogue",
            "dialog",
            "finalize",
            "thread",
            "メッセージ",
            "文体",
            "tone",
        )
    )
    if conv_path_hit or conv_kw:
        return _ok(
            "claude",
            ["chatgpt"],
            reason="rule_conversation_or_chat_surface_claude_reasoning_gpt_patch",
            task_class="conversation_quality_and_chat_surface",
            requires_consensus=base_consensus or conv_kw,
        )

    # --- 2) PWA / browser フロー → GPT primary, Claude secondary
    pwa_browser = (
        "pwa" in obj
        or "service worker" in obj
        or "serviceworker" in obj
        or "browser flow" in obj
        or "browser" in obj
        or any("pwa" in f or "service-worker" in f or "serviceworker" in f for f in files)
    )
    if pwa_browser or "pwa" in dom or "browser" in dom:
        return _ok(
            "chatgpt",
            ["claude"],
            reason="rule_pwa_browser_flow_gpt_impl_claude_review",
            task_class="pwa_browser_flow",
            requires_consensus=base_consensus,
        )

    # --- 3) shell / automation → GPT primary, Gemini secondary
    auto_hit = any(
        f.endswith(".sh")
        or "/automation/" in f
        or f.endswith(".py")
        or "/scripts/" in f
        for f in files
    ) or any(
        k in obj
        for k in (
            "shell",
            "bash",
            "automation",
            "playwright",
            "script",
        )
    )
    if auto_hit:
        return _ok(
            "chatgpt",
            ["gemini"],
            reason="rule_implementation_automation_gpt_gemini_alt",
            task_class="implementation_automation",
            requires_consensus=base_consensus,
        )

    # --- 4) TypeScript / API / UI / patch 草案（汎用実装寄り）→ GPT primary, Gemini secondary
    ts_hit = any(f.endswith(".ts") or f.endswith(".tsx") for f in files) or "typescript" in obj or ".ts" in obj
    api_ui = any(k in obj for k in ("api", " ui ", "react", "express", "patch", "実装案"))
    if ts_hit or api_ui:
        return _ok(
            "chatgpt",
            ["gemini"],
            reason="rule_typescript_api_ui_gpt_primary_gemini_broad_review",
            task_class="typescript_api_ui_implementation",
            requires_consensus=base_consensus,
        )

    # --- 5) domain のみ・設計妥当性寄り
    if dom and not joined:
        if any(k in dom for k in ("design", "設計", "architecture", "妥当性")):
            return _ok(
                "claude",
                ["chatgpt"],
                reason="rule_domain_design_claude_primary",
                task_class="design_review",
                requires_consensus=base_consensus,
            )
        if any(k in dom for k in ("compare", "比較", "alternative", "別案")):
            return _ok(
                "gemini",
                ["chatgpt", "claude"],
                reason="rule_domain_compare_gemini_broad",
                task_class="comparison_broad_review",
                requires_consensus=True,
            )

    # --- 6) objective のみ（短すぎると不能）
    if obj and len(obj) < 8 and not joined:
        return _fail("objective_too_short_to_route_safely")

    # --- 7) デフォルト: 広い相談 → GPT + Gemini（別案・比較）
    if obj or joined:
        return _ok(
            "chatgpt",
            ["gemini"],
            reason="rule_default_gpt_primary_gemini_broad_review",
            task_class="general_build_consultation",
            requires_consensus=base_consensus,
        )

    return _fail("no_routing_signal")


def _load_input_json(path: Path) -> dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw if isinstance(raw, dict) else {}


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--objective", default="", help="相談目的テキスト")
    ap.add_argument("--target-files", default="", help="カンマまたは改行区切りパス")
    ap.add_argument("--risk-class", default="unknown")
    ap.add_argument("--domain", default="", help="任意ドメインラベル")
    ap.add_argument("--input-json", type=Path, default=None, help="上記を上書きする JSON ファイル")
    ap.add_argument("--output-file", type=Path, default=None)
    args = ap.parse_args()

    objective = str(args.objective)
    target_files = _parse_target_files(str(args.target_files))
    risk_class = str(args.risk_class)
    domain = str(args.domain)

    if args.input_json is not None:
        p = args.input_json.expanduser().resolve()
        if not p.is_file():
            out = _fail("input_json_not_found")
        else:
            try:
                blob = _load_input_json(p)
                objective = str(blob.get("objective", objective))
                tf = blob.get("target_files")
                if isinstance(tf, list):
                    target_files = [str(x) for x in tf if str(x).strip()]
                elif isinstance(tf, str) and tf.strip():
                    target_files = _parse_target_files(tf)
                risk_class = str(blob.get("risk_class", risk_class))
                domain = str(blob.get("domain", domain))
                out = route_model_role_v1(objective, target_files, risk_class, domain)
            except Exception as e:
                out = _fail(f"input_json_invalid:{e}")
    else:
        out = route_model_role_v1(objective, target_files, risk_class, domain)

    out["card"] = CARD
    line = json.dumps(out, ensure_ascii=False)
    print(line, file=sys.stdout)
    if args.output_file is not None:
        op = args.output_file.expanduser().resolve()
        op.parent.mkdir(parents=True, exist_ok=True)
        op.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return 0 if not out.get("manual_review_required") else 1


if __name__ == "__main__":
    raise SystemExit(main())
