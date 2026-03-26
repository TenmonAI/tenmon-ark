#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1

acceptance（厳格: build/health/audit.build/probes + rollback なし）PASS 時のみ
commit スクリプト生成または TENMON_TRUE_SELF_COMMIT_EXECUTE=1 で git commit。
FAIL / human override 時は commit 禁止・requeue 候補のみ。
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from acceptance_gated_self_commit_and_requeue_v1 import (
    build_summary_v1,
    strict_autoguard_steps_pass,
)

CARD = "TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE_CURSOR_AUTO_V1"
OUT_NAME = "true_self_commit_summary.json"
NEXT_ON_PASS = "TENMON_PWA_LIVED_PROOF_WORLDCLASS_SEAL_CURSOR_AUTO_V1"
NEXT_ON_FAIL_NOTE = "停止。self-commit retry 1枚のみ生成。"


def _utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        x = json.loads(path.read_text(encoding="utf-8"))
        return x if isinstance(x, dict) else None
    except Exception:
        return None


def _is_distish(rel: str) -> bool:
    parts = rel.replace("\\", "/").lower().split("/")
    return "dist" in parts or rel.lower().startswith("dist/")


def _safe_add_paths(repo: Path, patch_plan: dict[str, Any]) -> list[str]:
    raw = patch_plan.get("target_files") if isinstance(patch_plan.get("target_files"), list) else []
    out: list[str] = []
    root = repo.resolve()
    for r in raw:
        rel = str(r).strip().lstrip("/")
        if not rel or _is_distish(rel):
            continue
        p = (root / rel).resolve()
        try:
            p.relative_to(root)
        except ValueError:
            continue
        if p.is_file():
            out.append(rel)
    return sorted(set(out))


def _commit_message_true(patch_plan: dict[str, Any], strict_ok: bool, gate_ok: bool) -> str:
    card_id = str(
        os.environ.get("TENMON_CURSOR_CARD")
        or patch_plan.get("card")
        or patch_plan.get("source_card")
        or "unknown_card"
    )[:220]
    tfs = patch_plan.get("target_files") if isinstance(patch_plan.get("target_files"), list) else []
    route = (str(tfs[0]) if tfs else str(patch_plan.get("change_scope") or "unknown_route"))[:240]
    domain = str(patch_plan.get("risk_class") or patch_plan.get("domain") or "autonomy")[:100]
    acc = "PASS" if (strict_ok and gate_ok) else "FAIL"
    summary = (
        f"build+health+audit.build+probes strict={strict_ok} upstream_gate={gate_ok} rollback_must_be_false"
    )[:400]
    return (
        f"tenmon true self-commit ({CARD})\n\n"
        f"card_id: {card_id}\n"
        f"route: {route}\n"
        f"domain: {domain}\n"
        f"acceptance_summary: {acc} | {summary}\n"
    ).strip()


def _pass_requeue_candidate() -> dict[str, Any]:
    """PASS 後の主線候補（本カードの nextOnPass）。"""
    now = _utc()
    qid = secrets.token_hex(8)
    body = "\n".join(
        [
            f"OBJECTIVE: Continue after true self-commit gate PASS ({CARD}).",
            "",
            f"NEXT_ON_PASS: {NEXT_ON_PASS}",
            "",
            "EDIT_SCOPE: PWA lived proof / worldclass seal; minimal diff.",
            "",
            f"SOURCE_RUN_AT: {now}",
        ]
    )
    return {
        "id": qid,
        "cursor_card": NEXT_ON_PASS,
        "card_name": NEXT_ON_PASS,
        "card_body_md": body,
        "source": CARD,
        "submitted_at": now,
        "state": "ready",
        "risk_tier": "low",
        "dry_run_only": False,
        "fixture": False,
        "objective": f"Enqueue {NEXT_ON_PASS} after true self-commit PASS (candidate only).",
        "enqueue_reason": "true_self_commit_pass",
    }


def _fail_requeue_candidate() -> dict[str, Any]:
    now = _utc()
    qid = secrets.token_hex(8)
    body = "\n".join(
        [
            f"OBJECTIVE: Re-arm after true self-commit gate FAIL or override; minimal diff ({CARD}).",
            "",
            f"SUGGESTED_NEXT: {NEXT_ON_PASS}",
            "",
            "EDIT_SCOPE: single retry card; no success fabrication.",
            "",
            f"SOURCE_RUN_AT: {now}",
        ]
    )
    return {
        "id": qid,
        "cursor_card": NEXT_ON_PASS,
        "card_name": NEXT_ON_PASS,
        "card_body_md": body,
        "source": CARD,
        "submitted_at": now,
        "state": "ready",
        "risk_tier": "low",
        "dry_run_only": False,
        "fixture": False,
        "objective": "Queue rearm candidate only (contract: do not mutate remote_cursor_queue.json from this script).",
        "enqueue_reason": "true_self_commit_fail_requeue_candidate",
    }


def _write_commit_script(repo: Path, script_path: Path, paths: list[str], msg_path: Path) -> None:
    script_path.parent.mkdir(parents=True, exist_ok=True)
    root_s = str(repo.resolve())
    lines = [
        "#!/usr/bin/env bash",
        "# Generated by TENMON_TRUE_SELF_COMMIT_AFTER_ACCEPTANCE — review before run",
        "set -euo pipefail",
        f'cd "{root_s}"',
    ]
    if paths:
        lines.append("git add -- " + " ".join(f'"{p}"' for p in paths))
    else:
        lines.append("# no paths — manual: git add <paths>")
    lines.append(f'git commit -F "{msg_path.resolve()}"')
    script_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        script_path.chmod(0o755)
    except Exception:
        pass


def _git_head_sha(repo: Path) -> str | None:
    try:
        cp = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if cp.returncode == 0 and (cp.stdout or "").strip():
            return (cp.stdout or "").strip()
    except Exception:
        pass
    return None


def _try_git_commit(repo: Path, paths: list[str], msg_path: Path) -> tuple[bool, str | None, str]:
    if os.environ.get("TENMON_TRUE_SELF_COMMIT_EXECUTE", "").strip().lower() not in ("1", "true", "yes"):
        return False, None, "TENMON_TRUE_SELF_COMMIT_EXECUTE_not_set"
    if not paths:
        return False, None, "no_paths_to_add"
    cp1 = subprocess.run(
        ["git", "add", "--"] + paths,
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if cp1.returncode != 0:
        return False, None, f"git_add_failed:{(cp1.stderr or cp1.stdout or '')[:400]}"
    cp2 = subprocess.run(
        ["git", "commit", "-F", str(msg_path.resolve())],
        cwd=str(repo),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    if cp2.returncode != 0:
        return False, None, f"git_commit_failed:{(cp2.stderr or cp2.stdout or '')[:400]}"
    sha = _git_head_sha(repo)
    return True, sha, "ok"


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--build-probe-result", type=Path, required=True)
    ap.add_argument("--patch-plan", type=Path, required=True)
    ap.add_argument("--remote-cursor-queue", type=Path, required=True)
    ap.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="既定: api/automation/out/true_self_commit",
    )
    args = ap.parse_args()

    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    out_dir = (args.output_dir or (auto / "out" / "true_self_commit")).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    summary_path = out_dir / OUT_NAME

    override_p = Path(
        os.environ.get("TENMON_TRUE_SELF_COMMIT_OVERRIDE_FILE", str(auto / "tenmon_autonomy_human_override.signal"))
    ).expanduser()

    bp_path = args.build_probe_result.expanduser().resolve()
    pp_path = args.patch_plan.expanduser().resolve()
    q_path = args.remote_cursor_queue.expanduser().resolve()

    bp = _load_json(bp_path) or {}
    pp = _load_json(pp_path) or {}
    q = _load_json(q_path) or {}

    upstream = build_summary_v1(
        build_probe=bp if bp else None,
        patch_plan=pp if pp else None,
        queue_snapshot=q if q else None,
        queue_path=str(q_path),
    )
    strict_ok, strict_reason = strict_autoguard_steps_pass(bp) if bp else (False, "missing_build_probe")

    human_override = override_p.is_file()
    commit_allowed = bool(upstream.get("commit_ready")) and strict_ok and not human_override

    commit_executed = False
    commit_sha: str | None = None
    commit_skipped_reason: str | None = None
    commit_script_path: str | None = None
    commit_message_path: str | None = None
    requeue_candidate: dict[str, Any] | None = None

    ts = int(time.time())
    base_gate_ok = bool(upstream.get("commit_ready"))
    msg_body = _commit_message_true(pp, strict_ok, base_gate_ok)
    msg_path = out_dir / f"commit_message_{ts}.txt"
    msg_path.write_text(msg_body + "\n", encoding="utf-8")
    commit_message_path = str(msg_path)

    if human_override:
        commit_skipped_reason = f"human_override_file_present:{override_p}"
        requeue_candidate = _fail_requeue_candidate()
    elif not upstream.get("commit_ready"):
        commit_skipped_reason = str(upstream.get("gate_reason") or "upstream_commit_not_ready")
        requeue_candidate = _fail_requeue_candidate()
    elif not strict_ok:
        commit_skipped_reason = f"strict_gate:{strict_reason}"
        requeue_candidate = _fail_requeue_candidate()
    else:
        paths = _safe_add_paths(repo, pp)
        sh_path = out_dir / f"git_commit_{ts}.sh"
        _write_commit_script(repo, sh_path, paths, msg_path)
        commit_script_path = str(sh_path)
        ok_ex, sha, why_ex = _try_git_commit(repo, paths, msg_path)
        if ok_ex:
            commit_executed = True
            commit_sha = sha
            commit_skipped_reason = None
        else:
            commit_executed = False
            commit_sha = None
            commit_skipped_reason = why_ex if not commit_executed else None

    out: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "next_on_pass": NEXT_ON_PASS,
        "next_on_fail_note": NEXT_ON_FAIL_NOTE,
        "commit_executed": commit_executed,
        "commit_sha": commit_sha,
        "commit_skipped_reason": commit_skipped_reason,
        "commit_allowed": commit_allowed,
        "commit_script_path": commit_script_path,
        "commit_message_path": commit_message_path,
        "strict_gate_ok": strict_ok,
        "strict_gate_reason": None if strict_ok else strict_reason,
        "human_override_file": str(override_p),
        "human_override_active": human_override,
        "upstream_acceptance_gated": upstream,
        "pass_requeue_candidate": _pass_requeue_candidate() if commit_allowed else None,
        "fail_requeue_candidate": requeue_candidate,
        "inputs": {
            "build_probe_result": str(bp_path),
            "cursor_patch_plan": str(pp_path),
            "remote_cursor_queue": str(q_path),
        },
    }

    summary_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    line = {
        "ok": commit_allowed and (commit_executed or commit_script_path is not None),
        "commit_executed": commit_executed,
        "commit_sha": commit_sha,
        "commit_skipped_reason": commit_skipped_reason,
        "commit_allowed": commit_allowed,
    }
    print(json.dumps(line, ensure_ascii=False), file=sys.stdout)
    return 0 if commit_allowed else 1


if __name__ == "__main__":
    raise SystemExit(main())
