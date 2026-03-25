#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_AGENT_REVIEW_BYPASS_OR_SINGLE_ACCEPT_RUNTIME_CURSOR_AUTO_V1

Cursor review 停止点を可能な範囲で自動通過する。
- bypass 可能なら accepted
- 不可なら manual_review_required=true で明示停止
"""
from __future__ import annotations

import argparse
import json
import platform
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_AGENT_REVIEW_BYPASS_OR_SINGLE_ACCEPT_RUNTIME_CURSOR_AUTO_V1"
BUTTON_ORDER = [
    "Continue without reverting",
    "Review",
    "Keep All",
    "Accept All",
    "Apply All",
]
FINAL_ACCEPT_BUTTONS = {"Keep All", "Accept All", "Apply All"}
HIGH_RISK_PATTERNS = [
    "chat.ts",
    "finalize.ts",
    "web/src/",
    "auth",
    "queue",
    "token",
]


def _run_osascript(script: str) -> tuple[int, str, str]:
    r = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        timeout=20,
    )
    return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()


def _activate_cursor() -> tuple[bool, str]:
    code, out, err = _run_osascript('tell application "Cursor" to activate')
    if code == 0:
        return True, out
    return False, err or out or "activate_failed"


def _button_exists(label: str) -> tuple[bool, str]:
    script = f'''
tell application "System Events"
  if not (exists process "Cursor") then return "no_cursor_process"
  tell process "Cursor"
    try
      set matches to (every button whose name is "{label}")
      if (count of matches) > 0 then
        return "yes"
      else
        return "no"
      end if
    on error errMsg
      return "error:" & errMsg
    end try
  end tell
end tell
'''
    code, out, err = _run_osascript(script)
    if code != 0:
        return False, err or out or "osascript_nonzero"
    if out == "yes":
        return True, out
    return False, out


def _click_button(label: str) -> tuple[bool, str]:
    script = f'''
tell application "System Events"
  if not (exists process "Cursor") then return "no_cursor_process"
  tell process "Cursor"
    try
      set matches to (every button whose name is "{label}")
      if (count of matches) > 0 then
        click item 1 of matches
        return "clicked"
      else
        return "not_found"
      end if
    on error errMsg
      return "error:" & errMsg
    end try
  end tell
end tell
'''
    code, out, err = _run_osascript(script)
    if code != 0:
        return False, err or out or "osascript_nonzero"
    return out == "clicked", out


def _is_high_risk(item: dict[str, Any]) -> bool:
    txt = json.dumps(item, ensure_ascii=False).lower()
    return any(p.lower() in txt for p in HIGH_RISK_PATTERNS)


def _manual(reason: str, clicked: list[str] | None = None, timeout: bool = False) -> dict[str, Any]:
    return {
        "ok": False,
        "card": CARD,
        "status": "manual_review_required",
        "clicked": clicked or [],
        "manual_review_required": True,
        "timeout": timeout,
        "reason": reason,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--item-json", type=str, default="")
    ap.add_argument("--manifest", type=str, default="")
    ap.add_argument("--timeout-sec", type=int, default=25)
    ap.add_argument("--poll-sec", type=float, default=0.4)
    args = ap.parse_args()

    item: dict[str, Any] = {}
    target_json = (args.manifest or args.item_json or "").strip()
    if target_json:
        p = Path(target_json)
        if p.is_file():
            try:
                item = json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                item = {}

    if _is_high_risk(item):
        print(json.dumps(_manual("high_risk_item_blocked"), ensure_ascii=False))
        return 0

    if platform.system().lower() != "darwin":
        print(json.dumps(_manual("non_darwin_environment"), ensure_ascii=False))
        return 0

    ok, msg = _activate_cursor()
    if not ok:
        print(json.dumps(_manual(f"cursor_activate_failed:{msg}"), ensure_ascii=False))
        return 0

    clicked: list[str] = []
    started = time.time()
    last_error = ""

    # single accept runtime: ボタン探索は優先順で繰り返し
    while time.time() - started <= max(5, args.timeout_sec):
        for label in BUTTON_ORDER:
            found, state = _button_exists(label)
            if not found:
                if state.startswith("error:"):
                    last_error = state
                continue
            did, out = _click_button(label)
            if did:
                clicked.append(label)
                time.sleep(max(0.1, args.poll_sec))
                break
            if out.startswith("error:"):
                last_error = out
        else:
            # no button found at this tick
            time.sleep(max(0.1, args.poll_sec))
            continue

        if any(x in FINAL_ACCEPT_BUTTONS for x in clicked):
            print(
                json.dumps(
                    {
                        "ok": True,
                        "card": CARD,
                        "status": "accepted",
                        "clicked": clicked,
                        "manual_review_required": False,
                        "timeout": False,
                    },
                    ensure_ascii=False,
                )
            )
            return 0

        # Continue without reverting のみ押せた場合、Review/Final がまだ無ければ single accept 完了
        if clicked and clicked[-1] == "Continue without reverting":
            has_review, _ = _button_exists("Review")
            has_keep, _ = _button_exists("Keep All")
            has_accept, _ = _button_exists("Accept All")
            has_apply, _ = _button_exists("Apply All")
            if not (has_review or has_keep or has_accept or has_apply):
                print(
                    json.dumps(
                        {
                            "ok": True,
                            "card": CARD,
                            "status": "accepted",
                            "clicked": clicked,
                            "manual_review_required": False,
                            "timeout": False,
                        },
                        ensure_ascii=False,
                    )
                )
                return 0

    reason = "timeout"
    if last_error:
        reason = f"{reason}:{last_error}"
    print(json.dumps(_manual(reason, clicked=clicked, timeout=True), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

