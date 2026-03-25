#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mac エージェント向け manifest（エンドポイント・環境変数・骨格手順）。"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from remote_cursor_common_v1 import CARD, VERSION, api_automation, utc_now_iso


def main() -> int:
    ap = argparse.ArgumentParser(description="remote_cursor_mac_manifest_v1")
    ap.add_argument("--base-url", type=str, default="", help="既定: env TENMON_REMOTE_CURSOR_BASE_URL or http://127.0.0.1:3000")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    base = (args.base_url or os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")
    auto = api_automation()
    out = Path(args.out) if args.out else auto / "remote_cursor_mac_agent_manifest.json"

    body = {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "executor_mode": "cursor_cli_primary",
        "role": "mac_cursor_agent_skeleton",
        "base_url": base,
        "auth": {
            "header": "X-Founder-Key",
            "env": ["FOUNDER_KEY", "TENMON_REMOTE_CURSOR_FOUNDER_KEY"],
            "cookie_alternate": "tenmon_founder=1 (dashboard browser)",
        },
        "endpoints": {
            "pull_next": {"method": "GET", "path": "/api/admin/cursor/next", "query": {"dry_run_only": "0|1"}},
            "submit_result": {"method": "POST", "path": "/api/admin/cursor/result"},
            "queue": {"method": "GET", "path": "/api/admin/cursor/queue"},
            "release_lease": {"method": "POST", "path": "/api/admin/cursor/release"},
        },
        "result_ingest_schema": {
            "queue_id": "string (required)",
            "touched_files": "string[]",
            "build_rc": "number | null",
            "acceptance_ok": "boolean | null",
            "next_card": "string | null",
            "dry_run": "boolean",
            "log_snippet": "string (optional)",
        },
        "shell_scripts": {
            "agent": "api/scripts/remote_cursor_agent_mac_v1.sh",
            "submit": "api/scripts/remote_cursor_submit_v1.sh",
        },
        "notes": [
            "pull で state は ready → delivered（リース付き）",
            "結果 POST で成功時 executed / 失敗時 ready にロールバック",
        ],
    }
    out.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps({"ok": True, "path": str(out)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
