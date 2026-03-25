#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_REAL_BROWSER_LASTMILE_AUDIT_V1"


def probe_trace_env_failure(url: str, preflight: dict[str, Any]) -> dict[str, Any]:
    """どの driver も使えないとき（env_failure）。"""
    return {
        "target_url": url,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "driver": None,
        "url_before": None,
        "url_after_send": None,
        "url_after_refresh": None,
        "url_after_newchat": None,
        "url_has_threadId": False,
        "response_threadid_seen": False,
        "thread_switch_event_seen": False,
        "refresh_same_thread_kept": False,
        "newchat_triggered_reload": False,
        "old_thread_restore_ok": False,
        "assistant_count_before": 0,
        "assistant_count_after": 0,
        "assistant_count_after_newchat": 0,
        "dom_drift": True,
        "auth_gate": False,
        "chatlayout_bound": True,
        "notes": [f"runtime_env_probe_failed:{json.dumps(preflight.get('reasons', []), ensure_ascii=False)}"],
    }


def run_node_playwright_probe(repo_root: Path, url: str, outdir: Path) -> tuple[dict[str, Any], list[str]]:
    """TENMON_PWA_RUNTIME_ENV_RESTORE_V1: Node + playwright npm exec ドライバ。"""
    trace_path = outdir / "node_probe_trace_raw.json"
    mjs = repo_root / "api" / "scripts" / "tenmon_pwa_playwright_node_probe_v1.mjs"
    npm = shutil.which("npm")
    if not npm or not mjs.is_file():
        why = "npm_not_found" if not npm else "mjs_not_found"
        trace = {
            "target_url": url,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "dom_drift": True,
            "notes": [f"node_probe_missing:{why}"],
        }
        return trace, ["runtime_env_probe_failed"]

    cmd = [
        npm,
        "exec",
        "--package=playwright@1.58.2",
        "--",
        "node",
        str(mjs),
        "--url",
        url,
        "--out",
        str(trace_path),
    ]
    try:
        p = subprocess.run(
            cmd,
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            timeout=240,
        )
    except Exception as e:
        trace = {
            "target_url": url,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "dom_drift": True,
            "notes": [f"node_probe_subprocess_error:{e!r}"],
        }
        return trace, ["runtime_env_probe_failed"]

    if p.returncode != 0 or not trace_path.is_file():
        trace = {
            "target_url": url,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "dom_drift": True,
            "notes": [f"node_probe_exit:{p.returncode}", (p.stderr or "")[-400:]],
        }
        return trace, ["selector_or_dom_drift"]

    trace = read_json(trace_path)
    if not trace:
        return (
            {
                "target_url": url,
                "dom_drift": True,
                "notes": ["node_probe_empty_trace"],
            },
            ["selector_or_dom_drift"],
        )

    blockers: list[str] = []
    if int(trace.get("assistant_count_after") or 0) <= int(trace.get("assistant_count_before") or 0):
        blockers.append("selector_or_dom_drift")
    return trace, sorted(set(blockers))


def ensure_preflight_json(repo_root: Path, automation: Path, base: str, pwa_url: str) -> dict[str, Any]:
    preflight_py = repo_root / "api" / "automation" / "tenmon_pwa_runtime_preflight_v1.py"
    subprocess.run(
        [
            sys.executable,
            str(preflight_py),
            "--automation-dir",
            str(automation),
            "--base",
            base,
            "--pwa-url",
            pwa_url,
            "--repo-root",
            str(repo_root),
        ],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    return read_json(automation / "pwa_playwright_preflight.json")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def effective_audit_build_ok_from_gate(gate: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    """gate_status の audit_build_ok と audit_build_body が矛盾する場合、実応答を優先して product blocker を誤認しない。"""
    raw = bool(gate.get("audit_build_ok", False))
    meta: dict[str, Any] = {"raw_audit_build_ok": raw, "body_overrides_gate": False}
    if raw:
        return True, meta
    body = str(gate.get("audit_build_body") or "").strip()
    if not body:
        return False, meta
    try:
        j = json.loads(body)
        if isinstance(j, dict):
            if j.get("ok") is False:
                return False, meta
            meta["body_overrides_gate"] = True
            return True, meta
    except Exception:
        pass
    return False, meta


def classify_blockers(trace: dict[str, Any]) -> list[str]:
    b: list[str] = []
    if not trace.get("url_has_threadId", False):
        b.append("url_sync_missing")
    if not trace.get("response_threadid_seen", False):
        b.append("response_threadid_unused")
    if not trace.get("refresh_same_thread_kept", False):
        b.append("refresh_restore_fail")
    if trace.get("newchat_triggered_reload", False):
        b.append("newchat_reload_residue")
    if not trace.get("thread_switch_event_seen", False):
        b.append("thread_switch_event_missing")
    if not trace.get("chatlayout_bound", True):
        b.append("chatlayout_not_bound")
    if trace.get("dom_drift", False):
        b.append("selector_or_dom_drift")
    if trace.get("auth_gate", False):
        b.append("auth_gate_unresolved")
    return sorted(set(b))


def run_playwright_probe(url: str) -> tuple[dict[str, Any], list[str]]:
    trace: dict[str, Any] = {
        "target_url": url,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "url_before": None,
        "url_after_send": None,
        "url_after_refresh": None,
        "url_after_newchat": None,
        "url_has_threadId": False,
        "response_threadid_seen": False,
        "thread_switch_event_seen": False,
        "refresh_same_thread_kept": False,
        "newchat_triggered_reload": False,
        "old_thread_restore_ok": False,
        "assistant_count_before": 0,
        "assistant_count_after": 0,
        "assistant_count_after_newchat": 0,
        "dom_drift": False,
        "auth_gate": False,
        "chatlayout_bound": True,
        "notes": [],
    }

    blockers: list[str] = []
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except Exception as e:
        trace["notes"].append(f"playwright_import_error:{e!r}")
        trace["dom_drift"] = True
        return trace, ["selector_or_dom_drift"]

    candidate_input = [
        "textarea",
        "textarea[placeholder*='メッセージ']",
        "textarea[placeholder*='message' i]",
        "[contenteditable='true']",
        "input[type='text']",
    ]
    candidate_send = [
        "button[type='submit']",
        "button[aria-label*='send' i]",
        "button:has-text('送信')",
        "button:has-text('Send')",
    ]
    candidate_new = [
        "button:has-text('新しい会話')",
        "button:has-text('New Chat')",
        "button:has-text('新規')",
        "[data-testid='new-chat']",
    ]
    candidate_assistant = [
        "[data-role='assistant']",
        ".assistant",
        "[class*='assistant']",
        "[data-message-role='assistant']",
    ]
    candidate_old_thread = [
        "[data-thread-id]",
        "[data-testid='thread-item']",
        "button[aria-label*='thread' i]",
        "button:has-text('Thread')",
    ]

    def first_visible(page, selectors: list[str]):
        for s in selectors:
            try:
                loc = page.locator(s).first
                if loc.count() > 0 and loc.is_visible():
                    return s, loc
            except Exception:
                continue
        return None, None

    def assistant_count(page) -> int:
        total = 0
        for s in candidate_assistant:
            try:
                c = page.locator(s).count()
                if c > total:
                    total = c
            except Exception:
                pass
        return total

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()

        api_seen: list[dict[str, Any]] = []

        def on_response(resp):
            try:
                u = resp.url
                if "/api/chat" not in u:
                    return
                t = resp.text()
                j = json.loads(t) if t else {}
                api_seen.append({"url": u, "status": resp.status, "body": j})
                if isinstance(j, dict) and str(j.get("threadId", "")).strip():
                    trace["response_threadid_seen"] = True
            except Exception:
                pass

        page.on("response", on_response)
        page.goto(url, wait_until="domcontentloaded", timeout=90000)
        time.sleep(2)
        trace["url_before"] = page.url

        html = page.content()
        if re.search(r"login|signin|ログイン|認証|メールアドレス", html, re.I):
            # 既存 founder セッションが無い場合は bypass しない
            trace["auth_gate"] = True
            browser.close()
            return trace, ["auth_gate_unresolved"]

        # bind 状態の軽量確認（参照のみ）
        if "gpt-chat-layout" not in html and "TENMON-ARK Chat" not in html:
            trace["chatlayout_bound"] = False

        in_sel, in_loc = first_visible(page, candidate_input)
        send_sel, send_loc = first_visible(page, candidate_send)
        new_sel, new_loc = first_visible(page, candidate_new)
        trace["selectors"] = {
            "input": in_sel,
            "send": send_sel,
            "new_chat": new_sel,
        }

        if in_loc is None or send_loc is None or new_loc is None:
            trace["dom_drift"] = True
            browser.close()
            return trace, ["selector_or_dom_drift"]

        # thread-switch event 観測フック
        page.evaluate(
            """
            () => {
              window.__TENMON_THREAD_SWITCH_SEEN__ = false;
              window.addEventListener('tenmon:thread-switch', () => {
                window.__TENMON_THREAD_SWITCH_SEEN__ = true;
              });
            }
            """
        )

        trace["assistant_count_before"] = assistant_count(page)
        probe_text = f"監査プローブ {int(time.time())}。一言で返答してください。"
        try:
            if "contenteditable" in (in_sel or ""):
                in_loc.click()
                page.keyboard.type(probe_text)
            else:
                in_loc.fill(probe_text)
        except Exception:
            in_loc.click()
            page.keyboard.type(probe_text)

        send_loc.click()
        page.wait_for_timeout(5000)
        trace["assistant_count_after"] = assistant_count(page)
        trace["url_after_send"] = page.url
        try:
            q = page.evaluate("() => new URL(window.location.href).searchParams.get('threadId') || ''")
            trace["url_has_threadId"] = bool(str(q).strip())
            old_tid = str(q).strip()
        except Exception:
            old_tid = ""
            trace["url_has_threadId"] = False

        # refresh 観測
        page.reload(wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(2000)
        trace["url_after_refresh"] = page.url
        try:
            q2 = page.evaluate("() => new URL(window.location.href).searchParams.get('threadId') || ''")
            trace["refresh_same_thread_kept"] = bool(old_tid and str(q2).strip() == old_tid)
        except Exception:
            trace["refresh_same_thread_kept"] = False

        # New Chat 観測（reload 禁止）
        perf_before = page.evaluate("() => performance.getEntriesByType('navigation').length")
        new_loc.click()
        page.wait_for_timeout(2000)
        perf_after = page.evaluate("() => performance.getEntriesByType('navigation').length")
        trace["newchat_triggered_reload"] = bool(perf_after > perf_before)
        trace["thread_switch_event_seen"] = bool(page.evaluate("() => !!window.__TENMON_THREAD_SWITCH_SEEN__"))
        trace["url_after_newchat"] = page.url
        trace["assistant_count_after_newchat"] = assistant_count(page)
        try:
            q3 = page.evaluate("() => new URL(window.location.href).searchParams.get('threadId') || ''")
            new_tid = str(q3).strip()
        except Exception:
            new_tid = ""

        # old thread restore 観測（URL直指定）
        if old_tid and new_tid and old_tid != new_tid:
            restore_url = f"{url}?threadId={old_tid}"
            page.goto(restore_url, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_timeout(2000)
            try:
                q4 = page.evaluate("() => new URL(window.location.href).searchParams.get('threadId') || ''")
                trace["old_thread_restore_ok"] = str(q4).strip() == old_tid
            except Exception:
                trace["old_thread_restore_ok"] = False
        else:
            trace["notes"].append("old_thread_restore_not_executed")

        browser.close()

    if trace["assistant_count_after"] <= trace["assistant_count_before"]:
        blockers.append("selector_or_dom_drift")
    return trace, sorted(set(blockers))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo_root", type=str)
    ap.add_argument("outdir", type=str)
    ap.add_argument("--url", type=str, default="https://tenmon-ark.com/pwa/")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo_root)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    automation = root / "api" / "automation"
    automation.mkdir(parents=True, exist_ok=True)
    gen = automation / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)

    gate = read_json(outdir / "gate_status.json")
    health_ok = bool(gate.get("health_ok", False))
    audit_ok = bool(gate.get("audit_ok", False))
    audit_build_ok, audit_build_meta = effective_audit_build_ok_from_gate(gate)

    # 参照のみ監査: source bind
    use_chat = read_text(root / "web" / "src" / "hooks" / "useChat.ts")
    gpt_shell = read_text(root / "web" / "src" / "components" / "gpt" / "GptShell.tsx")
    chat_layout = read_text(root / "web" / "src" / "components" / "gpt" / "ChatLayout.tsx")
    static_notes = {
        "useChat_has_switch_event": "TENMON_THREAD_SWITCH_EVENT" in use_chat,
        "gptshell_dispatches_switch_event": "TENMON_THREAD_SWITCH_EVENT" in gpt_shell and "CustomEvent" in gpt_shell,
        "chatlayout_uses_useChat": "useChat()" in chat_layout,
    }

    base_hint = os.environ.get("BASE", "").strip().rstrip("/")
    preflight = read_json(automation / "pwa_playwright_preflight.json")
    if not preflight.get("selected_driver"):
        preflight = ensure_preflight_json(root, automation, base_hint, args.url)

    driver = preflight.get("selected_driver")
    probe_blockers: list[str] = []

    if driver == "python_playwright":
        probe_trace, probe_blockers = run_playwright_probe(args.url)
    elif driver == "node_playwright":
        probe_trace, probe_blockers = run_node_playwright_probe(root, args.url, outdir)
    else:
        probe_trace = probe_trace_env_failure(args.url, preflight)
        probe_blockers = ["runtime_env_probe_failed"]

    probe_trace["chatlayout_bound"] = bool(static_notes["chatlayout_uses_useChat"])
    all_blockers = classify_blockers(probe_trace) + probe_blockers
    if not health_ok:
        all_blockers.append("gate_health_fail")
    if not audit_build_ok:
        all_blockers.append("gate_audit_build_fail")
    if not audit_ok:
        all_blockers.append("gate_audit_fail")
    all_blockers = sorted(set(all_blockers))

    report = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target_url": args.url,
        "probe_driver": driver,
        "preflight_env_failure": bool(preflight.get("env_failure")),
        "gate": {
            "health_ok": health_ok,
            "audit_ok": audit_ok,
            "audit_build_ok": audit_build_ok,
            "audit_build_reconcile": audit_build_meta,
        },
        "static_notes": static_notes,
        "probe_summary": {
            "url_has_threadId": probe_trace.get("url_has_threadId"),
            "response_threadid_seen": probe_trace.get("response_threadid_seen"),
            "refresh_same_thread_kept": probe_trace.get("refresh_same_thread_kept"),
            "newchat_triggered_reload": probe_trace.get("newchat_triggered_reload"),
            "thread_switch_event_seen": probe_trace.get("thread_switch_event_seen"),
            "old_thread_restore_ok": probe_trace.get("old_thread_restore_ok"),
            "auth_gate": probe_trace.get("auth_gate"),
            "dom_drift": probe_trace.get("dom_drift"),
        },
        "ready_for_seal": len(all_blockers) == 0,
    }

    (automation / "pwa_real_browser_lastmile_audit_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (automation / "pwa_real_browser_lastmile_blockers.json").write_text(
        json.dumps({"card": CARD, "blockers": all_blockers}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (automation / "pwa_real_browser_lastmile_probe_trace.json").write_text(
        json.dumps(probe_trace, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    (gen / "TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1.md").write_text(
        "\n".join(
            [
                "# TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1",
                "",
                f"- card: {CARD}",
                f"- ready_for_seal: {len(all_blockers) == 0}",
                f"- blockers: {all_blockers}",
                "- focus: frontend last-mile only / no backend rewrite",
                "",
            ]
        ),
        encoding="utf-8",
    )

    # mirror to outdir
    for fn in [
        "pwa_real_browser_lastmile_audit_report.json",
        "pwa_real_browser_lastmile_blockers.json",
        "pwa_real_browser_lastmile_probe_trace.json",
        "pwa_playwright_preflight.json",
    ]:
        try:
            (outdir / fn).write_text((automation / fn).read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    summary = {
        "ok": len(all_blockers) == 0,
        "ready_for_seal": len(all_blockers) == 0,
        "blocker_count": len(all_blockers),
        "blockers": all_blockers,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if len(all_blockers) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
