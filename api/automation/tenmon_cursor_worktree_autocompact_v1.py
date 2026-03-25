#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_WORKTREE_AUTOCOMPACT_AND_REVIEW_FLUSH_CURSOR_AUTO_V1

揮発的 automation 生成物を out/archive へ退避し、git 作業ツリーの
「見るべき差分」を減らす。KEEP_EXACT にある current-run 証跡は移動しない。
"""
from __future__ import annotations

import fnmatch
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CURSOR_WORKTREE_AUTOCOMPACT_AND_REVIEW_FLUSH_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_cursor_worktree_autocompact_summary.json"
OUT_MD = "tenmon_cursor_worktree_autocompact_report.md"

KEEP_EXACT_NAMES: frozenset[str] = frozenset(
    {
        "remote_cursor_queue.json",
        "remote_cursor_result_bundle.json",
        "conversation_quality_safe_probe_pack_v1.json",
        "tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json",
        "tenmon_conversation_quality_priority_summary.json",
        "conversation_quality_generated_cards.json",
        "state_convergence_next_cards.json",
        "tenmon_autonomy_current_state_forensic.json",
        "tenmon_worldclass_acceptance_scorecard.json",
        "tenmon_latest_state_rejudge_summary.json",
        "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json",
        "conversation_quality_analyzer_summary.json",
    }
)

VOLATILE_SUFFIXES: tuple[str, ...] = (
    "_summary.json",
    "_report.md",
    "_verdict.json",
    "_readiness.json",
    "_blockers.json",
    "_forensic.json",
    "_forensic.md",
)

HIGH_RISK_SUBSTR: tuple[str, ...] = (
    "api/src/routes/chat.ts",
    "api/src/routes/chat_refactor/finalize.ts",
    "web/src/",
)

REVIEW_FILE_WARN = 120
FAIL_FAST_HIGH_RISK = 25


def _utc_ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _git_changed_paths(repo: Path) -> list[str]:
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain", "-uall"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.returncode != 0:
            return []
    except Exception:
        return []
    out: list[str] = []
    for line in (r.stdout or "").splitlines():
        line = line.strip("\r")
        if len(line) < 3:
            continue
        # "XY PATH" or "?? PATH"
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[-1].strip()
        if path:
            out.append(path)
    return out


def _classify_path(rel: str) -> str:
    r = rel.replace("\\", "/")
    for h in HIGH_RISK_SUBSTR:
        if h in r:
            return "high_risk"
    base = os.path.basename(r)
    if base in KEEP_EXACT_NAMES:
        return "safe_tracked"
    if r.startswith("api/automation/out/") and "/archive/" not in r:
        return "volatile_generated"
    if r.startswith("api/automation/generated_cursor_apply/"):
        return "volatile_generated"
    if fnmatch.fnmatch(base, "*.log") or "/watch_sessions/" in r:
        return "volatile_generated"
    if r.startswith("api/automation/") and _should_move_basename(base):
        return "volatile_generated"
    return "safe_tracked"


def _should_move_basename(name: str) -> bool:
    if name in KEEP_EXACT_NAMES:
        return False
    if name in (OUT_JSON, OUT_MD):
        return False
    if any(name.endswith(s) for s in VOLATILE_SUFFIXES):
        return True
    if fnmatch.fnmatch(name, "*_forensic*.json") or fnmatch.fnmatch(name, "*_forensic*.md"):
        return True
    if fnmatch.fnmatch(name, "*_report.json"):
        return True
    return False


def _move_automation_loose_files(
    automation: Path,
    repo: Path,
    batch_dir: Path,
    dry_run: bool,
) -> tuple[list[dict[str, Any]], int]:
    moved: list[dict[str, Any]] = []
    n = 0
    ts = _utc_ts()
    for p in automation.iterdir():
        if not p.is_file():
            continue
        if not _should_move_basename(p.name):
            continue
        if dry_run:
            n += 1
            continue
        batch_dir.mkdir(parents=True, exist_ok=True)
        dest = batch_dir / p.name
        if dest.exists():
            dest = batch_dir / f"{p.stem}__{ts}{p.suffix}"
        shutil.move(str(p), str(dest))
        moved.append({"kind": "file", "from": str(p.relative_to(repo)), "to": str(dest.relative_to(repo))})
        n += 1
    return moved, n


def _relocate_generated_and_out(
    automation: Path,
    repo: Path,
    batch_dir: Path,
    dry_run: bool,
) -> tuple[list[dict[str, Any]], int]:
    moved: list[dict[str, Any]] = []
    n = 0
    ts = _utc_ts()

    gca = automation / "generated_cursor_apply"
    if gca.is_dir() and any(gca.iterdir()):
        if dry_run:
            n += sum(1 for _ in gca.rglob("*") if _.is_file())
        else:
            batch_dir.mkdir(parents=True, exist_ok=True)
            dest = batch_dir / "generated_cursor_apply"
            if dest.exists():
                dest = batch_dir / f"generated_cursor_apply__{ts}"
            shutil.move(str(gca), str(dest))
            moved.append({"kind": "dir_tree", "from": str(gca.relative_to(repo)), "to": str(dest.relative_to(repo))})
            n += 1

    out_dir = automation / "out"
    if not out_dir.is_dir():
        return moved, n
    for child in list(out_dir.iterdir()):
        if child.name == "archive":
            continue
        if child.is_dir():
            if dry_run:
                n += sum(1 for _ in child.rglob("*") if _.is_file())
            else:
                batch_dir.mkdir(parents=True, exist_ok=True)
                dest = batch_dir / child.name
                if dest.exists():
                    dest = batch_dir / f"{child.name}__{ts}"
                shutil.move(str(child), str(dest))
                moved.append({"kind": "dir", "from": str(child.relative_to(repo)), "to": str(dest.relative_to(repo))})
                n += 1
        elif child.is_file():
            if dry_run:
                n += 1
            else:
                batch_dir.mkdir(parents=True, exist_ok=True)
                dest = batch_dir / child.name
                if dest.exists():
                    dest = batch_dir / f"{child.stem}__{ts}{child.suffix}"
                shutil.move(str(child), str(dest))
                moved.append({"kind": "file", "from": str(child.relative_to(repo)), "to": str(dest.relative_to(repo))})
                n += 1
    return moved, n


def main() -> int:
    import argparse

    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--repo-root", type=str, default="")
    args = ap.parse_args()
    dry = bool(args.dry_run)

    repo = Path(args.repo_root or os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    automation = api / "automation"
    archive_root = automation / "out" / "archive"
    ts = _utc_ts()
    batch_dir = archive_root / f"autocompact_{ts}"

    changed_before = _git_changed_paths(repo)
    n_before = len(changed_before)

    all_moves: list[dict[str, Any]] = []
    moved_items = 0

    m1, n1 = _relocate_generated_and_out(automation, repo, batch_dir, dry)
    all_moves.extend(m1)
    moved_items += n1

    m2, n2 = _move_automation_loose_files(automation, repo, batch_dir, dry)
    all_moves.extend(m2)
    moved_items += n2

    changed_after = _git_changed_paths(repo)
    n_after = len(changed_after)

    counts = {"high_risk": 0, "safe_tracked": 0, "volatile_generated": 0}
    for p in changed_after:
        counts[_classify_path(p)] += 1

    review_blocked = n_after > REVIEW_FILE_WARN
    fail_fast = counts["high_risk"] >= FAIL_FAST_HIGH_RISK

    summary: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc_iso(),
        "dry_run": dry,
        "archive_batch": str(batch_dir.relative_to(repo)),
        "changed_file_count_before": n_before,
        "changed_file_count_after": n_after,
        "delta_changed_files": n_after - n_before,
        "moved_items_approx": moved_items,
        "classification_after": counts,
        "review_blockers": {
            "review_file_count_gt_120": review_blocked,
            "threshold": REVIEW_FILE_WARN,
            "message": "autocompact 実行後に再レビュー（919 級の膨張を抑止）" if review_blocked else None,
        },
        "fail_fast": {
            "recommended": fail_fast,
            "high_risk_count": counts["high_risk"],
            "threshold": FAIL_FAST_HIGH_RISK,
        },
        "keep_exact_names_unchanged": sorted(KEEP_EXACT_NAMES),
        "moves": all_moves[:300],
    }

    automation.mkdir(parents=True, exist_ok=True)
    (automation / OUT_JSON).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- dry_run: `{dry}`",
        f"- **changed files**: {n_before} → {n_after} (delta {summary['delta_changed_files']})",
        f"- **review_blocked** (> {REVIEW_FILE_WARN}): `{review_blocked}`",
        f"- **fail_fast (high_risk ≥ {FAIL_FAST_HIGH_RISK})**: `{fail_fast}`",
        "",
        "## Classification (after)",
        "",
        f"- high_risk: {counts['high_risk']}",
        f"- volatile_generated: {counts['volatile_generated']}",
        f"- safe_tracked: {counts['safe_tracked']}",
        "",
        "## Archive batch",
        "",
        f"- `{summary.get('archive_batch')}`",
    ]
    (automation / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "ok": True,
                "path": str(automation / OUT_JSON),
                "changed_file_count_before": n_before,
                "changed_file_count_after": n_after,
                "review_file_count_gt_120": review_blocked,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
