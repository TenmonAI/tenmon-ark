#!/usr/bin/env python3
"""TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1 — grep 集計 + evidence JSON。"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

CARD = "TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1"


def grep_lines(repo: Path, subdir: str, pattern: str) -> list[str]:
    base = repo / subdir
    if not base.is_dir():
        return []
    try:
        p = subprocess.run(
            [
                "grep",
                "-RIn",
                "--include=*.ts",
                "--include=*.tsx",
                "-E",
                pattern,
                str(base),
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        out = (p.stdout or "").strip()
        return [ln for ln in out.splitlines() if ln.strip()]
    except Exception as e:
        return [f"grep_error:{e!r}"]


def find_bak_files(web_src: Path) -> list[str]:
    out: list[str] = []
    if not web_src.is_dir():
        return out
    for root, _dirs, files in os.walk(web_src):
        for fn in files:
            low = fn.lower()
            if ".bak" in low or low.endswith(".backup"):
                out.append(str(Path(root) / fn))
    return sorted(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", type=str, default="")
    ap.add_argument("--stdout-json", action="store_true")
    ap.add_argument(
        "--prune-web-bak",
        action="store_true",
        help="web/src 配下の .gitignore 対象 .bak* を evidence 記録後に削除（要確認）",
    )
    args = ap.parse_args()
    repo = Path(args.repo_root or os.environ.get("TENMON_REPO_ROOT", "")).resolve()
    if not repo.is_dir():
        repo = Path(__file__).resolve().parents[2]

    web_src = repo / "web" / "src"
    automation = repo / "api" / "automation"
    automation.mkdir(parents=True, exist_ok=True)
    out_path = automation / "pwa_frontend_residue_hygiene_evidence.json"

    reload_hits = grep_lines(repo, "web/src", r"window\.location\.reload|location\.reload")
    sessionid_hits = grep_lines(repo, "web/src", r"sessionId")
    reload_word_hits = grep_lines(repo, "web/src", r"reload")

    bak_files = find_bak_files(web_src)
    pruned: list[str] = []

    if args.prune_web_bak and bak_files:
        for fpath in bak_files:
            try:
                Path(fpath).unlink(missing_ok=True)
                pruned.append(fpath)
            except OSError as e:
                pruned.append(f"{fpath}:error:{e}")

    doc = {
        "card": CARD,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "repo_root": str(repo),
        "counts": {
            "window_location_reload_lines": len(reload_hits),
            "sessionId_lines": len(sessionid_hits),
            "reload_substring_lines": len(reload_word_hits),
            "web_src_bak_files": len(bak_files),
            "pruned_bak_files": len([x for x in pruned if ":error:" not in x]),
        },
        "hits": {
            "location_reload": reload_hits[:200],
            "sessionId": sessionid_hits[:200],
            "reload_substring": reload_word_hits[:80],
        },
        "bak_paths_sample": bak_files[:100],
        "prune_actions": pruned[:200] if pruned else [],
        "gitignore_notes": [
            "api/out/",
            "api/scripts/__pycache__/",
            "api/src/routes/30,",
            "api/src/routes/=",
            "**/*.bak*",
        ],
    }
    out_path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.stdout_json:
        print(json.dumps(doc, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
