#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""司令塔シール: job normalizer → guard → ingest 契約 → Mac manifest → VPS bundle。"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

from remote_cursor_common_v1 import CARD, FAIL_NEXT, VPS_CARD, VERSION, api_automation, read_json, utc_now_iso


def _ensure_bundle_schema(auto: Path) -> None:
    p = auto / "remote_cursor_result_bundle.json"
    if p.is_file():
        return
    body = {
        "version": VERSION,
        "card": CARD,
        "updatedAt": utc_now_iso(),
        "entries": [],
        "ingest_schema": {
            "schema_version": 1,
            "fields": ["touched_files", "build_result", "acceptance_result", "next_card"],
        },
    }
    p.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _mirror_bundle(auto: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for fn in (
        "remote_cursor_queue.json",
        "remote_cursor_guard_report.json",
        "remote_cursor_result_bundle.json",
        "remote_cursor_command_center_seal.json",
        "remote_cursor_mac_agent_manifest.json",
    ):
        src = auto / fn
        if src.is_file():
            shutil.copy2(src, dest / fn)
    marker = read_json(auto / "remote_cursor_command_center_seal.json")
    ok = bool(marker.get("overall_ok"))
    (dest / VPS_CARD).write_text(f"{VPS_CARD}\n{utc_now_iso()}\noverall_ok={ok}\n", encoding="utf-8")


def _norm_state(s: str) -> str:
    if s == "in_progress":
        return "delivered"
    if s == "done":
        return "executed"
    return s


def _queue_summary(items: List[Dict[str, Any]]) -> Dict[str, int]:
    keys = ("approval_required", "ready", "rejected", "delivered", "executed")
    out = {k: 0 for k in keys}
    for x in items:
        st = _norm_state(str(x.get("state") or ""))
        if st in out:
            out[st] += 1
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="remote_cursor_command_center_v1")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--out-dir",
        type=str,
        default="",
        help="VPS bundle 複製先（既定: api/automation/out/tenmon_remote_cursor_command_center_v1）",
    )
    args = ap.parse_args()

    auto = api_automation()
    subprocess.run([sys.executable, str(auto / "remote_cursor_job_normalizer_v1.py")], cwd=str(auto), check=False)
    subprocess.run([sys.executable, str(auto / "remote_cursor_queue_guard_v1.py")], cwd=str(auto), check=False)
    subprocess.run([sys.executable, str(auto / "remote_cursor_mac_manifest_v1.py")], cwd=str(auto), check=False)
    _ensure_bundle_schema(auto)

    q = read_json(auto / "remote_cursor_queue.json")
    g = read_json(auto / "remote_cursor_guard_report.json")
    b = read_json(auto / "remote_cursor_result_bundle.json")

    items = q.get("items") or []
    summary = _queue_summary(items)
    flagged = len(g.get("flagged") or [])
    entries = len(b.get("entries") or [])

    q_ok = isinstance(q.get("version"), int) and isinstance(q.get("items"), list)
    b_ok = isinstance(b.get("version"), int) and isinstance(b.get("entries"), list)
    g_ok = flagged == 0

    # 司令塔 seal: approval パイプライン（キュー）+ ingest（バンドル）+ guard（flagged なし）
    overall_ok = bool(q_ok and b_ok and g_ok)

    seal: Dict[str, Any] = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "vps_card": VPS_CARD,
        "fail_next_cursor_card": FAIL_NEXT,
        "overall_ok": overall_ok,
        "conditions": {
            "queue_contract_ok": q_ok,
            "result_bundle_contract_ok": b_ok,
            "guard_clean": g_ok,
        },
        "queue_summary": summary,
        "guard_flagged_count": flagged,
        "result_bundle_entries": entries,
        "inputs": {
            "remote_cursor_queue": str(auto / "remote_cursor_queue.json"),
            "remote_cursor_guard_report": str(auto / "remote_cursor_guard_report.json"),
            "remote_cursor_result_bundle": str(auto / "remote_cursor_result_bundle.json"),
            "remote_cursor_mac_agent_manifest": str(auto / "remote_cursor_mac_agent_manifest.json"),
        },
        "notes": "guard flagged あり、または queue/bundle 契約破壊で overall_ok=false",
    }

    (auto / "remote_cursor_command_center_seal.json").write_text(
        json.dumps(seal, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (auto / "TENMON_REMOTE_CURSOR_COMMAND_CENTER_VPS_V1").write_text(
        f"{VPS_CARD}\n{utc_now_iso()}\noverall_ok={overall_ok}\n",
        encoding="utf-8",
    )

    out_bundle = (
        Path(args.out_dir).resolve()
        if (args.out_dir or "").strip()
        else (auto / "out" / "tenmon_remote_cursor_command_center_v1")
    )
    _mirror_bundle(auto, out_bundle)

    if args.stdout_json:
        print(
            json.dumps(
                {"ok": True, "overall_ok": overall_ok, "vps_bundle_dir": str(out_bundle)},
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
