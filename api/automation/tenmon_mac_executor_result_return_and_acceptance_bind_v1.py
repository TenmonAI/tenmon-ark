#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_MAC_EXECUTOR_RESULT_RETURN_AND_ACCEPTANCE_BIND_CURSOR_AUTO_V1 — POST /api/admin/cursor/result (current-run 証跡)."""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_EXECUTOR_RESULT_RETURN_AND_ACCEPTANCE_BIND_CURSOR_AUTO_V1"


def post_json(url: str, token: str, body: dict[str, Any], timeout: int = 120) -> tuple[int, dict[str, Any] | None, str]:
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(raw), raw
            except json.JSONDecodeError:
                return resp.status, None, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw), raw
        except json.JSONDecodeError:
            return e.code, None, raw


def main() -> int:
    ap = argparse.ArgumentParser(description="POST Mac executor result to TENMON-ARK API")
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo"))
    ap.add_argument(
        "--payload",
        type=Path,
        help="JSON file (default: stdin JSON object)",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root).resolve()
    scripts = repo / "api" / "scripts"

    base = (os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")
    token = (os.environ.get("TENMON_EXECUTOR_BEARER_TOKEN") or os.environ.get("TENMON_FOUNDER_EXECUTOR_BEARER") or "").strip()
    if not token:
        print("error: set TENMON_EXECUTOR_BEARER_TOKEN or TENMON_FOUNDER_EXECUTOR_BEARER", file=sys.stderr)
        return 2

    if args.payload:
        body = json.loads(args.payload.read_text(encoding="utf-8"))
    else:
        body = json.load(sys.stdin)
    if not isinstance(body, dict):
        print("error: payload must be a JSON object", file=sys.stderr)
        return 2

    url = f"{base}/api/admin/cursor/result"
    code, parsed, raw = post_json(url, token, body)
    out = {
        "card": CARD,
        "http_status": code,
        "response": parsed if parsed is not None else {"raw": raw[:8000]},
    }
    summary_path = repo / "api" / "automation" / "tenmon_mac_executor_result_return_summary.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))

    if os.environ.get("TENMON_RUN_REJUDGE_AFTER_RESULT") == "1":
        rj = scripts / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
        if rj.is_file():
            subprocess.run(["/usr/bin/env", "bash", str(rj)], cwd=str(repo), check=False)

    if not isinstance(parsed, dict):
        return 1
    return 0 if code < 400 and parsed.get("ok") is True else 1


if __name__ == "__main__":
    raise SystemExit(main())
