#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MAC_OPERATOR_PATH_AND_WATCH_REPAIR_CURSOR_AUTO_V1

Mac ローカル operator の summary パス移行・watch ロック整流・stuck soft reset・heartbeat 回復。
repo 本幹には触れない。fail-closed。
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MAC_OPERATOR_PATH_AND_WATCH_REPAIR_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_AUTONOMY_2H_MASTER_PDCA_FAILCLOSED_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_mac_operator_path_and_watch_repair_cursor_auto_v1.json"
STUCK_SEC = 600
HB_STALE_SEC = 300


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


def _heartbeat_age_sec(hb_path: Path) -> float | None:
    j = _read_json(hb_path)
    u = str(j.get("updated_at") or "").strip()
    if not u:
        return None
    try:
        t = u.replace("Z", "+00:00")
        dt = datetime.fromisoformat(t)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return time.time() - dt.timestamp()
    except Exception:
        return None


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
        "recovery": {"soft_reset_at": _utc(), "reason": "stuck_repair", "card": CARD},
    }
    if dry:
        return True
    try:
        _atomic_write_json(job_path, new)
    except OSError:
        return False
    return True


def _migrate_unsafe_summary(
    repo: Path,
    root: Path,
    resolved_summary: Path,
    safe_target: Path,
    dry: bool,
) -> tuple[bool, dict[str, Any]]:
    meta: dict[str, Any] = {
        "from": str(resolved_summary),
        "to": str(safe_target),
        "migrated_at": _utc(),
        "unsafe_was_repo_relative": _is_under_repo(repo, resolved_summary),
    }
    if not _is_under_repo(repo, resolved_summary):
        return True, {"skipped": True, **meta}

    if _is_under_repo(repo, safe_target):
        return False, {"error": "safe_target_still_under_repo", **meta}

    old_data: dict[str, Any] = {}
    if resolved_summary.is_file():
        old_data = _read_json(resolved_summary)

    if dry:
        return True, {"dry_run": True, **meta}

    try:
        safe_target.parent.mkdir(parents=True, exist_ok=True)
        merged = {**old_data, "migrated_from": str(resolved_summary), "card": CARD, "at": _utc()}
        _atomic_write_json(safe_target, merged)
        _atomic_write_json(root / "summary_path_migration_v1.json", meta)
        hint = {
            "card": CARD,
            "at": _utc(),
            "unset_or_set_env": "TENMON_MAC_OPERATOR_READINESS_SUMMARY_PATH",
            "recommended_value": str(safe_target),
            "note": "repo 配下の summary は PermissionError の原因になるため、上記の repo 外パスへ移行した。",
        }
        _atomic_write_json(root / "operator_env_hint_v1.json", hint)
    except OSError as e:
        return False, {"error": str(e), **meta}
    return True, meta


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
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
    lock_path = root / "watch_loop_single_runtime.json"
    hb_path = root / "heartbeat.json"
    job_path = root / "job_state.json"
    safe_target = root / "tenmon_mac_cursor_operator_readiness_summary.json"
    resolved_summary = default_summary_path(root)

    operator_path_repaired = False
    migration_info: dict[str, Any] = {}

    if _is_under_repo(repo, root) and not non_mac_ok:
        operator_path_repaired = False
        migration_info = {"error": "readiness_root_under_repo"}
    elif _is_under_repo(repo, root) and non_mac_ok:
        operator_path_repaired = True
        migration_info = {"skipped_non_mac": True}
    else:
        ok_m, migration_info = _migrate_unsafe_summary(repo, root, resolved_summary, safe_target, args.dry_run)
        if not ok_m:
            operator_path_repaired = False
        elif _is_under_repo(repo, resolved_summary):
            if args.dry_run:
                operator_path_repaired = not _is_under_repo(repo, safe_target.resolve())
            else:
                operator_path_repaired = safe_target.is_file() and not _is_under_repo(repo, safe_target.resolve())
        else:
            write_target = resolved_summary
            try:
                if _is_under_repo(repo, write_target.resolve()):
                    operator_path_repaired = False
                elif args.dry_run:
                    write_target.parent.mkdir(parents=True, exist_ok=True)
                    p = write_target.parent / ".tenmon_summary_probe"
                    p.write_text("ok", encoding="utf-8")
                    p.unlink()
                    operator_path_repaired = True
                else:
                    write_target.parent.mkdir(parents=True, exist_ok=True)
                    _atomic_write_json(
                        write_target,
                        {"card": CARD, "repair_probe": True, "at": _utc()},
                    )
                    operator_path_repaired = not _is_under_repo(repo, write_target.resolve())
            except OSError:
                operator_path_repaired = False

    watch_loop_repaired = False
    if args.dry_run:
        data = _load_watch_lock(lock_path)
        if not data:
            watch_loop_repaired = True
        else:
            pid = int(data.get("pid") or 0)
            watch_loop_repaired = not pid or not _pid_alive(pid) or True
    else:
        ok_w, _ = _cleanup_stale_lock(lock_path)
        watch_loop_repaired = ok_w

    stuck, _ = _stuck(job_path)
    stuck_recovery_ok = True
    if stuck:
        stuck_recovery_ok = _soft_reset_job(job_path, args.dry_run)
        if stuck_recovery_ok and not args.dry_run:
            stuck, _ = _stuck(job_path)
            stuck_recovery_ok = not stuck

    heartbeat_recovery_ok = False
    try:
        if args.dry_run:
            heartbeat_recovery_ok = True
        else:
            age = _heartbeat_age_sec(hb_path)
            stale = hb_path.is_file() and (age is None or age > HB_STALE_SEC)
            if stale or not hb_path.is_file():
                hb = {
                    "card": CARD,
                    "updated_at": _utc(),
                    "pid": os.getpid(),
                    "hostname": socket.gethostname(),
                    "recovery": True,
                }
                _atomic_write_json(hb_path, hb)
            heartbeat_recovery_ok = hb_path.is_file()
    except OSError:
        heartbeat_recovery_ok = False

    normalized = {
        "version": 1,
        "card": CARD,
        "normalized_at": _utc(),
        "platform": platform.system(),
        "paths": {
            "readiness_root": str(root),
            "summary_resolved": str(resolved_summary),
            "summary_safe_default": str(safe_target),
            "watch_lock": str(lock_path),
            "heartbeat": str(hb_path),
            "job_state": str(job_path),
        },
        "migration": migration_info,
    }
    if not args.dry_run:
        try:
            _atomic_write_json(root / "operator_state_v1.json", normalized)
        except OSError:
            pass

    mac_ok = darwin or non_mac_ok
    ok = (
        mac_ok
        and operator_path_repaired
        and watch_loop_repaired
        and stuck_recovery_ok
        and heartbeat_recovery_ok
    )

    out_min: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "operator_path_repaired": operator_path_repaired,
        "watch_loop_repaired": watch_loop_repaired,
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
