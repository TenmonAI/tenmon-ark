#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_KG0_KHS_HEALTH_GATE_V1 — KHS 投入前の健全性ゲート（監査のみ・DB 改変なし）。

kokuzo_pages と khs_units を参照し、NULL 率・BAD 率・実在率・引用可能率を算出し、
PASS 可能な unitId 集合を JSON で出力する。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# 同一リポ内 BAD 定義（hard_bad）を共有
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from kokuzo_bad_observer_v1 import analyze_text  # noqa: E402

CARD = "TENMON_KG0_KHS_HEALTH_GATE_V1"
VPS_CARD = "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1"
FAIL_NEXT = "TENMON_KG0_KHS_HEALTH_GATE_RETRY_CURSOR_AUTO_V1"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _repo_api() -> Path:
    return Path(__file__).resolve().parents[1]


def _default_db_path() -> Path:
    data = os.environ.get("TENMON_DATA_DIR", "/opt/tenmon-ark-data")
    p = Path(data) / "kokuzo.sqlite"
    alt = os.environ.get("TENMON_ARK_DB_KOKUZO_PATH", "")
    if alt:
        return Path(alt)
    return p


def _norm_ws(s: str) -> str:
    t = (s or "").replace("\f", " ").replace("\r", " ")
    return " ".join(t.split())


def _sha256_hex_utf8(s: str) -> str:
    return hashlib.sha256((s or "").encode("utf-8")).hexdigest()


def _load_thresholds() -> Dict[str, float]:
    """環境変数で上書き可能な既定しきい値（率は 0–1）。"""
    def f(name: str, default: float) -> float:
        raw = os.environ.get(name, "")
        if not raw.strip():
            return default
        try:
            return float(raw)
        except ValueError:
            return default

    return {
        "max_null_pdf_page_rate": f("KG0_MAX_NULL_PDF_PAGE_RATE", 0.05),
        "max_quote_empty_rate": f("KG0_MAX_QUOTE_EMPTY_RATE", 0.01),
        "max_doc_empty_rate": f("KG0_MAX_DOC_EMPTY_RATE", 0.0),
        "max_bad_quote_rate": f("KG0_MAX_BAD_QUOTE_RATE", 0.02),
        "max_quote_hash_mismatch_rate": f("KG0_MAX_QUOTE_HASH_MISMATCH_RATE", 0.05),
        "min_page_exist_rate": f("KG0_MIN_PAGE_EXIST_RATE", 0.90),
        "min_quotability_rate": f("KG0_MIN_QUOTABILITY_RATE", 0.85),
        "min_passable_fraction": f("KG0_MIN_PASSABLE_FRACTION", 0.80),
    }


def _table_exists(cur: sqlite3.Cursor, name: str) -> bool:
    row = cur.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1", (name,)
    ).fetchone()
    return row is not None


def _unit_row_fail_reasons(
    unit_id: str,
    doc: str,
    pdf_page: Optional[int],
    quote: str,
    quote_hash: str,
    page_text: Optional[str],
) -> List[str]:
    reasons: List[str] = []
    if not (doc or "").strip():
        reasons.append("DOC_EMPTY")
    if pdf_page is None:
        reasons.append("PDF_PAGE_NULL")
    q = quote or ""
    if not q.strip():
        reasons.append("QUOTE_EMPTY")
    if not (quote_hash or "").strip():
        reasons.append("QUOTE_HASH_EMPTY")

    an = analyze_text(q)
    if an.get("hard_bad_signal"):
        reasons.append("BAD_QUOTE_HARD")

    exp = _sha256_hex_utf8(q)
    qh = (quote_hash or "").strip().lower()
    if qh and exp != qh:
        reasons.append("QUOTE_HASH_MISMATCH")

    if pdf_page is not None and (doc or "").strip():
        if page_text is None:
            reasons.append("KOKUZO_PAGE_MISSING")
        else:
            nq = _norm_ws(q)
            np = _norm_ws(page_text)
            if len(nq) >= 2 and nq not in np:
                reasons.append("QUOTE_NOT_IN_PAGE")
    return reasons


def run_gate(db_path: Path, thresholds: Dict[str, float]) -> Dict[str, Any]:
    _fail_only = {
        "fail_conditions": _fail_conditions_template(thresholds),
        "passable_unit_ids": [],
        "aggregate_gate_pass": False,
    }
    if not db_path.is_file():
        return {
            "card": CARD,
            "generatedAt": _utc_now_iso(),
            "error": "db_not_found",
            "db_path": str(db_path),
            **_fail_only,
        }

    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        cur = conn.cursor()
        if not _table_exists(cur, "khs_units"):
            return {
                "card": CARD,
                "generatedAt": _utc_now_iso(),
                "error": "khs_units_missing",
                "db_path": str(db_path),
                **_fail_only,
            }

        has_pages = _table_exists(cur, "kokuzo_pages")
        units = cur.execute(
            "SELECT unitId, doc, pdfPage, quote, quoteHash FROM khs_units"
        ).fetchall()
    finally:
        conn.close()

    n = len(units)
    null_pdf = 0
    empty_quote = 0
    empty_doc = 0
    bad_quote = 0
    hash_mismatch = 0
    with_page = 0  # pdfPage not null and doc non-empty
    page_exists = 0
    quotable = 0  # among page exists
    passable: List[str] = []
    fail_counter: Counter[str] = Counter()
    samples_failed: List[Dict[str, Any]] = []
    max_samples = 200

    page_cache: Dict[Tuple[str, int], Optional[str]] = {}
    conn_pages: Optional[sqlite3.Connection] = None
    if has_pages:
        conn_pages = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)

    def get_page(d: str, p: int) -> Optional[str]:
        key = (d, p)
        if key in page_cache:
            return page_cache[key]
        if not conn_pages:
            page_cache[key] = None
            return None
        r = conn_pages.execute(
            "SELECT text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ? LIMIT 1",
            (d, p),
        ).fetchone()
        txt = r[0] if r else None
        page_cache[key] = txt if isinstance(txt, str) else None
        return page_cache[key]

    for row in units:
        unit_id, doc, pdf_page, quote, quote_hash = row
        doc_s = doc if isinstance(doc, str) else str(doc or "")
        quote_s = quote if isinstance(quote, str) else str(quote or "")
        qh_s = quote_hash if isinstance(quote_hash, str) else str(quote_hash or "")

        if not doc_s.strip():
            empty_doc += 1
        if pdf_page is None:
            null_pdf += 1
        if not quote_s.strip():
            empty_quote += 1

        an = analyze_text(quote_s)
        if an.get("hard_bad_signal"):
            bad_quote += 1

        exp = _sha256_hex_utf8(quote_s)
        if qh_s.strip() and exp != qh_s.strip().lower():
            hash_mismatch += 1

        page_text: Optional[str] = None
        if pdf_page is not None and doc_s.strip():
            with_page += 1
            page_text = get_page(doc_s.strip(), int(pdf_page))
            if page_text is not None:
                page_exists += 1
                nq = _norm_ws(quote_s)
                np = _norm_ws(page_text)
                if len(nq) >= 2 and nq in np:
                    quotable += 1
                elif len(nq) < 2 and nq:
                    quotable += 1

        reasons = _unit_row_fail_reasons(unit_id, doc_s, pdf_page, quote_s, qh_s, page_text)
        for r in reasons:
            fail_counter[r] += 1
        if not reasons:
            passable.append(str(unit_id))
        elif len(samples_failed) < max_samples:
            samples_failed.append({"unitId": str(unit_id), "reasons": reasons})

    if conn_pages:
        conn_pages.close()

    def rate(num: int, den: int) -> float:
        return round((num / den), 6) if den else 0.0

    null_pdf_rate = rate(null_pdf, n)
    quote_empty_rate = rate(empty_quote, n)
    doc_empty_rate = rate(empty_doc, n)
    bad_quote_rate = rate(bad_quote, n)
    hash_mismatch_rate = rate(hash_mismatch, n)
    page_exist_rate = rate(page_exists, with_page) if with_page else 1.0
    if page_exists:
        quotability_rate = rate(quotable, page_exists)
    elif with_page > 0:
        quotability_rate = 0.0
    else:
        quotability_rate = 1.0
    passable_fraction = rate(len(passable), n) if n else 0.0

    rules = _evaluate_rules(
        n=n,
        thresholds=thresholds,
        null_pdf_rate=null_pdf_rate,
        quote_empty_rate=quote_empty_rate,
        doc_empty_rate=doc_empty_rate,
        bad_quote_rate=bad_quote_rate,
        hash_mismatch_rate=hash_mismatch_rate,
        page_exist_rate=page_exist_rate,
        quotability_rate=quotability_rate,
        passable_fraction=passable_fraction,
        has_pages=has_pages,
    )

    aggregate_pass = n > 0 and all(r["passed"] for r in rules)

    return {
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "db_path": str(db_path.resolve()),
        "fail_next_card": FAIL_NEXT,
        "fail_conditions": _fail_conditions_template(thresholds),
        "counts": {
            "khs_units_total": n,
            "null_pdf_page": null_pdf,
            "empty_quote": empty_quote,
            "empty_doc": empty_doc,
            "bad_quote_hard": bad_quote,
            "quote_hash_mismatch": hash_mismatch,
            "with_pdf_page_and_doc": with_page,
            "kokuzo_page_hits": page_exists,
            "quotable_rows": quotable,
            "passable_units": len(passable),
        },
        "rates": {
            "null_pdf_page_rate": null_pdf_rate,
            "quote_empty_rate": quote_empty_rate,
            "doc_empty_rate": doc_empty_rate,
            "bad_quote_rate": bad_quote_rate,
            "quote_hash_mismatch_rate": hash_mismatch_rate,
            "kokuzo_page_exist_rate_among_scoped": page_exist_rate,
            "quotability_rate_among_existing_pages": quotability_rate,
            "passable_fraction": passable_fraction,
        },
        "thresholds_applied": thresholds,
        "rule_results": rules,
        "aggregate_gate_pass": aggregate_pass,
        "kokuzo_pages_table_present": has_pages,
        "summary_failed_reasons": dict(fail_counter.most_common(50)),
        "unit_samples_failed": samples_failed,
        "passable_unit_ids": sorted(passable),
    }


def _fail_conditions_template(thresholds: Dict[str, float]) -> Dict[str, Any]:
    """人間可読 + 機械可読の FAIL 条件（しきい値は thresholds と同期）。"""
    return {
        "description_ja": (
            "khs_units 全体に対する率チェックと、単位行ごとの実在・引用チェックを組み合わせる。"
            " 単体 PASS の unitId のみ khs_passable_set.json に載せ、KG1 は aggregate_gate_pass が true のときのみ学習へ進めることを推奨。"
        ),
        "thresholds": thresholds,
        "rules": [
            {
                "id": "G0",
                "ja": "khs_units が 0 件のときはデータなし（aggregate_gate_pass=false）",
            },
            {
                "id": "G1",
                "ja": "pdfPage NULL の割合が max_null_pdf_page_rate を超えたら FAIL",
                "metric": "null_pdf_page_rate",
                "op": "<=",
                "limit": thresholds["max_null_pdf_page_rate"],
            },
            {
                "id": "G2",
                "ja": "空 quote の割合が max_quote_empty_rate を超えたら FAIL",
                "metric": "quote_empty_rate",
                "op": "<=",
                "limit": thresholds["max_quote_empty_rate"],
            },
            {
                "id": "G3",
                "ja": "空 doc の割合が max_doc_empty_rate を超えたら FAIL",
                "metric": "doc_empty_rate",
                "op": "<=",
                "limit": thresholds["max_doc_empty_rate"],
            },
            {
                "id": "G4",
                "ja": "quote の hard_bad 割合が max_bad_quote_rate を超えたら FAIL",
                "metric": "bad_quote_rate",
                "op": "<=",
                "limit": thresholds["max_bad_quote_rate"],
            },
            {
                "id": "G5",
                "ja": "quoteHash が UTF-8 SHA-256 と一致しない割合が max_quote_hash_mismatch_rate を超えたら FAIL",
                "metric": "quote_hash_mismatch_rate",
                "op": "<=",
                "limit": thresholds["max_quote_hash_mismatch_rate"],
            },
            {
                "id": "G6",
                "ja": "doc+pdfPage がある行について kokuzo_pages 実在率が min_page_exist_rate 未満なら FAIL",
                "metric": "kokuzo_page_exist_rate_among_scoped",
                "op": ">=",
                "limit": thresholds["min_page_exist_rate"],
            },
            {
                "id": "G7",
                "ja": "実在ページがある行について、正規化 quote が本文に含まれる割合が min_quotability_rate 未満なら FAIL",
                "metric": "quotability_rate_among_existing_pages",
                "op": ">=",
                "limit": thresholds["min_quotability_rate"],
            },
            {
                "id": "G8",
                "ja": "単体チェック全合格の割合が min_passable_fraction 未満なら FAIL",
                "metric": "passable_fraction",
                "op": ">=",
                "limit": thresholds["min_passable_fraction"],
            },
        ],
        "unit_level_required_ja": [
            "doc が空でない",
            "pdfPage が NULL でない",
            "quote が空でない",
            "quoteHash が空でなく、SHA-256(quote UTF-8) と一致",
            "quote に hard_bad（U+FFFD / NUL / 制御文字率>=1%）がない",
            "kokuzo_pages に (doc,pdfPage) 行が存在",
            "正規化 whitespace 後の quote がページ本文に部分文字列として含まれる（長さ>=2）",
        ],
    }


def _evaluate_rules(
    n: int,
    thresholds: Dict[str, float],
    null_pdf_rate: float,
    quote_empty_rate: float,
    doc_empty_rate: float,
    bad_quote_rate: float,
    hash_mismatch_rate: float,
    page_exist_rate: float,
    quotability_rate: float,
    passable_fraction: float,
    has_pages: bool,
) -> List[Dict[str, Any]]:
    rules: List[Dict[str, Any]] = []

    def add(rid: str, passed: bool, detail: str, **kw: Any) -> None:
        rules.append({"id": rid, "passed": passed, "detail": detail, **kw})

    if n == 0:
        add("G0", False, "khs_units が 0 件")
        return rules

    add("G0", True, f"khs_units count={n}")

    add(
        "G1",
        null_pdf_rate <= thresholds["max_null_pdf_page_rate"],
        f"null_pdf_page_rate={null_pdf_rate} max={thresholds['max_null_pdf_page_rate']}",
    )
    add(
        "G2",
        quote_empty_rate <= thresholds["max_quote_empty_rate"],
        f"quote_empty_rate={quote_empty_rate} max={thresholds['max_quote_empty_rate']}",
    )
    add(
        "G3",
        doc_empty_rate <= thresholds["max_doc_empty_rate"],
        f"doc_empty_rate={doc_empty_rate} max={thresholds['max_doc_empty_rate']}",
    )
    add(
        "G4",
        bad_quote_rate <= thresholds["max_bad_quote_rate"],
        f"bad_quote_rate={bad_quote_rate} max={thresholds['max_bad_quote_rate']}",
    )
    add(
        "G5",
        hash_mismatch_rate <= thresholds["max_quote_hash_mismatch_rate"],
        f"quote_hash_mismatch_rate={hash_mismatch_rate} max={thresholds['max_quote_hash_mismatch_rate']}",
    )

    if not has_pages:
        add("G6", False, "kokuzo_pages テーブルなし — 実在率を検証できない")
        add("G7", False, "kokuzo_pages テーブルなし — 引用可能率を検証できない")
    else:
        add(
            "G6",
            page_exist_rate >= thresholds["min_page_exist_rate"],
            f"page_exist_rate={page_exist_rate} min={thresholds['min_page_exist_rate']}",
        )
        add(
            "G7",
            quotability_rate >= thresholds["min_quotability_rate"],
            f"quotability_rate={quotability_rate} min={thresholds['min_quotability_rate']}",
        )

    add(
        "G8",
        passable_fraction >= thresholds["min_passable_fraction"],
        f"passable_fraction={passable_fraction} min={thresholds['min_passable_fraction']}",
    )
    return rules


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--db", default="", help="kokuzo.sqlite（省略時は TENMON_DATA_DIR 等）")
    ap.add_argument(
        "--out-dir",
        default="",
        help="khs_health_gate_report.json 等の出力先（省略時 api/automation/out/tenmon_kg0_khs_health_gate_v1）",
    )
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    db_path = Path(args.db).resolve() if args.db else _default_db_path()
    api = _repo_api()
    out_dir = Path(args.out_dir).resolve() if args.out_dir else (api / "automation" / "out" / "tenmon_kg0_khs_health_gate_v1")
    out_dir.mkdir(parents=True, exist_ok=True)

    thresholds = _load_thresholds()
    report = run_gate(db_path, thresholds)

    agg = bool(report.get("aggregate_gate_pass"))
    has_err = "error" in report
    pids = list(report.get("passable_unit_ids") or [])

    passable_set: Dict[str, Any] = {
        "card": CARD,
        "vps_card": VPS_CARD,
        "generatedAt": report.get("generatedAt", _utc_now_iso()),
        "criteria_version": "KG0_V1",
        "aggregate_gate_pass": agg,
        "kg1_pipeline_recommended": agg and not has_err,
        "unitIds": pids,
        "count": len(pids),
        "note_ja": (
            "unitIds は行レベルで全チェック通過した集合。"
            " KG1 学習パイプラインへ進めるのは kg1_pipeline_recommended が true のときのみ推奨。"
        ),
    }

    final_verdict = {
        "card": VPS_CARD,
        "generatedAt": report.get("generatedAt", _utc_now_iso()),
        "verdict": "PASS" if (agg and not has_err) else "FAIL",
        "reasons": [] if (agg and not has_err) else [r.get("detail", r.get("id", "")) for r in report.get("rule_results", []) if not r.get("passed")],
        "db_error": report.get("error"),
        "artifacts": [
            "khs_health_gate_report.json",
            "khs_passable_set.json",
            "final_verdict.json",
            "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1",
        ],
        "fail_next_card": FAIL_NEXT,
    }
    if has_err:
        final_verdict["reasons"].insert(0, str(report.get("error")))

    (out_dir / "khs_health_gate_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "khs_passable_set.json").write_text(
        json.dumps(passable_set, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "final_verdict.json").write_text(
        json.dumps(final_verdict, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "TENMON_KG0_KHS_HEALTH_GATE_VPS_V1").write_text(
        f"{VPS_CARD}\n{report.get('generatedAt', '')}\nverdict={final_verdict['verdict']}\n",
        encoding="utf-8",
    )

    if args.stdout_json:
        print(json.dumps({"report": report, "passable_set": passable_set, "final_verdict": final_verdict}, ensure_ascii=False, indent=2))

    if os.environ.get("KG0_EXIT_ZERO", "").strip().lower() in ("1", "true", "yes"):
        return 0
    return 0 if final_verdict["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
