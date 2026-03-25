#!/usr/bin/env python3
"""TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX — 前提: Playwright 復旧は runtime restore カード参照。"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_PWA_REAL_BROWSER_LASTMILE_AUTOFIX_CURSOR_AUTO_V1"

# 自動修復カテゴリ（Python 側は静的確認 + 計画のみ。実コードは mainline に反映済みを前提）
FIXABLE = frozenset(
    {
        "url_sync_missing",
        "response_threadid_unused",
        "refresh_restore_fail",
        "newchat_reload_residue",
        "thread_switch_event_missing",
        "chatlayout_not_bound",
        "naming_residue",
    }
)

# 1 ループ最大 2 系統（taxonomy 順で先頭から）
TAXONOMY_ORDER = [
    "url_sync_missing",
    "response_threadid_unused",
    "refresh_restore_fail",
    "newchat_reload_residue",
    "thread_switch_event_missing",
    "chatlayout_not_bound",
    "naming_residue",
    "selector_or_dom_drift",
    "auth_gate_unresolved",
    "gate_health_fail",
    "gate_audit_build_fail",
    "gate_audit_fail",
]


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def verify_frontend_mainline(root: Path) -> dict[str, Any]:
    """blocker 種別ごとの静的シグナル（参照のみ）。"""
    use_chat = read_text(root / "web" / "src" / "hooks" / "useChat.ts")
    gpt_shell = read_text(root / "web" / "src" / "components" / "gpt" / "GptShell.tsx")
    chat_layout = read_text(root / "web" / "src" / "components" / "gpt" / "ChatLayout.tsx")
    api_chat = read_text(root / "web" / "src" / "api" / "chat.ts")
    types_chat = read_text(root / "web" / "src" / "types" / "chat.ts")

    return {
        "url_sync_missing": bool(
            "readThreadIdFromUrl" in use_chat
            and "writeThreadIdToUrl" in use_chat
            and "resolveCanonicalThreadId" in use_chat
        ),
        "response_threadid_unused": bool(
            "threadId?:" in types_chat or "threadId?:" in types_chat.replace(" ", "")
        )
        and "out?.threadId" in use_chat.replace(" ", "")
        and "threadId" in api_chat
        and '"threadId"' in api_chat,
        "refresh_restore_fail": bool(
            "readThreadIdFromUrl" in use_chat
            and ("popstate" in use_chat and "hashchange" in use_chat)
        ),
        "newchat_reload_residue": bool("location.reload" not in gpt_shell),
        "thread_switch_event_missing": bool(
            "TENMON_THREAD_SWITCH_EVENT" in use_chat
            and "TENMON_THREAD_SWITCH_EVENT" in gpt_shell
            and "CustomEvent" in gpt_shell
        ),
        "chatlayout_not_bound": bool(
            "useChat()" in chat_layout
            and "data-chat-layout-bound" in chat_layout
            and "data-thread-id" in chat_layout
        ),
        "naming_residue": bool("sessionId" not in use_chat and "sessionId" not in api_chat),
    }


def pick_patch_plan(blockers: list[str], max_systems: int = 2) -> dict[str, Any]:
    """blocker に対し最大 max_systems 件の修復系統を選択（taxonomy 順）。"""
    seen: list[str] = []
    for key in TAXONOMY_ORDER:
        if key in blockers and key in FIXABLE:
            seen.append(key)
            if len(seen) >= max_systems:
                break
    return {
        "max_systems": max_systems,
        "selected": seen,
        "skipped_due_to_cap": [b for b in blockers if b in FIXABLE and b not in seen],
    }


def run_browser_reprobe(repo_root: Path, outdir: Path, target_url: str, stdout_json: bool) -> int:
    audit_py = repo_root / "api" / "automation" / "tenmon_pwa_real_browser_lastmile_audit_v1.py"
    cmd = [
        sys.executable,
        str(audit_py),
        str(repo_root),
        str(outdir),
        "--url",
        target_url,
    ]
    if stdout_json:
        cmd.append("--stdout-json")
    r = subprocess.run(cmd, cwd=str(repo_root))
    return int(r.returncode)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo_root", type=str)
    ap.add_argument("outdir", type=str)
    ap.add_argument("--url", type=str, default="https://tenmon-ark.com/pwa/")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo_root)
    outdir = Path(args.outdir)
    automation = root / "api" / "automation"
    gen = automation / "generated_cursor_apply"
    gen.mkdir(parents=True, exist_ok=True)

    blockers_path = automation / "pwa_real_browser_lastmile_blockers.json"
    prior = read_json(blockers_path)
    prior_blockers: list[str] = []
    if isinstance(prior.get("blockers"), list):
        prior_blockers = [str(x) for x in prior["blockers"]]

    static_ok = verify_frontend_mainline(root)
    plan = pick_patch_plan(prior_blockers, max_systems=2)

    unfixable = sorted({b for b in prior_blockers if b not in FIXABLE})
    retry_queue = sorted(set(unfixable) | set(plan.get("skipped_due_to_cap", [])))

    report: dict[str, Any] = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "input_blockers_path": str(blockers_path),
        "input_blockers": prior_blockers,
        "patch_plan": plan,
        "static_verification": static_ok,
        "retry_queue": retry_queue,
        "notes": [
            "frontend mainline の実装はリポジトリ上のソースが正。本 runner は計画・静的確認・reprobe のみ。",
        ],
    }
    (automation / "pwa_real_browser_lastmile_autofix_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # driver 選択のため preflight を最新化（audit と同一）
    preflight_py = root / "api" / "automation" / "tenmon_pwa_runtime_preflight_v1.py"
    subprocess.run(
        [
            sys.executable,
            str(preflight_py),
            "--automation-dir",
            str(automation),
            "--base",
            "",
            "--pwa-url",
            args.url,
        ],
        cwd=str(root),
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )

    # browser reprobe（audit_v1 が blockers を上書き）
    rc = run_browser_reprobe(root, outdir, args.url, args.stdout_json)

    postfix_blockers_path = automation / "pwa_real_browser_lastmile_blockers.json"
    postfix_data = read_json(postfix_blockers_path)
    postfix_blockers: list[str] = []
    if isinstance(postfix_data.get("blockers"), list):
        postfix_blockers = [str(x) for x in postfix_data["blockers"]]

    readiness: dict[str, Any] = {
        "card": CARD,
        "generated_at": report["generated_at"],
        "prior_blockers": prior_blockers,
        "postfix_blockers": postfix_blockers,
        "reprobe_exit_code": rc,
        "pass": len(postfix_blockers) == 0,
        "retry_if_fail": postfix_blockers,
    }
    (automation / "pwa_real_browser_lastmile_postfix_readiness.json").write_text(
        json.dumps(readiness, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    pass_ok = len(postfix_blockers) == 0
    completion_lines = [
        "# TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_CURSOR_AUTO_V1",
        "",
        f"- card: {CARD}",
        f"- prior_blockers: {prior_blockers}",
        f"- postfix_blockers: {postfix_blockers}",
        f"- status: {'PASS' if pass_ok else 'FAIL'}",
        f"- reprobe_exit_code: {rc}",
        "",
        "PASS のときのみ lived seal 系カードへ進める。FAIL のときは `pwa_real_browser_lastmile_blockers.json` を再入力として本カードを再実行。",
        "",
    ]
    (gen / "TENMON_PWA_FINAL_AUTOLOOP_COMPLETION_CURSOR_AUTO_V1.md").write_text(
        "\n".join(completion_lines), encoding="utf-8"
    )

    summary = {
        "ok": pass_ok,
        "prior_blockers": prior_blockers,
        "postfix_blockers": postfix_blockers,
        "reprobe_exit_code": rc,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if pass_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
