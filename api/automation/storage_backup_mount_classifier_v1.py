#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mount / path classifier for NAS backup diagnosis (read-only).
"""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


def _run(cmd: List[str], timeout: float = 6.0) -> str:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        return (p.stdout or "") + (p.stderr or "")
    except Exception:
        return ""


def mount_table_linux() -> str:
    return _run(["mount"], timeout=8.0)


def findmnt_targets() -> List[str]:
    out = _run(["findmnt", "-n", "-o", "TARGET"], timeout=6.0)
    if not out.strip():
        return []
    return [ln.strip() for ln in out.splitlines() if ln.strip()]


def parse_mount_points(mount_text: str) -> Set[str]:
    """Linux `mount` 出力からマウントポイントを抽出。"""
    pts: Set[str] = set()
    for line in mount_text.splitlines():
        m = re.search(r"\s+on\s+(\S+)\s+type\s+", line)
        if m:
            pts.add(m.group(1))
            continue
        m2 = re.search(r"\s+on\s+(\S+)\s+", line)
        if m2:
            pts.add(m2.group(1))
    return pts


def parse_fstab_paths() -> List[Tuple[str, str]]:
    """(source, mountpoint) を fstab から読取（失敗時は空）。"""
    res: List[Tuple[str, str]] = []
    try:
        txt = Path("/etc/fstab").read_text(encoding="utf-8", errors="replace")
    except Exception:
        return res
    for line in txt.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        parts = s.split()
        if len(parts) < 2:
            continue
        src, mp = parts[0], parts[1]
        if any(x in src.lower() for x in ("nfs", "cifs", "smb", "fuse", "sshfs", "nfs4")) or any(
            x in s.lower() for x in ("nfs", "cifs", "fuse")
        ):
            res.append((src, mp))
    return res


def path_is_under_mount(path: Path, mount_points: Set[str]) -> bool:
    rp = str(path.resolve()) if path.exists() else str(path)
    rp = rp.rstrip("/") or "/"
    best = ""
    for mp in mount_points:
        m = mp.rstrip("/") or "/"
        if rp == m or rp.startswith(m + "/"):
            if len(m) > len(best):
                best = m
    return bool(best)


def classify_path(
    path_str: str,
    mount_text: str,
    mount_points: Set[str],
) -> Tuple[str, Dict[str, Any]]:
    """
    単一路径の分類 + 根拠。
    戻り値: (classification, evidence_dict)
    """
    p = Path(path_str)
    ev: Dict[str, Any] = {"path": path_str, "checks": []}

    if not p.exists():
        ev["checks"].append("path_exists:false")
        return "candidate_not_found", ev

    try:
        is_dir = p.is_dir()
    except PermissionError:
        ev["checks"].append("stat:permission_denied")
        return "mounted_but_permission_denied", ev

    if not is_dir:
        ev["checks"].append("not_a_directory")
        return "candidate_not_found", ev

    try:
        with os.scandir(path_str) as it:
            any(it)
    except PermissionError:
        ev["checks"].append("listdir:permission_denied")
        return "mounted_but_permission_denied", ev
    except OSError as e:
        ev["checks"].append(f"listdir:oserror:{e!s}")
        return "mounted_but_permission_denied", ev

    try:
        if os.path.ismount(path_str):
            ev["checks"].append("os.path.ismount:true")
            return "mounted_and_visible", ev
    except Exception as e:
        ev["checks"].append(f"ismount_error:{e!s}")

    if path_is_under_mount(p, mount_points):
        ev["checks"].append("under_active_mount_table")
        return "mounted_and_visible", ev

    # マウントテーブルにパスが無いがディレクトリは見える → 空ディレクトリ等（未マウント想定）
    ev["checks"].append("exists_listable_not_mounted")
    return "path_defined_but_unmounted", ev


def summarize_disconnection_reason(rows: List[Dict[str, Any]]) -> str:
    """人間向けの一次理由。"""
    cats = [r.get("classification") for r in rows]
    if any(c == "mounted_and_visible" for c in cats):
        return "at_least_one_candidate_mounted_and_visible"
    if all(c == "candidate_not_found" for c in cats if c):
        return "no_candidate_paths_exist"
    if any(c == "mounted_but_permission_denied" for c in cats):
        return "permission_denied_on_existing_paths"
    if any(c == "path_defined_but_unmounted" for c in cats):
        return "paths_exist_but_not_mounted_or_stale_empty_dirs"
    return "unknown_or_scripts_only"
