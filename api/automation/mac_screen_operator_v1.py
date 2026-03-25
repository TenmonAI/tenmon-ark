#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mac ローカル専用: 画面操作の最小ラッパ（VPS では import しない運用を推奨）。
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any


def is_mac() -> bool:
    return sys.platform == "darwin"


class MacScreenOperator:
    """pyautogui / pyperclip 前提。権限不足は各メソッドで例外または (False, reason)。"""

    def __init__(self) -> None:
        if not is_mac():
            raise RuntimeError("MacScreenOperator requires macOS (Darwin)")
        import pyautogui  # noqa: F401
        import pyperclip  # noqa: F401
        from PIL import Image  # noqa: F401

        self._pyautogui = __import__("pyautogui")
        self._pyperclip = __import__("pyperclip")
        self._pyautogui.FAILSAFE = True
        self._pyautogui.PAUSE = 0.05

    def screenshot(self, out_path: Path | None = None) -> tuple[bool, str, Path | None]:
        """画面キャプチャをファイルへ。out_path 省略時は tempfile。"""
        try:
            img = self._pyautogui.screenshot()
            if out_path is None:
                fd, name = tempfile.mkstemp(suffix=".png", prefix="tenmon_mac_ss_")
                os.close(fd)
                out_path = Path(name)
            out_path = Path(out_path)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(str(out_path))
            return True, "ok", out_path
        except Exception as e:
            return False, str(e), None

    def click_center(self) -> tuple[bool, str]:
        """画面中央付近をクリック（座標は実行時に算出、ソース固定座標禁止のため）。"""
        try:
            w, h = self._pyautogui.size()
            x, y = max(1, w // 2), max(1, h // 2)
            self._pyautogui.click(x, y)
            return True, f"click_at_derived_center:{x},{y}"
        except Exception as e:
            return False, str(e)

    def type_text(self, text: str) -> tuple[bool, str]:
        try:
            self._pyautogui.typewrite(text, interval=0.02)
            return True, "ok"
        except Exception as e:
            return False, str(e)

    def paste_text(self, text: str) -> tuple[bool, str]:
        try:
            self._pyperclip.copy(text)
            self._pyautogui.hotkey("command", "v")
            time.sleep(0.1)
            return True, "ok"
        except Exception as e:
            return False, str(e)

    def open_browser(self, url: str = "about:blank") -> tuple[bool, str]:
        try:
            subprocess.run(
                ["open", "-a", "Google Chrome", url],
                check=False,
                capture_output=True,
                text=True,
                timeout=30,
            )
            return True, "open_chrome"
        except Exception as e:
            return False, str(e)

    def open_cursor(self) -> tuple[bool, str]:
        try:
            subprocess.run(
                ["open", "-a", "Cursor"],
                check=False,
                capture_output=True,
                text=True,
                timeout=30,
            )
            return True, "open_cursor"
        except Exception as e:
            return False, str(e)


def screencapture_cli(out_path: Path) -> tuple[bool, str]:
    """macOS screencapture -x（Py 以外の経路確認用）。"""
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        p = subprocess.run(
            ["screencapture", "-x", str(out_path)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        if p.returncode != 0:
            return False, (p.stderr or p.stdout or "screencapture_failed")[:400]
        return True, "ok"
    except Exception as e:
        return False, str(e)
