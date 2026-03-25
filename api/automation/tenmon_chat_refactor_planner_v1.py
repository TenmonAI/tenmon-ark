#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
後方互換: `chat_refactor_planner_v1.py` へ委譲（--observation-json → --architecture-report）。
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).resolve().parent))
import chat_refactor_planner_v1 as crp  # noqa: E402


def plan_from_observation(obs: Dict[str, Any]) -> Dict[str, Any]:
    return crp.build_plan(obs, [], [])


def main() -> int:
    args = sys.argv[1:]
    mapped: list[str] = []
    i = 0
    while i < len(args):
        if args[i] == "--observation-json" and i + 1 < len(args):
            mapped.extend(["--architecture-report", args[i + 1]])
            i += 2
        else:
            mapped.append(args[i])
            i += 1
    return crp.main(mapped if mapped else None)


if __name__ == "__main__":
    raise SystemExit(main())
