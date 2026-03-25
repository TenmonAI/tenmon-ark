#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1

NAS / backup 実接続を read-only で観測し、canonical report を生成する。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from storage_backup_contract_v1 import DEFAULT_PATH_CANDIDATES, ENV_PATH_KEYS, RELATED_SCRIPTS
from storage_backup_mount_classifier_v1 import findmnt_targets, mount_table_linux, parse_mount_points

CARD = "TENMON_STORAGE_BACKUP_NAS_RECOVERY_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_STORAGE_BACKUP_NAS_RECOVERY_VPS_V1"
FAIL_NEXT = "TENMON_STORAGE_BACKUP_NAS_RECOVERY_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run(cmd: List[str], timeout: float = 8.0) -> Tuple[int, str, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        return p.returncode, p.stdout or "", p.stderr or ""
    except Exception as e:
        return 127, "", str(e)


def _dedup_add(rows: List[Tuple[str, str]], seen: Set[str], path: str, source: str) -> None:
    p = path.strip()
    if not p or p in seen:
        return
    seen.add(p)
    rows.append((p, source))


def _parse_env_path_values() -> List[Tuple[str, str]]:
    rows: List[Tuple[str, str]] = []
    seen: Set[str] = set()
    for k in ENV_PATH_KEYS:
        v = (os.environ.get(k) or "").strip()
        if not v:
            continue
        _dedup_add(rows, seen, v, f"env:{k}")
    extra_keys = ("TENMON_STORAGE_BACKUP_PATHS", "BACKUP_PATHS", "NAS_PATHS")
    for k in extra_keys:
        raw = (os.environ.get(k) or "").strip()
        if not raw:
            continue
        for token in re.split(r"[,:;\s]+", raw):
            if token.startswith("/"):
                _dedup_add(rows, seen, token, f"env_list:{k}")
    return rows


def _collect_candidates() -> List[Tuple[str, str]]:
    rows: List[Tuple[str, str]] = []
    seen: Set[str] = set()
    for p in ("/mnt/nas", "/opt/tenmon-backup", "/backup", "/data/backup"):
        _dedup_add(rows, seen, p, "fixed_policy")
    for p in DEFAULT_PATH_CANDIDATES:
        _dedup_add(rows, seen, p, "fixed_contract")
    for p, src in _parse_env_path_values():
        _dedup_add(rows, seen, p, src)
    return rows


def _is_mounted(path: str, active_mounts: Set[str]) -> bool:
    q = path.rstrip("/") or "/"
    if q in active_mounts:
        return True
    for mp in active_mounts:
        m = mp.rstrip("/") or "/"
        if q.startswith(m + "/"):
            return True
    return False


def _sample_listing(path: Path, limit: int = 20) -> Dict[str, Any]:
    if not path.exists() or not path.is_dir():
        return {"ok": False, "items": []}
    try:
        items = sorted([x.name for x in path.iterdir()])[:limit]
        return {"ok": True, "items": items}
    except PermissionError:
        return {"ok": False, "error": "permission_denied", "items": []}
    except Exception as e:
        return {"ok": False, "error": str(e), "items": []}


def _df_snapshot(path: str) -> Dict[str, Any]:
    rc, out, err = _run(["df", "-h", path], timeout=6.0)
    return {
        "rc": rc,
        "stdout_head": out[:1200],
        "stderr_head": err[:400],
    }


def _stat_snapshot(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"exists": False}
    try:
        st = path.stat()
        vfs = os.statvfs(str(path))
        return {
            "exists": True,
            "is_dir": path.is_dir(),
            "mode_octal": oct(st.st_mode & 0o777),
            "uid": st.st_uid,
            "gid": st.st_gid,
            "size": st.st_size,
            "mtime_epoch": st.st_mtime,
            "free_bytes": int(vfs.f_bavail * vfs.f_frsize),
            "total_bytes": int(vfs.f_blocks * vfs.f_frsize),
        }
    except PermissionError:
        return {"exists": True, "permission_denied": True}
    except Exception as e:
        return {"exists": True, "error": str(e)}


def _classify(path: str, mounted: bool, exists: bool, is_dir: bool, sample_ok: bool, sample_err: str) -> str:
    if not exists:
        return "candidate_not_found"
    if sample_err == "permission_denied":
        return "mounted_but_permission_denied"
    if mounted and is_dir and sample_ok:
        return "mounted_and_visible"
    if is_dir and sample_ok and not mounted:
        return "path_defined_but_unmounted"
    return "candidate_not_found"


def _scripts_state(api: Path) -> Dict[str, Any]:
    scripts: Dict[str, Any] = {}
    for rel in RELATED_SCRIPTS:
        p = api / rel
        scripts[rel] = {
            "exists": p.is_file(),
            "executable": os.access(p, os.X_OK) if p.is_file() else False,
            "runtime_condition_note": "manual_or_explicit_invocation_required",
        }
    present = sum(1 for v in scripts.values() if v["exists"])
    return {
        "scripts": scripts,
        "scripts_present_count": present,
        "scripts_all_present": present == len(RELATED_SCRIPTS),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", default="", help="default: api/automation/out/storage_backup_nas_recovery_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    api = _api_root()
    out = Path(args.out_dir).resolve() if args.out_dir else (api / "automation" / "out" / "storage_backup_nas_recovery_v1")
    out.mkdir(parents=True, exist_ok=True)

    mount_text = mount_table_linux()
    active_mounts = parse_mount_points(mount_text) | set(findmnt_targets())
    candidates = _collect_candidates()
    scripts_state = _scripts_state(api)

    rows: List[Dict[str, Any]] = []
    for path_str, source in candidates:
        p = Path(path_str)
        exists = p.exists()
        is_dir = p.is_dir() if exists else False
        mounted = _is_mounted(path_str, active_mounts)
        sample = _sample_listing(p, limit=20)
        stat = _stat_snapshot(p)
        df = _df_snapshot(path_str) if exists else {"rc": 2, "stdout_head": "", "stderr_head": "path_not_found"}
        sample_err = str(sample.get("error") or "")
        cls = _classify(path_str, mounted, exists, is_dir, bool(sample.get("ok")), sample_err)
        rows.append(
            {
                "path": path_str,
                "source": source,
                "mounted": mounted,
                "classification": cls,
                "stat": stat,
                "df": df,
                "sample_listing": sample,
                "writeability": {
                    "attempted_write": False,
                    "writable": False,
                    "policy": "read_only_observation",
                },
            }
        )

    mount_present = any(r["classification"] == "mounted_and_visible" for r in rows)
    blockers: List[str] = []
    if not mount_present:
        blockers.append("no_mounted_backup_candidate_detected")
    if not scripts_state["scripts_all_present"]:
        blockers.append("required_sync_scripts_missing")

    canonical = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "vps_marker": VPS_MARKER,
        "fail_next_card": FAIL_NEXT if blockers else None,
        "policy": "read_only",
        "runtime_mount_state": {
            "mount_present": mount_present,
            "active_mount_count": len(active_mounts),
        },
        "script_state": {
            "scripts_all_present": scripts_state["scripts_all_present"],
            "scripts_present_count": scripts_state["scripts_present_count"],
        },
        "path_candidates_count": len(rows),
        "blockers_ref": str(out / "backup_blockers.json"),
    }

    blockers_body = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "rc": 0 if not blockers else 1,
        "blockers": blockers,
        "runtime_mount_state": canonical["runtime_mount_state"],
        "script_state": canonical["script_state"],
        "fail_next_card": FAIL_NEXT if blockers else None,
    }

    (out / "backup_mount_candidates.json").write_text(
        json.dumps(
            {
                "version": 1,
                "card": CARD,
                "generated_at": _utc(),
                "rows": rows,
                "mount_output_head": mount_text[:8000],
                "env_path_values": {k: os.environ.get(k) for k in ENV_PATH_KEYS},
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (out / "backup_blockers.json").write_text(
        json.dumps(blockers_body, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (out / "storage_backup_nas_canonical_report.json").write_text(
        json.dumps(canonical, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (out / VPS_MARKER).write_text(
        json.dumps({"marker": VPS_MARKER, "generated_at": _utc(), "rc": blockers_body["rc"]}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps({"out_dir": str(out), **blockers_body}, ensure_ascii=False, indent=2))
    return int(blockers_body["rc"])


if __name__ == "__main__":
    raise SystemExit(main())

