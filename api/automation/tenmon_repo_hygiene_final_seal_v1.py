#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1

safe purge（allowlist） + .gitignore 正規化 + hygiene 分類 + gate + 条件付き seal commit。
git clean -fdx は使用しない。
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from repo_manifest_v1 import (
    classify_hygiene,
    git_porcelain,
    is_generated_purge_candidate,
    is_kept_source,
    load_json as load_json_allow,
)

CARD = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
LEGACY_CARD = "TENMON_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1"
NEXT_ON_PASS = "TENMON_AUTONOMY_CONSTITUTION_SEAL_V1"
NEXT_ON_FAIL_NOTE = "停止。retry 1枚のみ生成。"
RETRY_CARD = "TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_RETRY_CURSOR_AUTO_V1"
OUT_VERDICT = "tenmon_repo_hygiene_final_seal_verdict.json"
OUT_SUMMARY = "tenmon_repo_hygiene_final_seal_summary.json"
OUT_MD = "tenmon_repo_hygiene_final_seal_report.md"
OUT_RETRY_HINT = "retry_cursor_card_hint.md"

GI_BEGIN = "# BEGIN TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_V1"
GI_END = "# END TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_V1"


def utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def load_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def repo_root_from_here(here: Path) -> Path:
    return here.parents[2]


def classify_from_watchdog(wg: dict[str, Any]) -> dict[str, Any]:
    cleanup = wg.get("cleanup_candidates") or []
    if not isinstance(cleanup, list):
        cleanup = []
    ign = wg.get("ignore_candidates") or []
    if not isinstance(ign, list):
        ign = []
    manual = wg.get("manual_review_candidates") or []
    if not isinstance(manual, list):
        manual = []
    buckets = wg.get("buckets") or {}
    gen_noise = buckets.get("generated_noise") if isinstance(buckets, dict) else []
    if not isinstance(gen_noise, list):
        gen_noise = []

    def is_generated_bucket(p: str) -> bool:
        q = p.replace("\\", "/").lower()
        return any(
            x in q
            for x in (
                "generated_cursor_apply",
                "generated_vps_cards",
                "automation/out",
                "api/out/",
            )
        )

    generated_cleanup = [p for p in cleanup if is_generated_bucket(str(p))]
    runtime_artifact = [p for p in gen_noise if str(p) not in generated_cleanup][:400]
    return {
        "generated_cleanup_candidates": generated_cleanup[:500],
        "runtime_artifact_cleanup_candidates": runtime_artifact[:500],
        "ignore_candidates": ign[:500],
        "manual_review_candidates": manual[:500],
    }


def sync_gitignore_generated_block(
    repo: Path, line_list: list[str], dry_run: bool
) -> tuple[list[str], bool]:
    gi = repo / ".gitignore"
    existing = gi.read_text(encoding="utf-8") if gi.exists() else ""
    block_body = [ln.rstrip() for ln in line_list if (ln or "").strip()]
    block = "\n".join([GI_BEGIN, *block_body, GI_END]) + "\n"

    if GI_BEGIN in existing and GI_END in existing:
        i0 = existing.index(GI_BEGIN)
        i1 = existing.index(GI_END, i0) + len(GI_END)
        pre = existing[:i0]
        post = existing[i1:]
        new_body = pre.rstrip() + "\n\n" + block + post.lstrip("\n")
    else:
        new_body = existing.rstrip() + "\n\n" + block if existing.strip() else block
    if not new_body.endswith("\n"):
        new_body += "\n"
    if dry_run:
        return block_body, False
    gi.write_text(new_body, encoding="utf-8")
    return block_body, True


def safe_rmtree(repo: Path, rel: str, dry_run: bool) -> tuple[str, bool]:
    p = (repo / rel).resolve()
    try:
        repo_r = repo.resolve()
        if not str(p).startswith(str(repo_r)) or repo_r == p:
            return rel, False
    except Exception:
        return rel, False
    if not p.exists():
        return rel, False
    if dry_run:
        return rel, True
    if p.is_dir():
        shutil.rmtree(p, ignore_errors=False)
    else:
        p.unlink(missing_ok=True)
    return rel, True


def _git_ls_files_tracked(repo: Path, rel: str) -> bool:
    pr = subprocess.run(
        ["git", "-C", str(repo), "ls-files", "--", rel],
        capture_output=True,
        text=True,
        check=False,
    )
    return bool((pr.stdout or "").strip())


def purge_chat_ts_bak_untracked(repo: Path, dry_run: bool) -> list[str]:
    """watchdog の chat_ts_bak 判定（パスに chat.ts.bak を含む）に合わせ、untracked のみ削除。"""
    removed: list[str] = []
    skip_dir = {"node_modules", ".git", "dist", "build", ".pnpm-store"}
    try:
        for root, dirs, files in os.walk(repo, topdown=True):
            dirs[:] = [
                d
                for d in dirs
                if d not in skip_dir and not d.startswith(".") and d != "__pycache__"
            ]
            for fn in files:
                p = Path(root) / fn
                try:
                    rel = str(p.relative_to(repo)).replace("\\", "/")
                except ValueError:
                    continue
                if "chat.ts.bak" not in rel.lower():
                    continue
                if _git_ls_files_tracked(repo, rel):
                    continue
                if dry_run:
                    removed.append(rel)
                    continue
                try:
                    p.unlink(missing_ok=True)
                    removed.append(rel)
                except OSError:
                    pass
    except OSError:
        return removed
    return removed


def purge_untracked_generated(
    repo: Path,
    gen: dict[str, Any],
    allow: dict[str, Any],
    dry_run: bool,
) -> tuple[list[str], list[str]]:
    removed: list[str] = []
    skipped_kept: list[str] = []
    for row in git_porcelain(repo):
        if (row.get("xy") or "").strip() != "??":
            continue
        rel = (row.get("path") or "").strip()
        if not rel:
            continue
        reln = rel.replace("\\", "/")
        if is_kept_source(reln, allow):
            if is_generated_purge_candidate(reln, gen):
                skipped_kept.append(reln)
            continue
        if not is_generated_purge_candidate(reln, gen):
            continue
        p = (repo / reln).resolve()
        try:
            repo_r = repo.resolve()
            if not str(p).startswith(str(repo_r)):
                continue
        except Exception:
            continue
        if dry_run:
            removed.append(reln)
            continue
        try:
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            else:
                p.unlink(missing_ok=True)
        except OSError:
            pass
        removed.append(reln)
    return removed, skipped_kept


def _http_json_ok(base: str, path: str) -> tuple[bool, int, str]:
    url = base.rstrip("/") + path
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:  # noqa: S310
            code = getattr(resp, "status", 200) or 200
            raw = (resp.read() or b"").decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        code = e.code
        try:
            raw = (e.read() or b"").decode("utf-8", errors="replace")
        except Exception:
            raw = str(e)
    except Exception as e:
        return False, -1, str(e)
    ok_body = True
    try:
        j = json.loads(raw) if raw.strip().startswith("{") else {}
        if isinstance(j, dict) and "ok" in j:
            ok_body = bool(j.get("ok"))
    except Exception:
        pass
    return (200 <= code < 300) and ok_body, code, raw[:500]


def run_cmd(
    argv: list[str],
    cwd: Path,
    env: dict[str, str] | None = None,
) -> tuple[int, str, str]:
    pr = subprocess.run(
        argv,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    return pr.returncode, (pr.stdout or "")[-8000:], (pr.stderr or "")[-8000:]


_HYGIENE_BLOCKER_KEYS = (
    "repo_hygiene",
    "hygiene_watchdog",
    "massive_untracked",
    "seal_input_guard",
    "hygiene_guard",
)


def hygiene_attributed_product_notes(system_verdict: dict[str, Any]) -> list[str]:
    out: list[str] = []
    subs = system_verdict.get("subsystems")
    if not isinstance(subs, dict):
        return out
    for name, blob in subs.items():
        if not isinstance(blob, dict):
            continue
        for b in blob.get("primary_blockers") or []:
            s = str(b).lower()
            if any(k in s for k in _HYGIENE_BLOCKER_KEYS):
                out.append(f"{name}:{b}")
    return out[:40]


def try_seal_commit(
    repo: Path,
    auto: Path,
    summary: dict[str, Any],
    dry_run: bool,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "attempted": False,
        "committed": False,
        "sha": "",
        "message": "",
    }
    if dry_run or os.environ.get("TENMON_REPO_HYGIENE_FINAL_SEAL_COMMIT", "") != "1":
        return result
    if not summary.get("seal_candidate_ready"):
        return result
    paths = [
        ".gitignore",
        "api/automation/repo_hygiene_source_allowlist_v1.json",
        "api/automation/repo_hygiene_generated_patterns_v1.json",
        "api/automation/repo_manifest_v1.py",
        "api/automation/tenmon_repo_hygiene_final_seal_v1.py",
        "api/automation/tenmon_repo_hygiene_final_seal_summary.json",
        "api/automation/tenmon_repo_hygiene_final_seal_verdict.json",
        "api/automation/tenmon_repo_hygiene_final_seal_report.md",
        "api/scripts/tenmon_repo_hygiene_final_seal_v1.sh",
        "api/docs/constitution/TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1.md",
    ]
    result["attempted"] = True
    for rel in paths:
        p = repo / rel
        if p.exists():
            r = subprocess.run(
                ["git", "-C", str(repo), "add", "--", rel],
                capture_output=True,
                text=True,
                check=False,
            )
            if r.returncode != 0:
                result["error"] = f"git add failed: {rel}: {r.stderr}"
                return result
    msg = "seal(repo): normalize hygiene after real closed-loop proof"
    r = subprocess.run(
        ["git", "-C", str(repo), "commit", "-m", msg],
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode != 0 and "nothing to commit" in (r.stdout + r.stderr).lower():
        result["committed"] = False
        result["noop"] = True
        return result
    if r.returncode != 0:
        result["error"] = (r.stderr or r.stdout or "")[:2000]
        return result
    result["committed"] = True
    result["message"] = msg
    rh = subprocess.run(
        ["git", "-C", str(repo), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
    )
    if rh.returncode == 0:
        result["sha"] = (rh.stdout or "").strip()
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", default=os.environ.get("TENMON_REPO_ROOT", ""))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument("--skip-watchdog", action="store_true")
    ap.add_argument("--skip-gates", action="store_true")
    ap.add_argument("--skip-rejudge", action="store_true")
    ap.add_argument(
        "--gate-base",
        default=os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000"),
        help="/api/health 他のベース URL",
    )
    args = ap.parse_args()

    here = Path(__file__).resolve()
    repo = Path(args.repo_root).resolve() if args.repo_root else repo_root_from_here(here)
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    allow_path = auto / "repo_hygiene_source_allowlist_v1.json"
    gen_path = auto / "repo_hygiene_generated_patterns_v1.json"
    allow = load_json_allow(allow_path)
    gen = load_json_allow(gen_path)

    wg_path = auto / "tenmon_repo_hygiene_watchdog_verdict.json"
    wg = load_json(wg_path)
    phase_watchdog_snapshot = classify_from_watchdog(wg)

    classify_before = classify_hygiene(repo, allow, gen)

    removed_dirs: list[str] = []
    skipped_dirs: list[str] = []
    for rel in gen.get("safe_relative_rmdirs") or []:
        r, ok = safe_rmtree(repo, str(rel).replace("\\", "/"), args.dry_run)
        if ok:
            removed_dirs.append(r)
        else:
            skipped_dirs.append(r)

    gi_lines = [str(x) for x in (gen.get("gitignore_lines") or [])]
    gi_added, gi_touched = sync_gitignore_generated_block(repo, gi_lines, args.dry_run)

    purged_files, skipped_kept_under_generated = purge_untracked_generated(
        repo, gen, allow, args.dry_run
    )
    bak_removed = purge_chat_ts_bak_untracked(repo, args.dry_run)

    classify_after = classify_hygiene(repo, allow, gen)
    counts_after = classify_after.get("counts") or {}

    gate_base = str(args.gate_base)
    build_rc, build_out, build_err = -1, "", ""
    health_ok, audit_ok, audit_build_ok = False, False, False
    health_code, audit_code, ab_code = -1, -1, -1
    health_err = ""

    if not args.skip_gates:
        api_dir = repo / "api"
        build_rc, build_out, build_err = run_cmd(["npm", "run", "build"], cwd=api_dir)
        health_ok, health_code, health_err = _http_json_ok(gate_base, "/api/health")
        audit_ok, audit_code, _ = _http_json_ok(gate_base, "/api/audit")
        audit_build_ok, ab_code, _ = _http_json_ok(gate_base, "/api/audit.build")

    wd_rc: int | None = None
    watchdog_after: dict[str, Any] = {}
    watchdog_py = auto / "tenmon_repo_hygiene_watchdog_v1.py"
    run_watchdog = (
        not args.skip_watchdog
        and not args.dry_run
        and watchdog_py.exists()
    )
    if run_watchdog:
        pr = subprocess.run(
            ["python3", str(watchdog_py)],
            cwd=str(repo),
            capture_output=True,
            text=True,
            check=False,
        )
        wd_rc = pr.returncode
        watchdog_after = load_json(wg_path)

    rejudge_rc: int | None = None
    rejudge_sh = repo / "api" / "scripts" / "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh"
    if not args.skip_rejudge and not args.dry_run and rejudge_sh.exists():
        pr2 = subprocess.run(
            ["bash", str(rejudge_sh)],
            cwd=str(repo),
            env={**os.environ, "TENMON_REPO_ROOT": str(repo), "TENMON_GATE_BASE": gate_base},
            capture_output=True,
            text=True,
            check=False,
        )
        rejudge_rc = pr2.returncode

    unsafe_unknown = int(counts_after.get("unsafe_unknown_untracked", 0))
    untracked_generated_left = int(counts_after.get("generated_residue_untracked", 0))

    if watchdog_after:
        must_block = bool(watchdog_after.get("must_block_seal"))
    elif args.skip_watchdog or args.dry_run:
        must_block = unsafe_unknown > 0 or untracked_generated_left > 0
    else:
        must_block = bool(wg.get("must_block_seal"))

    sv = load_json(auto / "tenmon_system_verdict.json")
    hygiene_notes = hygiene_attributed_product_notes(sv)
    hygiene_product_failure = bool(hygiene_notes)

    gates_ok = bool(
        not args.skip_gates
        and build_rc == 0
        and health_ok
        and audit_ok
        and audit_build_ok
    )
    if args.skip_gates:
        gates_ok = True

    partial_run = (
        args.dry_run or args.skip_gates or args.skip_watchdog or args.skip_rejudge
    )
    repo_hygiene_clean = (
        not must_block
        and unsafe_unknown == 0
        and untracked_generated_left == 0
        and gates_ok
    )
    rejudge_ok = rejudge_rc == 0 and not args.skip_rejudge
    seal_candidate_ready = (
        not partial_run
        and repo_hygiene_clean
        and not hygiene_product_failure
        and rejudge_ok
    )

    summary: dict[str, Any] = {
        "card": CARD,
        "legacy_card": LEGACY_CARD,
        "generated_at": utc(),
        "dry_run": args.dry_run,
        "partial_run": partial_run,
        "repo_hygiene_clean": repo_hygiene_clean,
        "seal_candidate_ready": seal_candidate_ready,
        "must_block_seal": must_block,
        "unsafe_unknown_count": unsafe_unknown,
        "untracked_generated_count": untracked_generated_left,
        "gates_all_pass": gates_ok,
        "build": {
            "exit_code": build_rc,
            "ok": build_rc == 0,
            "stdout_tail": build_out[-1200:],
            "stderr_tail": build_err[-1200:],
        }
        if not args.skip_gates
        else {"skipped": True},
        "http": {
            "base": gate_base,
            "health_ok": health_ok,
            "health_code": health_code,
            "health_note": health_err[:300],
            "audit_ok": audit_ok,
            "audit_code": audit_code,
            "audit_build_ok": audit_build_ok,
            "audit_build_code": ab_code,
        },
        "watchdog": {
            "exit_code": wd_rc,
            "must_block_seal": must_block,
            "untracked_count": watchdog_after.get("untracked_count", wg.get("untracked_count")),
            "seal_blockers_head": (watchdog_after.get("seal_blockers") or wg.get("seal_blockers") or [])[
                :20
            ],
        },
        "rejudge_script": {"exit_code": rejudge_rc, "skipped": args.skip_rejudge},
        "system_verdict_hygiene_blockers": hygiene_notes,
        "classify_before_counts": classify_before.get("counts"),
        "classify_after_counts": counts_after,
        "inputs_readonly": {
            "watchdog_verdict": str(wg_path),
            "system_verdict": str(auto / "tenmon_system_verdict.json"),
            "rejudge_verdict": str(auto / "tenmon_latest_state_rejudge_and_seal_refresh_verdict.json"),
        },
    }

    commit_info = try_seal_commit(repo, auto, summary, args.dry_run)
    summary["seal_commit"] = commit_info
    summary["next_on_pass"] = NEXT_ON_PASS
    summary["next_on_fail_note"] = NEXT_ON_FAIL_NOTE
    summary["retry_card"] = RETRY_CARD
    summary["execution_order_phase_d"] = [
        "npm_run_build(api)",
        "GET_/api/health",
        "GET_/api/audit",
        "GET_/api/audit.build",
        "tenmon_repo_hygiene_watchdog_v1.py",
        "tenmon_latest_state_rejudge_and_seal_refresh_v1.sh",
    ]

    exit_code = 0
    if not args.dry_run:
        if not gates_ok:
            exit_code = 2
        elif must_block:
            exit_code = 3
        elif unsafe_unknown > 0:
            exit_code = 4
        elif untracked_generated_left > 0:
            exit_code = 5
        elif hygiene_product_failure:
            exit_code = 6
        elif rejudge_rc not in (None, 0) and not args.skip_rejudge:
            exit_code = 7
        elif not seal_candidate_ready:
            exit_code = 8
    summary["exit_code"] = 0 if args.dry_run else exit_code

    verdict: dict[str, Any] = {
        "card": CARD,
        "legacy_card": LEGACY_CARD,
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "retry_card": RETRY_CARD,
        "exit_code": summary["exit_code"],
        "generated_at": summary["generated_at"],
        "dry_run": args.dry_run,
        "phase_a_watchdog_classification": phase_watchdog_snapshot,
        "phase_a_classify_before": classify_before,
        "phase_b_safe_removed_dirs": removed_dirs,
        "phase_b_skipped_dirs": skipped_dirs,
        "phase_b_purged_untracked_generated": purged_files,
        "phase_b_skipped_kept_under_generated_rule": skipped_kept_under_generated,
        "phase_b_purged_chat_ts_bak_untracked": bak_removed,
        "phase_c_gitignore_block_lines": gi_added,
        "phase_c_gitignore_touched": gi_touched,
        "phase_d_gates": {
            "skipped": args.skip_gates,
            "npm_build_exit": build_rc,
            "health": {"ok": health_ok, "code": health_code},
            "audit": {"ok": audit_ok, "code": audit_code},
            "audit_build": {"ok": audit_build_ok, "code": ab_code},
        },
        "phase_d_watchdog_exit_code": wd_rc,
        "phase_e_rejudge_exit_code": rejudge_rc,
        "watchdog_after_head": {
            "must_block_seal": watchdog_after.get("must_block_seal"),
            "untracked_count": watchdog_after.get("untracked_count"),
            "generated_noise_count": watchdog_after.get("generated_noise_count"),
        }
        if watchdog_after
        else {},
        "phase_after_classify": classify_after,
        "summary": summary,
        "inputs_readonly": summary["inputs_readonly"],
    }

    (auto / OUT_SUMMARY).write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (auto / OUT_VERDICT).write_text(
        json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    md = [
        f"# {CARD}",
        "",
        f"- legacy alias: `{LEGACY_CARD}`",
        f"- generated_at: `{summary['generated_at']}`",
        f"- dry_run: `{args.dry_run}`",
        "",
        "## Summary",
        f"- repo_hygiene_clean: `{summary['repo_hygiene_clean']}`",
        f"- seal_candidate_ready: `{summary['seal_candidate_ready']}`",
        f"- must_block_seal: `{summary['must_block_seal']}`",
        f"- unsafe_unknown_count: `{summary['unsafe_unknown_count']}`",
        f"- untracked_generated_count: `{summary['untracked_generated_count']}`",
        f"- gates_all_pass: `{summary['gates_all_pass']}`",
        "",
        "## Phase B",
        "### removed dirs",
    ]
    md.extend([f"- `{x}`" for x in removed_dirs] if removed_dirs else ["- (none)"])
    md.append("### purged untracked (generated allowlist)")
    md.extend([f"- `{x}`" for x in purged_files[:80]] if purged_files else ["- (none)"])
    md.extend(
        [
            "",
            "## Phase C .gitignore",
            f"- block lines: {len(gi_added)}",
            f"- touched: `{gi_touched}`",
            "",
            "## Phase D gates",
            f"- build_rc: `{build_rc}`",
            f"- health_ok: `{health_ok}`",
            f"- audit_ok: `{audit_ok}`",
            f"- audit_build_ok: `{audit_build_ok}`",
            "",
            "## Watchdog",
            f"- must_block_seal: `{must_block}`",
            f"- untracked_count: `{summary['watchdog'].get('untracked_count')}`",
            "",
            "## Chain",
            f"- next_on_pass: `{NEXT_ON_PASS}`",
            f"- retry_card: `{RETRY_CARD}`",
            f"- {NEXT_ON_FAIL_NOTE}",
            "",
            "## Exit",
            f"- exit_code: `{summary['exit_code']}`（2=gate 3=watchdog_block 4=unsafe 5=generated 6=system_hygiene 7=rejudge 8=not_seal_candidate）",
            "",
            "## Seal commit",
            json.dumps(commit_info, ensure_ascii=False, indent=2),
        ]
    )
    (auto / OUT_MD).write_text("\n".join(md) + "\n", encoding="utf-8")

    if args.stdout_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    if args.dry_run:
        return 0

    def _retry_hint_body() -> str:
        return (
            f"# {RETRY_CARD}\n\n"
            f"- {NEXT_ON_FAIL_NOTE}\n"
            f"- 親: `{CARD}`\n"
            f"- exit_code: `{exit_code}`\n"
            f"- summary: `{OUT_SUMMARY}`\n"
        )

    if exit_code != 0:
        (auto / OUT_RETRY_HINT).write_text(_retry_hint_body(), encoding="utf-8")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
