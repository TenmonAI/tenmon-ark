#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_ROUTE_SOVEREIGNTY_FINAL_CLOSE_CURSOR_AUTO_V1 — 観測・probe・結果 JSON（build は別途）。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_ROUTE_SOVEREIGNTY_FINAL_CLOSE_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_route_sovereignty_final_close_cursor_auto_v1.json"


def _utc() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _http_get(url: str, timeout: int = 25) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            j = json.loads(raw) if raw.strip() else {}
            return {"ok_http": True, "status": r.getcode(), "json": j if isinstance(j, dict) else {}}
    except Exception as e:
        return {"ok_http": False, "error": str(e)[:200], "json": {}}


def _post_chat(base: str, message: str, thread_id: str) -> dict[str, Any]:
    base = base.rstrip("/")
    body = json.dumps({"message": message, "threadId": thread_id}, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/api/chat",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode("utf-8", errors="replace")
            j = json.loads(raw) if raw.strip() else {}
            return {"ok_http": True, "json": j if isinstance(j, dict) else {}}
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode("utf-8", errors="replace")
        except Exception:
            raw = ""
        return {"ok_http": False, "status": e.code, "raw": raw[:1500], "json": {}}
    except Exception as e:
        return {"ok_http": False, "error": str(e)[:200], "json": {}}


def _rr(resp: dict[str, Any]) -> str:
    j = resp.get("json") if isinstance(resp.get("json"), dict) else {}
    ku = ((j.get("decisionFrame") or {}).get("ku") or {}) if isinstance(j.get("decisionFrame"), dict) else {}
    return str(ku.get("routeReason") or "").strip()


def _meta_leak(j: dict[str, Any]) -> bool:
    t = str(j.get("response") or "")
    low = t.lower()
    return "cursor" in low and ("auto" in low or "gpt" in low)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_ROUTE_SOV_BASE", "http://127.0.0.1:3000").strip()
    skip_live = os.environ.get("TENMON_ROUTE_SOV_SKIP_PROBE", "").strip() in ("1", "true", "yes")

    build_ok = False
    if not os.environ.get("TENMON_ROUTE_SOV_SKIP_BUILD"):
        p = subprocess.run(["npm", "run", "build"], cwd=str(api), capture_output=True, text=True, timeout=600)
        build_ok = p.returncode == 0
    else:
        build_ok = True

    audit_ok = False
    general_ok = False
    cont_ok = False
    df_ok = True
    rollback_used = False

    if not skip_live and build_ok:
        h = _http_get(f"{base.rstrip('/')}/api/health")
        a = _http_get(f"{base.rstrip('/')}/api/audit")
        ab = _http_get(f"{base.rstrip('/')}/api/audit.build")
        hj = h.get("json") or {}
        aj = a.get("json") or {}
        abj = ab.get("json") or {}
        audit_ok = bool(h.get("ok_http") and a.get("ok_http") and ab.get("ok_http") and aj.get("ok") is True and abj.get("ok") is True)

        ts = str(int(time.time()))
        tid = f"rsov_{ts}"
        r1 = _post_chat(base, "水火の法則とは", f"{tid}_1")
        r2 = _post_chat(base, "言霊とは何かを簡潔に答えて", f"{tid}_2")
        _post_chat(base, "言霊とは何かを100字前後で答えて", tid)
        r3 = _post_chat(base, "その話の中心だけ保ったまま、一段深めて", tid)

        general_ok = _rr(r1) == "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1" and _rr(r1) != "TENMON_CONCEPT_CANON_V1"
        cont_ok = _rr(r3) == "CONTINUITY_ROUTE_HOLD_V1" and _rr(r3) != "TENMON_SUBCONCEPT_CANON_V1"
        def_ok = _rr(r2) == "DEF_FASTPATH_VERIFIED_V1"

        for resp in (r1, r2, r3):
            jj = resp.get("json") if isinstance(resp.get("json"), dict) else {}
            if _meta_leak(jj):
                df_ok = False
            if not isinstance(jj.get("decisionFrame"), dict):
                df_ok = False

        ok = bool(audit_ok and general_ok and cont_ok and def_ok and df_ok)
    else:
        ok = False
        rollback_used = bool(skip_live)

    out = {
        "ok": ok,
        "card": CARD,
        "generated_at": _utc(),
        "files_touched": ["api/src/routes/chat.ts"],
        "build_ok": build_ok,
        "audit_ok": audit_ok,
        "general_waterfire_ok": general_ok,
        "continuity_turn2_ok": cont_ok,
        "decision_frame_preserved": df_ok,
        "rollback_used": rollback_used,
        "next_card_if_fail": None if ok else "TENMON_ROUTE_SOVEREIGNTY_TRACE_SECOND_OVERRIDE_CURSOR_AUTO_V1",
        "notes": [
            "live probe は TENMON_ROUTE_SOV_SKIP_PROBE=1 でスキップ可能（ok=false）。",
            "build は TENMON_ROUTE_SOV_SKIP_BUILD=1 でスキップ可（検証のみ）。",
        ],
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
