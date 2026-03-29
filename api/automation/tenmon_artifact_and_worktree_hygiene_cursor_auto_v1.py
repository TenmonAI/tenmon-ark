#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1

mainline 後段: 既存 autocompact で揮発 automation 退避し、queue / KEEP / 主線 TS を壊さず
作業ツリーを薄くする。git commit は行わない。
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

CARD = "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_artifact_and_worktree_hygiene_result_v1.json"
OUT_MD = "tenmon_artifact_and_worktree_hygiene_report_v1.md"
AUTOCOMPACT = "tenmon_cursor_worktree_autocompact_v1.py"
AUTOCOMPACT_SUMMARY = "tenmon_cursor_worktree_autocompact_summary.json"
BEGIN = "<!-- ARTIFACT_WORKTREE_HYGIENE_AUTO_BEGIN -->"
END = "<!-- ARTIFACT_WORKTREE_HYGIENE_AUTO_END -->"

NEXT_ON_PASS = "TENMON_POST_FINAL_5CARDS_COMPLETION_XRAY_V1"
NEXT_ON_FAIL = "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_RETRY_CURSOR_AUTO_V1"

# queue / runtime 系（退避対象外・存在必須）
KEEP_REQUIRED: tuple[str, ...] = (
    "api/automation/tenmon_cursor_single_flight_queue_state.json",
    "api/automation/tenmon_cursor_worktree_autocompact_summary.json",
)

# conversation / book learning 主線（削除・退避禁止の確認用）
MAINLINE_SOURCE_PRESERVE: tuple[str, ...] = (
    "api/src/core/tenmonBookLearningMainlineSealV1.ts",
    "api/src/core/tenmonReuseBenchAndConversationUpliftAcceptanceV1.ts",
    "api/src/core/tenmonBookLearningAcceptanceReuseBenchV1.ts",
    "api/src/core/tenmonBookLearningDeepXrayQualityForensicV1.ts",
    "api/src/core/threadMeaningMemory.ts",
    "api/src/core/knowledgeBinder.ts",
    "api/src/routes/chat.ts",
)


def _utc_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _git_status_short_lines(repo: Path) -> list[str]:
    try:
        r = subprocess.run(
            ["git", "status", "--short"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.returncode != 0:
            return []
        return [ln for ln in (r.stdout or "").splitlines() if ln.strip()]
    except Exception:
        return []


def _git_status_short_count(repo: Path) -> int:
    return len(_git_status_short_lines(repo))


def _automation_root_dirty_count(lines: list[str]) -> int:
    n = 0
    for ln in lines:
        if len(ln) < 3:
            continue
        p = ln[3:].strip().replace("\\", "/")
        if " -> " in p:
            p = p.split(" -> ", 1)[-1].strip()
        if not p.startswith("api/automation/"):
            continue
        if "/out/archive/" in p:
            continue
        n += 1
    return n


def _npm_check(api_dir: Path) -> tuple[bool, str]:
    try:
        r = subprocess.run(
            ["npm", "run", "check"],
            cwd=str(api_dir),
            capture_output=True,
            text=True,
            timeout=600,
        )
        tail = (r.stdout or "") + (r.stderr or "")
        return r.returncode == 0, tail[-2000:]
    except Exception as e:
        return False, str(e)


def _load_json(path: Path) -> dict[str, Any]:
    try:
        o = json.loads(path.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except Exception:
        return {}


def _queue_state_ok(d: dict[str, Any]) -> tuple[bool, str]:
    if not d:
        return False, "queue_json_empty"
    if not isinstance(d.get("blocked_reason"), list):
        return False, "blocked_reason_not_list"
    if d.get("queue_corruption_stop") is True:
        return False, "queue_corruption_stop"
    if d.get("card") is None or str(d.get("card") or "").strip() == "":
        return False, "queue_card_missing"
    return True, "ok"


def _run_autocompact(repo: Path, dry: bool) -> tuple[int, str]:
    script = repo / "api" / "automation" / AUTOCOMPACT
    cmd = [sys.executable, str(script)]
    if dry:
        cmd.append("--dry-run")
    cmd.append("--repo-root")
    cmd.append(str(repo))
    try:
        r = subprocess.run(cmd, cwd=str(repo), capture_output=True, text=True, timeout=300)
        tail = (r.stdout or "") + (r.stderr or "")[-4000:]
        return r.returncode, tail
    except Exception as e:
        return 99, str(e)


def _patch_md(path: Path, data: dict[str, Any]) -> None:
    if not path.is_file():
        return
    raw = path.read_text(encoding="utf-8")
    if BEGIN not in raw or END not in raw:
        return
    pl = data.get("payload") or {}
    lines = [
        BEGIN,
        "",
        f"- **acceptance_pass**: `{data.get('acceptance_pass')}`",
        f"- **npm_run_check_ok**: `{data.get('npm_run_check_ok')}`",
        f"- **dry_run**: `{pl.get('dry_run')}`",
        f"- **git_status_short_before**: `{pl.get('git_status_short_count_before')}`",
        f"- **git_status_short_after**: `{pl.get('git_status_short_count_after')}`",
        f"- **automation_dirty_lines**: `{pl.get('automation_dirty_lines_before')}` → `{pl.get('automation_dirty_lines_after')}`",
        f"- **autocompact_moved_approx**: `{pl.get('autocompact_moved_items_approx')}`",
        f"- **autocompact_delta_changed**: `{pl.get('autocompact_delta_changed_files')}`",
        "",
        END,
    ]
    block = "\n".join(lines)
    pre, rest = raw.split(BEGIN, 1)
    _, post = rest.split(END, 1)
    path.write_text(pre + block + post, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--dry-run", action="store_true", help="autocompact のみ dry-run（封印は FAIL）")
    args = ap.parse_args()
    dry = bool(args.dry_run)

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"

    failure_reasons: list[str] = []
    lines_before = _git_status_short_lines(repo)
    status_before = len(lines_before)
    auto_before = _automation_root_dirty_count(lines_before)

    build_ok, build_tail = _npm_check(api)
    if not build_ok:
        failure_reasons.append("npm_run_check_failed")

    for rel in KEEP_REQUIRED:
        if not (repo / rel).is_file():
            failure_reasons.append(f"keep_missing:{rel}")

    for rel in MAINLINE_SOURCE_PRESERVE:
        if not (repo / rel).is_file():
            failure_reasons.append(f"mainline_source_missing:{rel}")

    sf_path = repo / KEEP_REQUIRED[0]
    sf = _load_json(sf_path)
    q_ok, q_note = _queue_state_ok(sf)
    if not q_ok:
        failure_reasons.append(f"queue_state_abnormal:{q_note}")

    ac_rc, ac_tail = _run_autocompact(repo, dry)
    if ac_rc != 0:
        failure_reasons.append(f"autocompact_exit_{ac_rc}")

    ac_sum = _load_json(auto / AUTOCOMPACT_SUMMARY)
    moved = int(ac_sum.get("moved_items_approx") or 0)
    delta_cf = ac_sum.get("delta_changed_files")
    lines_after = _git_status_short_lines(repo)
    status_after = len(lines_after)
    auto_after = _automation_root_dirty_count(lines_after)

    if not dry:
        build_ok2, _ = _npm_check(api)
        if not build_ok2:
            failure_reasons.append("npm_run_check_failed_after_autocompact")

    shrink_ok = False
    if status_after < status_before:
        shrink_ok = True
    if auto_after < auto_before:
        shrink_ok = True
    if moved >= 1:
        shrink_ok = True
    if isinstance(delta_cf, int) and delta_cf < 0:
        shrink_ok = True
    if status_before <= 35:
        shrink_ok = True

    if dry:
        failure_reasons.append("dry_run_seal_blocked")
    elif not shrink_ok and status_before > 35:
        failure_reasons.append("git_status_short_not_reduced_sufficiently")

    acceptance_pass = len(failure_reasons) == 0

    payload: dict[str, Any] = {
        "schema": "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_PAYLOAD_V1",
        "card": CARD,
        "generated_at": _utc_iso(),
        "dry_run": dry,
        "git_status_short_count_before": status_before,
        "git_status_short_count_after": status_after,
        "automation_dirty_lines_before": auto_before,
        "automation_dirty_lines_after": auto_after,
        "autocompact_exit_code": ac_rc,
        "autocompact_tail": ac_tail[-1500:] if ac_tail else "",
        "autocompact_moved_items_approx": moved,
        "autocompact_delta_changed_files": delta_cf,
        "keep_required": list(KEEP_REQUIRED),
        "mainline_preserve_checked": list(MAINLINE_SOURCE_PRESERVE),
        "queue_state_ok": q_ok,
        "queue_state_note": q_note,
        "acceptance_pass": acceptance_pass,
        "failure_reasons": [] if acceptance_pass else failure_reasons,
        "nextOnPass": NEXT_ON_PASS,
        "nextOnFail": NEXT_ON_FAIL,
        "observation_only": False,
    }

    result: dict[str, Any] = {
        "schema": "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_RESULT_V1",
        "card": CARD,
        "generated_at": payload["generated_at"],
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail,
        "acceptance_pass": acceptance_pass,
        "failure_reasons": [] if acceptance_pass else failure_reasons,
        "nextOnPass": NEXT_ON_PASS,
        "nextOnFail": NEXT_ON_FAIL,
        "payload": payload,
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    _patch_md(auto / OUT_MD, {**result, "payload": payload})

    print(json.dumps({"acceptance_pass": acceptance_pass, "npm_run_check_ok": build_ok}, ensure_ascii=False, indent=2))
    return 0 if acceptance_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
