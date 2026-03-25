#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mac ローカル専用: ブラウザで ChatGPT 等に質問を投げ、回答テキストを取得する最小実装。

- ログイン済み Chrome プロファイルを前提（資格情報の自動入力は行わない）。
- UI セレクタ不一致は fail-fast（短いタイムアウト）。
- 依存: Playwright（`pip install playwright` + `playwright install chrome` 推奨）。
"""
from __future__ import annotations

import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DEFAULT_CHATGPT_URL = "https://chatgpt.com"
DEFAULT_PAGE_LOAD_MS = int(os.environ.get("TENMON_BROWSER_AI_PAGE_LOAD_MS", "45000"))
DEFAULT_RESPONSE_MS = int(os.environ.get("TENMON_BROWSER_AI_RESPONSE_MS", "120000"))
DEFAULT_COMPOSER_MS = int(os.environ.get("TENMON_BROWSER_AI_COMPOSER_WAIT_MS", "20000"))


@dataclass
class AskChatGptResultV1:
    ok: bool
    answer_text: str
    error: str
    provider: str
    screenshot_before: str | None = None
    screenshot_during: str | None = None
    screenshot_after: str | None = None
    phases: dict[str, Any] = field(default_factory=dict)


def _user_data_dir() -> Path:
    raw = os.environ.get("TENMON_BROWSER_AI_USER_DATA_DIR", "").strip()
    if raw:
        return Path(raw).expanduser()
    return Path.home() / ".tenmon_browser_ai_chrome_profile"


def _evidence_paths(evidence_dir: Path, tag: str) -> tuple[Path, Path, Path]:
    ts = int(time.time())
    b = evidence_dir / f"{tag}_before_{ts}.png"
    d = evidence_dir / f"{tag}_during_{ts}.png"
    a = evidence_dir / f"{tag}_after_{ts}.png"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    return b, d, a


def ask_chatgpt(
    question: str,
    *,
    evidence_dir: Path | None = None,
    chatgpt_url: str | None = None,
) -> AskChatGptResultV1:
    """
    ChatGPT Web を開き、質問を貼り付けて送信し、最後のアシスタント応答テキストを返す。

    Playwright + Chrome チャンネル（永続プロファイル）を使用。
    """
    if sys.platform != "darwin":
        return AskChatGptResultV1(
            ok=False,
            answer_text="",
            error="darwin_only",
            provider="chatgpt",
        )

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return AskChatGptResultV1(
            ok=False,
            answer_text="",
            error="playwright_not_installed",
            provider="chatgpt",
            phases={"hint": "pip install playwright && playwright install chrome"},
        )

    url = (chatgpt_url or os.environ.get("TENMON_BROWSER_AI_CHATGPT_URL") or DEFAULT_CHATGPT_URL).strip()
    udir = _user_data_dir()
    udir.mkdir(parents=True, exist_ok=True)

    ed = evidence_dir or (Path(__file__).resolve().parent / "out" / "browser_ai_operator")
    before_p, during_p, after_p = _evidence_paths(ed, "chatgpt")

    phases: dict[str, Any] = {}
    result = AskChatGptResultV1(
        ok=False,
        answer_text="",
        error="",
        provider="chatgpt",
        screenshot_before=str(before_p),
        screenshot_during=str(during_p),
        screenshot_after=str(after_p),
        phases=phases,
    )

    headless = os.environ.get("TENMON_BROWSER_AI_HEADLESS", "").strip().lower() in ("1", "true", "yes")
    # 空なら Playwright 同梱 Chromium（Chrome 未導入環境向け）。ログイン済みなら channel=chrome も可。
    channel = os.environ.get("TENMON_BROWSER_AI_PLAYWRIGHT_CHANNEL", "").strip()

    with sync_playwright() as p:
        try:
            ctx_kwargs: dict[str, Any] = {
                "headless": headless,
                "viewport": {"width": 1280, "height": 900},
                "args": ["--disable-blink-features=AutomationControlled"],
            }
            if channel:
                ctx_kwargs["channel"] = channel
            context = p.chromium.launch_persistent_context(str(udir), **ctx_kwargs)
        except Exception as e:
            result.error = f"launch_failed:{e}"
            phases["launch"] = {"ok": False, "detail": str(e)}
            return result

        page = context.pages[0] if context.pages else context.new_page()
        phases["launch"] = {"ok": True, "user_data_dir": str(udir), "playwright_channel": channel or "bundled_chromium"}

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=DEFAULT_PAGE_LOAD_MS)
        except Exception as e:
            result.error = f"goto_failed:{e}"
            phases["goto"] = {"ok": False, "detail": str(e)}
            context.close()
            return result
        phases["goto"] = {"ok": True, "url": url}

        # コンポーザ（textarea）— UI drift 時はここでタイムアウトして fail-fast
        composer = None
        for sel in (
            "textarea[data-id='root']",
            "textarea#prompt-textarea",
            "textarea[placeholder*='Message']",
            "textarea",
        ):
            try:
                loc = page.locator(sel).first
                loc.wait_for(state="visible", timeout=min(DEFAULT_COMPOSER_MS, 15000))
                composer = loc
                phases["composer_selector"] = sel
                break
            except Exception:
                continue

        if composer is None:
            result.error = "composer_not_found_ui_drift"
            phases["composer"] = {"ok": False}
            try:
                page.screenshot(path=str(before_p))
            except Exception:
                result.screenshot_before = None
            context.close()
            return result

        try:
            page.screenshot(path=str(before_p))
        except Exception as e:
            phases["screenshot_before"] = {"ok": False, "detail": str(e)}

        try:
            composer.click(timeout=5000)
            composer.fill("")
            composer.fill(question)
        except Exception as e:
            result.error = f"fill_failed:{e}"
            phases["fill"] = {"ok": False, "detail": str(e)}
            context.close()
            return result
        phases["fill"] = {"ok": True}

        try:
            page.screenshot(path=str(during_p))
        except Exception as e:
            phases["screenshot_during"] = {"ok": False, "detail": str(e)}

        submitted = False
        try:
            composer.press("Enter")
            submitted = True
        except Exception:
            pass
        if not submitted:
            try:
                page.get_by_role("button", name="Send").first.click(timeout=3000)
                submitted = True
            except Exception:
                try:
                    page.locator('button[data-testid="send-button"]').first.click(timeout=3000)
                    submitted = True
                except Exception as e:
                    result.error = f"submit_failed:{e}"
                    phases["submit"] = {"ok": False, "detail": str(e)}
                    context.close()
                    return result
        phases["submit"] = {"ok": True}

        prev_assist = page.locator('[data-message-author-role="assistant"]').count()
        deadline = time.time() + (DEFAULT_RESPONSE_MS / 1000.0)
        new_assist = prev_assist
        while time.time() < deadline:
            new_assist = page.locator('[data-message-author-role="assistant"]').count()
            if new_assist > prev_assist:
                break
            time.sleep(0.4)
        if new_assist <= prev_assist:
            result.error = "assistant_response_timeout:no_new_message"
            phases["response"] = {"ok": False, "detail": f"prev={prev_assist} now={new_assist}"}
            try:
                page.screenshot(path=str(after_p))
            except Exception:
                result.screenshot_after = None
            context.close()
            return result

        phases["response"] = {"ok": True, "assistant_count": new_assist, "prev_count": prev_assist}

        try:
            page.locator('[data-message-author-role="assistant"]').nth(new_assist - 1).wait_for(
                state="visible",
                timeout=min(30000, DEFAULT_RESPONSE_MS),
            )
        except Exception as e:
            result.error = f"assistant_visibility:{e}"
            phases["response"] = {"ok": False, "detail": str(e)}
            context.close()
            return result

        # ストリーミング落ち着き: 短い安定待ち
        time.sleep(float(os.environ.get("TENMON_BROWSER_AI_STREAM_SETTLE_SEC", "3")))

        try:
            n = page.locator('[data-message-author-role="assistant"]').count()
            if n < 1:
                raise RuntimeError("no_assistant_node")
            text = page.locator('[data-message-author-role="assistant"]').nth(n - 1).inner_text(timeout=15000)
        except Exception as e:
            result.error = f"extract_failed:{e}"
            phases["extract"] = {"ok": False, "detail": str(e)}
            context.close()
            return result

        text = (text or "").strip()
        if not text:
            result.error = "empty_assistant_text"
            phases["extract"] = {"ok": False}
            context.close()
            return result

        try:
            page.screenshot(path=str(after_p))
        except Exception as e:
            phases["screenshot_after"] = {"ok": False, "detail": str(e)}

        phases["extract"] = {"ok": True, "chars": len(text)}
        result.answer_text = text
        result.ok = True
        context.close()

    return result


def ask_claude(question: str, **kwargs: Any) -> AskChatGptResultV1:
    """将来拡張用プレースホルダ（未実装）。"""
    return AskChatGptResultV1(
        ok=False,
        answer_text="",
        error="not_implemented",
        provider="claude",
    )


def ask_gemini(question: str, **kwargs: Any) -> AskChatGptResultV1:
    """将来拡張用プレースホルダ（未実装）。"""
    return AskChatGptResultV1(
        ok=False,
        answer_text="",
        error="not_implemented",
        provider="gemini",
    )
