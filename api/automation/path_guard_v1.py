#!/usr/bin/env python3
"""Glob-style path allow/deny for automation cards."""
from __future__ import annotations

import fnmatch
from typing import Iterable, List, Tuple


def _matches_one(path: str, pattern: str) -> bool:
    p = pattern.replace("\\", "/")
    path = path.replace("\\", "/")
    if p == "**/*" or p == "**":
        return True
    if p.endswith("/**"):
        base = p[:-3].rstrip("/")
        return path == base or path.startswith(base + "/")
    if "*" in p or "?" in p or "[" in p:
        return fnmatch.fnmatch(path, p)
    return path == p or path.startswith(p.rstrip("/") + "/")


def violates_forbidden(path: str, forbidden: Iterable[str]) -> List[str]:
    hits: List[str] = []
    for pat in forbidden:
        if _matches_one(path, pat):
            hits.append(pat)
    return hits


def allowed_only_violations(changed: Iterable[str], allowed: Iterable[str]) -> List[str]:
    """If allowed is empty, skip check (e.g. audit read-only)."""
    al = list(allowed)
    if not al:
        return []
    bad: List[str] = []
    for path in changed:
        path = path.replace("\\", "/")
        if not any(_matches_one(path, a) for a in al):
            bad.append(path)
    return bad


def classify_mixed_commit_roots(paths: Iterable[str]) -> Tuple[bool, List[str]]:
    """
    Mixed = more than one of {client, api_src, non_runtime_api}.
    non_runtime_api = api/docs + api/automation (tooling/docs may ship together).
    """
    roots: set[str] = set()
    for path in paths:
        path = path.replace("\\", "/")
        if path.startswith("client/"):
            roots.add("client")
        elif path.startswith("api/docs/") or path.startswith("api/automation/"):
            roots.add("non_runtime_api")
        elif path.startswith("api/src/"):
            roots.add("api_src")
        elif path.startswith("api/"):
            roots.add("api_other")
        else:
            roots.add("other")
    mixed = len(roots) > 1
    return mixed, sorted(roots)
