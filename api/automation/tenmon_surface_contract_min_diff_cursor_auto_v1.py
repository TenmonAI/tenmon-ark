#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1 — build + optional live probes"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

CARD = "TENMON_SURFACE_CONTRACT_MIN_DIFF_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_surface_contract_min_diff_cursor_auto_v1.json"


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


def _meta_leak(text: str) -> bool:
    low = text.lower()
    return "cursor" in low and ("auto" in low or "gpt" in low)


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    api = repo / "api"
    auto = api / "automation"
    auto.mkdir(parents=True, exist_ok=True)

    base = os.environ.get("TENMON_SURFACE_BASE", "http://127.0.0.1:3000").strip()
    skip = os.environ.get("TENMON_SURFACE_SKIP_PROBE", "").strip() in ("1", "true", "yes")

    build_ok = True
    if not os.environ.get("TENMON_SURFACE_SKIP_BUILD"):
        p = subprocess.run(["npm", "run", "build"], cwd=str(api), capture_output=True, text=True, timeout=600)
        build_ok = p.returncode == 0

    rr_ok = True
    df_ok = True
    meta_ok = True
    define_ok = general_ok = selfaware_ok = continuity_ok = scripture_ok = False

    if not skip and build_ok:
        ts = str(int(time.time()))
        tid = f"surf_{ts}"
        r1 = _post(base, "言霊とは何かを100字前後で答えて", tid + "_d")
        r2 = _post(base, "水火の法則とは", tid + "_g")
        r3 = _post(base, "AIに意識はあるのか", tid + "_s")
        tid_c = tid + "_c"
        _post(base, "言霊とは何かを100字前後で答えて", tid_c)
        r4 = _post(base, "その話の中心だけ保ったまま、一段深めて", tid_c)
        r5 = _post(base, "法華経とは", tid + "_sc")

        for r in (r1, r2, r3, r4, r5):
            j = r.get("json") if isinstance(r.get("json"), dict) else {}
            if not isinstance(j.get("decisionFrame"), dict):
                df_ok = False
            ku = ((j.get("decisionFrame") or {}).get("ku") or {}) if isinstance(j.get("decisionFrame"), dict) else {}
            rr0 = str(ku.get("routeReason") or "").strip()
            if not rr0:
                rr_ok = False
            if _meta_leak(str(j.get("response") or "")):
                meta_ok = False
            sc = ku.get("surfaceContractV1")
            if sc is not None and not isinstance(sc, dict):
                df_ok = False

        define_ok = bool(r1.get("ok"))
        general_ok = bool(r2.get("ok"))
        selfaware_ok = bool(r3.get("ok"))
        continuity_ok = bool(r4.get("ok"))
        scripture_ok = bool(r5.get("ok"))

    ok = bool(
        build_ok
        and (skip or (rr_ok and df_ok and meta_ok and define_ok and general_ok and selfaware_ok and continuity_ok and scripture_ok))
    )

    out = {
        "ok": ok,
        "card": CARD,
        "generated_at": _utc(),
        "files_touched": [
            "api/src/core/tenmonSurfaceContractV1.ts",
            "api/src/routes/chat_refactor/finalize.ts",
        ],
        "build_ok": build_ok,
        "route_reason_preserved": rr_ok,
        "decision_frame_preserved": df_ok,
        "meta_leak_none": meta_ok,
        "probe_summary": {
            "define_ok": define_ok,
            "general_ok": general_ok,
            "selfaware_ok": selfaware_ok,
            "continuity_ok": continuity_ok,
            "scripture_ok": scripture_ok,
        },
        "rollback_used": False,
        "next_card_if_fail": None if ok else "TENMON_SURFACE_CONTRACT_SECOND_TUNE_CURSOR_AUTO_V1",
    }
    (auto / OUT_JSON).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
