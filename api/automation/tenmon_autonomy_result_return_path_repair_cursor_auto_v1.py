#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_AUTONOMY_RESULT_RETURN_PATH_REPAIR_CURSOR_AUTO_V1

result return の summary パス / 権限を安全化（automation へのメタ書き込みのみ）。
repo 外の安全ルートを確定し、検証用ファイルを 1 件書く。fail-closed。
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_AUTONOMY_RESULT_RETURN_PATH_REPAIR_CURSOR_AUTO_V1"
NEXT_ON_FAIL = "TENMON_AUTONOMY_FAILCLOSED_SUPERVISOR_AND_ROLLBACK_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_autonomy_result_return_path_repair_cursor_auto_v1.json"
MANIFEST_NAME = "tenmon_autonomy_safe_summary_manifest_v1.json"
PATH_STATE_NAME = "tenmon_autonomy_safe_summary_path_v1.json"


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _atomic_write_json(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _is_under_repo(repo: Path, p: Path) -> bool:
    try:
        rp = repo.resolve()
        pp = p.resolve()
        return rp == pp or rp in pp.parents
    except Exception:
        return True


def _allow_repo_relative_summary() -> bool:
    v = (os.environ.get("TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY") or "").strip().lower()
    return v in ("1", "true", "yes")


def _resolve_safe_summary_root(repo: Path) -> tuple[Path, str]:
    """repo 外を既定。env が repo 配下なら明示オプトインのみ許可。"""
    env = (os.environ.get("TENMON_AUTONOMY_SAFE_SUMMARY_ROOT") or "").strip()
    if env:
        root = Path(os.path.expanduser(env)).resolve()
        if _is_under_repo(repo, root) and not _allow_repo_relative_summary():
            raise OSError(
                "unsafe_summary_path: TENMON_AUTONOMY_SAFE_SUMMARY_ROOT is under repo "
                "(set TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY=1 to opt-in)",
            )
        root.mkdir(parents=True, exist_ok=True)
        return root, "env:TENMON_AUTONOMY_SAFE_SUMMARY_ROOT"

    candidates: list[tuple[Path, str]] = [
        (Path("/var/log/tenmon/autonomy_summaries"), "default:/var/log/tenmon/autonomy_summaries"),
        (Path.home() / ".cache" / "tenmon_autonomy_summaries", "default:~/.cache/tenmon_autonomy_summaries"),
        (Path("/tmp/tenmon_autonomy_summaries"), "default:/tmp/tenmon_autonomy_summaries"),
    ]
    for root, tag in candidates:
        try:
            root.mkdir(parents=True, exist_ok=True)
        except OSError:
            continue
        if not _is_under_repo(repo, root):
            return root.resolve(), tag
    raise OSError("no_writable_safe_summary_root_outside_repo")


def _probe_write(root: Path) -> None:
    p = root / ".tenmon_autonomy_safe_summary_write_probe"
    p.write_text(_utc_iso() + "\n", encoding="utf-8")
    p.read_text(encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="automation への書き込みなし")
    ap.add_argument("--repo-root", type=Path, default=None)
    args = ap.parse_args()
    repo = args.repo_root or _repo_root_from_here()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    rollback_used = False
    blocked = False
    blocked_reason: list[str] = []
    safe_root: Path | None = None
    safe_tag = ""
    safe_summary_path_ok = False
    permission_safe_ok = False

    try:
        safe_root, safe_tag = _resolve_safe_summary_root(repo)
        _probe_write(safe_root)
        safe_summary_path_ok = (not _is_under_repo(repo, safe_root)) or _allow_repo_relative_summary()
        permission_safe_ok = True
    except OSError as e:
        blocked = True
        blocked_reason.append(str(e))
        safe_summary_path_ok = False
        permission_safe_ok = False

    manifest = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "resolved_root": str(safe_root) if safe_root else None,
        "resolution_source": safe_tag,
        "blocked": blocked,
        "blocked_reason": blocked_reason,
    }

    path_state = {
        "card": CARD,
        "version": 1,
        "generated_at": _utc_iso(),
        "safe_summary_root": str(safe_root) if safe_root else None,
        "resolution_source": safe_tag,
        "env_override": "TENMON_AUTONOMY_SAFE_SUMMARY_ROOT",
        "repo_relative_opt_in": "TENMON_AUTONOMY_ALLOW_REPO_RELATIVE_SUMMARY",
    }

    ok = bool(safe_summary_path_ok and permission_safe_ok and not blocked)

    out: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "safe_summary_path_ok": safe_summary_path_ok,
        "permission_safe_ok": permission_safe_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else NEXT_ON_FAIL,
    }
    if blocked_reason:
        out["blocked_reason"] = blocked_reason

    if not args.dry_run and ok:
        try:
            if safe_root is not None:
                _atomic_write_json(safe_root / MANIFEST_NAME, manifest)
            _atomic_write_json(auto / PATH_STATE_NAME, path_state)
        except OSError:
            ok = False
            out["ok"] = False
            out["safe_summary_path_ok"] = False
            out["permission_safe_ok"] = False
            out["next_card_if_fail"] = NEXT_ON_FAIL
            out["rollback_used"] = False
            out.setdefault("blocked_reason", []).append("automation_manifest_write_failed")

    if not args.dry_run:
        try:
            _atomic_write_json(auto / OUT_JSON, out)
        except OSError:
            ok = False
            out["ok"] = False
            out["next_card_if_fail"] = NEXT_ON_FAIL

    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
