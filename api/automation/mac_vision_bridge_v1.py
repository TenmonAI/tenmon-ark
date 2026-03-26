#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_VISION_BRIDGE_CURSOR_AUTO_V1（補助）

Mac の display キャプチャを PNG に保存する薄いブリッジ。browser / vision-assisted 層専用。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_VISION_BRIDGE_CURSOR_AUTO_V1"


def capture_display_png(evidence_dir: Path, *, tag: str = "display") -> tuple[Path | None, str]:
    """`screencapture -x` で全画面 PNG。非 Darwin は失敗。"""
    if sys.platform != "darwin":
        return None, "non_darwin"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    out = evidence_dir / f"{tag}_{int(time.time())}.png"
    try:
        cp = subprocess.run(
            ["screencapture", "-x", str(out)],
            capture_output=True,
            timeout=45,
            check=False,
        )
        if cp.returncode != 0:
            err = (cp.stderr or b"").decode("utf-8", errors="replace").strip()
            return None, err or "screencapture_nonzero"
        if not out.is_file() or out.stat().st_size <= 0:
            return None, "screenshot_empty"
        return out, "ok"
    except Exception as e:
        return None, f"screencapture_failed:{e}"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--tag", type=str, default="display")
    args = ap.parse_args()
    p, why = capture_display_png(args.out_dir.expanduser().resolve(), tag=args.tag or "display")
    line = json.dumps(
        {"ok": p is not None, "card": CARD, "path": str(p) if p else None, "reason": why},
        ensure_ascii=False,
    )
    print(line)
    return 0 if p is not None else 1


if __name__ == "__main__":
    raise SystemExit(main())
