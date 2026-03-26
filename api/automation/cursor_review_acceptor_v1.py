#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_REVIEW_ACCEPTOR_RUNTIME_CURSOR_AUTO_V1

Cursor review UI が残っている場合に、Mac 上で System Events 経由のボタンクリックのみ補助する。
非 Darwin / ゲート違反時は fail-closed（成功の捏造なし）。
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_REVIEW_ACCEPTOR_RUNTIME_CURSOR_AUTO_V1"
LEGACY_CARD = "TENMON_CURSOR_AGENT_REVIEW_BYPASS_OR_SINGLE_ACCEPT_RUNTIME_CURSOR_AUTO_V1"

BUTTON_ORDER = [
    "Continue without reverting",
    "Review",
    "Keep All",
    "Accept All",
    "Apply All",
]
FINAL_ACCEPT_BUTTONS = frozenset({"Keep All", "Accept All", "Apply All"})


def _apple_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def _run_osascript(script: str) -> tuple[int, str, str]:
    r = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
        timeout=12,
    )
    return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()


def _activate_cursor() -> tuple[bool, str]:
    code, out, err = _run_osascript('tell application "Cursor" to activate')
    if code == 0:
        return True, out
    return False, err or out or "activate_failed"


def _button_script_body(action: str, label_escaped: str) -> str:
    """action: exists | click — window / sheet / 1-level group を走査。"""
    return f'''
set targetLabel to "{label_escaped}"
tell application "System Events"
  if not (exists process "Cursor") then return "no_cursor_process"
  tell process "Cursor"
    try
      repeat with w in windows
        repeat with b in (buttons of w)
          if (name of b as string) is targetLabel then
            if "{action}" is "exists" then return "yes"
            click b
            return "clicked"
          end if
        end repeat
        repeat with s in sheets of w
          repeat with b in (buttons of s)
            if (name of b as string) is targetLabel then
              if "{action}" is "exists" then return "yes"
              click b
              return "clicked"
            end if
          end repeat
        end repeat
        repeat with g in groups of w
          repeat with b in (buttons of g)
            if (name of b as string) is targetLabel then
              if "{action}" is "exists" then return "yes"
              click b
              return "clicked"
            end if
          end repeat
        end repeat
      end repeat
    on error errMsg
      return "error:" & errMsg
    end try
    if "{action}" is "exists" then return "no"
    return "not_found"
  end tell
end tell
'''


def _button_exists(label: str) -> tuple[bool, str]:
    script = _button_script_body("exists", _apple_escape(label))
    code, out, err = _run_osascript(script)
    if code != 0:
        return False, err or out or "osascript_nonzero"
    if out == "yes":
        return True, out
    return False, out


def _click_button(label: str) -> tuple[bool, str]:
    script = _button_script_body("click", _apple_escape(label))
    code, out, err = _run_osascript(script)
    if code != 0:
        return False, err or out or "osascript_nonzero"
    return out == "clicked", out


def _env_substring_blocks() -> list[str]:
    raw = (os.environ.get("TENMON_REVIEW_ACCEPTOR_BLOCK_SUBSTRINGS") or "").strip()
    if not raw:
        return []
    return [x.strip().lower() for x in raw.split(",") if x.strip()]


def _substring_guard_blocks(item: dict[str, Any]) -> tuple[bool, str]:
    blocks = _env_substring_blocks()
    if not blocks:
        return False, ""
    blob = json.dumps(item, ensure_ascii=False).lower()
    for frag in blocks:
        if frag and frag in blob:
            return True, f"block_substring_match:{frag}"
    return False, ""


def _item_requires_manual(item: dict[str, Any]) -> tuple[bool, str]:
    """queue 契約に沿った high-risk / 状態ゲート（観測のみ、キューは変更しない）。"""
    if not item:
        return False, ""
    st = str(item.get("state") or "").lower()
    if st == "approval_required":
        return True, "queue_state_approval_required"
    if st == "rejected":
        return True, "queue_state_rejected"
    hr = item.get("high_risk") is True
    rt = str(item.get("risk_tier") or "").lower()
    high_tier = rt in ("high", "critical", "escrow", "severe", "blocker", "p0")
    esc = item.get("escrow_approved") is True
    if (hr or high_tier) and not esc:
        return True, "high_risk_or_tier_without_escrow_approval"
    blocked, why = _substring_guard_blocks(item)
    if blocked:
        return True, why
    return False, ""


def _emit(
    ok: bool,
    clicked: list[str],
    manual_review_required: bool,
    reason: str,
    *,
    status: str,
    timeout: bool = False,
) -> dict[str, Any]:
    return {
        "ok": ok,
        "clicked": clicked,
        "manual_review_required": manual_review_required,
        "reason": reason,
        "card": CARD,
        "legacy_card": LEGACY_CARD,
        "status": status,
        "timeout": timeout,
    }


def _manual(reason: str, clicked: list[str] | None = None, timeout: bool = False) -> dict[str, Any]:
    return _emit(
        False,
        clicked or [],
        True,
        reason,
        status="manual_review_required",
        timeout=timeout,
    )


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

    manual, why = _item_requires_manual(item)
    if manual:
        print(json.dumps(_manual(why), ensure_ascii=False))
        return 0

    if platform.system().lower() != "darwin":
        print(json.dumps(_manual("non_darwin_environment"), ensure_ascii=False))
        return 0

    ok_act, msg = _activate_cursor()
    if not ok_act:
        print(json.dumps(_manual(f"cursor_activate_failed:{msg}"), ensure_ascii=False))
        return 0

    clicked: list[str] = []
    started = time.time()
    last_error = ""

    while time.time() - started <= max(5, args.timeout_sec):
        for label in BUTTON_ORDER:
            found, state = _button_exists(label)
            if not found:
                if isinstance(state, str) and state.startswith("error:"):
                    last_error = state
                continue
            did, out = _click_button(label)
            if did:
                clicked.append(label)
                time.sleep(max(0.1, args.poll_sec))
                break
            if isinstance(out, str) and out.startswith("error:"):
                last_error = out
        else:
            time.sleep(max(0.1, args.poll_sec))
            continue

        if any(x in FINAL_ACCEPT_BUTTONS for x in clicked):
            print(
                json.dumps(
                    _emit(
                        True,
                        clicked,
                        False,
                        "accepted_final_button",
                        status="accepted",
                    ),
                    ensure_ascii=False,
                )
            )
            return 0

        if clicked and clicked[-1] == "Continue without reverting":
            has_review, _ = _button_exists("Review")
            has_keep, _ = _button_exists("Keep All")
            has_accept, _ = _button_exists("Accept All")
            has_apply, _ = _button_exists("Apply All")
            if not (has_review or has_keep or has_accept or has_apply):
                print(
                    json.dumps(
                        _emit(
                            True,
                            clicked,
                            False,
                            "continue_without_reverting_dialog_cleared",
                            status="accepted",
                        ),
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
