#!/usr/bin/env python3
import argparse, hashlib, sqlite3, sys, time
from typing import List, Tuple

KEYWORDS = ["言灵秘書", "五十行一言法則", "いろは言灵解", "カタカムナ"]  # legacy (default OFF)
DEFAULT_ALLOW_DOCS = ["KHS", "言霊秘書.pdf", "KHS_UTF8"]  # C0_3_KHS_SELECTOR_V1

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def pick_candidates(conn: sqlite3.Connection, limit: int, allow_docs: List[str]) -> List[Tuple[str, str]]:
    """
    C0_3_KHS_SELECTOR_V1:
      Default selector is doc-allowlist ONLY (prevents sutra bleed: HANNYA/HOKKE).
      Text-keyword selector is not used by default (kept only as legacy constant).
    """
    allow = [d.strip() for d in (allow_docs or []) if str(d).strip()]
    if not allow:
        allow = DEFAULT_ALLOW_DOCS[:]  # deterministic fallback

    qs = ",".join(["?"] * len(allow))
    sql = f"""
      SELECT doc, text
      FROM kokuzo_pages
      WHERE doc IN ({qs})
      ORDER BY doc ASC
      LIMIT ?
    """
    params = list(allow) + [str(limit)]
    cur = conn.execute(sql, params)
    rows = [(str(r[0]), str(r[1] or "")) for r in cur.fetchall()]
    return rows

def ingest(conn: sqlite3.Connection, head_chars: int, limit: int, allow_docs: List[str]) -> int:
    candidates = pick_candidates(conn, limit=limit, allow_docs=allow_docs)
    ins = 0
    for doc, text in candidates:
        t = (text or "").strip()
        if not t:
            continue
        quote = t[:head_chars]
        qh = sha256_hex(quote)
        dh = sha256_hex(doc)[:12]
        pdf_page = 0
        unit_id = f"KHSU:{dh}:p{pdf_page}:q{qh[:12]}"
        loc = f"auto:head{head_chars}"

        cur = conn.execute(
            """
            INSERT OR IGNORE INTO khs_units(unitId, doc, pdfPage, quote, quoteHash, locHint)
            VALUES(?,?,?,?,?,?)
            """,
            (unit_id, doc, pdf_page, quote, qh, loc)
        )
        if cur.rowcount and cur.rowcount > 0:
            ins += 1

    conn.commit()
    return ins

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--head", type=int, default=600)
    ap.add_argument("--limit", type=int, default=500)
ap.add_argument("--allow-doc", action="append", default=[], help="Allow doc name (repeatable). Default: KHS set")
ap.add_argument("--dry-run", action="store_true", help="List candidate docs/counts only; no DB writes")
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

        # C0_3_KHS_SELECTOR_V1 dry-run: show candidate doc counts and exit
    allow_docs = args.allow_doc if args.allow_doc else []
    if args.dry_run:
        allow = allow_docs if allow_docs else DEFAULT_ALLOW_DOCS[:]
        qs = ",".join(["?"] * len(allow))
        rows = conn.execute(
            f"SELECT doc, COUNT(*) FROM kokuzo_pages WHERE doc IN ({qs}) GROUP BY doc ORDER BY doc ASC;",
            allow
        ).fetchall()
        print("[DRYRUN] allow_docs=", allow)
        print("[DRYRUN] counts:")
        for d, c in rows:
            print(" -", d, c)
        # Show if any forbidden doc (sutra) sneaks in (should not)
        bad = conn.execute(
            "SELECT doc, COUNT(*) FROM kokuzo_pages WHERE doc IN ('HANNYA','HOKKE') GROUP BY doc ORDER BY doc ASC;"
        ).fetchall()
        print("[DRYRUN] known sutra docs present (for reference):", bad)
        return

    n = ingest(conn, head_chars=args.head, limit=args.limit, allow_docs=allow_docs)
    total = conn.execute("SELECT COUNT(*) FROM khs_units;").fetchone()[0]
    print(f"[OK] inserted={n} total_khs_units={total} elapsed_s={time.time()-t0:.2f}")

    rows = conn.execute(
        "SELECT unitId, doc, pdfPage, length(quote) AS qlen FROM khs_units ORDER BY createdAt DESC LIMIT 5;"
    ).fetchall()
    print("[SAMPLE] last5:")
    for r in rows:
        print(" -", r)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
