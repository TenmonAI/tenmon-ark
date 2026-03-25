#!/usr/bin/env bash
# TENMON_REMOTE_BUILD_RESULT — Mac 側: build / diff / log を束ねて bundle JSON を stdout に出力
# Usage: mac_result_packager_v1.sh <REPO_ROOT> <JOB_ID> [CURSOR_SESSION_LOG]
# 任意環境変数: BUILD_LOG_PATH（既存ログを tail） MAX_DIFF_CHARS（既定 60000）
set -euo pipefail
ROOT="${1:?repo root}"
JOB_ID="${2:?job id}"
SESSION_LOG="${3:-}"
export RB_REPO_ROOT="$ROOT"
export RB_JOB_ID="$JOB_ID"
export RB_SESSION_LOG="$SESSION_LOG"
export RB_BUILD_LOG_PATH="${BUILD_LOG_PATH:-}"
export RB_MAX_DIFF="${MAX_DIFF_CHARS:-60000}"

python3 - <<'PY'
from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

root = Path(os.environ["RB_REPO_ROOT"]).resolve()
job = os.environ["RB_JOB_ID"]
sess = os.environ.get("RB_SESSION_LOG") or ""
blog = os.environ.get("RB_BUILD_LOG_PATH") or ""
max_d = int(os.environ.get("RB_MAX_DIFF", "60000"))

def utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

build: dict = {}
if blog and Path(blog).is_file():
    build["log_path"] = str(Path(blog).resolve())
    build["log_tail"] = Path(blog).read_text(encoding="utf-8", errors="replace")[-8000:]
    # exit code 不明のときは null
    build["ok"] = None

diff_stat = ""
patch_tail = ""
git_dir = root / ".git"
if git_dir.exists():
    try:
        diff_stat = subprocess.run(
            ["git", "-C", str(root), "diff", "--stat"],
            capture_output=True,
            text=True,
            timeout=60,
        ).stdout[:8000]
    except Exception:
        pass
    try:
        p = subprocess.run(
            ["git", "-C", str(root), "diff"],
            capture_output=True,
            text=True,
            timeout=120,
        ).stdout
        patch_tail = p[:max_d]
    except Exception:
        pass

cur_tail = ""
if sess:
    sp = Path(sess)
    if sp.is_file():
        cur_tail = sp.read_text(encoding="utf-8", errors="replace")[-12000:]

acc_pass = None
if build.get("ok") is True:
    acc_pass = True
elif build.get("ok") is False:
    acc_pass = False

bundle = {
    "version": 1,
    "card": "TENMON_REMOTE_BUILD_RESULT_COLLECTOR_V1",
    "job_id": job,
    "collected_at": utc(),
    "hostname": __import__("socket").gethostname(),
    "build": build or {"note": "no BUILD_LOG_PATH; set env or run npm run build and point log"},
    "diff": {
        "stat": diff_stat,
        "patch_tail": patch_tail,
        "unified_diff_chars": len(patch_tail),
    },
    "acceptance": {
        "summary": "heuristic from build.ok only",
        "checks": [
            {"name": "build_log_present", "passed": bool(blog), "detail": blog or "(none)"},
        ],
        "passed": acc_pass,
    },
    "logs": {"cursor_session_log_tail": cur_tail},
    "artifacts": [],
}
print(json.dumps(bundle, ensure_ascii=False, indent=2))
PY
