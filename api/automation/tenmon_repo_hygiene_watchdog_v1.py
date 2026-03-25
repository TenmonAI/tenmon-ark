#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REPO_HYGIENE_WATCHDOG_CURSOR_AUTO_V1

git status --short を必須証拠として観測し、ignore / cleanup / manual の3分類と
must_block_seal を単一 verdict に固定する（自動削除は行わない）。
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from repo_hygiene_guard_v1 import (
    _backup_inventory,
    _build_guard,
    _build_hygiene,
    _classify_path,
    _git_status_porcelain,
    _repo_root,
)

CARD = "TENMON_REPO_HYGIENE_WATCHDOG_CURSOR_AUTO_V1"
RECOMMENDED_CLEANUP_CARD = "TENMON_REPO_HYGIENE_AND_SEAL_INPUT_GUARD_RETRY_CURSOR_AUTO_V1"
ALT_HYGIENE_CARD = "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_RETRY_CURSOR_AUTO_V1"

def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _api_automation() -> Path:
    return Path(__file__).resolve().parent


def _run_git_status_short(repo: Path) -> Tuple[int, str]:
    p = subprocess.run(
        ["git", "-C", str(repo), "status", "--short"],
        capture_output=True,
        text=True,
        check=False,
    )
    return p.returncode, (p.stdout or "")


def _is_untracked(xy: str) -> bool:
    return (xy or "").strip() == "??"


def _is_tracked_modified(xy: str) -> bool:
    u = (xy or "").strip()
    return u != "??" and u != ""


def _norm(p: str) -> str:
    return p.replace("\\", "/")


def watchdog_noise_kind(path: str) -> str:
    """bak_noise | cache_noise | generated_noise | suspicious | other"""
    cls0 = _classify_path(path)
    if cls0 == "suspicious_accidental_filename":
        return "suspicious"
    p = _norm(path)
    low = p.lower()
    base = p.split("/")[-1] if "/" in p else p
    if low.endswith(".bak") or ".bak." in low or "/.bak" in low or "chat.ts.bak" in low:
        return "bak_noise"
    if "web/src/" in low and ".bak" in base:
        return "bak_noise"
    if "__pycache__" in low or low.endswith(".pyc") or low.endswith(".pyo"):
        return "cache_noise"
    if (
        low.startswith("api/out/")
        or "/api/out/" in low
        or "api/automation/out/" in low
        or "/automation/out/" in low
        or "api/automation/generated_" in low
        or "/generated_cursor_apply/" in low
        or "/generated_vps_cards/" in low
        or "var/log/tenmon" in low
        or low.endswith("/run.log")
    ):
        return "generated_noise"
    if cls0 in ("runtime_artifact", "generated_artifact"):
        return "generated_noise"
    if cls0 in ("backup_sprawl", "backup_chat_ts_bak"):
        return "bak_noise"
    return "other"


def _mainlineish(path: str) -> bool:
    p = _norm(path)
    return p.startswith("web/src/") or p.startswith("api/src/")


def triage_path(path: str, noise: str) -> str:
    """ignore | cleanup | manual"""
    if noise in ("cache_noise", "generated_noise"):
        return "cleanup"
    if noise == "suspicious":
        return "manual"
    if noise == "bak_noise":
        return "cleanup"
    p = _norm(path)
    if "__pycache__" in p or p.endswith(".pyc"):
        return "ignore"
    if "node_modules/" in p:
        return "ignore"
    if _mainlineish(path) and noise == "other":
        cls = _classify_path(path)
        if cls == "code_or_config":
            return "manual"
    if noise == "other" and not _mainlineish(path):
        return "ignore"
    return "manual"


def extend_blockers(
    base: List[str],
    *,
    cache_noise_count: int,
    suspicious_count: int,
    git_status_failed: bool,
) -> List[str]:
    out = list(base)
    if git_status_failed:
        out.append("git_status_short_failed")
    if cache_noise_count > 0:
        out.append("pycache_or_cache_in_dirty_set")
    if suspicious_count > 0:
        out.append("suspicious_accidental_filename_present")
    # 重複除去（順序維持）
    seen: Set[str] = set()
    dedup: List[str] = []
    for b in out:
        if b not in seen:
            seen.add(b)
            dedup.append(b)
    return dedup


def build_report_md(
    verdict: Dict[str, Any],
    git_short_preview: str,
) -> str:
    lines = [
        f"# TENMON_REPO_HYGIENE_WATCHDOG_REPORT",
        "",
        f"- generated_at: `{verdict.get('generated_at')}`",
        f"- **watchdog_clean**: `{verdict.get('watchdog_clean')}`",
        f"- **must_block_seal**: `{verdict.get('must_block_seal')}`",
        "",
        "## 汚染量（カウント）",
        "",
        f"| metric | value |",
        f"|---|---:|",
        f"| untracked_count | {verdict.get('untracked_count')} |",
        f"| tracked_modified_count | {verdict.get('tracked_modified_count')} |",
        f"| bak_noise_count | {verdict.get('bak_noise_count')} |",
        f"| cache_noise_count | {verdict.get('cache_noise_count')} |",
        f"| generated_noise_count | {verdict.get('generated_noise_count')} |",
        f"| manual_review_count | {verdict.get('manual_review_count')} |",
        "",
        "## seal ブロック理由",
        "",
    ]
    for b in verdict.get("seal_blockers") or []:
        lines.append(f"- `{b}`")
    if not verdict.get("seal_blockers"):
        lines.append("- （なし）")
    lines.extend(
        [
            "",
            "## cleanup 候補（自動削除はしない）",
            "",
        ]
    )
    for p in (verdict.get("cleanup_candidates") or [])[:80]:
        lines.append(f"- `{p}`")
    if len(verdict.get("cleanup_candidates") or []) > 80:
        lines.append("- …（truncated）")
    lines.extend(["", "## manual review 候補", ""])
    for p in (verdict.get("manual_review_candidates") or [])[:80]:
        lines.append(f"- `{p}`")
    if len(verdict.get("manual_review_candidates") or []) > 80:
        lines.append("- …（truncated）")
    lines.extend(["", "## ignore 候補（.gitignore 見直し）", ""])
    for p in (verdict.get("ignore_candidates") or [])[:60]:
        lines.append(f"- `{p}`")
    lines.extend(
        [
            "",
            "## git status --short（抜粋証拠）",
            "",
            "```text",
            git_short_preview[:12000],
            "```",
            "",
            f"- recommended_cleanup_card: `{verdict.get('recommended_cleanup_card')}`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    repo = _repo_root()
    auto = _api_automation()

    rc_git, git_status_short = _run_git_status_short(repo)
    rows = _git_status_porcelain(repo)
    git_status_failed = rc_git != 0

    hygiene = _build_hygiene(repo, rows)
    inv = _backup_inventory(repo)
    guard, guard_rc = _build_guard(hygiene, inv)

    c = hygiene.get("counts") or {}
    untracked_count = int(c.get("untracked", 0))
    tracked_modified_count = sum(1 for r in rows if _is_tracked_modified(r.get("xy", "")))

    tracked_modified: List[str] = []
    untracked: List[str] = []
    bak_noise: List[str] = []
    cache_noise: List[str] = []
    generated_noise: List[str] = []
    manual_review_required: List[str] = []
    ignore_candidates: List[str] = []
    cleanup_candidates: List[str] = []
    manual_review_candidates: List[str] = []

    suspicious_count = 0

    for r in rows:
        path = r.get("path") or ""
        xy = r.get("xy") or ""
        if not path.strip():
            continue
        if _is_untracked(xy):
            untracked.append(path)
        else:
            tracked_modified.append(path)

        nk = watchdog_noise_kind(path)
        if nk == "bak_noise":
            bak_noise.append(path)
        elif nk == "cache_noise":
            cache_noise.append(path)
        elif nk == "generated_noise":
            generated_noise.append(path)

        cls = _classify_path(path)
        if cls == "suspicious_accidental_filename":
            suspicious_count += 1

        if nk == "suspicious":
            manual_review_required.append(path)
        elif _mainlineish(path) and nk == "other" and cls == "code_or_config":
            manual_review_required.append(path)

        tri = triage_path(path, nk)
        if tri == "ignore":
            ignore_candidates.append(path)
        elif tri == "cleanup":
            cleanup_candidates.append(path)
        elif tri == "manual":
            manual_review_candidates.append(path)

    # 重複除去（順序維持）
    def uniq(xs: List[str]) -> List[str]:
        s: Set[str] = set()
        o: List[str] = []
        for x in xs:
            if x not in s:
                s.add(x)
                o.append(x)
        return o

    tracked_modified = uniq(tracked_modified)
    untracked = uniq(untracked)
    bak_noise = uniq(bak_noise)
    cache_noise = uniq(cache_noise)
    generated_noise = uniq(generated_noise)
    manual_review_required = uniq(manual_review_required)
    ignore_candidates = uniq(ignore_candidates)
    cleanup_candidates = uniq(cleanup_candidates)
    manual_review_candidates = uniq(manual_review_candidates)

    bak_noise_count = len(bak_noise)
    cache_noise_count = len(cache_noise)
    generated_noise_count = len(generated_noise)
    manual_review_count = len(manual_review_candidates)

    # guard の bak 指標 + 在庫（従来互換）
    bak_noise_count_report = int(c.get("backup", 0)) + int(inv.get("chat_ts_bak_count", 0))

    base_blockers: List[str] = list(guard.get("blockers") or [])
    seal_blockers = extend_blockers(
        base_blockers,
        cache_noise_count=cache_noise_count,
        suspicious_count=suspicious_count,
        git_status_failed=git_status_failed,
    )

    must_block_seal = len(seal_blockers) > 0
    watchdog_clean = not must_block_seal

    rec_card = None if watchdog_clean else (
        ALT_HYGIENE_CARD if bak_noise_count > 40 or int(inv.get("chat_ts_bak_count", 0)) > 0 else RECOMMENDED_CLEANUP_CARD
    )

    verdict: Dict[str, Any] = {
        "version": 2,
        "card": CARD,
        "final_seal_policy": {
            "card": "TENMON_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1",
            "safe_relative_rmdirs": [
                "api/automation/generated_cursor_apply",
                "api/automation/generated_vps_cards",
                "api/automation/out",
            ],
            "never_auto_modify_prefixes": ["api/src/", "web/src/"],
            "notes": "自動削除は final_seal スクリプトの safe list のみ。tracked code の revert は禁止。",
        },
        "generated_at": _utc(),
        "git_status_short_rc": rc_git,
        "git_status_short_evidence": git_status_short[:100000],
        "watchdog_clean": watchdog_clean,
        "must_block_seal": must_block_seal,
        "untracked_count": untracked_count,
        "tracked_modified_count": tracked_modified_count,
        "bak_noise_count": bak_noise_count_report,
        "bak_noise_count_git_paths": len(bak_noise),
        "bak_noise_paths_git": bak_noise[:400],
        "cache_noise_count": cache_noise_count,
        "generated_noise_count": generated_noise_count,
        "manual_review_count": manual_review_count,
        "suspicious_count": suspicious_count,
        "recommended_cleanup_card": rec_card,
        "seal_blockers": seal_blockers,
        "guard_rc": guard_rc,
        "classification_summary": c,
        "buckets": {
            "tracked_modified": tracked_modified[:800],
            "untracked": untracked[:800],
            "bak_noise": bak_noise[:400],
            "cache_noise": cache_noise[:400],
            "generated_noise": generated_noise[:400],
            "manual_review_required": manual_review_required[:400],
        },
        "ignore_candidates": ignore_candidates[:500],
        "cleanup_candidates": cleanup_candidates[:500],
        "manual_review_candidates": manual_review_candidates[:500],
        "inputs": {
            "repo_root": str(repo),
            "seal_input_guard_policy": guard.get("policy"),
            "backup_inventory_samples": (inv.get("backup_sprawl_samples") or [])[:40],
        },
    }

    out_path = auto / "tenmon_repo_hygiene_watchdog_verdict.json"
    out_path.write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    report_path = auto / "tenmon_repo_hygiene_watchdog_report.md"
    report_path.write_text(
        build_report_md(verdict, git_status_short),
        encoding="utf-8",
    )

    if args.stdout_json:
        # 巨大フィールドは stdout から省略
        slim = dict(verdict)
        slim.pop("git_status_short_evidence", None)
        slim["git_status_short_evidence_omitted"] = True
        print(json.dumps(slim, ensure_ascii=False, indent=2))

    exit_rc = 0 if watchdog_clean else 1
    return exit_rc


if __name__ == "__main__":
    raise SystemExit(main())
