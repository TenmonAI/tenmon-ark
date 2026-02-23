#!/usr/bin/env python3
import argparse, hashlib, sqlite3, sys, time
from typing import List, Tuple

KEYWORDS = ["言灵秘書", "五十行一言法則", "いろは言灵解", "カタカムナ"]

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def pick_candidates(conn: sqlite3.Connection, limit: int) -> List[Tuple[str, str]]:
    # C-0-2 v1: deterministic and simple selector (refine in C-0-3)
    where = []
    params: List[str] = []

    where.append("(doc LIKE ? OR doc LIKE ?)")
    params += ["%khs%", "%KHS%"]

    kw_where = " OR ".join(["text LIKE ?"] * len(KEYWORDS))
    where.append(f"({kw_where})")
    params += [f"%{k}%" for k in KEYWORDS]

    sql = f"""
      SELECT doc, text
      FROM kokuzo_pages
      WHERE ({' OR '.join(where)})
      ORDER BY doc ASC
      LIMIT ?
    """
    params.append(str(limit))
    cur = conn.execute(sql, params)
    return [(str(r[0]), str(r[1] or "")) for r in cur.fetchall()]

def ingest(conn: sqlite3.Connection, head_chars: int, limit: int) -> int:
    candidates = pick_candidates(conn, limit=limit)
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
    args = ap.parse_args()

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    n = ingest(conn, head_chars=args.head, limit=args.limit)
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
