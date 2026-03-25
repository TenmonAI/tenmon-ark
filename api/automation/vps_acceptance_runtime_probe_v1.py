#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""runtime_probe_matrix.json — seal と同型の /api/chat 10 本（再利用可能な関数）"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict


def _post_chat(base: str, chat_url: str, message: str, thread_id: str, timeout: float = 40.0) -> tuple[int, str]:
    body = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        chat_url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8", errors="replace")


def discover_chat_url(base: str) -> str | None:
    b = base.rstrip("/")
    for path in ("/chat", "/api/chat"):
        url = b + path
        try:
            _post_chat(b, url, "ping", "vps-accept-discover", timeout=12.0)
            return url
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
            continue
    return None


def write_runtime_matrix(base: str, out_path: Path) -> Dict[str, Any]:
    tests = [
        {"name": "general_1", "message": "AIとは何？"},
        {"name": "support_1", "message": "どう進めればいい？"},
        {"name": "selfaware_1", "message": "天聞アークに意識はあるの？"},
        {"name": "define_1", "message": "言霊とは何？"},
        {"name": "scripture_1", "message": "法華経とは何を説くの？"},
        {"name": "continuity_1", "message": "さっきの話を踏まえて次の一手をください"},
        {"name": "nextstep_1", "message": "次の一手だけを明確にください"},
        {"name": "compare_1", "message": "GPTと天聞アークの違いを比較して"},
        {"name": "worldview_1", "message": "なぜ文明と言葉は関係するの？"},
        {"name": "longform_1", "message": "天聞アークが世界最高AIになるための未達点を詳しく説明して"},
    ]
    chat_url = discover_chat_url(base)
    res: Dict[str, Any] = {"_meta": {"chat_url_used": chat_url, "card": "TENMON_VPS_ACCEPTANCE_OS_V1"}}
    if not chat_url:
        for t in tests:
            res[t["name"]] = {"ok": False, "error": "no_chat_url"}
    else:
        for t in tests:
            try:
                status, body = _post_chat(base, chat_url, t["message"], f"vps-acc-{t['name']}")
                res[t["name"]] = {"ok": True, "status": status, "body": body}
            except Exception as e:
                res[t["name"]] = {"ok": False, "error": str(e)}
            time.sleep(0.12)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(res, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return res


def runtime_all_ok(matrix: Dict[str, Any]) -> bool:
    ok_n = 0
    tot = 0
    for k, row in matrix.items():
        if k == "_meta" or not isinstance(row, dict):
            continue
        tot += 1
        if row.get("ok"):
            ok_n += 1
    return tot > 0 and ok_n == tot
