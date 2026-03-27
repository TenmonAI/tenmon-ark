#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_6H_FINAL_FAILCLOSED_MASTER_CURSOR_AUTO_V1

6時間版ラッパー。preflight 後に 12h master エンジンを 6h 設定で実行する。
"""
from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_6H_FINAL_FAILCLOSED_MASTER_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_6h_final_failclosed_master_cursor_auto_v1.json"
RUN_DIR = "autonomy_6h_final_failclosed_master_v1"
ENGINE = "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.py"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _http_get(url: str, timeout: float = 12.0) -> dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip() else {}
            return {"ok_http": True, "status": int(getattr(r, "status", 200)), "json": js if isinstance(js, dict) else {}}
    except urllib.error.HTTPError as e:
        return {"ok_http": False, "status": int(e.code)}
    except Exception:
        return {"ok_http": False, "status": 0}


def _kill_stale_master_processes(api: Path) -> dict[str, Any]:
    patterns = (
        "tenmon_autonomy_12h_fully_autonomous_failclosed_master_cursor_auto_v1.py",
        "tenmon_autonomy_12h_failclosed_master_cursor_auto_v1.py",
    )
    killed: list[int] = []
    failed: list[int] = []
    try:
        p = subprocess.run(["ps", "-eo", "pid=,args="], capture_output=True, text=True, timeout=10)
        lines = (p.stdout or "").splitlines()
    except Exception:
        return {"ok": False, "error": "ps_failed", "killed": killed, "failed": failed}

    me = os.getpid()
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        parts = s.split(None, 1)
        if len(parts) < 2:
            continue
        try:
            pid = int(parts[0])
        except ValueError:
            continue
        args = parts[1]
        if pid == me:
            continue
        if not any(x in args for x in patterns):
            continue
        if str(api) not in args and "/opt/tenmon-ark-repo/api" not in args:
            continue
        try:
            os.kill(pid, signal.SIGTERM)
            killed.append(pid)
        except OSError:
            failed.append(pid)
    return {"ok": len(failed) == 0, "killed": killed, "failed": failed}


def _archive_stale_run_dirs(repo: Path, safe_root: Path) -> dict[str, Any]:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    archive_base = safe_root / "archive" / "autonomy_master_stale" / ts
    moved: list[str] = []
    errors: list[str] = []
    targets = [
        repo / "api" / "automation" / "autonomy_12h_fully_autonomous_failclosed_master_v1",
        repo / "api" / "automation" / "autonomy_12h_failclosed_master_v1",
    ]
    for src in targets:
        if not src.exists():
            continue
        try:
            archive_base.mkdir(parents=True, exist_ok=True)
            dst = archive_base / src.name
            if dst.exists():
                dst = archive_base / f"{src.name}_{int(time.time())}"
            shutil.move(str(src), str(dst))
            moved.append(str(dst))
        except Exception as e:
            errors.append(f"{src}:{e!r}")
    return {"ok": len(errors) == 0, "archive_base": str(archive_base), "moved": moved, "errors": errors}


def _preflight(repo: Path, api: Path, auto: Path, safe_root: Path) -> dict[str, Any]:
    checks: dict[str, Any] = {"card": CARD, "generated_at": _utc()}

    repo_s = str(repo.resolve())
    safe_s = str(safe_root.resolve())
    checks["summary_root_outside_repo"] = not (safe_s == repo_s or safe_s.startswith(repo_s + os.sep))
    if not checks["summary_root_outside_repo"]:
        return {"ok": False, "reason": "invalid_summary_root_inside_repo", "checks": checks}

    checks["killed_stale"] = _kill_stale_master_processes(api)
    if not checks["killed_stale"].get("ok"):
        return {"ok": False, "reason": "kill_stale_failed", "checks": checks}

    checks["archive"] = _archive_stale_run_dirs(repo, safe_root)
    if not checks["archive"].get("ok"):
        return {"ok": False, "reason": "archive_failed", "checks": checks}

    try:
        gs = subprocess.run(["git", "status", "--porcelain"], cwd=str(repo), capture_output=True, text=True, timeout=10)
        lines = [ln.rstrip("\n") for ln in (gs.stdout or "").splitlines() if ln.strip()]
    except Exception:
        return {"ok": False, "reason": "git_status_failed", "checks": checks}

    allow = (
        " api/automation/",
        "?? api/automation/",
        " M api/automation/",
        "A  api/automation/",
        "AM api/automation/",
        "MM api/automation/",
    )
    disallowed = [ln for ln in lines if not ln.startswith(allow)]
    checks["git_dirty_disallowed"] = disallowed[:50]
    if disallowed:
        fractal = _read_json(auto / "tenmon_fractal_truth_worldclass_seal_cursor_auto_v1.json")
        effective0 = bool(fractal.get("worktree_dirty_effective") == 0)
        checks["fractal_worktree_effective_zero"] = effective0
        if not effective0:
            return {"ok": False, "reason": "dirty_outside_automation", "checks": checks}

    base = (os.environ.get("TENMON_PDCA_BASE") or os.environ.get("TENMON_GATE_BASE") or "http://127.0.0.1:3000").rstrip("/")
    h = _http_get(f"{base}/api/health")
    ab = _http_get(f"{base}/api/audit.build")
    checks["runtime_gate"] = {"base": base, "health_status": h.get("status"), "audit_build_status": ab.get("status")}
    if not (h.get("ok_http") and ab.get("ok_http")):
        return {"ok": False, "reason": "health_or_audit_build_not_ready", "checks": checks}

    return {"ok": True, "checks": checks}


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", str(_repo_root()))).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    out_path = auto / OUT_JSON

    safe_root = Path(os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT", "/var/log/tenmon/autonomy_safe")).resolve()
    pre = _preflight(repo, api, auto, safe_root)
    if not pre.get("ok"):
        out = {
            "ok": False,
            "card": CARD,
            "preflight_ok": False,
            "reason": pre.get("reason"),
            "checks": pre.get("checks"),
            "rollback_used": False,
            "next_card_if_fail": "TENMON_AUTONOMY_6H_FINAL_FAILCLOSED_MASTER_RETRY_CURSOR_AUTO_V1",
            "generated_at": _utc(),
        }
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    target = auto / ENGINE
    if not target.is_file():
        out = {
            "ok": False,
            "card": CARD,
            "preflight_ok": True,
            "error": "missing_engine",
            "path": str(target),
            "generated_at": _utc(),
        }
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    env = os.environ.copy()
    env["TENMON_AUTONOMY_12H_CARD"] = CARD
    env["TENMON_AUTONOMY_12H_OUT_JSON"] = OUT_JSON
    env["TENMON_12H_RUN_DIR_NAME"] = RUN_DIR
    env["TENMON_PDCA_SKIP_PROBES"] = "0"
    env["TENMON_12H_CURSOR_OPERATOR_BRIDGE"] = "1"
    env["TENMON_CURSOR_OPERATOR_BRIDGE_EXECUTE"] = "1"
    env["TENMON_12H_CURSOR_OPERATOR_BRIDGE_APPLY"] = "1"
    env["TENMON_12H_MASTER_RESTART"] = "1"
    env["TENMON_12H_OK_REQUIRE_EXPANSION"] = "1"
    env["TENMON_12H_MASTER_MAX_LOOPS"] = "24"
    env["TENMON_12H_MASTER_MAX_SEC"] = "21600"
    env.pop("TENMON_12H_PILOT_MAX_LOOPS", None)

    rc = subprocess.run([sys.executable, str(target)], cwd=str(api), env=env).returncode
    # engine が最終 json を書く契約。念のため存在確認のみ。
    final = _read_json(out_path)
    if not final:
        out = {
            "ok": False,
            "card": CARD,
            "preflight_ok": True,
            "engine_exit_code": rc,
            "error": "engine_output_missing",
            "generated_at": _utc(),
        }
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
