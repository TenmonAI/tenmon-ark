#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_REFLECTION_STACK_WORKTREE_CONVERGENCE_CURSOR_AUTO_V1

dirty worktree を keep / seal / archive / delete に分類し JSON 出力（自動削除はしない・fail-closed）。
会話コア・trunk・finalize・responseComposer・web は編集しない。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_REFLECTION_STACK_WORKTREE_CONVERGENCE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_reflection_stack_worktree_convergence_cursor_auto_v1.json"
OUT_MD = "tenmon_reflection_stack_worktree_convergence_cursor_auto_v1.md"

HIGH_RISK_PREFIXES = (
    "api/src/routes/chat.ts",
    "api/src/routes/chat_refactor/general_trunk_v1.ts",
    "api/src/routes/chat_refactor/continuity_trunk_v1.ts",
    "api/src/routes/chat_refactor/finalize.ts",
    "api/src/core/responseComposer.ts",
    "web/",
)


def _run_git(repo: Path, *args: str) -> tuple[int, str]:
    try:
        r = subprocess.run(
            ["git", *args],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=120,
        )
        return r.returncode, (r.stdout or "") + (r.stderr or "")
    except Exception as e:
        return 1, str(e)


def _parse_status_short(text: str) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    """Return (modified_lines, untracked_lines) as list of (status, path)."""
    modified: list[tuple[str, str]] = []
    untracked: list[tuple[str, str]] = []
    for raw in text.splitlines():
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        if line.startswith("warning:") or line.startswith("fatal:"):
            continue
        if len(line) < 3:
            continue
        st = line[:2]
        rest = line[3:].strip()
        if " -> " in rest:
            rest = rest.split(" -> ", 1)[-1].strip()
        path = rest
        if not path:
            continue
        if st.strip() == "??" or st == "??":
            untracked.append((st, path))
        else:
            modified.append((st, path))
    return modified, untracked


def _infer_role(path: str) -> str:
    p = path.replace("\\", "/")
    if p.startswith("api/automation/"):
        if p.endswith(".json"):
            return "automation JSON artifact"
        if p.endswith(".md"):
            return "automation report MD"
        if p.endswith(".py"):
            return "automation script"
        return "automation path"
    if p.startswith("api/src/core/"):
        return "core module"
    if p.startswith("api/src/routes/"):
        return "route / trunk"
    if p.startswith("canon/"):
        return "canon"
    if p.startswith("web/"):
        return "web (out of scope for this card)"
    if p.startswith("dist/") or "/dist/" in p:
        return "dist (do not hand-edit)"
    if "evidence" in p or "_v1/" in p and p.count("/") > 4:
        return "timestamped evidence / loop bundle"
    return "repository file"


def _classify(
    path: str,
    kind: str,
) -> tuple[str, str, str]:
    """
    decision: keep | seal | archive | delete
    fail-closed: 高リスク本幹・不明は keep
    """
    p = path.replace("\\", "/")
    for hp in HIGH_RISK_PREFIXES:
        if p == hp or p.startswith(hp):
            return (
                _infer_role(p),
                "keep",
                "high-risk mainline or forbidden path: do not converge via this card",
            )
    if p.startswith("web/"):
        return (_infer_role(p), "keep", "web/src out of scope; no action here")

    if p.startswith("api/automation/"):
        base = Path(p).name
        if base.endswith((".tmp", ".bak")):
            return (_infer_role(p), "delete", "ephemeral temp; safe to remove if unneeded")
        if "/fractal_expansion_failover_bridge_evidence/" in p or "/autonomy_2h_master" in p:
            return (_infer_role(p), "archive", "timestamp evidence; move under archive/ if retaining")
        if (base.startswith("tenmon_") and base.endswith(".json")) or (
            base.endswith(".py") and "cursor_auto_v1" in base
        ):
            return (
                _infer_role(p),
                "seal",
                "convergence / seal / card artifact: commit when PASS after audit",
            )
        if base.endswith(".md") and base.startswith("tenmon_"):
            return (
                _infer_role(p),
                "seal",
                "card report MD: commit when PASS after audit",
            )
        return (_infer_role(p), "keep", "review then seal or archive")

    if kind == "untracked" and ("node_modules" in p or p.endswith(".log")):
        return (_infer_role(p), "delete", "generated noise; gitignore or remove locally")

    if kind == "untracked" and p.count("/") >= 6 and ("loop_" in p or "evidence" in p):
        return (_infer_role(p), "archive", "nested run artifact; archive if historical")

    return (_infer_role(p), "keep", "ambiguous: manual review before seal")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    rc, status_out = _run_git(repo, "status", "--short")
    rc2, name_out = _run_git(repo, "diff", "--name-only")
    rc3, stat_out = _run_git(repo, "diff", "--stat")

    modified_pairs, untracked_pairs = _parse_status_short(status_out)

    modified_entries: list[dict[str, Any]] = []
    for st, path in modified_pairs:
        role, decision, reason = _classify(path, "modified")
        modified_entries.append(
            {
                "path": path,
                "git_status": st.strip(),
                "role": role,
                "decision": decision,
                "reason": reason,
            }
        )

    untracked_entries: list[dict[str, Any]] = []
    for st, path in untracked_pairs:
        role, decision, reason = _classify(path, "untracked")
        untracked_entries.append(
            {
                "path": path,
                "git_status": "??",
                "role": role,
                "decision": decision,
                "reason": reason,
            }
        )

    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    ok = rc == 0 and rc2 == 0 and rc3 == 0

    # STEP 1 契約: トップレベル modified / untracked（path, role, decision, reason のみ）
    modified_table = [{k: e[k] for k in ("path", "role", "decision", "reason")} for e in modified_entries]
    untracked_table = [{k: e[k] for k in ("path", "role", "decision", "reason")} for e in untracked_entries]

    queue_hint: dict[str, Any] = {}
    for rel in ("remote_cursor_queue.json", "remote_cursor_result_bundle.json", "tenmon_cursor_single_flight_queue_state.json"):
        p = auto / rel
        queue_hint[rel] = {"exists": p.is_file(), "path": str(p)}

    out: dict[str, Any] = {
        "ok": ok,
        "card": CARD,
        "generated_at": ts,
        "repo_root": str(repo),
        "modified": modified_table,
        "untracked": untracked_table,
        "git": {
            "status_short_rc": rc,
            "diff_name_only_rc": rc2,
            "diff_stat_rc": rc3,
            "status_short": status_out.strip(),
            "diff_name_only": name_out.strip(),
            "diff_stat": stat_out.strip(),
        },
        "classification_detail": {
            "modified": modified_entries,
            "untracked": untracked_entries,
        },
        "automation_queue_observation": queue_hint,
        "integration_cards": {
            "worktree_classify": "TENMON_WORKTREE_CONVERGENCE_CLASSIFY_AND_FINALIZE_CURSOR_AUTO_V1",
            "final_seal_worktree": "TENMON_FINAL_CONVERSATION_SEAL_AND_WORKTREE_CONVERGENCE_CURSOR_AUTO_V1",
            "fractal_worktree": "TENMON_FRACTAL_WORKTREE_CONVERGENCE_AND_SEAL_CURSOR_AUTO_V1",
            "queue_repair": "TENMON_AUTONOMY_QUEUE_STATE_REPAIR_CURSOR_AUTO_V1",
            "result_return_repair": "TENMON_AUTONOMY_RESULT_RETURN_PATH_REPAIR_CURSOR_AUTO_V1",
        },
        "rollback_used": False,
        "next_card_if_fail": None if ok else "TENMON_FRACTAL_WORKTREE_CONVERGENCE_AND_SEAL_CURSOR_AUTO_V1",
        "notes": [
            "分類のみ。delete/archive は人手または専用カードで実行。",
            "latest_lived_truth_singleton / superseded report は再注入しない（観測のみ）。",
            "truth reasoning density は別カード（TENMON_TRUTH_REASONING_DENSITY_TUNE_*）。",
        ],
    }

    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{ts}`",
        f"- ok: `{ok}`",
        "",
        "## git status --short",
        "",
        "```",
        status_out.strip() or "(empty)",
        "```",
        "",
        "## STEP 1 classification — modified",
        "",
        json.dumps(out["modified"], ensure_ascii=False, indent=2),
        "",
        "## STEP 1 classification — untracked",
        "",
        json.dumps(out["untracked"], ensure_ascii=False, indent=2),
    ]
    (auto / OUT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(json.dumps({"ok": ok, "card": CARD, "modified_n": len(modified_entries), "untracked_n": len(untracked_entries)}, ensure_ascii=False))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
