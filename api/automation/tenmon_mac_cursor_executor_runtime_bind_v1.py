#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1 — VPS側 dry bind + manifest 整合（実ジョブは走らせない）。"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1"
# 正式 transport は 1 本に固定（docs / state 用）
EXECUTOR_MODE = "cursor_cli_primary"
POLL_INTERVAL_SEC = 30


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    d = default or {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else d
    except Exception:
        return d


def write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="tenmon_mac_cursor_executor_runtime_bind_v1")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    auto = repo / "api" / "automation"
    scripts = repo / "api" / "scripts"

    api_base = (os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")

    queue_path = auto / "remote_cursor_queue.json"
    bundle_path = auto / "remote_cursor_result_bundle.json"
    manifest_path = auto / "remote_cursor_mac_agent_manifest.json"
    agent_sh = scripts / "remote_cursor_agent_mac_v1.sh"

    queue_ok = queue_path.is_file()
    queue = read_json(queue_path) if queue_ok else {}
    queue_watch_ready = queue_ok and isinstance(queue.get("items"), list)

    bundle_ok = bundle_path.is_file()
    if not bundle_ok:
        write_json(bundle_path, {"version": 1, "card": "TENMON_REMOTE_CURSOR", "updatedAt": utc(), "entries": []})
        bundle_ok = True
    result_return_ready = bundle_ok

    manifest_ok = manifest_path.is_file()
    if not manifest_ok:
        # manifest 未生成なら骨格を書く（Mac は別途 pull）
        body = {
            "card": CARD,
            "generatedAt": utc(),
            "executor_mode": EXECUTOR_MODE,
            "base_url": api_base,
            "endpoints": {
                "pull_next": {"method": "GET", "path": "/api/admin/cursor/next"},
                "submit_result": {"method": "POST", "path": "/api/admin/cursor/result"},
                "queue": {"method": "GET", "path": "/api/admin/cursor/queue"},
            },
            "transport_notes": "primary: Cursor CLI / Agent; fallback GUI stub only if explicitly unsupported",
        }
        write_json(manifest_path, body)
        manifest_ok = True

    m = read_json(manifest_path)
    endpoints = m.get("endpoints") or {}
    admin_route_presence = bool(
        isinstance(endpoints.get("pull_next"), dict)
        and str(endpoints.get("pull_next", {}).get("path") or "").startswith("/api/admin/cursor/")
        and isinstance(endpoints.get("submit_result"), dict)
        and "/result" in str(endpoints.get("submit_result", {}).get("path") or "")
    )

    transport_ambiguous = False
    watch_sh_ok = agent_sh.is_file()

    current_run_bind_ok = (
        queue_watch_ready
        and result_return_ready
        and admin_route_presence
        and watch_sh_ok
        and str(m.get("executor_mode") or EXECUTOR_MODE) == EXECUTOR_MODE
    )

    out = {
        "card": CARD,
        "generated_at": utc(),
        "executor_mode": EXECUTOR_MODE,
        "poll_interval_sec": POLL_INTERVAL_SEC,
        "api_base": api_base,
        "admin_route_presence": admin_route_presence,
        "queue_watch_ready": queue_watch_ready,
        "result_return_ready": result_return_ready,
        "current_run_bind_ok": current_run_bind_ok,
        "transport_ambiguous": transport_ambiguous,
        "manifest_path": str(manifest_path),
        "queue_path": str(queue_path),
        "agent_script_present": watch_sh_ok,
        "dry_bind_only": True,
    }

    summary_path = auto / "tenmon_mac_cursor_executor_runtime_bind_summary.json"
    report_path = auto / "tenmon_mac_cursor_executor_runtime_bind_report.md"
    write_json(summary_path, out)
    report_path.write_text(
        "\n".join(
            [
                f"# {CARD}",
                "",
                f"- executor_mode: `{EXECUTOR_MODE}`",
                f"- queue_watch_ready: `{queue_watch_ready}`",
                f"- result_return_ready: `{result_return_ready}`",
                f"- current_run_bind_ok: `{current_run_bind_ok}`",
                f"- transport_ambiguous: `{transport_ambiguous}`",
                "",
                "Dry bind のみ。実ジョブは実行しない。",
                "",
            ]
        ),
        encoding="utf-8",
    )

    pass_bind = (
        out["executor_mode"] == EXECUTOR_MODE
        and queue_watch_ready
        and result_return_ready
        and current_run_bind_ok
        and not transport_ambiguous
    )
    return 0 if pass_bind else 1


if __name__ == "__main__":
    raise SystemExit(main())
