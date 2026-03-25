#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""repo manifest + hygiene 分類（tracked / untracked / generated / unknown）"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Set

from observation_os_common_v1 import CARD, VERSION, api_root, utc_now_iso

SKIP_DIRS: Set[str] = {"node_modules", "dist", ".git"}


def _walk(api: Path) -> Dict[str, Any]:
    dirs: List[str] = []
    files_by_ext: Dict[str, int] = {}
    automation_py = len(list((api / "automation").glob("**/*.py"))) if (api / "automation").is_dir() else 0
    scripts_sh = len(list((api / "scripts").glob("**/*.sh"))) if (api / "scripts").is_dir() else 0
    for root, dirnames, filenames in os.walk(api):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        rel = str(Path(root).relative_to(api))
        if rel == ".":
            rel = ""
        for d in dirnames:
            p = f"{rel}/{d}".strip("/")
            if p:
                dirs.append(p)
        for fn in filenames:
            ext = Path(fn).suffix.lower() or "(noext)"
            files_by_ext[ext] = files_by_ext.get(ext, 0) + 1
    dirs = sorted(set(dirs))
    return {
        "version": VERSION,
        "card": CARD,
        "generatedAt": utc_now_iso(),
        "api_root": str(api),
        "directory_count": len(dirs),
        "directories_sample": dirs[:200],
        "files_by_extension": dict(sorted(files_by_ext.items())),
        "approx_automation_py_files": automation_py,
        "approx_scripts_sh_files": scripts_sh,
    }


def load_json(path: Path) -> dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def git_porcelain(repo: Path) -> List[Dict[str, str]]:
    p = subprocess.run(
        ["git", "-C", str(repo), "status", "--porcelain"],
        capture_output=True,
        text=True,
        check=False,
    )
    if p.returncode != 0:
        return []
    rows: List[Dict[str, str]] = []
    for ln in (p.stdout or "").splitlines():
        if not ln.strip():
            continue
        xy = ln[:2]
        path = ln[3:].strip() if len(ln) > 3 else ""
        rows.append({"xy": xy, "path": path})
    return rows


def _norm(p: str) -> str:
    return p.replace("\\", "/")


def path_matches_glob(rel: str, pattern: str) -> bool:
    import re

    reln = _norm(rel)
    pat = _norm(pattern)
    if pat.endswith("/**"):
        pre = pat[:-3].rstrip("/")
        return reln == pre or reln.startswith(pre + "/")
    # `prefix/**/*suffix`（** = 0 段以上のサブディレクトリ）— pathlib の ** は直下を含まないことがあるため専用処理
    if "/**/" in pat:
        head, tail = pat.split("/**/", 1)
        pre = head.rstrip("/") + "/"
        if not reln.startswith(pre):
            return False
        remainder = reln[len(pre) :]
        tail_rx = fnmatch.translate(tail)
        if tail_rx.startswith("(?s:") and tail_rx.endswith(")\\Z"):
            tail_rx = tail_rx[len("(?s:") : -len(")\\Z")]
        elif tail_rx.endswith("\\Z"):
            tail_rx = tail_rx[:-2]
        if tail_rx.startswith("^"):
            tail_rx = tail_rx[1:]
        if tail_rx.endswith("$"):
            tail_rx = tail_rx[:-1]
        rx = "^(?:[^/]+/)*" + tail_rx + "$"
        return re.match(rx, remainder, re.IGNORECASE) is not None
    i, n, buf = 0, len(pat), []
    while i < n:
        if i + 1 < n and pat[i : i + 2] == "**":
            buf.append(".*")
            i += 2
        elif pat[i] == "*":
            buf.append("[^/]*")
            i += 1
        elif pat[i] == "?":
            buf.append(".")
            i += 1
        else:
            buf.append(re.escape(pat[i]))
            i += 1
    rx = "^" + "".join(buf) + "$"
    return re.match(rx, reln, re.IGNORECASE) is not None


def is_kept_source(rel: str, allow: dict[str, Any]) -> bool:
    reln = _norm(rel)
    for e in allow.get("keep_exact_paths") or []:
        if reln == _norm(str(e)):
            return True
    for p in allow.get("keep_prefixes") or []:
        pre = _norm(str(p))
        if reln == pre or reln.startswith(pre.rstrip("/") + "/"):
            return True
    for g in allow.get("keep_path_globs") or []:
        if path_matches_glob(reln, str(g)):
            return True
    return False


def is_generated_purge_candidate(rel: str, gen: dict[str, Any]) -> bool:
    reln = _norm(rel)
    for pre in gen.get("purge_untracked_path_prefixes") or []:
        p = _norm(str(pre))
        if reln.startswith(p):
            if reln.startswith("api/src/") or reln.startswith("web/src/"):
                return False
            return True
    for ex in gen.get("purge_untracked_exact_paths") or []:
        if reln == _norm(str(ex)):
            return True
    for pre in gen.get("purge_untracked_subtree_prefixes") or []:
        p = _norm(str(pre))
        pp = p.rstrip("/")
        if reln == pp or reln.startswith(pp + "/"):
            return True
    if reln.startswith("api/src/") or reln.startswith("web/src/"):
        return False
    base = Path(reln).name
    if reln.startswith("api/automation/"):
        for pat in gen.get("purge_untracked_basename_globs") or []:
            if fnmatch.fnmatch(base, str(pat)):
                return True
        if base.endswith(".md"):
            return True
        if base.endswith(".json"):
            return True
        if base.endswith(".txt"):
            return True
    return False


def classify_hygiene(
    repo: Path,
    allow: dict[str, Any],
    gen: dict[str, Any],
) -> dict[str, Any]:
    rows = git_porcelain(repo)
    tracked_intended: List[str] = []
    tracked_other: List[str] = []
    untracked_intended: List[str] = []
    generated_residue: List[str] = []
    unsafe_unknown: List[str] = []

    for r in rows:
        path = (r.get("path") or "").strip()
        if not path:
            continue
        xy = (r.get("xy") or "").strip()
        reln = _norm(path)
        untracked = xy == "??"
        if untracked:
            if is_kept_source(reln, allow):
                untracked_intended.append(reln)
            elif is_generated_purge_candidate(reln, gen):
                generated_residue.append(reln)
            else:
                unsafe_unknown.append(reln)
            continue
        if is_kept_source(reln, allow) or reln.startswith("api/src/") or reln.startswith("web/src/"):
            tracked_intended.append(reln)
        else:
            tracked_other.append(reln)

    def u(xs: List[str]) -> List[str]:
        s: set[str] = set()
        o: List[str] = []
        for x in xs:
            if x not in s:
                s.add(x)
                o.append(x)
        return o

    return {
        "version": 1,
        "generatedAt": utc_now_iso(),
        "repo_root": str(repo),
        "tracked_intended_source": u(tracked_intended)[:600],
        "tracked_other_dirty": u(tracked_other)[:400],
        "untracked_intended_source": u(untracked_intended)[:400],
        "generated_residue_untracked": u(generated_residue)[:800],
        "unsafe_unknown_untracked": u(unsafe_unknown)[:800],
        "counts": {
            "tracked_intended_source": len(u(tracked_intended)),
            "tracked_other_dirty": len(u(tracked_other)),
            "untracked_intended_source": len(u(untracked_intended)),
            "generated_residue_untracked": len(u(generated_residue)),
            "unsafe_unknown_untracked": len(u(unsafe_unknown)),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="repo_manifest_v1")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--write-md", type=str, default="")
    ap.add_argument(
        "--hygiene-classify-out",
        type=str,
        default="",
        help="repo + allowlist / generated_patterns から分類 JSON を出力",
    )
    ap.add_argument("--repo-root", type=str, default="", help="hygiene 分類時の repo root（既定: api 親）")
    args = ap.parse_args()

    api = api_root()
    body = _walk(api)
    text = json.dumps(body, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    if args.write_md:
        Path(args.write_md).write_text(
            f"# Repo manifest\n\n- dirs: {body['directory_count']}\n- generatedAt: {body['generatedAt']}\n",
            encoding="utf-8",
        )

    if args.hygiene_classify_out:
        repo = Path(args.repo_root).resolve() if args.repo_root else api.parent.resolve()
        auto = api / "automation"
        allow = load_json(auto / "repo_hygiene_source_allowlist_v1.json")
        gen = load_json(auto / "repo_hygiene_generated_patterns_v1.json")
        cls_body = classify_hygiene(repo, allow, gen)
        cls_body["walk_bundle"] = {"directory_count": body["directory_count"], "generatedAt": body["generatedAt"]}
        Path(args.hygiene_classify_out).write_text(
            json.dumps(cls_body, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
