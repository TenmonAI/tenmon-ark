#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1

Mac 画面のスクリーンショットパスとコンテキスト JSON を入力に、次の UI 操作候補を rule-based で返す骨格。
後段で vision API に差し替え可能な単一入口 ``decide_screen_action_v1`` を提供する。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_SCREEN_OBSERVE_AND_ACTION_SELECT_CURSOR_AUTO_V1"
CONSUMER_CARD = "TENMON_BROWSER_VISION_ASSISTED_OPERATOR_CURSOR_AUTO_V1"

ALLOWED_ACTIONS = frozenset({"click", "type", "paste", "wait", "done", "manual_required"})

PROVIDERS = frozenset({"chatgpt", "claude", "gemini"})


def _payload(
    *,
    ok: bool,
    action: str,
    x: int,
    y: int,
    text: str,
    reason: str,
    manual_review_required: bool,
) -> dict[str, Any]:
    return {
        "ok": ok,
        "action": action,
        "x": int(x),
        "y": int(y),
        "text": str(text),
        "reason": reason,
        "manual_review_required": bool(manual_review_required),
    }


def _fail_manual(reason: str) -> dict[str, Any]:
    return _payload(
        ok=False,
        action="manual_required",
        x=0,
        y=0,
        text="",
        reason=reason,
        manual_review_required=True,
    )


def _as_int(v: Any, default: int = 0) -> int:
    try:
        return int(v)
    except Exception:
        return default


def _load_context(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def decide_screen_action_v1(
    provider: str,
    screenshot: Path,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    スクリーンショットの存在と context のヒントのみで決定。vision 未使用時は多くが manual_required（捏造しない）。
    """
    provider = str(provider or "").strip().lower()
    if provider not in PROVIDERS:
        return _fail_manual(f"invalid_provider:{provider or 'empty'}")

    ctx = dict(context or {})
    so = ctx.get("screen_observe_v1")
    if so is not None and not isinstance(so, dict):
        so = {}
    so = so or {}

    p = screenshot.expanduser().resolve()
    if not p.is_file():
        return _fail_manual("screenshot_not_found")
    try:
        if p.stat().st_size <= 0:
            return _fail_manual("screenshot_empty_file")
    except OSError as e:
        return _fail_manual(f"screenshot_stat_failed:{e}")

    if ctx.get("login_gate") is True or so.get("login_gate") is True:
        return _fail_manual("login_gate_flag_in_context")

    # 明示パイプライン: 遷移直後の安定待ち（座標不要）
    step = str(so.get("pipeline_step") or "").strip().lower()
    if step in ("after_navigate", "after_open_url", "after_skeleton_open", "settle"):
        ms = _as_int(so.get("wait_ms"), 1200)
        if ms < 0:
            ms = 0
        if ms > 120_000:
            ms = 120_000
        return _payload(
            ok=True,
            action="wait",
            x=0,
            y=0,
            text=str(ms),
            reason="rule_pipeline_settle_wait",
            manual_review_required=False,
        )

    # 呼び出し元が検証済みの提案を載せる場合のみ採用（テスト・オーケストレータ用）
    sug = str(so.get("suggested_action") or "").strip().lower()
    if sug in ALLOWED_ACTIONS and sug != "manual_required":
        x = _as_int(so.get("x"))
        y = _as_int(so.get("y"))
        t = str(so.get("text") or "")
        if sug == "click":
            return _payload(
                ok=True,
                action="click",
                x=x,
                y=y,
                text="",
                reason="rule_context_suggested_click",
                manual_review_required=False,
            )
        if sug in ("type", "paste"):
            if not t.strip():
                return _fail_manual("suggested_type_paste_missing_text")
            return _payload(
                ok=True,
                action=sug,
                x=x,
                y=y,
                text=t,
                reason=f"rule_context_suggested_{sug}",
                manual_review_required=False,
            )
        if sug == "wait":
            ms = _as_int(so.get("wait_ms") or so.get("text") or 1000, 1000)
            if ms < 0:
                ms = 0
            if ms > 120_000:
                ms = 120_000
            return _payload(
                ok=True,
                action="wait",
                x=0,
                y=0,
                text=str(ms),
                reason="rule_context_suggested_wait",
                manual_review_required=False,
            )
        if sug == "done":
            return _payload(
                ok=True,
                action="done",
                x=0,
                y=0,
                text="",
                reason="rule_context_suggested_done",
                manual_review_required=False,
            )

    # 将来: TENMON_SCREEN_OBSERVE_VISION_HOOK=module:callable の動的呼び出しで置換可
    _hook = str(os.environ.get("TENMON_SCREEN_OBSERVE_VISION_HOOK", "") or "").strip()
    if _hook:
        return _fail_manual(f"vision_hook_configured_but_not_implemented_v1:{_hook}")

    # vision 未接続の既定: 画像はあるが画素解釈はしない
    return _fail_manual("rule_based_v1_no_vision_match")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--provider", required=True, choices=sorted(PROVIDERS))
    ap.add_argument("--screenshot", type=Path, required=True)
    ap.add_argument("--context-json", type=Path, default=None)
    ap.add_argument("--output-file", type=Path, default=None)
    args = ap.parse_args()

    ctx = _load_context(args.context_json)
    result = decide_screen_action_v1(args.provider, args.screenshot, ctx)
    pub = {
        **result,
        "card": CARD,
        "consumer_card": CONSUMER_CARD,
        "provider": str(args.provider),
        "screenshot": str(args.screenshot.expanduser().resolve()),
    }
    line = json.dumps(pub, ensure_ascii=False)
    print(line, file=sys.stdout)
    if args.output_file is not None:
        op = args.output_file.expanduser().resolve()
        op.parent.mkdir(parents=True, exist_ok=True)
        op.write_text(json.dumps(pub, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    success = bool(result.get("ok")) and not bool(result.get("manual_review_required"))
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
