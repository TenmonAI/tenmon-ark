#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TENMON_A0_KOKUZO_BAD_OBSERVE — kokuzo_pages を読み取り専用で観測し BAD 分布を JSON 出力する（改正なし）。
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import re
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CARD = "TENMON_A0_KOKUZO_BAD_OBSERVE_V1"
FAIL_NEXT = "TENMON_A0_KOKUZO_BAD_OBSERVE_RETRY_CURSOR_AUTO_V1"


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


def _jp_count(s: str) -> int:
    return len(re.findall(r"[\u3041-\u3096\u30a1-\u30fc\u4e00-\u9fff]", s))


def _mostly_latin_or_ascii(s: str) -> bool:
    """英語・数字・記号主体のページは jp_rate 低のみでは BAD としない。"""
    if not s:
        return True
    ok = 0
    for c in s:
        o = ord(c)
        if c.isascii() and (c.isalnum() or c.isspace() or c in ".,;:!?-'\"()[]{}/"):
            ok += 1
    return (ok / len(s)) > 0.55


def analyze_text(text: str) -> Dict[str, Any]:
    s = text if isinstance(text, str) else str(text or "")
    ln = len(s) or 0
    jp = _jp_count(s)
    jp_rate = (jp / ln) if ln else 0.0

    ctrl = 0
    for ch in s:
        c = ord(ch)
        allowed = c in (0x09, 0x0A, 0x0D)
        is_ctrl = (not allowed) and (c < 0x20 or (0x7F <= c <= 0x9F))
        if is_ctrl:
            ctrl += 1
    ctrl_rate = (ctrl / ln) if ln else 0.0

    nul = s.count("\x00")
    replacement = s.count("\ufffd")

    hard_bad = replacement > 0 or nul > 0 or ctrl_rate >= 0.01
    soft_mojibake = (
        ln >= 80
        and jp_rate < 0.01
        and not _mostly_latin_or_ascii(s)
    )
    mojibake_likely = hard_bad or soft_mojibake

    raw = s.encode("utf-8", errors="replace")
    hex_head = raw[:96].hex()

    return {
        "len": ln,
        "jp_count": jp,
        "jp_rate": round(jp_rate, 6),
        "ctrl_count": ctrl,
        "ctrl_rate": round(ctrl_rate, 6),
        "nul_count": nul,
        "replacement_char_count": replacement,
        "mojibake_likely": mojibake_likely,
        "hard_bad_signal": hard_bad,
        "soft_mojibake_context": soft_mojibake,
        "utf8_hex_head_96b": hex_head,
    }


def _load_compare_map(compare_dirs: List[str]) -> Dict[Tuple[str, int], str]:
    """jsonl / json 行から (doc, pdfPage) -> text を推定収集（観測用・ベストエフォート）。"""
    out: Dict[Tuple[str, int], str] = {}

    def _add(doc_raw: str, pgi: int, tx: str) -> None:
        ds = str(doc_raw).strip()
        if not ds:
            return
        out[(ds, pgi)] = tx
        out[(Path(ds).name, pgi)] = tx

    for d in compare_dirs:
        base = Path(d)
        if not base.is_dir():
            continue
        for pattern in ("**/*.jsonl", "**/*.ndjson"):
            for fp in base.glob(pattern):
                try:
                    for line in fp.read_text(encoding="utf-8", errors="replace").splitlines():
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        try:
                            o = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if not isinstance(o, dict):
                            continue
                        doc = o.get("doc") or o.get("source_doc") or o.get("file")
                        pg = o.get("pdfPage") or o.get("page") or o.get("pdf_page")
                        tx = o.get("text")
                        if doc is None or pg is None or not isinstance(tx, str):
                            continue
                        try:
                            pgi = int(pg)
                        except (TypeError, ValueError):
                            continue
                        _add(str(doc), pgi, tx)
                except OSError:
                    continue
    return out


def _lookup_artifact(
    compare_map: Dict[Tuple[str, int], str], doc: str, page: int
) -> Optional[str]:
    if (doc, page) in compare_map:
        return compare_map[(doc, page)]
    return compare_map.get((Path(doc).name, page))


def _ingest_log_hints(log_dirs: List[str], limit_lines: int = 5000) -> Dict[str, Any]:
    """ingest 系ログから doc 名・エラーのヒントを集約（正文は改変しない）。"""
    doc_mentions: Dict[str, int] = defaultdict(int)
    error_hits = 0
    lines_scanned = 0
    for d in log_dirs:
        root = Path(d)
        if not root.is_dir():
            continue
        for pat in ("**/*ingest*.log", "**/*kokuzo*.log", "**/*.jsonl"):
            for fp in root.glob(pat):
                try:
                    with fp.open(encoding="utf-8", errors="replace") as f:
                        for i, line in enumerate(f):
                            if i > 2000:
                                break
                            if lines_scanned >= limit_lines:
                                break
                            lines_scanned += 1
                            low = line.lower()
                            if "error" in low or "traceback" in low or "mojibake" in low:
                                error_hits += 1
                            for m in re.finditer(
                                r"([\w\-]+\.(?:pdf|PDF))", line
                            ):
                                doc_mentions[m.group(1)] += 1
                except OSError:
                    continue
    return {
        "lines_scanned": lines_scanned,
        "error_or_traceback_hits": error_hits,
        "pdf_filenames_mentioned_top": sorted(
            doc_mentions.keys(), key=lambda k: doc_mentions[k], reverse=True
        )[:20],
    }


def run_observe(
    db_path: Path,
    out_dir: Path,
    compare_dirs: List[str],
    log_dirs: List[str],
    doc_filter: str,
    limit_pages: int,
) -> Dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    compare_map = _load_compare_map(compare_dirs)
    log_hints = _ingest_log_hints(log_dirs)

    if not db_path.is_file():
        body = {
            "version": 1,
            "card": CARD,
            "generatedAt": _utc_now_iso(),
            "error": "kokuzo_sqlite_missing",
            "db_path": str(db_path),
            "fail_next_cursor_card": FAIL_NEXT,
        }
        (out_dir / "kokuzo_bad_report.json").write_text(
            json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (out_dir / "page_bad_distribution.json").write_text("{}\n", encoding="utf-8")
        (out_dir / "final_verdict.json").write_text(
            json.dumps(
                {
                    "version": 1,
                    "card": "TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1",
                    "pass": False,
                    "reason": "db_missing",
                    "fail_next_cursor_card": FAIL_NEXT,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        return body

    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    q = "SELECT doc, pdfPage, text, sha, updatedAt FROM kokuzo_pages"
    args: List[Any] = []
    if doc_filter:
        q += " WHERE doc LIKE ?"
        args.append(f"%{doc_filter}%")
    q += " ORDER BY doc, pdfPage"
    if limit_pages > 0:
        lim = max(0, min(int(limit_pages), 50_000_000))
        q += f" LIMIT {lim}"
    rows = cur.execute(q, args).fetchall()
    conn.close()

    distribution: Dict[str, Any] = {}
    bad_pages: List[Dict[str, Any]] = []
    soft_pages = 0
    total = len(rows)
    bad_count = 0
    by_doc: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"pages": 0, "bad_pages": 0, "total_ctrl": 0, "total_repl": 0}
    )

    for row in rows:
        doc = str(row["doc"])
        page = int(row["pdfPage"])
        text = str(row["text"] or "")
        sha_db = str(row["sha"] or "")
        metrics = analyze_text(text)
        key = f"{doc}::P{page}"
        layer_guess = "unknown"
        artifact = _lookup_artifact(compare_map, doc, page)
        if artifact is not None:
            am = analyze_text(artifact)
            if metrics["hard_bad_signal"] and not am["hard_bad_signal"]:
                layer_guess = "storage_or_post_ingest_suspected"
            elif am["hard_bad_signal"]:
                layer_guess = "ingest_or_extract_suspected"
            elif metrics["soft_mojibake_context"] and not am["soft_mojibake_context"]:
                layer_guess = "storage_or_post_ingest_suspected_soft"
            elif am["soft_mojibake_context"]:
                layer_guess = "ingest_or_extract_suspected_soft"
            else:
                layer_guess = "both_clean_or_mild"
        entry = {
            "doc": doc,
            "pdfPage": page,
            "sha": sha_db,
            "updatedAt": str(row["updatedAt"] or ""),
            "metrics": metrics,
            "layer_guess": layer_guess,
            "had_ingest_artifact": artifact is not None,
        }
        distribution[key] = {k: v for k, v in entry.items() if k != "metrics"} | {
            "mojibake_likely": metrics["mojibake_likely"],
            "hard_bad_signal": metrics["hard_bad_signal"],
            "soft_mojibake_context": metrics["soft_mojibake_context"],
            "ctrl_rate": metrics["ctrl_rate"],
            "replacement_char_count": metrics["replacement_char_count"],
        }
        bd = by_doc[doc]
        bd["pages"] += 1
        bd["total_ctrl"] += metrics["ctrl_count"]
        bd["total_repl"] += metrics["replacement_char_count"]
        if metrics.get("soft_mojibake_context"):
            soft_pages += 1
        if metrics["hard_bad_signal"]:
            bad_count += 1
            bd["bad_pages"] += 1
            entry["metrics_sample_hex_only"] = metrics["utf8_hex_head_96b"]
            bad_pages.append(entry)

    contam_rate = (bad_count / total) if total else 0.0

    report = {
        "version": 1,
        "card": CARD,
        "generatedAt": _utc_now_iso(),
        "db_path": str(db_path),
        "pages_scanned": total,
        "bad_pages_count": bad_count,
        "soft_mojibake_pages_count": soft_pages,
        "contamination_rate": round(contam_rate, 6),
        "contamination_note": "bad_pages_count は hard_bad_signal（制御文字・NUL・置換文字）のみ。soft_mojibake は参考指標。",
        "by_doc_summary": dict(by_doc),
        "ingest_log_hints": log_hints,
        "compare_artifact_keys_loaded": len(compare_map),
        "policy": {
            "observe_only": True,
            "no_kokuzo_pages_mutation": True,
        },
        "fail_next_cursor_card": FAIL_NEXT,
    }

    (out_dir / "kokuzo_bad_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "page_bad_distribution.json").write_text(
        json.dumps(distribution, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    final = {
        "version": 1,
        "card": "TENMON_A0_KOKUZO_BAD_OBSERVE_VPS_V1",
        "pass": True,
        "observation_complete": True,
        "pages_scanned": total,
        "bad_pages_count": bad_count,
        "paths": {
            "kokuzo_bad_report": str(out_dir / "kokuzo_bad_report.json"),
            "page_bad_distribution": str(out_dir / "page_bad_distribution.json"),
        },
        "fail_next_cursor_card": FAIL_NEXT,
    }
    (out_dir / "final_verdict.json").write_text(
        json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description=CARD)
    ap.add_argument("--db", default="", help="kokuzo.sqlite パス（省略時 TENMON_DATA_DIR 等）")
    ap.add_argument("--out-dir", required=True)
    ap.add_argument(
        "--compare-dir",
        action="append",
        default=[],
        help="ingest 中間 jsonl 等を再帰探索（複数可）。doc+pdfPage+text 行で DB と比較",
    )
    ap.add_argument(
        "--log-dir",
        action="append",
        default=[],
        help="ingest / kokuzo ログ探索（複数可）。既定: /var/log/tenmon",
    )
    ap.add_argument("--doc-filter", default="", help="SQL LIKE 用 doc フィルタ")
    ap.add_argument("--limit", type=int, default=0, help="最大ページ数（0=無制限）")
    ap.add_argument("--stdout-json", action="store_true")
    args = ap.parse_args()

    db_path = Path(args.db).resolve() if args.db else _default_db_path()
    compare_dirs = list(args.compare_dir)
    api = _repo_api()
    if not compare_dirs:
        for cand in (
            api / "scripts" / "_kokuzo_extract_cache",
            api.parent / "data" / "kokuzo_ingest_artifacts",
        ):
            if cand.is_dir():
                compare_dirs.append(str(cand))

    log_dirs = list(args.log_dir)
    if not log_dirs:
        log_dirs = ["/var/log/tenmon"]

    rep = run_observe(
        db_path,
        Path(args.out_dir).resolve(),
        compare_dirs,
        log_dirs,
        args.doc_filter,
        args.limit,
    )
    if args.stdout_json:
        print(json.dumps(rep, ensure_ascii=False, indent=2))
    return 0 if "error" not in rep else 1


if __name__ == "__main__":
    raise SystemExit(main())
