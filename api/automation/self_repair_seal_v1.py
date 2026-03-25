#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""self_repair_seal.json — 自己修復フロー集約。完結フラグは厳格。"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict

from self_repair_common_v1 import CARD, FAIL_NEXT, VPS_CARD, VERSION, api_automation, utc_now_iso


def _read(p: Path) -> Dict[str, Any]:
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}


def _run(mod: str, extra: list[str] | None = None) -> None:
    py = api_automation() / mod
    subprocess.run([sys.executable, str(py)] + (extra or []), cwd=str(api_automation()), check=False)


def main() -> int:
    ap = argparse.ArgumentParser(description="self_repair_seal_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    auto = api_automation()

    # 入力（VPS acceptance 等）
    integrated = _read(auto / "integrated_acceptance_seal.json")

    _run("dangerous_patch_blocker_v1.py")
    _run("patch_diff_minimizer_v1.py")
    _run("fail_classifier_v1.py")
    _run("rollback_trigger_v1.py")
    _run("alternate_strategy_generator_v1.py")
    _run("retry_queue_orchestrator_v1.py")
    if os.environ.get("TENMON_SELF_REPAIR_SEAL_SKIP_ANTI_REGRESSION", "").strip() != "1":
        subprocess.run(
            [sys.executable, str(auto / "anti_regression_memory_v1.py"), "--from-classification", "--note", "self_repair_cycle"],
            cwd=str(auto),
            check=False,
        )

    fc = _read(auto / "fail_classification.json")
    rq = _read(auto / "retry_queue.json")
    alt = _read(auto / "alternate_strategy.json")
    mem = _read(auto / "anti_regression_memory.json")
    dpb = _read(auto / "dangerous_patch_blocker_report.json")

    # 厳格: 既定は false。VPS で fail→rollback→retry 完結を確認後にのみ TENMON_SELF_REPAIR_CYCLE_COMPLETE=1
    self_repair_complete = os.environ.get("TENMON_SELF_REPAIR_CYCLE_COMPLETE", "").strip() == "1"

    seal: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "self_repair_cycle_complete": self_repair_complete,
        "self_repair_complete": self_repair_complete,
        "conditions": {
            "strict": "fail→rollback→retry が完結したときのみ true",
            "set_env": "TENMON_SELF_REPAIR_CYCLE_COMPLETE=1",
        },
        "inputs": {
            "fail_classification": str(auto / "fail_classification.json"),
            "retry_queue": str(auto / "retry_queue.json"),
            "alternate_strategy": str(auto / "alternate_strategy.json"),
            "dangerous_patch_blocker": str(auto / "dangerous_patch_blocker_report.json"),
            "integrated_acceptance_seal": str(auto / "integrated_acceptance_seal.json"),
        },
        "summary": {
            "fail_types": fc.get("fail_types"),
            "dangerous_patch_blocked": dpb.get("blocked"),
            "retry_steps": len((rq.get("queue") or [])),
        },
    }

    (auto / "self_repair_seal.json").write_text(
        json.dumps(seal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )

    (auto / "TENMON_SELF_REPAIR_OS_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\nself_repair_complete={self_repair_complete}\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps({"ok": True, "self_repair_complete": self_repair_complete}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
