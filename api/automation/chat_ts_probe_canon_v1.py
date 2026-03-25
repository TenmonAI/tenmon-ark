#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CHAT_TS_PROBE_CANON_V1 — runtime 10 本 + exit contract 5 probe の単一ソース読み込み。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

_CANON_PATH = Path(__file__).resolve().with_name("chat_ts_probe_canon_v1.json")


def canon_path() -> Path:
    return _CANON_PATH


def load_canon() -> Dict[str, Any]:
    raw = _CANON_PATH.read_text(encoding="utf-8", errors="replace")
    return json.loads(raw)


def runtime_probe_full_10() -> Dict[str, str]:
    data = load_canon()
    d = data.get("runtime_probe_full_10") or {}
    return {str(k): str(v) for k, v in d.items()}


def exit_contract_probe_5_ordered() -> List[Tuple[str, str]]:
    """route authority 表示順（general → selfaware → scripture → compare → longform）。"""
    data = load_canon()
    inner = data.get("exit_contract_probe_5") or {}
    order: List[str] = [
        "general_1",
        "selfaware_1",
        "scripture_1",
        "compare_1",
        "longform_1",
    ]
    out: List[Tuple[str, str]] = []
    for name in order:
        if name in inner:
            out.append((name, str(inner[name])))
    return out


def exit_contract_longform_message() -> str:
    data = load_canon()
    inner = data.get("exit_contract_probe_5") or {}
    return str(inner.get("longform_1") or "")
