#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
後方互換: `chat_architecture_observer_v1.py` への薄いラッパー。
新規作業は chat_architecture_observer_v1 を直接使用すること。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

# 同ディレクトリ
sys.path.insert(0, str(Path(__file__).resolve().parent))
import chat_architecture_observer_v1 as cao  # noqa: E402


def sample_observation() -> dict:
    return cao.sample_report()


def observe_file(chat_path: Path) -> dict:
    return cao.build_architecture_report(Path(chat_path))


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON_CHAT_ARCHITECTURE_OBSERVER_V1 (wrapper)")
    ap.add_argument("--chat-path", default="")
    ap.add_argument("--out-json", default="")
    ap.add_argument("--out-dir", default="")
    ap.add_argument("--sample", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    if args.sample:
        report = cao.sample_report()
    else:
        root = cao._repo_root()
        chat = Path(args.chat_path).resolve() if args.chat_path else cao._default_chat_path()
        report = cao.build_architecture_report(chat, root)

    if args.out_dir:
        cao.write_split_outputs(Path(args.out_dir), report)
    if args.out_json:
        p = Path(args.out_json)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not report.get("error") else 1


if __name__ == "__main__":
    raise SystemExit(main())
