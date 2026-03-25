#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_PRIORITY_CURSOR_AUTO_V1."""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

CARD = "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_PRIORITY_CURSOR_AUTO_V1"
SUMMARY_NAME = "tenmon_conversation_quality_priority_summary.json"
LEGACY_SUMMARY_NAME = "conversation_quality_analyzer_summary.json"
REPORT_NAME = "conversation_quality_analyzer_report.md"
CONVERGENCE_NAME = "state_convergence_next_cards.json"

PRIORITY_ORDER = [
    "k1_trace_empty_short_response",
    "general_knowledge_insufficient_substance",
    "self_view_generic_tone_residual",
    "factual_weather_correction_residual",
    "continuity_short_input_hold_residual",
    "greeting_style_polish",
    "template_leak_recurrence",
]

CARD_BY_AXIS = {
    "k1_trace_empty_short_response": "TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "general_knowledge_insufficient_substance": "TENMON_GENERAL_KNOWLEDGE_SUBSTANCE_REPAIR_CURSOR_AUTO_V1",
    "self_view_generic_tone_residual": "TENMON_SELF_VIEW_TENMON_TONE_REPAIR_CURSOR_AUTO_V1",
    "factual_weather_correction_residual": "TENMON_FACTUAL_WEATHER_CORRECTION_QUALITY_REPAIR_CURSOR_AUTO_V1",
    "continuity_short_input_hold_residual": "TENMON_CONTINUITY_SHORT_INPUT_HOLD_DENSITY_REPAIR_CURSOR_AUTO_V1",
    "greeting_style_polish": "TENMON_GREETING_STYLE_POLISH_CURSOR_AUTO_V1",
    "template_leak_recurrence": "TENMON_TEMPLATE_LEAK_GUARD_REINFORCE_CURSOR_AUTO_V1",
}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _parse_dt(raw: Any) -> datetime | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    s = raw.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(s)
    except ValueError:
        return None
    return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _find_kokuzo_db(api_root: Path) -> Path | None:
    import os
    env = os.environ.get("TENMON_KOKUZO_DB", "").strip()
    if env:
        p = Path(env)
        if p.is_file():
            return p
    for rel in (Path("data/kokuzo.sqlite"), Path("kokuzo.sqlite"), Path("../data/kokuzo.sqlite")):
        c = (api_root / rel).resolve()
        if c.is_file():
            return c
    return None


def _open_sqlite_ro(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=5.0)


def _table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    try:
        cur = conn.execute(f"PRAGMA table_info({table})")
        return [str(r[1]) for r in cur.fetchall()]
    except sqlite3.Error:
        return []


def _parse_assistant_payload(content: str) -> tuple[str, str | None]:
    raw = (content or "").strip()
    if raw.startswith("{") and '"response"' in raw:
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return raw, None
        rr = None
        df = obj.get("decisionFrame")
        if isinstance(df, dict):
            ku = df.get("ku")
            if isinstance(ku, dict) and ku.get("routeReason") is not None:
                rr = str(ku.get("routeReason"))
        return str(obj.get("response") or ""), rr
    return raw, None


def _load_conversation_pairs(conn: sqlite3.Connection, hours: int = 24, limit: int = 800) -> tuple[list[dict[str, Any]], datetime | None]:
    cols = _table_columns(conn, "conversation_log")
    if not cols:
        return [], None
    sess_col = "session_id" if "session_id" in cols else ("threadId" if "threadId" in cols else None)
    time_col = "created_at" if "created_at" in cols else ("timestamp" if "timestamp" in cols else None)
    id_col = "id" if "id" in cols else "rowid"
    if not sess_col or "role" not in cols or "content" not in cols:
        return [], None
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%S")
    where = f" AND {time_col} >= ?" if time_col else ""
    sql = f"SELECT {sess_col}, role, content, {time_col or 'NULL'}, {id_col} FROM conversation_log WHERE 1=1{where} ORDER BY {sess_col} ASC, {id_col} ASC LIMIT ?"
    params: list[Any] = [cutoff, limit] if time_col else [limit]
    rows = conn.execute(sql, params).fetchall()
    seq: dict[str, list[tuple[str, str, Any]]] = {}
    latest: datetime | None = None
    for sid, role, content, ts, _oid in rows:
        s = str(sid)
        seq.setdefault(s, []).append((str(role).lower(), str(content), ts))
        d = _parse_dt(ts)
        if d and (latest is None or d > latest):
            latest = d
    pairs: list[dict[str, Any]] = []
    for sid, items in seq.items():
        prev_user = ""
        pending = ""
        for role, content, ts in items:
            if role == "user":
                prev_user = pending
                pending = content
                continue
            if role != "assistant" or not pending:
                continue
            resp, rr = _parse_assistant_payload(content)
            pairs.append(
                {
                    "source": "conversation_log",
                    "session_id": sid,
                    "prev_user": prev_user,
                    "user": pending,
                    "response": resp,
                    "route_reason": rr,
                    "ts": ts,
                }
            )
            prev_user = pending
            pending = ""
    return pairs, latest


def _load_probe_pairs(auto: Path) -> tuple[list[dict[str, Any]], datetime | None]:
    files = sorted(auto.glob("*probe*.json")) + sorted(auto.glob("pwa_real_chat_trace.json"))
    out: list[dict[str, Any]] = []
    latest: datetime | None = None
    for p in files:
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        d = _parse_dt(j.get("generated_at"))
        if d and (latest is None or d > latest):
            latest = d
        probes = j.get("probes")
        if isinstance(probes, list):
            for x in probes:
                if not isinstance(x, dict):
                    continue
                out.append(
                    {
                        "source": p.name,
                        "session_id": str(x.get("threadId") or ""),
                        "prev_user": "",
                        "user": str(x.get("message") or ""),
                        "response": str(x.get("response_head") or x.get("head") or ""),
                        "route_reason": str(x.get("routeReason")) if x.get("routeReason") is not None else None,
                        "ts": j.get("generated_at"),
                    }
                )
        turns = j.get("turns")
        if isinstance(turns, list):
            for t in turns:
                if not isinstance(t, dict):
                    continue
                req = t.get("request_payload") if isinstance(t.get("request_payload"), dict) else {}
                out.append(
                    {
                        "source": p.name,
                        "session_id": str(t.get("threadId") or ""),
                        "prev_user": "",
                        "user": str(req.get("message") or ""),
                        "response": str(t.get("canonicalResponse") or t.get("finalizeResponse") or ""),
                        "route_reason": str(t.get("routeReason")) if t.get("routeReason") is not None else None,
                        "ts": j.get("generated_at"),
                    }
                )
    return out, latest


RE_SELF_VIEW = re.compile(r"(意識|自我|君の思考|あなたの思考|内省|self)", re.I)
RE_SHORT_FOLLOW = re.compile(r"^(教えて|続けて|もっと|次は|一言で|短く)[？?！!。…\s]*$", re.U)
RE_WEATHER = re.compile(r"(天気|気温|予報|降水|梅雨|東京|大阪|大分|福岡)", re.U)
RE_CORRECTION = re.compile(r"(違う|間違い|正しくない|訂正)", re.U)
RE_TEMPLATE_LEAK = re.compile(r"(SYSTEM_PROMPT|BEGIN_PROMPT|<template>|{{|}}|内部指示|developer message)", re.I)


def _mk_finding(axis: str, evidence: dict[str, Any]) -> dict[str, Any]:
    return {"axis": axis, "priority": PRIORITY_ORDER.index(axis) + 1, "evidence": evidence}


def _analyze_findings(pairs: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {k: [] for k in PRIORITY_ORDER}
    for p in pairs:
        u = str(p.get("user") or "").strip()
        r = str(p.get("response") or "").strip()
        rr = str(p.get("route_reason") or "").strip()
        if not u:
            continue
        e = {"source": p.get("source"), "user": u[:120], "route_reason": rr or None, "response_head": r[:180]}
        if RE_SELF_VIEW.search(u) and ("私はAI" in r or "一般的に" in r) and "天聞" not in r[:180]:
            out["self_view_generic_tone_residual"].append(_mk_finding("self_view_generic_tone_residual", e))
        if rr == "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1" and len(r) < 120:
            out["general_knowledge_insufficient_substance"].append(_mk_finding("general_knowledge_insufficient_substance", e))
        if rr == "K1_TRACE_EMPTY_GATED_V1" and len(r) < 100:
            out["k1_trace_empty_short_response"].append(_mk_finding("k1_trace_empty_short_response", e))
        if (RE_WEATHER.search(u) and "FACTUAL_WEATHER" not in rr) or (RE_CORRECTION.search(u) and "FACTUAL_CORRECTION" not in rr):
            out["factual_weather_correction_residual"].append(_mk_finding("factual_weather_correction_residual", e))
        if RE_SHORT_FOLLOW.match(u) and rr and "CONTINUITY" not in rr:
            out["continuity_short_input_hold_residual"].append(_mk_finding("continuity_short_input_hold_residual", e))
        if re.match(r"^(こんにちは|おはよう|こんばんは)", u) and (not r.startswith("【天聞の所見】")):
            out["greeting_style_polish"].append(_mk_finding("greeting_style_polish", e))
        if RE_TEMPLATE_LEAK.search(r):
            out["template_leak_recurrence"].append(_mk_finding("template_leak_recurrence", e))
    return out


def run_analyzer(api_root: Path) -> dict[str, Any]:
    auto = api_root / "automation"
    db_path = _find_kokuzo_db(api_root)
    db_pairs: list[dict[str, Any]] = []
    db_latest: datetime | None = None
    if db_path:
        try:
            conn = _open_sqlite_ro(db_path)
            try:
                db_pairs, db_latest = _load_conversation_pairs(conn)
            finally:
                conn.close()
        except Exception:
            db_pairs = []
    probe_pairs, probe_latest = _load_probe_pairs(auto)
    pairs = db_pairs + probe_pairs
    findings = _analyze_findings(pairs)
    counts = {k: len(v) for k, v in findings.items()}
    prioritized_axes = [k for k in PRIORITY_ORDER if counts.get(k, 0) > 0]
    next_cards = [CARD_BY_AXIS[k] for k in prioritized_axes]
    newest = max([x for x in [db_latest, probe_latest] if x is not None], default=None)
    stale = newest is None or (datetime.now(timezone.utc) - newest) > timedelta(hours=48)
    stale_sources = []
    if newest is None:
        stale_sources.append("no_recent_conversation_or_probe_data")
    elif stale:
        stale_sources.append("latest_conversation_or_probe_older_than_48h")
    top = prioritized_axes[0] if prioritized_axes else None
    summary = {
        "card": CARD,
        "generated_at": _utc_now_iso(),
        "analysis_basis": "actual_conversation_log_and_probe_json_only",
        "source": {
            "db_path": str(db_path) if db_path else None,
            "conversation_pairs_scanned": len(db_pairs),
            "probe_pairs_scanned": len(probe_pairs),
            "latest_db_at": db_latest.isoformat().replace("+00:00", "Z") if db_latest else None,
            "latest_probe_at": probe_latest.isoformat().replace("+00:00", "Z") if probe_latest else None,
        },
        "counts": counts,
        "quality_findings": {k: v[:8] for k, v in findings.items()},
        "evidence_probes": sorted({str(x.get("source")) for x in probe_pairs})[:30],
        "prioritized_axes": prioritized_axes,
        "recommended_next_cards": next_cards,
        "next_best_card": CARD_BY_AXIS[top] if top else None,
        "current_run_evidence_preferred": True,
        "stale_sources_present": bool(stale_sources),
        "stale_sources": stale_sources,
    }
    return summary


def write_outputs(api_root: Path, summary: dict[str, Any]) -> None:
    auto = api_root / "automation"
    auto.mkdir(parents=True, exist_ok=True)
    (auto / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (auto / LEGACY_SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary['generated_at']}`",
        f"- stale_sources_present: `{summary['stale_sources_present']}`",
        f"- next_best_card: `{summary['next_best_card']}`",
        "",
        "## Counts",
    ]
    for k in PRIORITY_ORDER:
        md.append(f"- `{k}`: `{summary['counts'].get(k, 0)}`")
    md.extend(["", "## Recommended Next Cards"])
    for c in summary.get("recommended_next_cards") or []:
        md.append(f"- `{c}`")
    (auto / REPORT_NAME).write_text("\n".join(md) + "\n", encoding="utf-8")
    convergence = {
        "version": 3,
        "card": CARD,
        "generated_at": summary["generated_at"],
        "next_cards": summary.get("recommended_next_cards", [])[:6],
    }
    (auto / CONVERGENCE_NAME).write_text(json.dumps(convergence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    api_root = _repo_api()
    summary = run_analyzer(api_root)
    write_outputs(api_root, summary)
    print(json.dumps({"ok": True, "summary_path": str(api_root / "automation" / SUMMARY_NAME)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
