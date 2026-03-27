#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_MIXED_QUESTION_PROBE_DIGEST_REFRESH_CURSOR_AUTO_V1

mixed probes を再実測し、tenmon_latest_state_rejudge_summary.json の
fresh_probe_digest を最新化する（fail-closed）。
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_MIXED_QUESTION_PROBE_DIGEST_REFRESH_CURSOR_AUTO_V1"
OUT_JSON = "tenmon_mixed_question_probe_digest_refresh_cursor_auto_v1.json"

MIXED_PROBES = [
    "法華経の中心と水火の法則の接点を、一般知識ではなく天聞アークの理解として説明して",
    "古事記生成とカタカムナの接点を、言霊法則の根から説明して",
    "いろはと言霊秘書の違いを、root と mapping の関係で説明して",
    "人生の迷いを、火水とテニヲハの法則でどう読むか",
    "サンスクリットとKHSの共通構造を、root と comparative の違いを保って説明して",
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


def _post_json(url: str, body: dict[str, Any], timeout: float = 30.0) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
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
        body_s = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": int(e.code), "json": {}, "body": body_s[:2000]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def _get_json(url: str, timeout: float = 15.0) -> dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode("utf-8", errors="replace")
            js = json.loads(raw) if raw.strip() else {}
            if not isinstance(js, dict):
                js = {}
            return {"ok_http": True, "status": int(getattr(r, "status", 200)), "json": js}
    except urllib.error.HTTPError as e:
        body_s = e.read().decode("utf-8", errors="replace")
        return {"ok_http": False, "status": int(e.code), "json": {}, "body": body_s[:2000]}
    except Exception as e:
        return {"ok_http": False, "status": 0, "json": {}, "error": repr(e)}


def _route_reason(chat_json: dict[str, Any]) -> str:
    df = chat_json.get("decisionFrame")
    if isinstance(df, dict):
        ku = df.get("ku")
        if isinstance(ku, dict):
            rr = ku.get("routeReason")
            if isinstance(rr, str) and rr.strip():
                return rr.strip()
    return ""


def _response_len(chat_json: dict[str, Any]) -> int:
    return len(str(chat_json.get("response") or "").strip())


def _meta_leak_ok(chat_json: dict[str, Any]) -> bool:
    t = str(chat_json.get("response") or "")
    if not t.strip():
        return True
    if any(x in t for x in ("priorRouteReason", "keep_center_one_step", "decisionFrame")):
        return False
    if re.search(r"\b[A-Z][A-Z0-9_]{4,}_V1\b", t):
        return False
    return True


def _is_non_natural(rr: str) -> bool:
    r = str(rr or "").strip()
    return r not in ("NATURAL_GENERAL_LLM_TOP", "NATURAL_GENERAL_LLM_TOP_V1")


def _probe(base: str, msg: str, idx: int) -> dict[str, Any]:
    tid = f"mixed_probe_refresh_{int(time.time())}_{idx}"
    r = _post_json(f"{base}/api/chat", {"threadId": tid, "message": msg}, timeout=60.0)
    js = r.get("json") if isinstance(r.get("json"), dict) else {}
    rr = _route_reason(js)
    ln = _response_len(js)
    ml = _meta_leak_ok(js)
    sat = bool(r.get("ok_http")) and _is_non_natural(rr) and ml and ln >= 80
    return {
        "route": rr,
        "len": ln,
        "response_nonempty": ln > 0,
        "meta_leak_ok": ml,
        "satisfied": sat,
        "http_status": r.get("status"),
        "thread_id": tid,
        "message": msg,
    }


def main() -> int:
    repo = Path(os.environ.get("TENMON_REPO_ROOT", "/opt/tenmon-ark-repo")).resolve()
    auto = repo / "api" / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    base = str(os.environ.get("TENMON_GATE_BASE", "http://127.0.0.1:3000")).rstrip("/")

    health = _get_json(f"{base}/api/health", timeout=15.0)
    auditb = _get_json(f"{base}/api/audit.build", timeout=15.0)
    if not bool(health.get("ok_http")) or not bool(auditb.get("ok_http")):
        out = {
            "ok": False,
            "card": CARD,
            "mixed_probe_digest_refreshed": False,
            "mixed_question_quality_ready": False,
            "fresh_probe_digest_current": False,
            "fractal_truth_worldclass_candidate": False,
            "rollback_used": False,
            "next_card_if_fail": "TENMON_MIXED_QUESTION_ROUTE_GUARD_TRACE_CURSOR_AUTO_V1",
            "error": "health_or_audit_build_not_ok",
        }
        _atomic_write(auto / OUT_JSON, out)
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 1

    rows = [_probe(base, m, i + 1) for i, m in enumerate(MIXED_PROBES)]
    all_ok = all(bool(r.get("satisfied")) for r in rows)

    summary_path = auto / "tenmon_latest_state_rejudge_summary.json"
    summary = _read_json(summary_path)
    fpd = summary.get("fresh_probe_digest") if isinstance(summary.get("fresh_probe_digest"), dict) else {}
    primary = rows[0] if rows else {}
    # seal 互換のため general_probe を最新 mixed 実測へ差し替え
    fpd["general_probe"] = {
        "route": primary.get("route", ""),
        "len": int(primary.get("len") or 0),
        "response_nonempty": bool(primary.get("response_nonempty")),
        "meta_leak_ok": bool(primary.get("meta_leak_ok")),
        "satisfied": bool(primary.get("satisfied")),
        "http_status": primary.get("http_status"),
        "thread_id": primary.get("thread_id"),
        "source": CARD,
    }
    fpd["mixed_probe"] = {
        "card": CARD,
        "generated_at": _utc(),
        "all_satisfied": all_ok,
        "probes": rows,
    }
    summary["fresh_probe_digest"] = fpd
    summary["stale_sources_present"] = False
    summary["generated_at"] = _utc()
    _atomic_write(summary_path, summary)

    out = {
        "ok": all_ok,
        "card": CARD,
        "mixed_probe_digest_refreshed": True,
        "mixed_question_quality_ready": all_ok,
        "fresh_probe_digest_current": True,
        "fractal_truth_worldclass_candidate": all_ok,
        "rollback_used": False,
        "next_card_if_fail": None if all_ok else "TENMON_MIXED_QUESTION_ROUTE_GUARD_TRACE_CURSOR_AUTO_V1",
        "summary_path": str(summary_path),
    }
    _atomic_write(auto / OUT_JSON, out)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

