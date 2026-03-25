#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""failure_forensics_bundle.json — audit / systemctl / journal / git / ss 採取（失敗時）"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

CARD = "TENMON_VPS_ACCEPTANCE_OS_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _sh(cmd: List[str], cwd: Path | None = None, timeout: float = 25.0) -> Dict[str, Any]:
    try:
        p = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "cmd": cmd,
            "rc": p.returncode,
            "stdout": (p.stdout or "")[-24000:],
            "stderr": (p.stderr or "")[-8000:],
        }
    except Exception as e:
        return {"cmd": cmd, "error": str(e)}


def collect(repo_root: Path, base_url: str, unit: str) -> Dict[str, Any]:
    api = repo_root / "api"
    bundle: Dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "generatedAt": _utc(),
        "audit_probe": _sh(
            ["curl", "-fsS", "--max-time", "12", f"{base_url.rstrip('/')}/api/audit"]
        ),
        "health_probe": _sh(
            ["curl", "-fsS", "--max-time", "8", f"{base_url.rstrip('/')}/health"]
        ),
        "systemctl_status": _sh(["systemctl", "status", unit, "--no-pager", "-l"]),
        "systemctl_show": _sh(["systemctl", "show", unit, "-p", "ActiveState,SubState,MainPID,ExecMainStatus"]),
        "journal_tail": _sh(
            ["journalctl", "-u", unit, "-n", "120", "--no-pager"]
        ),
        "git_status": _sh(["git", "status", "-sb"], cwd=repo_root),
        "git_log": _sh(["git", "log", "-5", "--oneline"], cwd=repo_root),
        "ss_listen": _sh(["ss", "-tlnp"]),
    }
    return bundle


def main() -> int:
    ap = argparse.ArgumentParser(description="failure_forensics_collector_v1")
    ap.add_argument("--out", type=str, required=True)
    ap.add_argument("--repo-root", type=str, default="")
    ap.add_argument("--base-url", type=str, default=os.environ.get("CHAT_TS_PROBE_BASE_URL", "http://127.0.0.1:3000"))
    ap.add_argument("--systemd-unit", type=str, default=os.environ.get("TENMON_VPS_ACCEPTANCE_UNIT", "tenmon-ark-api.service"))
    args = ap.parse_args()
    root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parents[2]
    body = collect(root, args.base_url, args.systemd_unit)
    Path(args.out).write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "path": args.out}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
