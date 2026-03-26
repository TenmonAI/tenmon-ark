#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONTINUOUS_RUNTIME_HEALTH_RESCUE_CURSOR_AUTO_V1

runtime health を観測し、必要時に rescue 提案（または one-shot 実行）を1回だけ行う。
"""
from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

CARD = "TENMON_CONTINUOUS_RUNTIME_HEALTH_RESCUE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_continuous_runtime_health_rescue_summary.json"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else {}
    except Exception:
        return {}


def get(url: str) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(url, timeout=8.0) as r:
            code = int(getattr(r, "status", r.getcode()))
            _ = r.read(1000)
        return {"ok": 200 <= code < 300, "http_code": code}
    except urllib.error.HTTPError as e:
        return {"ok": False, "http_code": int(e.code)}
    except Exception as e:
        return {"ok": False, "http_code": None, "error": str(e)[:200]}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    base = os.environ.get("TENMON_FORENSIC_API_BASE", "http://127.0.0.1:3000").rstrip("/")
    one_shot_cmd = str(os.environ.get("TENMON_RESCUE_ONE_SHOT_CMD", "")).strip()

    lock = auto / ".tenmon_continuous_runtime_health_rescue_once.lock"
    already = lock.is_file()

    health = get(f"{base}/api/health")
    queue_guard = read_json(auto / "tenmon_continuous_queue_dedup_and_backpressure_summary.json")
    bind = read_json(auto / "tenmon_autonomy_result_bind_to_rejudge_and_acceptance_summary.json")

    failures: list[str] = []
    if not health.get("ok"):
        failures.append("api_health_not_ok")
    if queue_guard and queue_guard.get("enqueue_allowed") is False:
        failures.append("queue_backpressure_active")
    if bind and bind.get("bundle_seen") is not True:
        failures.append("bundle_seen_false")

    rescue_attempted = False
    rescue_executed = False
    rescue_cmd_result: dict[str, Any] = {"skip": True}
    if failures and not already:
        rescue_attempted = True
        lock.write_text(json.dumps({"card": CARD, "generated_at": utc(), "failures": failures}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if one_shot_cmd:
            cp = subprocess.run(["bash", "-lc", one_shot_cmd], cwd=str(repo / "api"), capture_output=True, text=True, timeout=1200, check=False)
            rescue_executed = cp.returncode == 0
            rescue_cmd_result = {
                "skip": False,
                "ok": rescue_executed,
                "exit_code": cp.returncode,
                "stdout_tail": (cp.stdout or "")[-2000:],
                "stderr_tail": (cp.stderr or "")[-2000:],
            }
        else:
            rescue_cmd_result = {"skip": True, "reason": "TENMON_RESCUE_ONE_SHOT_CMD_not_set"}

    out = {
        "card": CARD,
        "generated_at": utc(),
        "failures": failures,
        "already_rescued_once": already,
        "rescue_attempted": rescue_attempted,
        "rescue_executed": rescue_executed,
        "rescue_cmd_result": rescue_cmd_result,
        "rescue_lock_path": str(lock),
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "rescue_attempted": rescue_attempted, "rescue_executed": rescue_executed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

