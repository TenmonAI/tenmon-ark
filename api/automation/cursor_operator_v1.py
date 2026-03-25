#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mac ローカル専用: Cursor を起動し、安全パス上のファイルを開いて指示を貼り、
明示的判定後に 1 パッチだけ適用する（chat.ts 等は対象外）。

- 対象は api/automation/** のみ（リポジトリルート相対）。
- ビルド失敗時はコミットしない（呼び出し側でパッチ巻き戻し可）。
"""
from __future__ import annotations

import difflib
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# chat.ts 直撃禁止（パス部分一致）
_FORBIDDEN_PATH_MARKERS = (
    "routes/chat.ts",
    "chat_front.ts",
    "src/routes/chat.ts",
)
# safe target: api/automation 配下のみ
_ALLOWED_PREFIX = "api/automation/"


def is_mac() -> bool:
    return sys.platform == "darwin"


def is_safe_automation_target(repo_root: Path, target: Path) -> tuple[bool, str]:
    """api/automation/** かつ禁止パスを含まないこと。"""
    try:
        rel = target.resolve().relative_to(repo_root.resolve())
    except ValueError:
        return False, "outside_repo"
    s = rel.as_posix()
    if not s.startswith(_ALLOWED_PREFIX):
        return False, "not_under_api_automation"
    low = s.lower()
    for m in _FORBIDDEN_PATH_MARKERS:
        if m in low:
            return False, f"forbidden:{m}"
    return True, "ok"


@dataclass
class CursorOperatorResultV1:
    cursor_open_ok: bool
    file_open_ok: bool
    instruction_injected: bool
    patch_applied: bool
    build_verify_ok: bool
    changed_files: list[str]
    diff_unified: str
    build_rc: int | None
    build_stdout_excerpt: str
    error: str
    phases: dict[str, Any] = field(default_factory=dict)


class CursorOperatorV1:
    """pyautogui / pyperclip 前提。GUI 省略時は環境変数でスキップ可能。"""

    def __init__(self) -> None:
        if not is_mac():
            raise RuntimeError("CursorOperatorV1 requires macOS (Darwin)")
        self._pyautogui = __import__("pyautogui")
        self._pyperclip = __import__("pyperclip")
        self._pyautogui.FAILSAFE = True
        self._pyautogui.PAUSE = 0.08

    def open_cursor_with_file(self, file_path: Path) -> tuple[bool, str]:
        try:
            p = subprocess.run(
                ["open", "-a", "Cursor", str(file_path)],
                capture_output=True,
                text=True,
                timeout=45,
            )
            if p.returncode != 0:
                return False, (p.stderr or p.stdout or "open_cursor_failed")[:400]
            return True, "ok"
        except Exception as e:
            return False, str(e)

    def _focus_cursor_chat(self) -> tuple[bool, str]:
        """環境変数でショートカットを指定（既定: command+l）。"""
        raw = os.environ.get("TENMON_CURSOR_OPERATOR_CHAT_HOTKEY", "command,l").strip()
        parts = [x.strip().lower() for x in raw.split(",") if x.strip()]
        if not parts:
            parts = ["command", "l"]
        try:
            self._pyautogui.hotkey(*parts)
            time.sleep(float(os.environ.get("TENMON_CURSOR_OPERATOR_AFTER_CHAT_FOCUS_SEC", "0.4")))
            return True, "ok"
        except Exception as e:
            return False, str(e)

    def inject_instruction_paste(self, instruction: str) -> tuple[bool, str]:
        """Cursor チャットへクリップボード経由で貼付（UI ドリフトで失敗し得る）。"""
        if os.environ.get("TENMON_CURSOR_OPERATOR_SKIP_GUI", "").strip().lower() in ("1", "true", "yes"):
            return False, "skip_gui"
        ok, msg = self._focus_cursor_chat()
        if not ok:
            return False, msg
        try:
            self._pyperclip.copy(instruction)
            self._pyautogui.hotkey("command", "v")
            time.sleep(0.15)
            return True, "ok"
        except Exception as e:
            return False, str(e)


def make_unified_diff(before: str, after: str, path: str) -> str:
    a = before.splitlines(keepends=True)
    b = after.splitlines(keepends=True)
    return "".join(difflib.unified_diff(a, b, fromfile=path + ":before", tofile=path + ":after"))


def apply_sandbox_patch_explicit(
    repo_root: Path,
    sandbox_file: Path,
) -> tuple[bool, str, str, str]:
    """
    SANDBOX_STATE=idle を patched に 1 箇所だけ置換。事前に is_safe_automation_target 必須。
    Returns: (ok, message, before_text, after_text)
    """
    ok, reason = is_safe_automation_target(repo_root, sandbox_file)
    if not ok:
        return False, reason, "", ""

    before = sandbox_file.read_text(encoding="utf-8")
    if not re.search(r"^SANDBOX_STATE=idle\s*$", before, re.MULTILINE):
        return False, "sandbox_not_idle_or_unexpected_format", before, before

    after = re.sub(
        r"^SANDBOX_STATE=idle\s*$",
        "SANDBOX_STATE=patched",
        before,
        count=1,
        flags=re.MULTILINE,
    )
    if after == before:
        return False, "no_change", before, before

    sandbox_file.parent.mkdir(parents=True, exist_ok=True)
    sandbox_file.write_text(after, encoding="utf-8")
    return True, "ok", before, after


def revert_sandbox_patch(repo_root: Path, sandbox_file: Path, before_text: str) -> tuple[bool, str]:
    ok, reason = is_safe_automation_target(repo_root, sandbox_file)
    if not ok:
        return False, reason
    try:
        sandbox_file.write_text(before_text, encoding="utf-8")
        return True, "ok"
    except Exception as e:
        return False, str(e)


def run_npm_build(repo_root: Path, api_dir: Path | None = None) -> tuple[int, str]:
    cwd = api_dir or (repo_root / "api")
    try:
        p = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=int(os.environ.get("TENMON_CURSOR_OPERATOR_BUILD_TIMEOUT_SEC", "600")),
        )
        out = (p.stdout or "") + "\n" + (p.stderr or "")
        return p.returncode, out[-8000:]
    except Exception as e:
        return 99, str(e)


def default_sandbox_path(repo_root: Path) -> Path:
    return repo_root / "api" / "automation" / "out" / "cursor_operator_sandbox" / "CURSOR_OPERATOR_SANDBOX_V1.txt"


def ensure_sandbox_idle(sandbox_file: Path) -> None:
    """gitignore 下にサンドボックス雛形を生成。"""
    body = """# TENMON_CURSOR_OPERATOR_SANDBOX_V1 — safe automation-only file (do not move outside api/automation/)
SANDBOX_STATE=idle
# patch target: single-line state flip for runtime proof
"""
    sandbox_file.parent.mkdir(parents=True, exist_ok=True)
    if not sandbox_file.is_file():
        sandbox_file.write_text(body, encoding="utf-8")
        return
    raw = sandbox_file.read_text(encoding="utf-8")
    if "SANDBOX_STATE=patched" in raw:
        sandbox_file.write_text(body, encoding="utf-8")


def run_cursor_operator_proof(
    repo_root: Path,
    *,
    sandbox_file: Path | None = None,
    instruction: str | None = None,
) -> CursorOperatorResultV1:
    """
    Phase A–E: ファイルオープン → 指示貼付 → 明示パッチ → npm build → diff 記録。
    """
    repo_root = repo_root.resolve()
    sf = sandbox_file or default_sandbox_path(repo_root)
    ensure_sandbox_idle(sf)

    default_instr = os.environ.get(
        "TENMON_CURSOR_OPERATOR_INSTRUCTION",
        "[TENMON_CURSOR_OPERATOR_RUNTIME] SANDBOX_STATE を idle→patched に1行のみ更新。chat.ts には触れないこと。",
    )
    instr = instruction if instruction is not None else default_instr

    phases: dict[str, Any] = {}
    result = CursorOperatorResultV1(
        cursor_open_ok=False,
        file_open_ok=False,
        instruction_injected=False,
        patch_applied=False,
        build_verify_ok=False,
        changed_files=[],
        diff_unified="",
        build_rc=None,
        build_stdout_excerpt="",
        error="",
        phases=phases,
    )

    ok_path, pr = is_safe_automation_target(repo_root, sf)
    if not ok_path:
        result.error = pr
        phases["safe_path"] = {"ok": False, "detail": pr}
        return result
    phases["safe_path"] = {"ok": True}

    if not sf.is_file():
        result.error = "sandbox_missing"
        return result

    before_all = sf.read_text(encoding="utf-8")
    result.file_open_ok = True

    try:
        op = CursorOperatorV1()
    except Exception as e:
        result.error = f"operator_init:{e}"
        return result

    o_ok, o_msg = op.open_cursor_with_file(sf)
    phases["open_cursor_file"] = {"ok": o_ok, "detail": o_msg}
    result.cursor_open_ok = o_ok
    if not o_ok:
        result.error = o_msg
        return result

    time.sleep(float(os.environ.get("TENMON_CURSOR_OPERATOR_UI_SETTLE_SEC", "2.5")))

    i_ok, i_msg = op.inject_instruction_paste(instr)
    phases["instruction_paste"] = {"ok": i_ok, "detail": i_msg}
    result.instruction_injected = i_ok
    if not i_ok:
        result.error = i_msg or "instruction_not_injected"
        return result

    # 明示的判定後に 1 パッチのみ
    p_ok, p_msg, before_snap, after_snap = apply_sandbox_patch_explicit(repo_root, sf)
    phases["explicit_patch"] = {"ok": p_ok, "detail": p_msg}
    result.patch_applied = p_ok
    result.changed_files = [sf.relative_to(repo_root).as_posix()] if p_ok else []
    result.diff_unified = make_unified_diff(before_snap, after_snap, result.changed_files[0] if result.changed_files else str(sf))
    if not p_ok:
        result.error = p_msg
        return result

    rc, bout = run_npm_build(repo_root)
    result.build_rc = rc
    result.build_stdout_excerpt = bout
    result.build_verify_ok = rc == 0
    phases["npm_build"] = {"rc": rc, "ok": result.build_verify_ok}

    if not result.build_verify_ok:
        result.error = "build_failed"
        revert_sandbox_patch(repo_root, sf, before_all)
        phases["revert_after_build_fail"] = {"ok": True}
        result.patch_applied = False
        result.changed_files = []
        result.diff_unified = ""
        return result

    return result
