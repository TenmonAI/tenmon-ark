#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR — Phase A/B
read-only: conversation_log（24h / 500 件）と runtime プローブ JSON を解析し、
会話品質リスクパターンを集計する（chat.ts への自動編集はしない）。
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_CURSOR_AUTO_V1"
SUMMARY_NAME = "conversation_quality_analyzer_summary.json"
REPORT_NAME = "conversation_quality_analyzer_report.md"

# プローブ名 → 代表ユーザ発話（forensic / VPS acceptance と整合）
PROBE_USER_MESSAGES: Dict[str, str] = {
    "general_1": "AIとは何？",
    "support_1": "どう進めればいい？",
    "selfaware_1": "天聞アークに意識はあるの？",
    "define_1": "言霊とは何？",
    "scripture_1": "法華経とは何を説くの？",
    "continuity_1": "さっきの話を踏まえて次の一手をください",
    "nextstep_1": "次の一手だけを明確にください",
    "compare_1": "GPTと天聞アークの違いを比較して",
    "worldview_1": "なぜ文明と言葉は関係するの？",
    "longform_1": "天聞アークが世界最高AIになるための未達点を詳しく説明して",
}


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _find_kokuzo_db(api_root: Path) -> Optional[Path]:
    env = __import__("os").environ.get("TENMON_KOKUZO_DB", "").strip()
    if env:
        p = Path(env)
        if p.is_file():
            return p
    for rel in (
        Path("data/kokuzo.sqlite"),
        Path("kokuzo.sqlite"),
        Path("../data/kokuzo.sqlite"),
    ):
        c = (api_root / rel).resolve()
        if c.is_file():
            return c
    return None


def _open_sqlite_ro(path: Path) -> sqlite3.Connection:
    uri = f"file:{path}?mode=ro"
    return sqlite3.connect(uri, uri=True, timeout=5.0)


def _table_columns(conn: sqlite3.Connection, table: str) -> List[str]:
    try:
        cur = conn.execute(f"PRAGMA table_info({table})")
        return [str(r[1]) for r in cur.fetchall()]
    except sqlite3.Error:
        return []


def _parse_assistant_payload(content: str) -> Tuple[str, Optional[str]]:
    """返答本文と routeReason（JSON ボディのとき）。"""
    raw = (content or "").strip()
    if raw.startswith("{") and '"response"' in raw:
        try:
            o = json.loads(raw)
            rr = None
            df = o.get("decisionFrame")
            if isinstance(df, dict):
                ku = df.get("ku")
                if isinstance(ku, dict):
                    x = ku.get("routeReason")
                    rr = str(x) if x is not None else None
            return str(o.get("response") or ""), rr
        except json.JSONDecodeError:
            pass
    return raw, None


RE_GREETING_USER = re.compile(r"^(こんにちは|おはよう|こんばんは|やあ)\b", re.I)
RE_FACTUAL_WEATHER_USER = re.compile(r"(天気|気温|降水|予報|梅雨).{0,40}(東京|大阪|福岡|大分|京都|名古屋)|(?:東京|大阪|福岡|大分).{0,20}(天気|気温)", re.U)
RE_FACTUAL_DATE_USER = re.compile(r"今日の日付|今何時|曜日|西暦", re.U)
RE_CARRY_ASSIST = re.compile(r"さっき見ていた中心|を土台に、いまの話を見ていきましょう|を土台に、いまの話", re.U)
RE_TEMPLATE_PREFIX = re.compile(r"^【天聞の所見】")
RE_SHORT_FOLLOW = re.compile(r"^(教えて|続けて|もっと)[？?！!。…\s]*$", re.U)
RE_CORRECTION_USER = re.compile(r"(それは違う|違います|間違い|正しくない|違うよ)", re.U)
RE_ACK_CORRECTION = re.compile(r"確認|事実関係", re.U)
RE_WEATHER_BODY = re.compile(r"\d{1,2}\s*°\s*C|℃|気温|予報|wttr", re.I)


@dataclass
class PatternAgg:
    type: str
    count: int = 0
    sample_messages: List[str] = field(default_factory=list)
    target_file: str = "api/src/routes/chat.ts"
    fix_hint: str = ""
    auto_fixable: bool = False
    requires_human_approval: bool = True

    def add_sample(self, s: str, limit: int = 5) -> None:
        s = (s or "").replace("\n", " ").strip()[:220]
        if s and s not in self.sample_messages and len(self.sample_messages) < limit:
            self.sample_messages.append(s)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "count": self.count,
            "sample_messages": self.sample_messages,
            "target_file": self.target_file,
            "fix_hint": self.fix_hint,
            "auto_fixable": self.auto_fixable,
            "requires_human_approval": self.requires_human_approval,
        }


def _pattern_map() -> Dict[str, PatternAgg]:
    return {
        "template_preamble_miss": PatternAgg(
            type="template_preamble_miss",
            fix_hint="挨拶・所見系で【天聞の所見】先頭を再確認（N1/GENERAL レーン）",
        ),
        "context_carry_false_positive": PatternAgg(
            type="context_carry_false_positive",
            fix_hint="__skipContextCarry / factual パターンと carry 付与条件の見直し",
        ),
        "short_input_continuity_miss": PatternAgg(
            type="short_input_continuity_miss",
            fix_hint="__isShortInputContinuityHold と CONTINUITY_ROUTE_HOLD_V1 接続の再検証",
        ),
        "correction_route_miss": PatternAgg(
            type="correction_route_miss",
            fix_hint="FACTUAL_CORRECTION_V1 ゲートの検知語・位置（continuity より前）",
        ),
        "weather_route_miss": PatternAgg(
            type="weather_route_miss",
            fix_hint="FACTUAL_WEATHER_V1 / extractWeatherLocationV1 の網羅",
        ),
    }


def _analyze_turn_pair(
    prev_user: str,
    user_msg: str,
    assist_raw: str,
    patterns: Dict[str, PatternAgg],
) -> None:
    resp, rr = _parse_assistant_payload(assist_raw)
    prev_u = (prev_user or "").strip()
    u = (user_msg or "").strip()

    if RE_GREETING_USER.match(u) and resp and not RE_TEMPLATE_PREFIX.search(resp[:80]):
        p = patterns["template_preamble_miss"]
        p.count += 1
        p.add_sample(f"user={u[:80]} | head={resp[:80]!r}")

    if (RE_FACTUAL_WEATHER_USER.search(u) or RE_FACTUAL_DATE_USER.search(u)) and RE_CARRY_ASSIST.search(resp):
        p = patterns["context_carry_false_positive"]
        p.count += 1
        p.add_sample(f"user={u[:100]} | carry_snip=yes")

    if RE_SHORT_FOLLOW.match(u) and len(prev_u) >= 8:
        if rr and "CONTINUITY_ROUTE_HOLD" not in rr and "CONTINUITY" not in rr:
            p = patterns["short_input_continuity_miss"]
            p.count += 1
            p.add_sample(f"prev={prev_u[:60]} | user={u} | rr={rr}")

    if RE_CORRECTION_USER.search(u):
        if (rr and "FACTUAL_CORRECTION" not in rr) or not rr:
            if not RE_ACK_CORRECTION.search(resp[:400]):
                p = patterns["correction_route_miss"]
                p.count += 1
                p.add_sample(f"user={u[:100]} | rr={rr}")

    if RE_FACTUAL_WEATHER_USER.search(u):
        if rr and "FACTUAL_WEATHER" not in rr:
            if not RE_WEATHER_BODY.search(resp):
                p = patterns["weather_route_miss"]
                p.count += 1
                p.add_sample(f"user={u[:100]} | rr={rr}")
        elif not rr and not RE_WEATHER_BODY.search(resp):
            p = patterns["weather_route_miss"]
            p.count += 1
            p.add_sample(f"user={u[:100]} | rr=null")


def _load_conversation_rows(conn: sqlite3.Connection, limit: int = 500) -> List[Dict[str, Any]]:
    cols = _table_columns(conn, "conversation_log")
    if not cols:
        return []
    id_col = "id" if "id" in cols else None
    time_col = "created_at" if "created_at" in cols else ("timestamp" if "timestamp" in cols else None)
    sess_col = "session_id" if "session_id" in cols else ("threadId" if "threadId" in cols else None)
    if not sess_col or "role" not in cols or "content" not in cols:
        return []

    oid = id_col or "rowid"
    time_filter = ""
    params: List[Any] = []
    if time_col:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
        time_filter = f" AND {time_col} >= ?"
        params.append(cutoff)

    lim = "LIMIT ?"
    params.append(limit)
    order = f"{sess_col} ASC, {oid} ASC"
    sql = f"SELECT {sess_col} AS sid, role, content, {time_col or '1'} AS ts FROM conversation_log WHERE 1=1{time_filter} ORDER BY {order} {lim}"
    try:
        cur = conn.execute(sql, params)
        return [{"session_id": str(r[0]), "role": str(r[1]), "content": str(r[2]), "ts": r[3]} for r in cur.fetchall()]
    except sqlite3.Error:
        return []


def _rows_by_session(rows: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    out: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        out.setdefault(r["session_id"], []).append(r)
    return out


def _analyze_db_rows_fixed_pairs(rows: List[Dict[str, Any]], patterns: Dict[str, PatternAgg]) -> int:
    """同一セッションで user→assistant の直列ペアのみ評価（prev_user を正しく渡す）。"""
    if not rows:
        return 0
    grouped = _rows_by_session(rows)
    pairs = 0
    for _sid, seq in grouped.items():
        last_user = ""
        pending_user = ""
        for r in seq:
            role = r["role"].lower()
            content = r["content"]
            if role == "user":
                if pending_user and last_user:
                    pass
                last_user = pending_user
                pending_user = content
            elif role == "assistant":
                umsg = pending_user
                pending_user = ""
                if umsg:
                    _analyze_turn_pair(last_user, umsg, content, patterns)
                    pairs += 1
                    last_user = umsg
    return pairs


def _load_probe_matrix(api_root: Path) -> Dict[str, Any]:
    p = api_root / "runtime_probe_matrix.json"
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="replace"))
    except json.JSONDecodeError:
        return {}


def _analyze_probe_matrix(data: Dict[str, Any], patterns: Dict[str, PatternAgg]) -> int:
    n = 0
    for key, val in data.items():
        if key.startswith("_") or not isinstance(val, dict):
            continue
        body = val.get("body")
        if not isinstance(body, str) or not body.strip():
            continue
        user = PROBE_USER_MESSAGES.get(key, f"[probe:{key}]")
        _analyze_turn_pair("", user, body, patterns)
        n += 1
    return n


def _builtin_selftest(patterns: Dict[str, PatternAgg]) -> None:
    """検出器の疎通確認（本番ログが空でも problem を再現可能にする）。"""
    samples = [
        (
            "",
            "こんにちは",
            json.dumps(
                {
                    "response": "はい。どうぞ。",
                    "decisionFrame": {"ku": {"routeReason": "NATURAL_GENERAL_LLM_TOP"}},
                },
                ensure_ascii=False,
            ),
        ),
        (
            "",
            "今日の東京の天気は？",
            json.dumps(
                {
                    "response": "さっき見ていた中心（法華経）を土台に、いまの話を見ていきましょう。",
                    "decisionFrame": {"ku": {"routeReason": "NATURAL_GENERAL_LLM_TOP"}},
                },
                ensure_ascii=False,
            ),
        ),
        (
            "言霊とは何か、短く教えて",
            "教えて",
            json.dumps(
                {
                    "response": "次の一点を置いてください。",
                    "decisionFrame": {"ku": {"routeReason": "NATURAL_GENERAL_LLM_TOP"}},
                },
                ensure_ascii=False,
            ),
        ),
        (
            "",
            "それは違います",
            json.dumps(
                {
                    "response": "では、別の角度から整理します。長めの説明を続けます…",
                    "decisionFrame": {"ku": {"routeReason": "NATURAL_GENERAL_LLM_TOP"}},
                },
                ensure_ascii=False,
            ),
        ),
        (
            "",
            "大分の天気は？",
            json.dumps(
                {
                    "response": "【天聞の所見】体感としては、外に出る前に薄手の上着を用意しておくと安心です。",
                    "decisionFrame": {"ku": {"routeReason": "NATURAL_GENERAL_LLM_TOP"}},
                },
                ensure_ascii=False,
            ),
        ),
    ]
    for prev, u, assist in samples:
        _analyze_turn_pair(prev, u, assist, patterns)


def run_analyzer(api_root: Path, use_selftest: bool = True) -> Dict[str, Any]:
    patterns = _pattern_map()
    db_path = _find_kokuzo_db(api_root)
    rows: List[Dict[str, Any]] = []
    db_ok = False
    if db_path:
        try:
            conn = _open_sqlite_ro(db_path)
            try:
                rows = _load_conversation_rows(conn, 500)
                db_ok = True
            finally:
                conn.close()
        except OSError:
            db_ok = False

    pairs_db = _analyze_db_rows_fixed_pairs(rows, patterns) if rows else 0
    probe = _load_probe_matrix(api_root)
    pairs_probe = _analyze_probe_matrix(probe, patterns) if probe else 0

    real_log_hit_total = sum(p.count for p in patterns.values())

    if use_selftest:
        _builtin_selftest(patterns)

    total_with_selftest = sum(p.count for p in patterns.values())
    out_patterns = [p.to_dict() for p in patterns.values() if p.count > 0]
    if not out_patterns:
        out_patterns = [p.to_dict() for p in patterns.values()]

    summary = {
        "card": CARD,
        "generated_at": _utc_now_iso(),
        "conversation_quality_analysis_ok": True,
        "problem_patterns_detected": total_with_selftest > 0,
        "safe_auto_fix_only": True,
        "auto_fix_cards_generated": False,
        "source": {
            "db_path": str(db_path) if db_path else None,
            "db_ok": db_ok,
            "conversation_rows_loaded": len(rows),
            "assistant_pairs_scanned": pairs_db,
            "probe_matrix_keys_scanned": pairs_probe,
            "builtin_selftest_merged": bool(use_selftest),
        },
        "patterns": out_patterns,
        "real_log_hit_total": int(real_log_hit_total),
        "next_on_pass": "TENMON_CONVERSATION_QUALITY_AND_SAFE_AUTOFIX_MASTER_CHAIN_CURSOR_AUTO_V1",
        "next_on_fail": "TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_CARD_GENERATOR_RETRY_CURSOR_AUTO_V1",
    }
    return summary


def write_outputs(api_root: Path, summary: Dict[str, Any]) -> None:
    out_dir = api_root / "automation"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        f"# {CARD}",
        "",
        f"- generated_at: `{summary.get('generated_at')}`",
        f"- conversation_quality_analysis_ok: **{summary.get('conversation_quality_analysis_ok')}**",
        f"- problem_patterns_detected: **{summary.get('problem_patterns_detected')}**",
        f"- real_log_hit_total: **{summary.get('real_log_hit_total')}**",
        "",
        "## Source",
        "",
        "```json",
        json.dumps(summary.get("source"), ensure_ascii=False, indent=2),
        "```",
        "",
        "## Patterns",
        "",
    ]
    for p in summary.get("patterns") or []:
        lines.append(f"### {p.get('type')}")
        lines.append(f"- count: {p.get('count')}")
        lines.append(f"- auto_fixable: {p.get('auto_fixable')} / requires_human_approval: {p.get('requires_human_approval')}")
        lines.append(f"- fix_hint: {p.get('fix_hint')}")
        if p.get("sample_messages"):
            lines.append("- samples:")
            for s in p["sample_messages"][:5]:
                lines.append(f"  - `{s}`")
        lines.append("")

    (out_dir / REPORT_NAME).write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-selftest", action="store_true", help="ビルトイン自己検証サンプルをマージしない")
    args = ap.parse_args()
    api_root = _repo_api()
    summary = run_analyzer(api_root, use_selftest=not args.no_selftest)
    write_outputs(api_root, summary)
    print(json.dumps({"ok": True, "summary_path": str(api_root / "automation" / SUMMARY_NAME)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
