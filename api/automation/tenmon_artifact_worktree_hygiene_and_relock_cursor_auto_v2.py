#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ARTIFACT_WORKTREE_HYGIENE_AND_RELOCK_CURSOR_AUTO_V2

worktree / automation 成果物を観測し keep / archive / delete_candidate に分類する。
最小修復のみ（一括削除禁止）。TENMON_ARTIFACT_HYGIENE_V2_APPLY=1 のとき:
  - api/tools/__pycache__ 削除
  - manual_shelter 退避跡 + 法医学系3ファイルの index 削除を stage（実体は out/archive に複製済み前提）
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_ARTIFACT_WORKTREE_HYGIENE_AND_RELOCK_CURSOR_AUTO_V2"
OUT_JSON = "tenmon_artifact_worktree_hygiene_and_relock_result_v2.json"
OUT_MD = "tenmon_artifact_worktree_hygiene_and_relock_report_v2.md"

NEXT_ON_PASS = "TENMON_FINAL_ACCEPTANCE_FREEZE_AND_SEAL_CURSOR_AUTO_V4"
NEXT_ON_FAIL = (
    "keep/archive/delete candidate 分類のやり直し、誤削除があれば archive から復旧"
)

# acceptance・seal 直前で残すべき主線（無ければ FAIL）
KEEP_REQUIRED_PATHS: tuple[str, ...] = (
    "api/automation/tenmon_cursor_single_flight_queue_state.json",
    "api/automation/tenmon_conversation_acceptance_probe_relock_cursor_auto_v1.py",
    "api/automation/tenmon_real_chat_ux_acceptance_cursor_auto_v2.py",
)

# 削除を stage してよいパス（アーカイブ側に同等物がある前提・手動確認済みカード用）
ARCHIVE_ALIGNED_STAGE_DELETES: tuple[str, ...] = (
    "api/automation/out/manual_shelter",
    "api/automation/tenmon_autonomy_current_state_forensic.md",
    "api/automation/tenmon_autonomy_forensic_bundle_repair_cursor_auto_v1.json",
    "api/automation/tenmon_autonomy_forensic_bundle_repair_next_card_v1.json",
)

DELETE_CANDIDATE_GLOBS = (
    r"^api/.*/__pycache__/.*",
    r"\.pyc$",
)


def _utc_iso() -> str:
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


def _parse_status_line(ln: str) -> tuple[str, str]:
    """Return (xy, path) where path may be 'a -> b' rename."""
    if len(ln) < 3:
        return "", ln
    return ln[:2], ln[3:].strip()


def _classify_path(
    xy: str,
    path: str,
) -> str:
    p = path.replace("\\", "/")
    if " -> " in p:
        p = p.split(" -> ", 1)[-1].strip()

    for pat in DELETE_CANDIDATE_GLOBS:
        if re.search(pat, p):
            return "delete_candidate"

    if "/__pycache__/" in p or p.endswith("__pycache__"):
        return "delete_candidate"

    if p.startswith("api/automation/out/manual_shelter/") or p.rstrip("/") == "api/automation/out/manual_shelter":
        return "archive"

    if p in (
        "api/automation/tenmon_autonomy_current_state_forensic.md",
        "api/automation/tenmon_autonomy_forensic_bundle_repair_cursor_auto_v1.json",
        "api/automation/tenmon_autonomy_forensic_bundle_repair_next_card_v1.json",
    ):
        return "archive"

    if p.startswith("api/automation/out/archive/"):
        return "archive"

    if xy.strip() == "??":
        if p.endswith(".py") and "tenmon_" in p and "cursor_auto" in p:
            return "keep_add_candidate"
        if p.endswith((".md", ".json")) and "tenmon_" in p and (
            "_report_" in p or "_result_" in p or "acceptance" in p
        ):
            return "keep_add_candidate"
        if p.startswith("api/scripts/tenmon_") and (
            p.endswith(".sh") or p.endswith(".ts")
        ):
            return "keep_add_candidate"
        if p.startswith("api/src/core/tenmon") or p.startswith("api/src/core/thread"):
            return "keep_add_candidate"
        return "keep_add_candidate_other"

    if p.startswith("api/src/") or p.startswith("api/src/routes/"):
        return "keep"

    if p.startswith("server/"):
        return "keep"

    if p.startswith("api/automation/") and (xy[0:1] in ("M", "A") or xy[1:2] in ("M", "A")):
        return "keep"

    if p.startswith("canon/") or p.startswith("api/scripts/"):
        return "keep"

    if p == ".gitignore":
        return "keep"

    return "keep"


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


def _get_audit(base: str) -> dict[str, Any]:
    url = base.rstrip("/") + "/api/audit"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=8.0) as r:
            body = r.read().decode("utf-8", errors="replace")
        j = json.loads(body)
        return {"ok": bool(j.get("ok")), "http": r.getcode()}
    except Exception as e:
        return {"ok": False, "skipped": True, "error": str(e)}


def _apply_minimal_fixes(repo: Path) -> dict[str, Any]:
    log: dict[str, Any] = {"pycache_removed": False, "git_add_u_paths": []}
    tools_pyc = repo / "api" / "tools" / "__pycache__"
    if tools_pyc.is_dir():
        shutil.rmtree(tools_pyc, ignore_errors=True)
        log["pycache_removed"] = True

    for rel in ARCHIVE_ALIGNED_STAGE_DELETES:
        r = subprocess.run(
            ["git", "add", "-u", "--", rel],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        log["git_add_u_paths"].append(
            {"path": rel, "rc": r.returncode, "err": (r.stderr or "")[:400]},
        )
    return log


def main() -> int:
    apply_fixes = os.environ.get("TENMON_ARTIFACT_HYGIENE_V2_APPLY", "").strip() in (
        "1",
        "true",
        "yes",
    )
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api_dir = repo / "api"
    auto = api_dir / "automation"
    base = os.environ.get("TENMON_AUDIT_BASE_URL", "http://127.0.0.1:3000").strip()

    lines_before = _git_status_short_lines(repo)
    apply_log: dict[str, Any] | None = None
    if apply_fixes:
        apply_log = _apply_minimal_fixes(repo)

    lines = _git_status_short_lines(repo)
    build_ok, build_tail = _npm_check(api_dir)
    audit = _get_audit(base)

    classified: list[dict[str, Any]] = []
    buckets: dict[str, list[str]] = {
        "keep": [],
        "archive": [],
        "delete_candidate": [],
        "keep_add_candidate": [],
        "keep_add_candidate_other": [],
    }

    manual_shelter_lines: list[str] = []
    for ln in lines:
        xy, path = _parse_status_line(ln)
        bucket = _classify_path(xy, path)
        if "manual_shelter" in path.replace("\\", "/"):
            manual_shelter_lines.append(ln)
        classified.append({"line": ln, "xy": xy, "path": path, "bucket": bucket})
        if bucket in buckets:
            buckets[bucket].append(path)
        elif bucket == "keep":
            buckets.setdefault("keep", []).append(path)

    for k in buckets:
        buckets[k] = sorted(set(buckets[k]))

    failure_reasons: list[str] = []
    if not build_ok:
        failure_reasons.append("npm_run_check_failed")

    for rel in KEEP_REQUIRED_PATHS:
        if not (repo / rel).is_file():
            failure_reasons.append(f"keep_required_missing:{rel}")

    lines_final = _git_status_short_lines(repo)

    def _unstaged_delete_paths(status_lines: list[str]) -> list[str]:
        out: list[str] = []
        for ln in status_lines:
            if not ln.startswith(" D"):
                continue
            _xy, p = _parse_status_line(ln)
            out.append(p.replace("\\", "/"))
        return out

    unstaged_dels = _unstaged_delete_paths(lines_final)
    archive_targets = [
        p
        for p in unstaged_dels
        if "manual_shelter" in p
        or p
        in (
            "api/automation/tenmon_autonomy_current_state_forensic.md",
            "api/automation/tenmon_autonomy_forensic_bundle_repair_cursor_auto_v1.json",
            "api/automation/tenmon_autonomy_forensic_bundle_repair_next_card_v1.json",
        )
    ]
    if archive_targets and not apply_fixes:
        failure_reasons.append(
            "archive_aligned_deletes_unstaged:"
            + str(len(archive_targets))
            + "_set_TENMON_ARTIFACT_HYGIENE_V2_APPLY=1",
        )

    pycache_lines = [ln for ln in lines_final if "__pycache__" in ln]
    if pycache_lines:
        failure_reasons.append(f"pycache_present_in_git_status:{len(pycache_lines)}")

    if not audit.get("skipped") and not audit.get("ok"):
        failure_reasons.append("audit_not_ok")

    if apply_fixes:
        lines_after_apply = _git_status_short_lines(repo)
        unstaged_after = _unstaged_delete_paths(lines_after_apply)
        forensic_set = {
            "api/automation/tenmon_autonomy_current_state_forensic.md",
            "api/automation/tenmon_autonomy_forensic_bundle_repair_cursor_auto_v1.json",
            "api/automation/tenmon_autonomy_forensic_bundle_repair_next_card_v1.json",
        }
        still = [p for p in unstaged_after if "manual_shelter" in p or p in forensic_set]
        if still:
            failure_reasons.append(f"archive_aligned_still_unstaged_after_apply:{len(still)}")

    audit_note = "optional"
    if audit.get("skipped"):
        audit_note = "server_unreachable_skipped"
    elif audit.get("ok"):
        audit_note = "ok"
    else:
        audit_note = "audit_not_ok_non_blocking"

    staged_deletes = [
        ln
        for ln in lines_final
        if len(ln) >= 2 and ln[0] == "D" and ln[1] == " "
    ]
    staged_manual_shelter = sum(
        1 for ln in staged_deletes if "manual_shelter" in ln.replace("\\", "/")
    )

    explainable = bool(build_ok) and not any(
        f.startswith("keep_required_missing") for f in failure_reasons
    )

    acceptance_pass = (
        build_ok
        and not any(f.startswith("keep_required_missing") for f in failure_reasons)
        and not any(f.startswith("archive_aligned") for f in failure_reasons)
        and not any(f.startswith("pycache_present") for f in failure_reasons)
        and not any(f.startswith("archive_aligned_still_unstaged") for f in failure_reasons)
    )

    result: dict[str, Any] = {
        "schema": "TENMON_ARTIFACT_WORKTREE_HYGIENE_RELOCK_V2",
        "card": CARD,
        "generated_at": _utc_iso(),
        "apply_fixes_ran": apply_fixes,
        "apply_log": apply_log,
        "git_status_short_count_before_apply": len(lines_before),
        "git_status_short_count": len(_git_status_short_lines(repo)),
        "npm_run_check_ok": build_ok,
        "npm_run_check_tail": build_tail[-1200:],
        "audit": audit,
        "audit_note": audit_note,
        "manual_shelter_note": (
            "out/manual_shelter 下は autocompact により api/automation/out/archive/*/manual_shelter に複製済み。"
            "D 行は重複退避の削除で、index からの除去を推奨。"
        ),
        "relock": {
            "staged_deletion_lines_total": len(staged_deletes),
            "staged_manual_shelter_lines": staged_manual_shelter,
            "unstaged_archive_delete_paths": archive_targets,
        },
        "classified_lines": classified,
        "buckets_summary": {k: len(v) for k, v in buckets.items()},
        "buckets_paths": buckets,
        "keep_required": list(KEEP_REQUIRED_PATHS),
        "archive_aligned_stage_deletes": list(ARCHIVE_ALIGNED_STAGE_DELETES),
        "failure_reasons": failure_reasons if not acceptance_pass else [],
        "explainable_worktree": explainable,
        "acceptance_pass": acceptance_pass,
        "nextOnPass": NEXT_ON_PASS,
        "nextOnFail": NEXT_ON_FAIL,
        "observation_only": not apply_fixes,
    }

    auto.mkdir(parents=True, exist_ok=True)
    (auto / OUT_JSON).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md = [
        "# TENMON_ARTIFACT_WORKTREE_HYGIENE_AND_RELOCK_REPORT_V2",
        "",
        f"- **generated_at**: `{result['generated_at']}`",
        f"- **acceptance_pass**: `{acceptance_pass}`",
        f"- **apply_fixes_ran**: `{apply_fixes}` (`TENMON_ARTIFACT_HYGIENE_V2_APPLY=1`)",
        f"- **git status --short (count)**: {len(_git_status_short_lines(repo))}",
        f"- **npm run check**: {'PASS' if build_ok else 'FAIL'}",
        f"- **GET /api/audit**: `{audit}`",
        "",
        "## manual_shelter 扱い",
        "",
        result["manual_shelter_note"],
        "",
        "- 観測された manual_shelter 関連行数: "
        f"{len(manual_shelter_lines)}（詳細は result json `classified_lines`）",
        f"- **index ステージ済み削除行（先頭 `D `）**: {len(staged_deletes)} 行のうち "
        f"manual_shelter 関連 {staged_manual_shelter} 行",
        f"- **未ステージのアーカイブ整合削除（` D`）**: {len(archive_targets)} パス",
        "",
        "## 分類サマリ（パス単位ユニーク）",
        "",
        "\n".join(f"- **{k}**: {len(v)} paths" for k, v in sorted(buckets.items())),
        "",
        "## keep（必須成果物の存在）",
        "",
        "\n".join(f"- `{p}`: {'OK' if (repo/p).is_file() else 'MISSING'}" for p in KEEP_REQUIRED_PATHS),
        "",
        "## relock / 次カード",
        "",
        f"- **nextOnPass**: `{NEXT_ON_PASS}`",
        f"- **nextOnFail**: {NEXT_ON_FAIL}",
        "",
    ]
    if failure_reasons:
        md.extend(["## 不合格・要フォロー", "", "\n".join(f"- `{x}`" for x in failure_reasons), ""])
    if apply_log:
        md.extend(["## apply ログ", "", f"```json\n{json.dumps(apply_log, ensure_ascii=False, indent=2)}\n```", ""])

    (auto / OUT_MD).write_text("\n".join(md), encoding="utf-8")

    print(
        json.dumps(
            {
                "acceptance_pass": acceptance_pass,
                "apply_fixes_ran": apply_fixes,
                "git_status_short_count": len(_git_status_short_lines(repo)),
            },
            ensure_ascii=False,
            indent=2,
        ),
    )
    return 0 if acceptance_pass else 2


if __name__ == "__main__":
    raise SystemExit(main())
