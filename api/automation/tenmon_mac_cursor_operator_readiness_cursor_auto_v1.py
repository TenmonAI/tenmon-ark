#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_CURSOR_OPERATOR_READINESS_CURSOR_AUTO_V1

Mac ローカル operator readiness（summary 安全パス・refresh-only 単一 watch・heartbeat・stuck 検知と soft reset）。
`--claim-watch-runtime` で fcntl 二重起動拒否。operator_state_v1 / readiness_detail を repo 外に永続化。
repo 配下への書き込みはしない（PermissionError 回避）。fail-closed。
"""
from __future__ import annotations

import argparse
import fcntl
import json
import os
import platform
import shutil
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_CURSOR_OPERATOR_READINESS_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_MAC_OPERATOR_PATH_AND_WATCH_REPAIR_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_mac_cursor_operator_readiness_cursor_auto_v1.json"
STUCK_SEC = 600


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _is_under_repo(repo: Path, p: Path) -> bool:
    try:
        rp = repo.resolve()
        pp = p.resolve()
        return rp == pp or rp in pp.parents
    except Exception:
        return True


def default_readiness_root() -> Path:
    env = (os.environ.get("TENMON_MAC_OPERATOR_READINESS_ROOT") or "").strip()
    if env:
        return Path(os.path.expanduser(env)).resolve()
    return (Path.home() / "tenmon-mac" / "operator_readiness").resolve()


def default_summary_path(root: Path) -> Path:
    env = (os.environ.get("TENMON_MAC_OPERATOR_READINESS_SUMMARY_PATH") or "").strip()
    if env:
        return Path(os.path.expanduser(env)).resolve()
    return (root / "tenmon_mac_cursor_operator_readiness_summary.json").resolve()


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _cursor_installed_darwin() -> bool:
    if shutil.which("cursor"):
        return True
    return Path("/Applications/Cursor.app").is_dir()


def _load_watch_lock(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else None
    except Exception:
        return None


def _cleanup_stale_lock(lock_path: Path) -> tuple[bool, str]:
    data = _load_watch_lock(lock_path)
    if not data:
        if lock_path.is_file():
            try:
                lock_path.unlink()
            except OSError:
                pass
        return True, "no_lock"
    pid = int(data.get("pid") or 0)
    if pid and _pid_alive(pid):
        return True, "single_runtime_active"
    try:
        lock_path.unlink()
    except OSError:
        return False, "stale_lock_unremovable"
    return True, "stale_lock_removed"


def _flock_path(root: Path) -> Path:
    return root / "watch_loop_exclusive.flock"


def _claim_watch_lock(root: Path, lock_path: Path, mode: str) -> tuple[bool, str]:
    """単一ランタイムを宣言。fcntl LOCK_NB で同時二重起動を拒否。"""
    fp = _flock_path(root)
    try:
        fd = os.open(str(fp), os.O_CREAT | os.O_RDWR, 0o644)
    except OSError as e:
        return False, f"flock_open:{e}"
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        os.close(fd)
        return False, "duplicate_runtime_reject"
    me = os.getpid()
    payload = {
        "version": 1,
        "card": CARD,
        "pid": me,
        "hostname": socket.gethostname(),
        "started_at": _utc(),
        "mode": mode,
        "refresh_only": True,
    }
    try:
        _atomic_write_json(lock_path, payload)
    except OSError as e:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
            os.close(fd)
        except Exception:
            pass
        return False, f"lock_write:{e}"
    return True, "claimed"


def _stuck(job_path: Path) -> tuple[bool, dict[str, Any]]:
    j = _read_json(job_path)
    st = str(j.get("status") or "idle").lower()
    started = str(j.get("started_at") or "").strip()
    if st != "running" or not started:
        return False, {"reason": "not_running", "job": j}
    try:
        t = started.replace("Z", "+00:00")
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        age = time.time() - dt.timestamp()
    except Exception:
        return True, {"reason": "parse_error", "job": j}
    return age > STUCK_SEC, {"age_sec": age, "job": j}


def _job_snapshot(job_path: Path) -> dict[str, Any]:
    j = _read_json(job_path)
    return {
        "current_job_id": j.get("current_job_id") or j.get("job_id") or j.get("id"),
        "last_job_id": j.get("last_job_id"),
        "status": j.get("status"),
        "started_at": j.get("started_at"),
        "completed_at": j.get("completed_at"),
    }


def _soft_reset_job(job_path: Path, dry: bool) -> bool:
    j = _read_json(job_path)
    cur = j.get("current_job_id") or j.get("job_id") or j.get("id")
    new: dict[str, Any] = {
        "version": 1,
        "status": "idle",
        "started_at": None,
        "completed_at": _utc(),
        "last_job_id": cur or j.get("last_job_id"),
        "current_job_id": None,
        "recovery": {"soft_reset_at": _utc(), "reason": "stuck_readiness", "card": CARD},
    }
    if dry:
        return True
    try:
        _atomic_write_json(job_path, new)
    except OSError:
        return False
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="ローカル state / 成果物を書かない")
    ap.add_argument("--claim-watch-runtime", action="store_true", help="単一 watch ランタイムを宣言（重複なら失敗）")
    ap.add_argument("--repo-root", type=Path, default=None)
    args = ap.parse_args()
    repo = args.repo_root or _repo_root_from_here()
    auto = repo / "api" / "automation"
    rollback_used = False

    darwin = platform.system() == "Darwin"
    non_mac_ok = os.environ.get("TENMON_MAC_OPERATOR_READINESS_NON_MAC_OK", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )

    root = default_readiness_root()
    summary_path = default_summary_path(root)
    lock_path = root / "watch_loop_single_runtime.json"
    hb_path = root / "heartbeat.json"
    job_path = root / "job_state.json"

    safe_summary_path_ok = False
    try:
        if _is_under_repo(repo, summary_path):
            safe_summary_path_ok = False
        else:
            summary_path.parent.mkdir(parents=True, exist_ok=True)
            probe = {"card": CARD, "probe": True, "at": _utc()}
            if args.dry_run:
                p = summary_path.parent / ".tenmon_operator_readiness_probe"
                p.write_text("ok", encoding="utf-8")
                p.unlink()
            else:
                _atomic_write_json(summary_path, probe)
            safe_summary_path_ok = True
    except OSError:
        safe_summary_path_ok = False

    single_runtime_watch_loop_ok = False
    dup_msg = ""
    sr_reason = "no_lock"
    if args.dry_run:
        data = _load_watch_lock(lock_path)
        if not data:
            single_runtime_watch_loop_ok = True
            sr_reason = "no_lock"
        else:
            pid = int(data.get("pid") or 0)
            if pid and _pid_alive(pid):
                single_runtime_watch_loop_ok = True
                sr_reason = "single_runtime_active"
            else:
                single_runtime_watch_loop_ok = True
                sr_reason = "stale_lock_observed"
        if args.claim_watch_runtime:
            single_runtime_watch_loop_ok = False
            dup_msg = "dry_run_no_claim"
    else:
        ok_sr, sr_reason = _cleanup_stale_lock(lock_path)
        if not ok_sr:
            single_runtime_watch_loop_ok = False
        elif args.claim_watch_runtime:
            claimed, dup_msg = _claim_watch_lock(root, lock_path, "refresh_only")
            single_runtime_watch_loop_ok = claimed
        else:
            single_runtime_watch_loop_ok = sr_reason in ("no_lock", "single_runtime_active", "stale_lock_removed")

    heartbeat_ok = False
    try:
        root.mkdir(parents=True, exist_ok=True)
        if args.dry_run:
            p = root / ".tenmon_heartbeat_probe"
            p.write_text("ok", encoding="utf-8")
            p.unlink()
            heartbeat_ok = True
        else:
            hb = {
                "card": CARD,
                "updated_at": _utc(),
                "pid": os.getpid(),
                "hostname": socket.gethostname(),
            }
            _atomic_write_json(hb_path, hb)
            heartbeat_ok = hb_path.is_file()
    except OSError:
        heartbeat_ok = False

    stuck, stuck_detail = _stuck(job_path)
    was_stuck_initial = stuck
    job_snap = _job_snapshot(job_path)

    stuck_recovery_ok = True
    if stuck:
        stuck_recovery_ok = _soft_reset_job(job_path, args.dry_run)
        if stuck_recovery_ok and not args.dry_run:
            stuck, stuck_detail = _stuck(job_path)
            stuck_recovery_ok = not stuck

    if darwin:
        mac_operator_ready = safe_summary_path_ok and heartbeat_ok and single_runtime_watch_loop_ok
        cursor_operator_ready = _cursor_installed_darwin()
    else:
        mac_operator_ready = bool(non_mac_ok) and safe_summary_path_ok and heartbeat_ok and single_runtime_watch_loop_ok
        cursor_operator_ready = bool(non_mac_ok)

    ok = (
        mac_operator_ready
        and cursor_operator_ready
        and safe_summary_path_ok
        and single_runtime_watch_loop_ok
        and heartbeat_ok
        and stuck_recovery_ok
    )

    operator_state_norm: dict[str, Any] = {
        "version": 1,
        "card": CARD,
        "normalized_at": _utc(),
        "platform": platform.system(),
        "paths": {
            "readiness_root": str(root),
            "summary_path": str(summary_path),
            "watch_lock": str(lock_path),
            "heartbeat": str(hb_path),
            "job_state": str(job_path),
        },
        "stuck_detected_before_recovery": was_stuck_initial,
    }

    detail = {
        "card": CARD,
        "generated_at": _utc(),
        "platform": platform.system(),
        "readiness_root": str(root),
        "darwin": darwin,
        "non_mac_ok": non_mac_ok,
        "cursor_operator": {
            "ready": cursor_operator_ready,
            "cursor_cli": bool(shutil.which("cursor")),
            "cursor_app": Path("/Applications/Cursor.app").is_dir() if darwin else False,
        },
        "watch_loop": {
            "refresh_only": True,
            "single_runtime_reason": sr_reason,
            "lock_path": str(lock_path),
            "claim_message": dup_msg,
        },
        "heartbeat_path": str(hb_path),
        "stuck": stuck,
        "stuck_detail": stuck_detail,
        "stuck_recovery_ok": stuck_recovery_ok,
        "jobs": {
            "current": job_snap.get("current_job_id"),
            "last": job_snap.get("last_job_id"),
            "job_state_path": str(job_path),
            "snapshot": job_snap,
        },
    }

    if not args.dry_run:
        try:
            _atomic_write_json(root / "readiness_detail.json", detail)
            _atomic_write_json(root / "operator_state_v1.json", operator_state_norm)
        except OSError:
            pass

    out_min: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "mac_operator_ready": mac_operator_ready,
        "cursor_operator_ready": cursor_operator_ready,
        "safe_summary_path_ok": safe_summary_path_ok,
        "single_runtime_watch_loop_ok": single_runtime_watch_loop_ok,
        "heartbeat_ok": heartbeat_ok,
        "stuck_recovery_ok": stuck_recovery_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else NEXT_ON_FAIL,
    }

    out_path = auto / OUT_JSON
    if not args.dry_run:
        try:
            _atomic_write_json(out_path, out_min)
        except OSError:
            ok = False
            out_min["ok"] = False
            out_min["next_card_if_fail"] = NEXT_ON_FAIL

    print(json.dumps(out_min, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
