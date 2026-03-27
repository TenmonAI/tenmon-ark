#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_SELFAWARE_ROUTE_FAMILY_NORMALIZE_CURSOR_AUTO_V1 — probe + 結果 JSON"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_SELFAWARE_ROUTE_FAMILY_NORMALIZE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_selfaware_route_family_normalize_cursor_auto_v1.json"


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _post(base: str, msg: str, tid: str) -> dict[str, Any]:
    body = json.dumps({"message": msg, "threadId": tid}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base.rstrip('/')}/api/chat",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode("utf-8", errors="replace")
            j = json.loads(raw) if raw.strip() else {}
            return {"ok": True, "json": j if isinstance(j, dict) else {}}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200], "json": {}}


def _rr(resp: dict[str, Any]) -> str:
    j = resp.get("json") if isinstance(resp.get("json"), dict) else {}
    ku = ((j.get("decisionFrame") or {}).get("ku") or {}) if isinstance(j.get("decisionFrame"), dict) else {}
    return str(ku.get("routeReason") or "").strip()


def _is_selfaware_family(rr: str) -> bool:
    if not rr:
        return False
    if rr in ("AI_CONSCIOUSNESS_LOCK_V1", "TENMON_CONSCIOUSNESS_LOCK_V1", "WILL_CORE_PREEMPT_V1"):
        return True
    if rr == "R22_SELFAWARE_CONSCIOUSNESS_V1" or rr.startswith("R22_SELFAWARE_"):
        return True
    return False


def _is_scripture_family(rr: str) -> bool:
    if not rr:
        return False
    if rr in ("TENMON_SCRIPTURE_CANON_V1", "K1_TRACE_EMPTY_GATED_V1", "KATAKAMUNA_CANON_ROUTE_V1", "SCRIPTURE_LOCAL_RESOLVER_V4"):
        return True
    if "SCRIPTURE" in rr or rr.startswith("K1_"):
        return True
    return False


def _is_general_drop(rr: str) -> bool:
    return rr in ("NATURAL_GENERAL_LLM_TOP", "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1")


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_SELFAWARE_BASE", "http://127.0.0.1:3000").strip()
    skip = os.environ.get("TENMON_SELFAWARE_SKIP_PROBE", "").strip() in ("1", "true", "yes")

    build_ok = True
    if not os.environ.get("TENMON_SELFAWARE_SKIP_BUILD"):
        p = subprocess.run(["npm", "run", "build"], cwd=str(api), capture_output=True, text=True, timeout=600)
        build_ok = p.returncode == 0

    sa_ok = False
    sc_ok = False
    if not skip and build_ok:
        ts = str(int(time.time()))
        r1 = _post(base, "AIに意識はあるのか", f"sa_{ts}_1")
        r2 = _post(base, "意識と自己認識は同じか", f"sa_{ts}_2")
        r3 = _post(base, "法華経とは", f"sa_{ts}_3")
        rr1, rr2, rr3 = _rr(r1), _rr(r2), _rr(r3)
        sa_ok = (
            _is_selfaware_family(rr1)
            and not _is_general_drop(rr1)
            and _is_selfaware_family(rr2)
            and not _is_general_drop(rr2)
        )
        sc_ok = _is_scripture_family(rr3) and not _is_general_drop(rr3)

    ok = bool(build_ok and not skip and sa_ok and sc_ok)
    out = {
        "ok": ok,
        "card": CARD,
        "generated_at": _utc(),
        "files_touched": ["api/src/routes/chat.ts"],
        "build_ok": build_ok,
        "selfaware_family_ok": sa_ok,
        "scripture_family_ok": sc_ok,
        "rollback_used": False,
        "next_card_if_fail": None if ok else "TENMON_SELFAWARE_OVERRIDE_TRACE_CURSOR_AUTO_V1",
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
