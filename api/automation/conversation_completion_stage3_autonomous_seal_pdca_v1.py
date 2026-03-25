#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1

Thin launcher: `conversation_full_completion_pdca_autoloop_v1.py` を
--report-card TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1 で実行。
cwd 非依存（親モジュールが __file__ 基準で repo を解決）。
"""
from __future__ import annotations

import sys
from pathlib import Path

STAGE3_CARD = "TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1"


def main() -> int:
    here = Path(__file__).resolve().parent
    if str(here) not in sys.path:
        sys.path.insert(0, str(here))

    from conversation_full_completion_pdca_autoloop_v1 import main as base_main

    argv = list(sys.argv)
    if "--report-card" not in argv:
        argv.insert(1, "--report-card")
        argv.insert(2, STAGE3_CARD)
    sys.argv = argv
    return int(base_main())


if __name__ == "__main__":
    raise SystemExit(main())
