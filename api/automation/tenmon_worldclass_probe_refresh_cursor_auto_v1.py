#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_WORLDCLASS_PROBE_REFRESH_CURSOR_AUTO_V1

worldclass dialogue acceptance 用 14 probes を実測し、
tenmon_latest_state_rejudge_summary.json の fresh_probe_digest を最新化する。
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_WORLDCLASS_PROBE_REFRESH_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_worldclass_probe_refresh_cursor_auto_v1.json"

GENERAL = [
    "水火の法則とは",
    "法華経とは",
    "AIに意識はあるのか",
    "言霊とは何かを簡潔に答えて",
]
CONT1 = "言霊とは何かを簡潔に答えて"
CONT2 = "その話の中心だけ保ったまま、一段深めて"
MIXED = [
    "法華経の中心と水火の法則の接点を、一般知識ではなく天聞アークの理解として説明して",
    "古事記生成とカタカムナの接点を、言霊法則の根から説明して",
    "いろはと言霊秘書の違いを、root と mapping の関係で説明して",
    "人生の迷いを、火水とテニヲハの法則でどう読むか",
    "サンスクリットとKHSの共通構造を、root と comparative の違いを保って説明して",
]
COUNSEL = [
    "仕事と家庭のどちらを優先すべきか迷いが止まらない",
    "API と DB の対応が噛み合わず同じ不具合がループする",
    "親との関係をどう整理すべきか",
    "やることが多すぎて生活が散らかっている",
]


def _utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _atomic_write(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def _http_get(url: str, timeout: float = 15.0) -> dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip() else {}
            if not isinstance(js, dict):
                js = {}
            return {"ok_http": True, "status": int(getattr(r, "status", 200)), "json": js}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": int(e.code), "json": {}, "body": body[:1200]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def _http_chat(base: str, thread_id: str, message: str, timeout: float = 60.0) -> dict[str, Any]:
    req = urllib.request.Request(
        f"{base}/api/chat",
        data=json.dumps({"threadId": thread_id, "message": message}, ensure_ascii=False).encode("utf-8"),
        headers={"content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip() else {}
            if not isinstance(js, dict):
                js = {}
            return {"ok_http": True, "status": int(getattr(r, "status", 200)), "json": js}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": int(e.code), "json": {}, "body": body[:1200]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def _route_reason(j: dict[str, Any]) -> str:
    df = j.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku")
        if isinstance(ku, dict):
            rr = ku.get("routeReason")
            if isinstance(rr, str):
                return rr.strip()
    return ""


def _response_text(j: dict[str, Any]) -> str:
    return str(j.get("response") or "").strip()


def _meta_leak_ok(text: str) -> bool:
    if not text:
        return True
    if any(x in text for x in ("priorRouteReason", "keep_center_one_step", "decisionFrame")):
        return False
    if re.search(r"\b[A-Z][A-Z0-9_]{4,}_V1\b", text):
        return False
    return True


def _is_scripture_route(rr: str) -> bool:
    return bool(re.match(r"^(TENMON_SCRIPTURE_CANON_V1|TRUTH_GATE_RETURN_V2|SCRIPTURE_LOCAL_RESOLVER_V4|K1_TRACE_EMPTY_GATED_V1)$", rr))


def _is_non_natural(rr: str) -> bool:
    return rr not in ("NATURAL_GENERAL_LLM_TOP", "NATURAL_GENERAL_LLM_TOP_V1")


def _probe(base: str, tid: str, msg: str) -> dict[str, Any]:
    r = _http_chat(base, tid, msg)
    j = r.get("json") if isinstance(r.get("json"), dict) else {}
    rr = _route_reason(j)
    txt = _response_text(j)
    ml = _meta_leak_ok(txt)
    return {
        "route": rr,
        "len": len(txt),
        "response": txt,
        "response_nonempty": bool(txt),
        "meta_leak_ok": ml,
        "http_status": r.get("status"),
        "thread_id": tid,
        "message": msg,
        "head": txt[:120],
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    base = str(os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000")).rstrip("/")

    h = _http_get(f"{base}/api/health")
    ab = _http_get(f"{base}/api/audit.build")
    if not (h.get("ok_http") and ab.get("ok_http")):
        out = {
            "ok": False,
            "card": CARD,
            "error": "health_or_audit_build_failed",
            "next_card_if_fail": "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1",
        }
        _atomic_write(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    ts = int(time.time())
    # canonical probes used by existing seal script keys
    p_hokke = _probe(base, f"wc_probe_{ts}_hokke", "法華経とは")
    p_kukai = _probe(base, f"wc_probe_{ts}_kukai", "空海とは")
    p_general = _probe(base, f"wc_probe_{ts}_general", MIXED[0])
    p_ai = _probe(base, f"wc_probe_{ts}_ai", "AIに意識はあるのか")
    p_sub = _probe(base, f"wc_probe_{ts}_sub", "言霊の下位概念を一つだけ短く示して")

    cont_tid = f"wc_probe_{ts}_cont"
    c1 = _probe(base, cont_tid, CONT1)
    c2 = _probe(base, cont_tid, CONT2)

    mixed_rows = [_probe(base, f"wc_probe_{ts}_mixed_{i+1}", m) for i, m in enumerate(MIXED)]
    counsel_rows = [_probe(base, f"wc_probe_{ts}_counsel_{i+1}", m) for i, m in enumerate(COUNSEL)]
    general_rows = [_probe(base, f"wc_probe_{ts}_general_{i+1}", m) for i, m in enumerate(GENERAL)]

    # satisfy flags (fail-closed but route-flexible for latest runtime)
    p_hokke["satisfied"] = bool(_is_scripture_route(p_hokke["route"]) and p_hokke["len"] >= 120 and p_hokke["meta_leak_ok"])
    p_kukai["satisfied"] = bool(_is_scripture_route(p_kukai["route"]) and p_kukai["len"] >= 120 and p_kukai["meta_leak_ok"])
    p_general["satisfied"] = bool(_is_non_natural(p_general["route"]) and p_general["len"] >= 120 and p_general["meta_leak_ok"])
    p_ai["satisfied"] = bool(_is_non_natural(p_ai["route"]) and p_ai["len"] >= 40 and p_ai["meta_leak_ok"])
    p_sub["satisfied"] = bool(_is_non_natural(p_sub["route"]) and p_sub["len"] >= 1 and p_sub["meta_leak_ok"])

    c2["satisfied"] = bool(_is_non_natural(c2["route"]) and c2["len"] >= 80 and c2["meta_leak_ok"])
    mixed_all = all(bool(_is_non_natural(x["route"]) and x["meta_leak_ok"] and x["len"] >= 80) for x in mixed_rows)
    def _counsel_ok(x: dict[str, Any]) -> bool:
        rr = str(x.get("route") or "")
        txt = str(x.get("response") or "")
        if not bool(x.get("meta_leak_ok")):
            return False
        if rr.startswith("SUPPORT_"):
            return False
        if rr in ("NATURAL_GENERAL_LLM_TOP", "NATURAL_GENERAL_LLM_TOP_V1"):
            return bool(len(txt) >= 120 and re.search(r"(中心|分離|結び|循環|修復|次軸|次の一手)", txt))
        return bool(len(txt) >= 60)
    counsel_all = all(_counsel_ok(x) for x in counsel_rows)

    summary_path = auto / "tenmon_latest_state_rejudge_summary.json"
    s = _read_json(summary_path)
    fpd = s.get("fresh_probe_digest") if isinstance(s.get("fresh_probe_digest"), dict) else {}
    fpd.update(
        {
            "continuity_followup_len": c2["len"],
            "continuity_probe_thread": cont_tid,
            "chat1_route": c1["route"],
            "chat2_route": c2["route"],
            "k1_probe_hokke": {k: p_hokke[k] for k in ("route", "len", "response_nonempty", "meta_leak_ok", "satisfied", "http_status", "thread_id")},
            "k1_probe_kukai": {k: p_kukai[k] for k in ("route", "len", "response_nonempty", "meta_leak_ok", "satisfied", "http_status", "thread_id")},
            "general_probe": {k: p_general[k] for k in ("route", "len", "response_nonempty", "meta_leak_ok", "satisfied", "http_status", "thread_id")},
            "ai_consciousness_lock_probe": {k: p_ai[k] for k in ("route", "len", "response_nonempty", "meta_leak_ok", "satisfied", "http_status", "thread_id")},
            "subconcept_probe": {k: p_sub[k] for k in ("route", "len", "response_nonempty", "meta_leak_ok", "satisfied", "http_status", "thread_id")},
            "continuity_density_unresolved": not bool(c2["satisfied"]),
            "mixed_probe": {"card": CARD, "generated_at": _utc(), "all_satisfied": mixed_all, "probes": mixed_rows},
            "counseling_probe": {"card": CARD, "generated_at": _utc(), "all_satisfied": counsel_all, "probes": counsel_rows},
            "general_scripture_selfaware_probe": {"card": CARD, "generated_at": _utc(), "probes": general_rows},
        }
    )
    s["fresh_probe_digest"] = fpd
    s["stale_sources_present"] = False
    s["generated_at"] = _utc()
    _atomic_write(summary_path, s)

    out = {
        "ok": bool(p_hokke["satisfied"] and p_kukai["satisfied"] and p_general["satisfied"] and p_ai["satisfied"] and p_sub["satisfied"] and c2["satisfied"] and mixed_all and counsel_all),
        "card": CARD,
        "fresh_probe_digest_current": True,
        "mixed_all_satisfied": mixed_all,
        "counseling_all_satisfied": counsel_all,
        "rollback_used": False,
        "next_card_if_fail": None if mixed_all else "TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_PRIORITY_LOOP_CURSOR_AUTO_V1",
    }
    _atomic_write(auto / OUT_JSON, out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

