#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cursor 自動構築ブリッジ — v2 モジュールを一括実行し成果物を api/automation に集約"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

from cursor_autobuild_common_v2 import (
    CARD,
    FAIL_NEXT,
    REQUIRED_CARD_FIELDS,
    VPS_CARD,
    VERSION,
    api_automation,
    gen_apply_dir,
    utc_now_iso,
)


def _run(mod: str, args: List[str]) -> int:
    py = api_automation() / mod
    return subprocess.run([sys.executable, str(py)] + args, check=False).returncode


def _validate_card_md(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        return {"ok": False, "missing_file": str(path)}
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [f for f in REQUIRED_CARD_FIELDS if f not in text]
    return {"ok": len(missing) == 0, "missing_fields": missing, "path": str(path)}


def main() -> int:
    ap = argparse.ArgumentParser(description="cursor_executor_bridge_v2")
    ap.add_argument("--skip-subprocess", action="store_true", help="内蔵 write のみ（デバッグ）")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()
    ga = gen_apply_dir()
    card_md = ga / "TENMON_CURSOR_AUTOBUILD_BRIDGE_CURSOR_AUTO_V1.md"
    validation = _validate_card_md(card_md)

    if not args.skip_subprocess:
        _run("cursor_card_schema_v2.py", [])
        _run("multi_card_campaign_runner_v2.py", [])
        _run("result_collector_v2.py", ["--status", "pass", "--out", str(auto / "cursor_result_bundle.json")])
        _run(
            "retry_generator_v2.py",
            ["--result-bundle", str(auto / "cursor_result_bundle.json"), "--out", str(auto / "cursor_retry_queue.json")],
        )
        _run("next_card_generator_v2.py", [])
        _run("cursor_acceptance_connector_v2.py", [])

    marker = auto / "TENMON_CURSOR_AUTOBUILD_BRIDGE_VPS_V1"
    marker.write_text(f"{VPS_CARD}\n{utc_now_iso()}\n", encoding="utf-8")

    report: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "card_md_validation": validation,
        "artifacts": {
            "cursor_card_schema_v2": str(auto / "cursor_card_schema_v2.json"),
            "cursor_campaign_manifest": str(auto / "cursor_campaign_manifest.json"),
            "cursor_result_bundle": str(auto / "cursor_result_bundle.json"),
            "cursor_retry_queue": str(auto / "cursor_retry_queue.json"),
            "cursor_ready_next_cards_v2": str(auto / "cursor_ready_next_cards_v2.json"),
            "cursor_acceptance_manifest_v2": str(auto / "cursor_acceptance_manifest_v2.json"),
        },
    }
    (auto / "cursor_autobuild_bridge_report_v2.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if args.stdout_json:
        print(json.dumps({"ok": True, "validation": validation}, ensure_ascii=False, indent=2))
    return 0 if validation.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
