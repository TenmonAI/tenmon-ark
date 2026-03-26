#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1

自律運転の最終安全弁: stop / human override / fail-closed を sentinel と env で観測する。
成功の捏造はしない（ファイル存在と env の観測のみ）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_SAFE_STOP_HUMAN_OVERRIDE_AND_FAIL_CLOSED_CURSOR_AUTO_V1"
DEFAULT_STOP = "tenmon_autonomy_safe_stop.signal"
DEFAULT_OVERRIDE = "tenmon_autonomy_human_override.signal"
DEFAULT_FAIL_CLOSED = "tenmon_autonomy_fail_closed.signal"
NEXT_ON_PASS = "TENMON_FULL_AUTONOMY_OS_13PLUS4_MASTER_PARENT_CURSOR_AUTO_V1 の全束完了"
NEXT_ON_FAIL_NOTE = "停止。safe-stop retry 1枚のみ生成。"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _truthy_env(v: str) -> bool:
    return v.strip().lower() in ("1", "true", "yes", "on")


def resolve_paths(auto: Path) -> tuple[Path, Path, Path]:
    stop_p = Path(os.environ.get("TENMON_SAFE_STOP_FILE", str(auto / DEFAULT_STOP))).expanduser()
    over_p = Path(os.environ.get("TENMON_SAFE_OVERRIDE_FILE", str(auto / DEFAULT_OVERRIDE))).expanduser()
    fail_p = Path(os.environ.get("TENMON_FAIL_CLOSED_FILE", str(auto / DEFAULT_FAIL_CLOSED))).expanduser()
    return stop_p, over_p, fail_p


def evaluate_state(auto: Path | None = None) -> dict[str, Any]:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    a = auto if auto is not None else repo / "api" / "automation"
    stop_p, over_p, fail_p = resolve_paths(a)

    stop_requested = stop_p.is_file()
    override_requested = over_p.is_file()
    fail_closed = fail_p.is_file() or _truthy_env(os.environ.get("TENMON_FAIL_CLOSED", ""))

    # 自律ループが進めてよいか（human override 時は manual モード＝自律は止める）
    running = not stop_requested and not fail_closed and not override_requested

    if stop_requested:
        reason = "safe_stop_sentinel_present"
    elif override_requested:
        reason = "human_override_sentinel_present"
    elif fail_closed:
        reason = "fail_closed_active"
    else:
        reason = "autonomy_permitted"

    return {
        "card": CARD,
        "generated_at": utc(),
        "running": running,
        "stop_requested": stop_requested,
        "override_requested": override_requested,
        "fail_closed": fail_closed,
        "reason": reason,
        "paths": {
            "stop_file": str(stop_p),
            "override_file": str(over_p),
            "fail_closed_file": str(fail_p),
        },
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--exit-on-block",
        action="store_true",
        help="running が false なら exit 1（シェル・daemon 連携用）",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    out = evaluate_state(auto)
    line = json.dumps(
        {
            "ok": True,
            "running": out["running"],
            "stop_requested": out["stop_requested"],
            "override_requested": out["override_requested"],
            "fail_closed": out["fail_closed"],
            "reason": out["reason"],
        },
        ensure_ascii=False,
    )
    print(line)
    summary_path = auto / "safe_stop_human_override_summary.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.exit_on_block and not out["running"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
