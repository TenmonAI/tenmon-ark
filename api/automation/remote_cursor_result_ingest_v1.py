#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
結果 JSON をマージ（ファイルまたは stdin）。API POST の代替・オフライン用。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

from remote_cursor_common_v1 import (
    CARD,
    VERSION,
    api_automation,
    read_json,
    utc_now_iso,
    validate_real_result_ingest_payload,
)


ALLOWED_REAL_STATUSES = {"started", "executor_failed", "completed_no_diff", "build_ok", "acceptance_ok"}


def normalize_entry_v1(entry: Dict[str, Any]) -> Dict[str, Any]:
    e = dict(entry)
    status = str(e.get("status") or "").strip()
    dry_run = bool(e.get("dry_run") is True)
    touched_files = e.get("touched_files")
    if not isinstance(touched_files, list):
        touched_files = []
    e["touched_files"] = [str(x) for x in touched_files if str(x).strip()]

    if dry_run:
        if not status:
            status = "dry_run_started"
    else:
        if status == "dry_run_started":
            status = "started"
        if status not in ALLOWED_REAL_STATUSES:
            status = "executor_failed" if status == "failed" else (status or "started")
        if not e["touched_files"] and status in {"started", "build_ok", "acceptance_ok"}:
            status = "completed_no_diff"
        if status == "completed_no_diff" and not str(e.get("no_diff_reason") or "").strip():
            e["no_diff_reason"] = "executor_opened_but_no_change"

    e["status"] = status
    if e.get("build_rc") is not None:
        try:
            e["build_rc"] = int(e["build_rc"])
        except (TypeError, ValueError):
            pass
    ao = e.get("acceptance_ok")
    if ao is not None:
        e["acceptance_ok"] = bool(ao)
    e.setdefault("build_result", {"rc": e.get("build_rc")})
    e.setdefault("acceptance_result", {"ok": e.get("acceptance_ok")})
    e.setdefault("log_path", "")
    e.setdefault("dangerous_patch_block_report", "")
    return e


def main() -> int:
    ap = argparse.ArgumentParser(description="remote_cursor_result_ingest_v1")
    ap.add_argument("--from-file", type=str, default="", help="単一エントリ JSON")
    ap.add_argument("--bundle", type=str, default="")
    ap.add_argument(
        "--soft-exit-ok",
        action="store_true",
        help="検証・parse 失敗時も exit 0（監視スクリプト互換・ログのみ）",
    )
    ap.add_argument(
        "--require-queue-id",
        action="store_true",
        help="entry に queue_id が無い場合は ingest 拒否",
    )
    args = ap.parse_args()

    auto = api_automation()
    bpath = Path(args.bundle) if args.bundle else auto / "remote_cursor_result_bundle.json"

    raw = ""
    try:
        if args.from_file:
            raw = Path(args.from_file).read_text(encoding="utf-8", errors="replace")
        else:
            raw = sys.stdin.read()
        if not raw.strip():
            raise ValueError("empty_input")
        entry = json.loads(raw)
        if not isinstance(entry, dict):
            raise ValueError("entry_must_be_object")
        if entry.get("queue_id") is not None:
            entry["queue_id"] = str(entry.get("queue_id") or "").strip()
        if entry.get("id") is not None:
            entry["id"] = str(entry.get("id") or "").strip()
        if entry.get("run_id") is not None:
            entry["run_id"] = str(entry.get("run_id") or "").strip()
        if args.require_queue_id and not str(entry.get("queue_id") or entry.get("id") or "").strip():
            raise ValueError("queue_id_required")
        vok, vwhy = validate_real_result_ingest_payload(entry)
        if not vok:
            raise ValueError(vwhy)
    except Exception as e:
        msg = json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False)
        print(msg)
        return 0 if args.soft_exit_ok else 1

    try:
        bundle = read_json(bpath)
        if not bundle.get("entries"):
            bundle = {
                "version": VERSION,
                "card": CARD,
                "updatedAt": utc_now_iso(),
                "entries": [],
            }
        entries: List[Dict[str, Any]] = list(bundle.get("entries") or [])
        entry = normalize_entry_v1(entry)
        entry.setdefault("schema_version", 1)
        entry.setdefault("ingested_via", "remote_cursor_result_ingest_v1.py")
        entry.setdefault("ingested_at", utc_now_iso())
        entries.append(entry)
        bundle["entries"] = entries[-200:]
        bundle["updatedAt"] = utc_now_iso()
        bpath.parent.mkdir(parents=True, exist_ok=True)
        bpath.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"ok": True, "path": str(bpath), "entries": len(bundle["entries"])}, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"write_failed:{e}"}, ensure_ascii=False))
        return 0 if args.soft_exit_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
