#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_OPENAI_REAL_CALL_BIND — orchestra GPT スロット用の実 HTTP 呼び出し（最小）。
OPENAI_API_KEY 未設定時は fail-closed。監査ログのみ真実源（憶測禁止）。
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_MULTI_AI_OPENAI_REAL_CALL_V1"


def openai_orchestra_arbitration_call(
    *,
    issue: str,
    gemini_options: list[Any],
    claude_risks: list[Any],
    evidence_dir: Path,
    model: str | None = None,
) -> tuple[dict[str, Any] | None, str]:
    """
    Chat Completions + json_object。戻り: (gpt_raw_dict または None, reason)。
    evidence_dir に openai_audit_*.json を必ず書く（成功・失敗どちらも）。
    """
    evidence_dir.mkdir(parents=True, exist_ok=True)
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key:
        audit = {
            "ok": False,
            "reason": "OPENAI_API_KEY_missing",
            "http_called": False,
            "card": CARD,
        }
        (evidence_dir / "openai_audit_summary.json").write_text(
            json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return None, "OPENAI_API_KEY_missing"

    mdl = (model or os.environ.get("TENMON_OPENAI_ORCHESTRA_MODEL") or "gpt-4o-mini").strip()

    system = (
        "You are a strict arbitration engine for TENMON multi-ai orchestration. "
        "Output a single JSON object with keys: "
        "adopted_plan (object with option_id, summary, target_paths array, non_goals array), "
        "rejected_options (array of {id, reason}), "
        "center_decision (string), "
        "execution_authority (object with authorized boolean, arbiter string, constraints array). "
        "Do not propose canon, scripture, or persona semantic changes. "
        "Prefer minimal scope under api/automation unless the user issue clearly requires otherwise."
    )
    user_payload = {
        "issue": issue[:12000],
        "gemini_options": gemini_options[:20],
        "claude_design_risks": claude_risks[:20],
    }
    user = json.dumps(user_payload, ensure_ascii=False)

    body = {
        "model": mdl,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    raw_body = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=raw_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    (evidence_dir / "openai_audit_request_meta.json").write_text(
        json.dumps(
            {
                "url": "https://api.openai.com/v1/chat/completions",
                "method": "POST",
                "model": mdl,
                "headers": {"Content-Type": "application/json", "Authorization": "Bearer ***REDACTED***"},
                "body_keys": list(body.keys()),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        err_b = e.read().decode("utf-8", errors="replace")[:8000]
        summary = {
            "ok": False,
            "reason": f"openai_http_{e.code}",
            "http_called": True,
            "error_body_excerpt": err_b,
            "card": CARD,
        }
        (evidence_dir / "openai_audit_summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (evidence_dir / "openai_audit_http_error.txt").write_text(err_b, encoding="utf-8")
        return None, summary["reason"]
    except Exception as e:
        summary = {
            "ok": False,
            "reason": f"openai_request_exception:{e}",
            "http_called": True,
            "card": CARD,
        }
        (evidence_dir / "openai_audit_summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return None, summary["reason"]

    (evidence_dir / "openai_audit_response_raw.json").write_text(raw[:240000], encoding="utf-8")
    try:
        outer = json.loads(raw)
    except json.JSONDecodeError:
        summary = {"ok": False, "reason": "openai_response_json_parse_outer", "http_called": True, "card": CARD}
        (evidence_dir / "openai_audit_summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return None, "openai_response_json_parse_outer"

    choices = outer.get("choices") if isinstance(outer.get("choices"), list) else []
    content = ""
    if choices and isinstance(choices[0], dict):
        msg = choices[0].get("message") if isinstance(choices[0].get("message"), dict) else {}
        content = str(msg.get("content") or "")

    inner: dict[str, Any] | None = None
    try:
        inner = json.loads(content) if content.strip() else None
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", content)
        if m:
            try:
                inner = json.loads(m.group(0))
            except json.JSONDecodeError:
                inner = None

    if not isinstance(inner, dict):
        summary = {
            "ok": False,
            "reason": "openai_content_not_json_object",
            "http_called": True,
            "content_excerpt": content[:4000],
            "card": CARD,
        }
        (evidence_dir / "openai_audit_summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        return None, "openai_content_not_json_object"

    inner.setdefault("gpt_real_http", True)
    inner.setdefault("openai_model", mdl)
    (evidence_dir / "openai_audit_parsed_arbitration.json").write_text(
        json.dumps(inner, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    summary = {
        "ok": True,
        "reason": "openai_chat_completions_ok",
        "http_called": True,
        "model": mdl,
        "card": CARD,
    }
    (evidence_dir / "openai_audit_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return inner, "ok"
