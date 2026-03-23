#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Canonical git repo root discovery for api/automation/* CLIs.

When cwd is e.g. /root (no .git above), fall back to walking upward from
this file's directory (…/api/automation), which sits inside the repo.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional


def _walk_git_root(start: Path) -> Optional[Path]:
    cur = start.resolve()
    for _ in range(28):
        if (cur / ".git").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return None


def repo_root_from(start: Path) -> Path:
    """
    Prefer .git discovered from ``start`` (usually Path.cwd()).
    Then try from this module's directory (api/automation/).
    Last resort: ``start.resolve()`` (legacy; may be wrong if cwd is not in repo).
    """
    hit = _walk_git_root(start)
    if hit is not None:
        return hit
    here = Path(__file__).resolve().parent
    hit = _walk_git_root(here)
    if hit is not None:
        return hit
    return start.resolve()
