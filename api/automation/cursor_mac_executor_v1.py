#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_MAC_EXECUTOR_V1
Mac 側: 正規化済み build job を Cursor 実行セッションに変換し、起動ラッパー経由で作業を開始する（commit/deploy はしない）。
VPS 検証: CURSOR_EXECUTOR_DRY_RUN=1 で実起動をスキップ。

運用入口の dry bind / manifest 整合は TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1
（`tenmon_mac_cursor_executor_runtime_bind_v1.py`）を参照。
API 用短命 Bearer の自動更新は `tenmon_mac_executor_auth_refresh_v1.py` と constitution
TENMON_MAC_EXECUTOR_REFRESHABLE_AUTH_RUNTIME_CURSOR_AUTO_V1 を参照。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_CURSOR_MAC_EXECUTOR_V1"
VERSION = 1

# 編集スコープに含めてはならないパターン（部分一致 + fnmatch）
SCOPE_BLOCK_PATTERNS: List[Tuple[str, str]] = [
    (r"dist(\/|$)", "dist/** 禁止"),
    (r"(^|\/)dist\/", "dist 配下"),
    (r"routes[/\\]chat\.ts", "chat.ts 本体"),
    (r"\.\./", "パストラバーサル"),
]

PATCH_DANGER: List[Tuple[str, re.Pattern[str], str]] = [
    ("rm_rf", re.compile(r"rm\s+-rf\s+[/~]"), "rm -rf"),
    ("alter_table", re.compile(r"ALTER\s+TABLE|DROP\s+TABLE", re.I), "schema 強行"),
    ("secret", re.compile(r"(API_KEY|SECRET)\s*=\s*['\"]?.+['\"]?", re.I), "秘密っぽい代入"),
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_root_fallback() -> Path:
    return Path(__file__).resolve().parents[2]


def load_manifest(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8", errors="replace"))


def check_manifest_safety(manifest: Dict[str, Any], repo_root: Path) -> Tuple[bool, List[str], List[str]]:
    """(ok, reasons, matched_ids)"""
    reasons: List[str] = []
    matched: List[str] = []

    sf = manifest.get("safety_flags") or {}
    if sf.get("rejected"):
        reasons.append("normalizer safety_flags.rejected is true")
        matched.append("normalizer_rejected")

    raw = str(manifest.get("raw_card_body_md") or "")
    for pid, rx, note in PATCH_DANGER:
        if rx.search(raw):
            reasons.append(f"raw_card_body_md: {note}")
            matched.append(pid)

    edit_scope = manifest.get("edit_scope") or []
    if not isinstance(edit_scope, list):
        edit_scope = []
    for line in edit_scope:
        s = str(line).strip()
        if not s:
            continue
        for pat, note in SCOPE_BLOCK_PATTERNS:
            if re.search(pat, s, re.I):
                reasons.append(f"edit_scope '{s}': {note}")
                matched.append(f"scope:{pat}")

    try:
        root = repo_root.resolve()
        for line in edit_scope:
            s = str(line).strip()
            if not s:
                continue
            base = s.split("*")[0].rstrip("/")
            if not base:
                continue
            p = (root / base).resolve()
            try:
                p.relative_to(root)
            except ValueError:
                reasons.append(f"edit_scope not under repo: {line}")
                matched.append("outside_repo")
    except Exception as e:
        reasons.append(f"path_check_error:{e}")

    dont = manifest.get("do_not_touch") or []
    if isinstance(dont, list):
        for es in edit_scope:
            es_l = str(es).lower().replace("\\", "/")
            for d in dont:
                d = str(d).lower().replace("\\", "/").strip()
                if not d:
                    continue
                d = d.rstrip("*").rstrip("/")
                if not d:
                    continue
                if es_l == d or es_l.startswith(d + "/"):
                    reasons.append(f"edit_scope overlaps do_not_touch: {es} vs {d}")
                    matched.append("do_not_touch_overlap")

    return (len(reasons) == 0, reasons, matched)


def write_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run_launch_wrapper(
    *,
    wrapper: Path,
    repo_root: Path,
    session_id: str,
    session_manifest_path: Path,
    log_path: Path,
    dry_run: bool,
) -> Tuple[int, str]:
    env = os.environ.copy()
    env["TENMON_REPO_ROOT"] = str(repo_root)
    env["TENMON_SESSION_ID"] = session_id
    env["TENMON_SESSION_MANIFEST"] = str(session_manifest_path)
    env["TENMON_CURSOR_LOG"] = str(log_path)
    if dry_run:
        env["CURSOR_EXECUTOR_DRY_RUN"] = "1"
    else:
        env.pop("CURSOR_EXECUTOR_DRY_RUN", None)
    try:
        p = subprocess.run(
            ["bash", str(wrapper)],
            cwd=str(repo_root),
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode, out
    except Exception as e:
        return 1, str(e)


def update_state(state_path: Path, session_row: Dict[str, Any]) -> None:
    data: Dict[str, Any]
    if state_path.is_file():
        try:
            data = json.loads(state_path.read_text(encoding="utf-8"))
        except Exception:
            data = {"version": 1, "card": CARD, "sessions": []}
    else:
        data = {"version": 1, "card": CARD, "sessions": []}
    if "sessions" not in data or not isinstance(data["sessions"], list):
        data["sessions"] = []
    data["sessions"].append(session_row)
    data["last_session"] = session_row
    data["updated_at"] = _utc_now()
    write_json(state_path, data)


def main() -> int:
    ap = argparse.ArgumentParser(description="TENMON_CURSOR_MAC_EXECUTOR_V1")
    ap.add_argument("--manifest", type=Path, required=True, help="normalized job json (job_*.json or normalized_*.json)")
    ap.add_argument("--repo-root", type=Path, default=None)
    ap.add_argument("--session-dir", type=Path, default=None)
    ap.add_argument("--dry-run", action="store_true", help="do not invoke real Cursor; wrapper dry-run")
    ap.add_argument("--skip-launch", action="store_true", help="only write manifests/reports, no wrapper")
    args = ap.parse_args()

    repo_root = (args.repo_root or _repo_root_fallback()).resolve()
    session_dir = args.session_dir or (repo_root / "api" / "automation" / "out" / "cursor_executor_v1")
    session_dir = session_dir.resolve()
    session_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest(args.manifest)
    job_id = str(manifest.get("job_id") or "unknown")
    session_id = f"curs_{uuid.uuid4().hex[:20]}"

    block_report_path = session_dir / "dangerous_patch_block_report.json"
    session_manifest_path = session_dir / "cursor_job_session_manifest.json"
    state_path = session_dir / "mac_executor_state.json"
    log_path = session_dir / f"cursor_session_{session_id}.log"
    wrapper = Path(__file__).resolve().parent / "cursor_local_launch_wrapper_v1.sh"

    ok, reasons, matched = check_manifest_safety(manifest, repo_root)
    block_payload = {
        "version": 1,
        "card": CARD,
        "generated_at": _utc_now(),
        "blocked": not ok,
        "reasons": reasons,
        "matched_patterns": matched,
        "job_id": job_id,
    }
    write_json(block_report_path, block_payload)

    if not ok:
        session_payload = {
            "version": VERSION,
            "card": CARD,
            "session_id": session_id,
            "job_id": job_id,
            "status": "blocked",
            "blocked_reasons": reasons,
            "repo_root": str(repo_root),
            "received_manifest_path": str(args.manifest.resolve()),
            "created_at": _utc_now(),
        }
        write_json(session_manifest_path, session_payload)
        update_state(
            state_path,
            {
                "session_id": session_id,
                "job_id": job_id,
                "status": "blocked",
                "at": _utc_now(),
                "session_manifest": str(session_manifest_path),
            },
        )
        print(json.dumps({"ok": False, "status": "blocked", "reasons": reasons}, ensure_ascii=False, indent=2))
        return 4

    dry = args.dry_run or os.environ.get("CURSOR_EXECUTOR_DRY_RUN") == "1"

    session_payload = {
        "version": VERSION,
        "card": CARD,
        "session_id": session_id,
        "job_id": job_id,
        "card_name": manifest.get("card_name"),
        "objective": manifest.get("objective"),
        "status": "ready",
        "repo_root": str(repo_root),
        "received_manifest_path": str(args.manifest.resolve()),
        "safety": {"passed": True, "checks": ["edit_scope", "do_not_touch", "raw_body_patch_scan"]},
        "cursor": {
            "launch_wrapper": str(wrapper),
            "log_path": str(log_path),
            "dry_run": dry,
        },
        "created_at": _utc_now(),
        "policy": {
            "no_auto_commit": True,
            "no_auto_deploy": True,
        },
    }
    write_json(session_manifest_path, session_payload)

    launch_rc = 0
    launch_out = ""
    if args.skip_launch:
        launch_out = "skip_launch"
        log_path.write_text(f"[{_utc_now()}] skip_launch session={session_id}\n", encoding="utf-8")
        final_status = "manifest_only"
    elif wrapper.is_file():
        launch_rc, launch_out = run_launch_wrapper(
            wrapper=wrapper,
            repo_root=repo_root,
            session_id=session_id,
            session_manifest_path=session_manifest_path,
            log_path=log_path,
            dry_run=dry,
        )
        try:
            log_path.write_text(
                f"[{_utc_now()}] session={session_id} rc={launch_rc}\n{launch_out}\n",
                encoding="utf-8",
            )
        except Exception:
            pass
        if dry:
            final_status = "dry_run_started" if launch_rc == 0 else "dry_run_failed"
        else:
            final_status = "started" if launch_rc == 0 else "failed"
    else:
        launch_rc = 3
        launch_out = "wrapper_missing"
        log_path.write_text(f"[{_utc_now()}] wrapper missing\n", encoding="utf-8")
        final_status = "failed"

    session_payload["status"] = final_status
    session_payload["cursor"]["exit_code"] = launch_rc
    session_payload["cursor"]["launch_output_tail"] = (launch_out or "")[:4000]
    write_json(session_manifest_path, session_payload)

    update_state(
        state_path,
        {
            "session_id": session_id,
            "job_id": job_id,
            "status": final_status,
            "at": _utc_now(),
            "session_manifest": str(session_manifest_path),
            "log_path": str(log_path),
            "block_report": str(block_report_path),
        },
    )

    print(
        json.dumps(
            {
                "ok": launch_rc == 0,
                "session_id": session_id,
                "status": final_status,
                "cursor_job_session_manifest": str(session_manifest_path),
                "mac_executor_state": str(state_path),
                "dangerous_patch_block_report": str(block_report_path),
                "log_path": str(log_path),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0 if launch_rc == 0 else 5


if __name__ == "__main__":
    raise SystemExit(main())
