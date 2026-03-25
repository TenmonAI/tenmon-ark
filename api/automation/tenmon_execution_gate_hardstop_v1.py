#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_EXECUTION_GATE_HARDSTOP_CURSOR_AUTO_V1

autopilot / 自動適用の前段で危険 patch・契約破壊・巨大 diff を機械遮断する。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

CARD = "TENMON_EXECUTION_GATE_HARDSTOP_CURSOR_AUTO_V1"
VERDICT_NAME = "tenmon_execution_gate_hardstop_verdict.json"
REPORT_MD = "tenmon_execution_gate_hardstop_report.md"
FAIL_NEXT = "TENMON_EXECUTION_GATE_HARDSTOP_RETRY_CURSOR_AUTO_V1"

# しきい値（広域改変の目安）
CHAT_TS_MAX_LINES_TOUCHED = 220
CORE_MAX_LINES_TOUCHED = 400
MAX_CHANGED_FILES = 35
MAX_DIFF_CHARS = 900_000
DIFF_SCORE_BLOCK = 120

FORBIDDEN_PATH_PREFIXES = (
    "dist/",
    "web/dist/",
    "api/dist/",
    "kokuzo_pages",
)

SMOKE_HYBRID_LLM_PAT = re.compile(
    r"smoke[-_]?hybrid.*LLM_CHAT|LLM_CHAT.*smoke[-_]?hybrid",
    re.I | re.S,
)


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def repo_root() -> Path:
    return Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()


def auto_dir() -> Path:
    return repo_root() / "api" / "automation"


def read_json(p: Path) -> dict[str, Any]:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def run_git(repo: Path, *args: str) -> tuple[int, str]:
    try:
        p = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
        )
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except Exception as e:
        return 1, str(e)


def git_diff_head(repo: Path) -> str:
    _, out = run_git(repo, "diff", "HEAD")
    return out[-MAX_DIFF_CHARS * 2 :] if len(out) > MAX_DIFF_CHARS * 2 else out


def git_numstat(repo: Path) -> list[tuple[str, int, int]]:
    rc, out = run_git(repo, "diff", "--numstat", "HEAD")
    rows: list[tuple[str, int, int]] = []
    if rc != 0:
        return rows
    for ln in out.splitlines():
        parts = ln.split("\t")
        if len(parts) < 3:
            continue
        add, rem, path = parts[0], parts[1], parts[2]
        try:
            a = 0 if add == "-" else int(add)
            r = 0 if rem == "-" else int(rem)
        except ValueError:
            continue
        rows.append((path.replace("\\", "/"), a, r))
    return rows


def forbidden_path_hit(path: str) -> str | None:
    p = path.replace("\\", "/").lower()
    for pre in FORBIDDEN_PATH_PREFIXES:
        if pre in p or p.startswith(pre.rstrip("*")):
            return f"forbidden_path:{pre}"
    if p.startswith("dist/") or "/dist/" in p:
        return "forbidden_path:dist"
    return None


def analyze_contract_diff(diff_text: str) -> list[str]:
    reasons: list[str] = []
    # 契約名の大量削除（ヒューリスティック）
    for sym in ("routeReason", "threadId", "decisionFrame"):
        if diff_text.count(f"-{sym}") + diff_text.count(f"- {sym}") > 8:
            reasons.append(f"contract_heuristic:mass_removal_{sym}")
    if SMOKE_HYBRID_LLM_PAT.search(diff_text):
        reasons.append("smoke_hybrid_thread_llm_chat_mix")
    # sessionId を mainline request に戻す匂い
    if re.search(r"\+.*sessionId.*\+.*request", diff_text, re.I) and "web/src" in diff_text:
        reasons.append("sessionId_reintroduction_suspected")
    return reasons


def seal_rush_without_acceptance(
    numstat: list[tuple[str, int, int]], wc: dict[str, Any]
) -> str | None:
    if not wc:
        return None
    if wc.get("sealed_operable_ready") or wc.get("worldclass_ready"):
        return None
    for path, _, _ in numstat:
        pl = path.replace("\\", "/").lower()
        if "seal" in pl and pl.endswith(".json") and "automation" in pl:
            return "seal_json_touch_without_acceptance_evidence"
    return None


def refresh_dangerous_report(repo: Path) -> dict[str, Any]:
    py = repo / "api" / "automation" / "dangerous_patch_blocker_v1.py"
    out = repo / "api" / "automation" / "dangerous_patch_blocker_report.json"
    if py.is_file():
        subprocess.run(
            [sys.executable, str(py), "--out", str(out)],
            cwd=str(repo),
            capture_output=True,
            timeout=60,
            check=False,
        )
    return read_json(out)


def compute_diff_score(numstat: list[tuple[str, int, int]], diff_len: int) -> float:
    files = len(numstat)
    lines = sum(a + r for _, a, r in numstat)
    return float(files) * 1.5 + lines / 80.0 + diff_len / 50000.0


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--repo-root", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo_root).resolve() if args.repo_root else repo_root()
    auto = auto_dir()

    blocked_reasons: list[str] = []
    high_risk_targets: list[str] = []

    dpr = refresh_dangerous_report(root)
    dangerous_patch_detected = bool(dpr.get("blocked"))
    if dangerous_patch_detected:
        blocked_reasons.append("dangerous_patch_blocker.blocked")
        high_risk_targets.extend(list(dpr.get("high_risk_hits") or []))
        for p in dpr.get("pattern_hits") or []:
            blocked_reasons.append(f"forbidden_pattern:{p}")

    numstat = git_numstat(root)
    diff_text = git_diff_head(root)
    diff_len = len(diff_text)

    if diff_len > MAX_DIFF_CHARS:
        blocked_reasons.append(f"diff_too_large:{diff_len}>{MAX_DIFF_CHARS}")

    if len(numstat) > MAX_CHANGED_FILES:
        blocked_reasons.append(f"too_many_files:{len(numstat)}>{MAX_CHANGED_FILES}")

    score = compute_diff_score(numstat, diff_len)
    if score > DIFF_SCORE_BLOCK:
        blocked_reasons.append(f"diff_score_exceeds:{score:.1f}>{DIFF_SCORE_BLOCK}")

    chat_lines = 0
    core_lines = 0
    for path, a, r in numstat:
        fp = path.replace("\\", "/")
        hit = forbidden_path_hit(fp)
        if hit:
            blocked_reasons.append(f"{hit}:{fp}")
        if fp == "api/src/routes/chat.ts" or fp.endswith("/api/src/routes/chat.ts"):
            chat_lines += a + r
        if fp.startswith("api/src/core/"):
            core_lines += a + r

    if chat_lines > CHAT_TS_MAX_LINES_TOUCHED:
        blocked_reasons.append(f"chat_ts_wide_change:{chat_lines}>{CHAT_TS_MAX_LINES_TOUCHED}")
        high_risk_targets.append("api/src/routes/chat.ts")

    if core_lines > CORE_MAX_LINES_TOUCHED:
        blocked_reasons.append(f"core_wide_change:{core_lines}>{CORE_MAX_LINES_TOUCHED}")
        high_risk_targets.append("api/src/core/**")

    blocked_reasons.extend(analyze_contract_diff(diff_text))

    wc = read_json(auto / "tenmon_worldclass_acceptance_scorecard.json")
    sr = seal_rush_without_acceptance(numstat, wc)
    if sr:
        blocked_reasons.append(sr)

    contract_break_detected = any(
        x.startswith("contract_heuristic") or x.startswith("smoke_") or x.startswith("sessionId")
        for x in blocked_reasons
    )

    must_block = bool(blocked_reasons)
    allowed_to_continue = not must_block
    pass_ok = allowed_to_continue

    verdict: dict[str, Any] = {
        "card": CARD,
        "generated_at": _utc(),
        "pass": pass_ok,
        "must_block": must_block,
        "dangerous_patch_detected": dangerous_patch_detected,
        "contract_break_detected": contract_break_detected,
        "high_risk_targets": list(dict.fromkeys(high_risk_targets))[:80],
        "blocked_reasons": blocked_reasons,
        "allowed_to_continue": allowed_to_continue,
        "recommended_retry_card": None if pass_ok else FAIL_NEXT,
        "inputs": {
            "dangerous_patch_blocker_report": str(auto / "dangerous_patch_blocker_report.json"),
            "diff_chars": diff_len,
            "changed_files_count": len(numstat),
            "diff_score": round(score, 2),
        },
        "evidence": {
            "dangerous_patch_blocker": dpr,
            "numstat_sample": numstat[:40],
        },
        "notes": [
            "dist / kokuzo_pages 直撃・chat.ts 広域・core 広域・巨大 diff・dangerous_patch_blocker を OR で block。",
            "契約は diff ヒューリスティック。FAIL 時は手元で原因特定後に再実行。",
        ],
    }

    auto.mkdir(parents=True, exist_ok=True)
    vpath = auto / VERDICT_NAME
    vpath.write_text(json.dumps(verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{verdict['generated_at']}`",
        f"- **pass**: `{pass_ok}`",
        f"- **must_block**: `{must_block}`",
        f"- **allowed_to_continue**: `{allowed_to_continue}`",
        "",
        "## blocked_reasons",
        "",
    ]
    for b in blocked_reasons:
        md_lines.append(f"- `{b}`")
    if not blocked_reasons:
        md_lines.append("- （なし）")
    md_lines.extend(
        [
            "",
            "## high risk",
            "",
            *[f"- `{x}`" for x in verdict["high_risk_targets"]],
            "",
            "## retry",
            "",
            f"- recommended: `{verdict['recommended_retry_card']}`",
            "",
        ]
    )
    (auto / REPORT_MD).write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    out = {"ok": True, "pass": pass_ok, "must_block": must_block, "path": str(vpath)}
    if args.stdout_json:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(out, ensure_ascii=False, indent=2))

    return 0 if pass_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
