#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_EXECUTOR_REFRESHABLE_AUTH_RUNTIME — Mac 専用: refresh で access を更新し state ファイルに保存。
初回の access + refresh は founder ブラウザセッションで POST .../executor-token?include_refresh=1 から取得し、
このスクリプトが読む JSON に書き込む（秘密は Mac ローカルのみ）。
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_EXECUTOR_AUTH_REFRESH_V1"


def default_state_path() -> Path:
    home = Path.home()
    d = home / "tenmon-mac"
    return d / "executor_auth.json"


def post_refresh(base: str, refresh_token: str, timeout: int = 60) -> tuple[int, dict[str, Any] | None]:
    url = f"{base.rstrip('/')}/api/admin/founder/executor-token/refresh"
    body = json.dumps({"refresh_token": refresh_token}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, None


def main() -> int:
    ap = argparse.ArgumentParser(description="Refresh founder executor access token (Mac local state)")
    ap.add_argument(
        "--state-file",
        type=Path,
        default=None,
        help=f"JSON with token, refresh_token, exp (default: {default_state_path()})",
    )
    ap.add_argument("--skew-sec", type=int, default=120, help="refresh if access exp within this many seconds")
    ap.add_argument("--print-token", action="store_true", help="print access token to stdout (for scripts)")
    args = ap.parse_args()

    if args.state_file:
        state_path = args.state_file.expanduser()
    else:
        env_p = os.environ.get("TENMON_MAC_EXECUTOR_AUTH_STATE", "").strip()
        state_path = Path(env_p).expanduser() if env_p else default_state_path()

    base = (os.environ.get("TENMON_REMOTE_CURSOR_BASE_URL") or "http://127.0.0.1:3000").rstrip("/")

    if not state_path.is_file():
        print(f"error: state file missing: {state_path}", file=sys.stderr)
        print("hint: founder browser → POST /api/admin/founder/executor-token?include_refresh=1 → save JSON", file=sys.stderr)
        return 2

    st = json.loads(state_path.read_text(encoding="utf-8"))
    if not isinstance(st, dict):
        print("error: state must be a JSON object", file=sys.stderr)
        return 2

    refresh_token = str(st.get("refresh_token") or "").strip()
    if not refresh_token:
        print("error: refresh_token missing in state file", file=sys.stderr)
        return 2

    now = int(time.time())
    exp = st.get("exp")
    exp_i = int(exp) if isinstance(exp, (int, float)) and not isinstance(exp, bool) else 0
    token = str(st.get("token") or "").strip()

    need_refresh = not token or exp_i <= now + max(0, args.skew_sec)

    if need_refresh:
        code, parsed = post_refresh(base, refresh_token)
        if code >= 400 or not isinstance(parsed, dict) or not parsed.get("ok"):
            print(f"error: refresh failed http={code} body={parsed}", file=sys.stderr)
            return 1
        token = str(parsed.get("token") or "").strip()
        exp_i = int(parsed.get("exp") or 0)
        if not token or not exp_i:
            print("error: refresh response missing token/exp", file=sys.stderr)
            return 1
        st["token"] = token
        st["exp"] = exp_i
        if parsed.get("refresh_token"):
            st["refresh_token"] = str(parsed["refresh_token"]).strip()
        if parsed.get("refresh_expires_at"):
            st["refresh_expires_at"] = parsed["refresh_expires_at"]
        st["card"] = CARD
        st["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.print_token:
        print(token)
    else:
        print(json.dumps({"ok": True, "exp": exp_i, "state_file": str(state_path)}, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
