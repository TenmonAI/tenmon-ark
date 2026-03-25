#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_CURSOR_AUTO_V1

dirty repo / untracked / generated / backup sprawl を観測・分類し、
seal 入力を濁らせるパスを guard JSON として固定する。
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

CARD = "TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_CURSOR_AUTO_V1"
VPS_MARKER = "TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_VPS_V1"
FAIL_NEXT = "TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_RETRY_CURSOR_AUTO_V1"


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _api_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _run_git(repo: Path, args: List[str]) -> Tuple[int, str, str]:
    p = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    return p.returncode, p.stdout or "", p.stderr or ""


def _git_status_porcelain(repo: Path) -> List[Dict[str, str]]:
    rc, out, _ = _run_git(repo, ["status", "--porcelain"])
    if rc != 0:
        return []
    rows: List[Dict[str, str]] = []
    for ln in out.splitlines():
        if not ln.strip():
            continue
        xy = ln[:2]
        path = ln[3:].strip() if len(ln) > 3 else ""
        rows.append({"xy": xy, "path": path})
    return rows


def _classify_path(path: str) -> str:
    p = path.lower()
    base = path.split("/")[-1] if "/" in path else path
    if base in ("30,", "=", "30") or base.startswith("30,"):
        return "suspicious_accidental_filename"
    if "chat.ts.bak" in p:
        return "backup_chat_ts_bak"
    if "/backup/" in p or p.startswith("backup/") or ".backup" in p or p.endswith(".bak"):
        return "backup_sprawl"
    if p.startswith("api/automation/out/") or "/automation/out/" in p:
        return "runtime_artifact"
    if "/var/log/tenmon" in p or "run.log" in p:
        return "runtime_artifact"
    if p.startswith("api/automation/generated_") or "/generated_cursor_apply/" in p:
        return "generated_artifact"
    return "code_or_config"


def _norm_path(p: str) -> str:
    return p.replace("\\", "/")


def _status_kind(xy: str) -> str:
    if xy == "??":
        return "untracked"
    x, y = xy[0], xy[1]
    if x != " ":
        return "staged_or_index_modified"
    if y != " ":
        return "working_tree_modified"
    return "unknown"


def _backup_inventory(repo: Path, limit: int = 1200) -> Dict[str, Any]:
    backup_files: List[str] = []
    chat_baks: List[str] = []
    for p in repo.rglob("*"):
        if not p.is_file():
            continue
        rel = str(p.relative_to(repo))
        low = rel.lower()
        if "chat.ts.bak" in low:
            chat_baks.append(rel)
            backup_files.append(rel)
        elif low.endswith(".bak") or "/backup/" in low or low.startswith("backup/") or ".backup" in low:
            backup_files.append(rel)
        if len(backup_files) >= limit:
            break
    return {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "policy": "inventory_only_no_modification",
        "chat_ts_bak_count": len(chat_baks),
        "chat_ts_bak_samples": sorted(chat_baks)[:200],
        "backup_sprawl_count": len(backup_files),
        "backup_sprawl_samples": sorted(backup_files)[:400],
    }


def _build_hygiene(repo: Path, rows: List[Dict[str, str]]) -> Dict[str, Any]:
    allow: Dict[str, Any] = {}
    apath = Path(__file__).resolve().parent / "repo_hygiene_source_allowlist_v1.json"
    if apath.exists():
        try:
            raw = json.loads(apath.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                allow = raw
        except Exception:
            allow = {}
    try:
        from repo_manifest_v1 import is_kept_source as _allow_kept
    except Exception:
        def _allow_kept(_p: str, _a: Dict[str, Any]) -> bool:
            return False

    classified: List[Dict[str, str]] = []
    counts: Dict[str, int] = {
        "modify": 0,
        "untracked": 0,
        "untracked_seal_relevant": 0,
        "generated": 0,
        "backup": 0,
        "runtime_artifact": 0,
        "code_or_config": 0,
    }
    for r in rows:
        sk = _status_kind(r["xy"])
        cls = _classify_path(r["path"])
        classified.append({"path": r["path"], "xy": r["xy"], "status_kind": sk, "class": cls})
        if sk in ("working_tree_modified", "staged_or_index_modified"):
            counts["modify"] += 1
        if sk == "untracked":
            counts["untracked"] += 1
            pn = _norm_path(r.get("path") or "")
            if not (allow and _allow_kept(pn, allow)):
                counts["untracked_seal_relevant"] += 1
        if cls == "generated_artifact":
            counts["generated"] += 1
        if cls in ("backup_sprawl", "backup_chat_ts_bak"):
            counts["backup"] += 1
        if cls == "runtime_artifact":
            counts["runtime_artifact"] += 1
        if cls == "code_or_config":
            counts["code_or_config"] += 1
    return {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "repo_root": str(repo),
        "total_dirty_entries": len(classified),
        "counts": counts,
        "entries_sample": classified[:600],
    }


def _build_guard(hygiene: Dict[str, Any], inv: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    excludes = [
        "api/automation/out/**",
        "api/automation/generated_cursor_apply/**",
        "api/automation/generated_vps_cards/**",
        "**/*.bak",
        "**/backup/**",
        "backup/**",
        "**/run.log",
        "var/log/tenmon/**",
    ]
    blockers: List[str] = []
    c = hygiene.get("counts", {})
    if int(c.get("backup", 0)) > 0:
        blockers.append("backup_sprawl_present")
    if int(c.get("generated", 0)) > 0:
        blockers.append("generated_artifacts_mixed_in_dirty_set")
    if int(c.get("runtime_artifact", 0)) > 0:
        blockers.append("runtime_artifacts_present_in_dirty_set")
    seal_untracked = int(c.get("untracked_seal_relevant", c.get("untracked", 0)))
    if seal_untracked > 200:
        blockers.append("massive_untracked_detected")
    if int(inv.get("chat_ts_bak_count", 0)) > 0:
        blockers.append("chat_ts_bak_inventory_present")

    rc = 0 if len(blockers) == 0 else 1
    guard = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc(),
        "rc": rc,
        "policy": "seal_input_noise_guard",
        "exclude_from_seal_input_globs": excludes,
        "blockers": blockers,
        "fail_next_card": FAIL_NEXT if rc != 0 else None,
        "classification_summary": hygiene.get("counts", {}),
    }
    return guard, rc


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--out-dir", default="", help="default: api/automation/out/repo_hygiene_guard_v1")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = _repo_root()
    api = _api_root()
    out = Path(args.out_dir).resolve() if args.out_dir else (api / "automation" / "out" / "repo_hygiene_guard_v1")
    out.mkdir(parents=True, exist_ok=True)

    status_rows = _git_status_porcelain(repo)
    hygiene = _build_hygiene(repo, status_rows)
    inventory = _backup_inventory(repo)
    guard, rc = _build_guard(hygiene, inventory)

    (out / "repo_hygiene_report.json").write_text(json.dumps(hygiene, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "backup_sprawl_inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "seal_input_guard.json").write_text(json.dumps(guard, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    marker = json.dumps({"marker": VPS_MARKER, "generated_at": _utc(), "rc": rc}, ensure_ascii=False, indent=2) + "\n"
    (out / VPS_MARKER).write_text(marker, encoding="utf-8")
    (api / "automation" / VPS_MARKER).write_text(marker, encoding="utf-8")

    if args.stdout_json:
        print(json.dumps({"out_dir": str(out), "rc": rc, "blockers": guard["blockers"]}, ensure_ascii=False, indent=2))
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

