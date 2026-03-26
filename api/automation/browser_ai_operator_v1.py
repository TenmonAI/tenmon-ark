#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mac ローカル専用: ブラウザで ChatGPT / Claude / Gemini に相談する実行器。

- CLI: ``--provider chatgpt|claude|gemini --prompt-file PATH --output-file PATH``
- 既定エンジン ``skeleton``（``open`` + ``pbcopy`` + 可能なら AppleScript で送信試行）。応答本文は取得しない → ``manual_review_required: true``。
- ChatGPT のみ ``TENMON_BROWSER_AI_ENGINE=playwright`` で Playwright 経路（``ask_chatgpt``）を選択可。
- ログイン済みプロファイルを前提（資格情報の自動入力は行わない）。
- Playwright 経路: UI セレクタ不一致は fail-fast（短いタイムアウト）。
- セッション永続: ``browser_session_registry_v1``（profile / URL / ログイン観測）。未ログインは fail-closed。
- **Vision-assisted**: ``--vision-assisted`` で Playwright スクリーンショット → ``screen_observe_and_action_select_v1`` の action 連鎖（骨格）。``mac_vision_bridge_v1`` は skeleton 経路の display キャプチャ用。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_CHATGPT_URL = "https://chatgpt.com"
DEFAULT_CLAUDE_URL = "https://claude.ai/chat"
DEFAULT_GEMINI_URL = "https://gemini.google.com/app"

PROVIDER_ENTRY_URL: dict[str, str] = {
    "chatgpt": DEFAULT_CHATGPT_URL,
    "claude": DEFAULT_CLAUDE_URL,
    "gemini": DEFAULT_GEMINI_URL,
}

SESSION_CARD = "TENMON_BROWSER_SESSION_AND_LOGIN_PERSISTENCE_CURSOR_AUTO_V1"
VISION_OPERATOR_CARD = "TENMON_BROWSER_VISION_ASSISTED_OPERATOR_CURSOR_AUTO_V1"


def _automation_dir() -> Path:
    return Path(__file__).resolve().parent


def _utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _runtime_registry_path() -> Path:
    raw = os.environ.get("TENMON_BROWSER_SESSION_REGISTRY", "").strip()
    if raw:
        return Path(raw).expanduser()
    return _automation_dir() / "out" / "browser_session" / "registry_v1.json"


def _template_registry_path() -> Path:
    return _automation_dir() / "browser_session_registry_v1.json"


def _default_provider_entry(name: str) -> dict[str, Any]:
    urls = PROVIDER_ENTRY_URL
    profiles = {
        "chatgpt": "~/.tenmon_browser_ai_chrome_profile",
        "claude": "~/.tenmon_browser_sessions/claude",
        "gemini": "~/.tenmon_browser_sessions/gemini",
    }
    files = {
        "chatgpt": "out/browser_session/status_chatgpt.json",
        "claude": "out/browser_session/status_claude.json",
        "gemini": "out/browser_session/status_gemini.json",
    }
    return {
        "provider_url": urls.get(name, ""),
        "profile_dir": profiles.get(name, "~/.tenmon_browser_sessions/unknown"),
        "status_file": files.get(name, "out/browser_session/status_unknown.json"),
        "last_login_check": None,
        "session_state": "unknown",
    }


def _load_json_file(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def _write_registry_file(path: Path, data: dict[str, Any]) -> None:
    blob = dict(data)
    blob["updated_at"] = _utc_iso()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(blob, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_status_json(path: Path, obj: dict[str, Any]) -> None:
    out = dict(obj)
    out["updated_at"] = _utc_iso()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _resolve_status_path(entry: dict[str, Any]) -> Path:
    sf = str(entry.get("status_file") or "").strip()
    if not sf:
        return _automation_dir() / "out" / "browser_session" / "status_misc.json"
    p = Path(sf)
    if p.is_absolute():
        return p
    return _automation_dir() / p


def _expand_profile_dir(entry: dict[str, Any]) -> Path:
    return Path(str(entry.get("profile_dir") or "").strip() or "~").expanduser()


def _merge_provider_entry(entry: dict[str, Any], name: str) -> None:
    d = _default_provider_entry(name)
    for k, v in d.items():
        if k not in entry or entry[k] in (None, ""):
            entry[k] = v


def load_session_registry_v1() -> tuple[Path, dict[str, Any]]:
    """テンプレまたは既存ランタイム registry を読み、不足キーを補完し変更時のみ保存する。"""
    runtime = _runtime_registry_path()
    data = _load_json_file(runtime)
    changed = False
    if not data.get("providers"):
        seed = _load_json_file(_template_registry_path())
        if not seed.get("providers"):
            seed = {
                "schema_version": 1,
                "card": SESSION_CARD,
                "providers": {n: _default_provider_entry(n) for n in PROVIDER_ENTRY_URL},
            }
        data = seed
        changed = True
    provs = data.setdefault("providers", {})
    for name in PROVIDER_ENTRY_URL:
        if name not in provs or not isinstance(provs[name], dict):
            provs[name] = _default_provider_entry(name)
            changed = True
        else:
            snap = json.dumps(provs[name], sort_keys=True, ensure_ascii=False)
            _merge_provider_entry(provs[name], name)
            if json.dumps(provs[name], sort_keys=True, ensure_ascii=False) != snap:
                changed = True
    if changed:
        _write_registry_file(runtime, data)
    return runtime, data


def _login_check_stale(last_iso: str | None, ttl_sec: float) -> bool:
    """True なら再プローブが必要。"""
    if not last_iso:
        return True
    try:
        ts = datetime.fromisoformat(str(last_iso).replace("Z", "+00:00")).timestamp()
        return (time.time() - ts) >= ttl_sec
    except Exception:
        return True


def _probe_session_playwright(provider: str, profile_dir: Path, url: str) -> tuple[str, str]:
    """(session_state, reason) session_state は session_usable | login_required | manual_required。"""
    if sys.platform != "darwin":
        return "manual_required", "darwin_required_for_playwright_probe"
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return "manual_required", "playwright_not_installed_cannot_probe"

    profile_dir.mkdir(parents=True, exist_ok=True)
    headless = os.environ.get("TENMON_BROWSER_AI_HEADLESS", "1").strip().lower() in ("1", "true", "yes")
    channel = os.environ.get("TENMON_BROWSER_AI_PLAYWRIGHT_CHANNEL", "").strip()
    timeout_ms = int(os.environ.get("TENMON_BROWSER_SESSION_PROBE_MS", "28000"))

    with sync_playwright() as p:
        kwargs: dict[str, Any] = {
            "headless": headless,
            "viewport": {"width": 1280, "height": 900},
            "args": ["--disable-blink-features=AutomationControlled"],
        }
        if channel:
            kwargs["channel"] = channel
        try:
            ctx = p.chromium.launch_persistent_context(str(profile_dir), **kwargs)
        except Exception as e:
            return "manual_required", f"probe_launch_failed:{e}"
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        except Exception as e:
            ctx.close()
            return "manual_required", f"probe_goto_failed:{e}"
        u = page.url.lower()
        if any(x in u for x in ("auth.openai.com", "/login", "signin", "accounts.google.com", "claude.ai/login")):
            ctx.close()
            return "login_required", "url_suggests_login_gate"
        if provider == "chatgpt":
            for sel in (
                "textarea[data-id='root']",
                "textarea#prompt-textarea",
                "textarea[placeholder*='Message']",
                "textarea",
            ):
                try:
                    page.locator(sel).first.wait_for(state="visible", timeout=8000)
                    ctx.close()
                    return "session_usable", "chatgpt_composer_visible"
                except Exception:
                    continue
            ctx.close()
            return "login_required", "chatgpt_composer_not_found"
        if provider == "claude":
            try:
                page.locator("textarea, div[contenteditable='true']").first.wait_for(state="visible", timeout=10000)
                ctx.close()
                return "session_usable", "claude_input_visible"
            except Exception:
                ctx.close()
                return "login_required", "claude_input_not_found"
        if provider == "gemini":
            try:
                page.locator("textarea, rich-textarea, div[contenteditable='true']").first.wait_for(state="visible", timeout=10000)
                ctx.close()
                return "session_usable", "gemini_input_visible"
            except Exception:
                ctx.close()
                return "login_required", "gemini_input_not_found"
        ctx.close()
        return "manual_required", "probe_unknown_provider"


@dataclass
class SessionResolutionV1:
    ok_to_run: bool
    session_state: str
    login_required: bool
    manual_required: bool
    profile_dir: Path
    status_file: Path
    provider_url: str
    registry_path: Path
    reason: str


def resolve_browser_session_v1(provider: str) -> SessionResolutionV1:
    """
    registry を読み、利用可能なら既存 profile を使う前提で ok_to_run。
    login_required / manual_required は fail-closed（捏造しない）。
    """
    provider = provider.strip().lower()
    if provider not in PROVIDER_ENTRY_URL:
        return SessionResolutionV1(
            ok_to_run=False,
            session_state="unknown",
            login_required=False,
            manual_required=True,
            profile_dir=Path.home(),
            status_file=_automation_dir() / "out" / "browser_session" / "status_misc.json",
            provider_url="",
            registry_path=_runtime_registry_path(),
            reason="unknown_provider",
        )

    if sys.platform != "darwin":
        return SessionResolutionV1(
            ok_to_run=True,
            session_state="skip_non_darwin",
            login_required=False,
            manual_required=False,
            profile_dir=_expand_profile_dir(_default_provider_entry(provider)),
            status_file=_resolve_status_path(_default_provider_entry(provider)),
            provider_url=PROVIDER_ENTRY_URL[provider],
            registry_path=_runtime_registry_path(),
            reason="non_darwin_operator_gate_skipped",
        )

    reg_path, reg = load_session_registry_v1()
    entry = reg["providers"][provider]
    profile_dir = _expand_profile_dir(entry)
    status_path = _resolve_status_path(entry)
    url = str(entry.get("provider_url") or PROVIDER_ENTRY_URL[provider]).strip()

    if os.environ.get("TENMON_BROWSER_SESSION_ASSUME_USABLE", "").strip().lower() in ("1", "true", "yes"):
        return SessionResolutionV1(
            ok_to_run=True,
            session_state="session_usable",
            login_required=False,
            manual_required=False,
            profile_dir=profile_dir,
            status_file=status_path,
            provider_url=url,
            registry_path=reg_path,
            reason="assume_usable_env_override",
        )

    ttl = float(os.environ.get("TENMON_BROWSER_SESSION_TTL_SEC", "86400"))
    state = str(entry.get("session_state") or "unknown").strip()
    last_check = entry.get("last_login_check")
    last_s = last_check if isinstance(last_check, str) or last_check is None else str(last_check)

    if state == "login_required":
        return SessionResolutionV1(
            ok_to_run=False,
            session_state="login_required",
            login_required=True,
            manual_required=False,
            profile_dir=profile_dir,
            status_file=status_path,
            provider_url=url,
            registry_path=reg_path,
            reason="registry_login_required",
        )
    if state == "manual_required":
        return SessionResolutionV1(
            ok_to_run=False,
            session_state="manual_required",
            login_required=False,
            manual_required=True,
            profile_dir=profile_dir,
            status_file=status_path,
            provider_url=url,
            registry_path=reg_path,
            reason="registry_manual_required",
        )

    need_probe = state != "session_usable" or _login_check_stale(last_s, ttl)
    if not need_probe and state == "session_usable":
        return SessionResolutionV1(
            ok_to_run=True,
            session_state="session_usable",
            login_required=False,
            manual_required=False,
            profile_dir=profile_dir,
            status_file=status_path,
            provider_url=url,
            registry_path=reg_path,
            reason="registry_session_usable_fresh",
        )

    new_state, why = _probe_session_playwright(provider, profile_dir, url)
    entry["session_state"] = new_state
    entry["last_login_check"] = _utc_iso()
    _write_status_json(
        status_path,
        {
            "card": SESSION_CARD,
            "provider": provider,
            "session_state": new_state,
            "reason": why,
            "profile_dir": str(profile_dir),
            "provider_url": url,
        },
    )
    _write_registry_file(reg_path, reg)

    login_req = new_state == "login_required"
    man_req = new_state == "manual_required"
    ok = new_state == "session_usable"
    return SessionResolutionV1(
        ok_to_run=ok,
        session_state=new_state,
        login_required=login_req,
        manual_required=man_req,
        profile_dir=profile_dir,
        status_file=status_path,
        provider_url=url,
        registry_path=reg_path,
        reason=why if not ok else "probe_session_usable",
    )


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
    user_data_dir: Path | None = None,
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
    udir = user_data_dir.expanduser().resolve() if user_data_dir is not None else _user_data_dir()
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


def _darwin_open_url(url: str, *, timeout: float = 45.0) -> tuple[bool, str]:
    try:
        subprocess.run(["open", url], check=True, timeout=timeout)
        return True, ""
    except Exception as e:
        return False, f"open_url_failed:{e}"


def _pbcopy_utf8(text: str, *, timeout: float = 15.0) -> tuple[bool, str]:
    try:
        subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True, timeout=timeout)
        return True, ""
    except Exception as e:
        return False, f"pbcopy_failed:{e}"


def _try_skeleton_submit_keystrokes(*, timeout: float = 8.0) -> tuple[bool, str]:
    script = """
    delay 1
    tell application "System Events"
      keystroke "v" using command down
      delay 0.25
      key code 36
    end tell
    """
    try:
        cp = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        if cp.returncode != 0:
            err = (cp.stderr or b"").decode("utf-8", errors="replace").strip()
            return False, err or "osascript_nonzero"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "osascript_timeout"
    except Exception as e:
        return False, f"submit_keystroke_failed:{e}"


def run_skeleton_operator_v1(provider: str, prompt: str, *, entry_url: str | None = None) -> dict[str, Any]:
    """
    URL オープン → クリップボード貼付用にコピー → 送信キー試行。応答キャプチャは行わない。
    戻り値は CLI 用フラット dict（ok / reason / steps 等）。
    """
    provider = provider.strip().lower()
    url = (entry_url or "").strip() or PROVIDER_ENTRY_URL.get(provider, "")
    if not url:
        return {"ok": False, "reason": "unknown_provider", "manual_review_required": True}

    if sys.platform != "darwin":
        return {"ok": False, "reason": "darwin_only", "manual_review_required": True}

    steps: dict[str, Any] = {}
    ok_open, err_open = _darwin_open_url(url)
    steps["open_url"] = {"ok": ok_open, "url": url, "detail": err_open}
    if not ok_open:
        return {"ok": False, "reason": err_open, "manual_review_required": True, "steps": steps}

    ok_copy, err_copy = _pbcopy_utf8(prompt)
    steps["pbcopy"] = {"ok": ok_copy, "detail": err_copy}
    if not ok_copy:
        return {"ok": False, "reason": err_copy, "manual_review_required": True, "steps": steps}

    if os.environ.get("TENMON_BROWSER_AI_SKIP_SUBMIT", "").strip().lower() in ("1", "true", "yes"):
        steps["submit"] = {"ok": False, "skipped": True}
        return {
            "ok": True,
            "reason": "skeleton_v1_open_and_clipboard_only_submit_skipped_by_env",
            "manual_review_required": True,
            "steps": steps,
        }

    ok_sub, err_sub = _try_skeleton_submit_keystrokes()
    steps["submit"] = {"ok": ok_sub, "detail": err_sub}
    if not ok_sub:
        return {
            "ok": False,
            "reason": f"skeleton_submit_failed:{err_sub}",
            "manual_review_required": True,
            "steps": steps,
        }

    return {
        "ok": True,
        "reason": "skeleton_v1_open_clipboard_submit_attempted_no_response_capture",
        "manual_review_required": True,
        "steps": steps,
    }


def _write_cli_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def screen_observe_decide_v1(
    provider: str,
    screenshot: Path,
    context_json_path: Path | None = None,
    context_dict: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    ``screen_observe_and_action_select_v1.decide_screen_action_v1`` を同一プロセスで呼ぶ。
    ``context_dict`` があれば JSON ファイルの上にマージする。
    """
    _ad = Path(__file__).resolve().parent
    if str(_ad) not in sys.path:
        sys.path.insert(0, str(_ad))
    from screen_observe_and_action_select_v1 import decide_screen_action_v1

    ctx: dict[str, Any] = {}
    if context_json_path is not None:
        p = context_json_path.expanduser().resolve()
        if p.is_file():
            try:
                raw = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(raw, dict):
                    ctx.update(raw)
            except Exception:
                pass
    if context_dict:
        ctx.update(context_dict)
    return decide_screen_action_v1(provider, screenshot.expanduser().resolve(), ctx)


def playwright_screenshot_chatgpt_page(
    *,
    profile_dir: Path,
    url: str,
    out_png: Path,
    timeout_ms: int | None = None,
) -> tuple[bool, str, dict[str, Any]]:
    """ChatGPT エントリ URL を開き 1 枚スクリーンショット（composer 不問・観測用）。"""
    if sys.platform != "darwin":
        return False, "darwin_only", {}
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return False, "playwright_not_installed", {}
    tms = int(timeout_ms or DEFAULT_PAGE_LOAD_MS)
    phases: dict[str, Any] = {}
    headless = os.environ.get("TENMON_BROWSER_AI_HEADLESS", "").strip().lower() in ("1", "true", "yes")
    channel = os.environ.get("TENMON_BROWSER_AI_PLAYWRIGHT_CHANNEL", "").strip()
    profile_dir.mkdir(parents=True, exist_ok=True)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        try:
            ctx_kwargs: dict[str, Any] = {
                "headless": headless,
                "viewport": {"width": 1280, "height": 900},
                "args": ["--disable-blink-features=AutomationControlled"],
            }
            if channel:
                ctx_kwargs["channel"] = channel
            context = p.chromium.launch_persistent_context(str(profile_dir), **ctx_kwargs)
        except Exception as e:
            return False, f"launch_failed:{e}", phases
        page = context.pages[0] if context.pages else context.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=tms)
        except Exception as e:
            context.close()
            return False, f"goto_failed:{e}", phases
        try:
            page.screenshot(path=str(out_png), full_page=False)
        except Exception as e:
            context.close()
            return False, f"screenshot_failed:{e}", phases
        phases["url"] = url
        context.close()
    return True, "ok", phases


def run_vision_assisted_operator_v1(
    provider: str,
    prompt: str,
    output_path: Path,
    sess: SessionResolutionV1,
) -> tuple[dict[str, Any], int]:
    """スクリーンショット → rule-based action 選択の骨格。成功の捏造はしない。"""
    if sys.platform != "darwin":
        return (
            {
                "ok": False,
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "actions_taken": [],
                "last_action": {},
                "manual_review_required": True,
                "reason": "vision_assisted_darwin_only",
                "screen_state": {"provider": provider, "screenshot_paths": []},
                "session_status": {},
                "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
                "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
            },
            1,
        )

    evidence_dir = _automation_dir() / "out" / "browser_vision_operator" / provider
    evidence_dir.mkdir(parents=True, exist_ok=True)
    base_ts = int(time.time())

    screen_state: dict[str, Any] = {"provider": provider, "screenshot_paths": []}
    session_status: dict[str, Any] = {
        "session_state": sess.session_state,
        "profile_dir": str(sess.profile_dir),
        "session_reason": sess.reason,
        "registry_path": str(sess.registry_path),
        "status_file": str(sess.status_file),
    }
    actions_taken: list[dict[str, Any]] = []
    last: dict[str, Any] = {}
    skeleton_tail: dict[str, Any] | None = None

    if not sess.ok_to_run:
        out = {
            "ok": False,
            "card": VISION_OPERATOR_CARD,
            "provider": provider,
            "actions_taken": [],
            "last_action": {},
            "manual_review_required": True,
            "reason": (
                "login_required"
                if sess.login_required
                else ("manual_required" if sess.manual_required else "session_not_usable")
            )
            + f":{sess.reason}",
            "screen_state": screen_state,
            "session_status": session_status,
            "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
            "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
        }
        return out, 1

    engine = os.environ.get("TENMON_BROWSER_AI_ENGINE", "skeleton").strip().lower()

    if provider == "chatgpt" and engine == "playwright":
        url = str(sess.provider_url or DEFAULT_CHATGPT_URL).strip()
        png1 = evidence_dir / f"vision_{base_ts}_a.png"
        ok_sh, err_ph, ph1 = playwright_screenshot_chatgpt_page(
            profile_dir=sess.profile_dir,
            url=url,
            out_png=png1,
        )
        screen_state["screenshot_paths"].append(str(png1))
        screen_state["playwright_open"] = ph1
        if not ok_sh:
            out = {
                "ok": False,
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "actions_taken": actions_taken,
                "last_action": {},
                "manual_review_required": True,
                "reason": err_ph,
                "screen_state": screen_state,
                "session_status": session_status,
                "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
                "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
            }
            return out, 1

        ctx0: dict[str, Any] = {
            "screen_observe_v1": {"pipeline_step": "after_navigate"},
            "prompt_digest": prompt[:1200],
        }
        d0 = screen_observe_decide_v1(provider, png1, None, ctx0)
        actions_taken.append({"step": 0, "decision": d0})
        last = d0
        if str(d0.get("action") or "") == "wait":
            try:
                ms = max(0, min(120_000, int(str(d0.get("text") or "0"))))
            except Exception:
                ms = 1200
            time.sleep(ms / 1000.0)

        png2 = evidence_dir / f"vision_{base_ts}_b.png"
        ok2, err2, ph2 = playwright_screenshot_chatgpt_page(
            profile_dir=sess.profile_dir,
            url=url,
            out_png=png2,
        )
        screen_state["screenshot_paths"].append(str(png2))
        screen_state["playwright_reopen"] = ph2
        if ok2:
            d1 = screen_observe_decide_v1(provider, png2, None, {})
            actions_taken.append({"step": 1, "decision": d1})
            last = d1
        else:
            last = {
                "ok": False,
                "action": "manual_required",
                "reason": err2,
                "manual_review_required": True,
            }
            actions_taken.append({"step": 1, "decision": last, "note": "second_screenshot_failed"})
    else:
        sk = run_skeleton_operator_v1(provider, prompt, entry_url=sess.provider_url)
        skeleton_tail = sk
        if not sk.get("ok"):
            out = {
                "ok": False,
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "actions_taken": [],
                "last_action": {},
                "manual_review_required": True,
                "reason": str(sk.get("reason") or "skeleton_failed"),
                "screen_state": screen_state,
                "session_status": session_status,
                "skeleton_steps": sk.get("steps"),
                "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
                "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
            }
            return out, 1

        try:
            from mac_vision_bridge_v1 import capture_display_png
        except ImportError:
            out = {
                "ok": False,
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "actions_taken": [],
                "last_action": {},
                "manual_review_required": True,
                "reason": "mac_vision_bridge_import_failed",
                "screen_state": screen_state,
                "session_status": session_status,
                "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
                "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
            }
            return out, 1

        cap, why_cap = capture_display_png(evidence_dir, tag=f"skeleton_{base_ts}")
        if cap is None:
            out = {
                "ok": False,
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "actions_taken": [],
                "last_action": {},
                "manual_review_required": True,
                "reason": f"display_capture_failed:{why_cap}",
                "screen_state": screen_state,
                "session_status": session_status,
                "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
                "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
            }
            return out, 1

        screen_state["screenshot_paths"].append(str(cap))
        ctxb: dict[str, Any] = {
            "screen_observe_v1": {"pipeline_step": "after_skeleton_open"},
            "prompt_digest": prompt[:1200],
        }
        d0 = screen_observe_decide_v1(provider, cap, None, ctxb)
        actions_taken.append({"step": 0, "decision": d0})
        last = d0

    act = str(last.get("action") or "")
    manual = bool(last.get("manual_review_required")) or act == "manual_required"
    out_ok = bool(last.get("ok")) and act == "done" and not manual
    out = {
        "ok": out_ok,
        "card": VISION_OPERATOR_CARD,
        "provider": provider,
        "actions_taken": actions_taken,
        "last_action": last,
        "manual_review_required": manual,
        "reason": str(last.get("reason") or "vision_assisted_cycle_end"),
        "screen_state": screen_state,
        "session_status": session_status,
        "skeleton_steps": (skeleton_tail or {}).get("steps") if skeleton_tail else None,
        "next_on_pass": "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1",
        "next_on_fail_note": "停止。vision-assisted retry 1枚のみ生成。",
    }
    action_log_path = evidence_dir / f"action_log_{base_ts}.json"
    action_log_path.write_text(
        json.dumps(
            {
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "actions_taken": actions_taken,
                "session_status": session_status,
                "screen_state": screen_state,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    screen_state["action_log_path"] = str(action_log_path)
    status_path = evidence_dir / f"status_{provider}.json"
    status_path.write_text(
        json.dumps(
            {
                "card": VISION_OPERATOR_CARD,
                "provider": provider,
                "updated_at": _utc_iso(),
                "session_status": session_status,
                "screen_state": screen_state,
                "last_action": last,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    out["action_log_path"] = str(action_log_path)
    out["provider_status_path"] = str(status_path)
    rc = 0 if out_ok else 1
    return out, rc


def main() -> int:
    ap = argparse.ArgumentParser(
        description="TENMON_BROWSER_AI_OPERATOR_MAC_RUNTIME_CURSOR_AUTO_V1 — Mac browser operator (skeleton + optional Playwright ChatGPT)"
    )
    ap.add_argument("--provider", required=True, choices=sorted(PROVIDER_ENTRY_URL.keys()))
    ap.add_argument("--prompt-file", type=Path, required=True)
    ap.add_argument("--output-file", type=Path, required=True)
    ap.add_argument(
        "--vision-assisted",
        action="store_true",
        help="スクリーンショット→action select 骨格（TENMON_BROWSER_VISION_ASSISTED_OPERATOR）",
    )
    args = ap.parse_args()

    prompt_path = args.prompt_file.expanduser().resolve()
    output_path = args.output_file.expanduser().resolve()
    provider = str(args.provider)

    base_out: dict[str, Any] = {
        "ok": False,
        "provider": provider,
        "prompt_path": str(prompt_path),
        "output_path": str(output_path),
        "manual_review_required": True,
        "reason": "not_started",
    }

    if not prompt_path.is_file():
        base_out["reason"] = "prompt_file_not_found"
        _write_cli_json(output_path, base_out)
        print(json.dumps(base_out, ensure_ascii=False), file=sys.stdout)
        return 1

    prompt = prompt_path.read_text(encoding="utf-8", errors="replace")
    if not str(prompt).strip():
        base_out["reason"] = "prompt_file_empty"
        _write_cli_json(output_path, base_out)
        print(json.dumps(base_out, ensure_ascii=False), file=sys.stdout)
        return 1

    sess = resolve_browser_session_v1(provider)
    base_out["session_card"] = SESSION_CARD
    base_out["session_state"] = sess.session_state
    base_out["login_required"] = sess.login_required
    base_out["manual_required"] = sess.manual_required
    base_out["registry_path"] = str(sess.registry_path)
    base_out["profile_dir"] = str(sess.profile_dir)
    base_out["session_status_file"] = str(sess.status_file)
    if not sess.ok_to_run:
        base_out["ok"] = False
        base_out["manual_review_required"] = True
        base_out["reason"] = (
            "login_required"
            if sess.login_required
            else ("manual_required" if sess.manual_required else "session_not_usable")
        ) + f":{sess.reason}"
        _write_cli_json(output_path, base_out)
        print(json.dumps(base_out, ensure_ascii=False), file=sys.stdout)
        return 1

    if args.vision_assisted:
        vout, vrc = run_vision_assisted_operator_v1(provider, str(prompt).strip(), output_path, sess)
        _write_cli_json(output_path, vout)
        print(json.dumps(vout, ensure_ascii=False), file=sys.stdout)
        return vrc

    engine = os.environ.get("TENMON_BROWSER_AI_ENGINE", "skeleton").strip().lower()

    if provider == "chatgpt" and engine == "playwright":
        r = ask_chatgpt(
            prompt.strip(),
            user_data_dir=sess.profile_dir,
            chatgpt_url=sess.provider_url or None,
        )
        out = {
            **base_out,
            "ok": bool(r.ok),
            "manual_review_required": not bool(r.ok),
            "reason": "playwright_chatgpt_complete" if r.ok else (r.error or "playwright_chatgpt_failed"),
        }
        if r.ok and (r.answer_text or "").strip():
            out["captured_text"] = r.answer_text.strip()
        _write_cli_json(output_path, out)
        print(json.dumps(out, ensure_ascii=False), file=sys.stdout)
        return 0 if r.ok else 1

    sk = run_skeleton_operator_v1(provider, prompt, entry_url=sess.provider_url)
    out = {
        **base_out,
        "ok": bool(sk.get("ok")),
        "manual_review_required": bool(sk.get("manual_review_required", True)),
        "reason": str(sk.get("reason") or "skeleton_unknown"),
    }
    st = sk.get("steps")
    if isinstance(st, dict) and st:
        out["steps"] = st
    _write_cli_json(output_path, out)
    print(json.dumps(out, ensure_ascii=False), file=sys.stdout)
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
