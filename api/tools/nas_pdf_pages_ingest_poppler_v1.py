#!/usr/bin/env python3
import argparse, sqlite3, subprocess, sys, time
from pathlib import Path

def run_pdftotext(pdf: str, pno: int) -> str:
    # Extract a single page as text to stdout
    # -layout keeps rough layout; may help headers.
    cmd = ["pdftotext", "-layout", "-f", str(pno), "-l", str(pno), pdf, "-"]
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # keep stderr for logs but do not fail extraction hard
    txt = r.stdout.decode("utf-8", errors="ignore")
    return txt.strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--doc", required=True)
    ap.add_argument("--from-page", type=int, default=1)
    ap.add_argument("--to-page", type=int, default=20)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pdf = Path(args.pdf)
    if not pdf.exists():
        raise SystemExit(f"[FATAL] pdf not found: {pdf}")

    t0 = time.time()
    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # precheck existing
    pre = conn.execute(
        "SELECT COUNT(*) FROM kokuzo_pages WHERE doc=? AND pdfPage BETWEEN ? AND ?;",
        (args.doc, args.from_page, args.to_page)
    ).fetchone()[0]
    print(f"[OBSERVE] doc={args.doc} range={args.from_page}-{args.to_page} pre_rows={pre}")

    pages = []
    total_chars = 0
    for pno in range(args.from_page, args.to_page + 1):
        txt = run_pdftotext(str(pdf), pno)
        total_chars += len(txt)
        pages.append((args.doc, pno, txt))

    print(f"[OBSERVE] extracted_chars_total={total_chars}")

    # sample heads
    for (d, pno, txt) in pages[:2]:
        head = (txt[:140] + "…") if len(txt) > 140 else txt
        print(f"[DRYRUN] p={pno} chars={len(txt)} head={head!r}")

    if args.dry_run:
        print("[OK] dry-run only")
        return

    # UPSERT: replace text for same (doc,pdfPage)
    up = 0
    for (d, pno, txt) in pages:
        cur = conn.execute(
            """
            INSERT INTO kokuzo_pages(doc, pdfPage, text)
            VALUES(?,?,?)
            ON CONFLICT(doc,pdfPage) DO UPDATE SET
              text=excluded.text,
              updatedAt=datetime('now');
            """,
            (d, pno, txt)
        )
        # sqlite rowcount is unreliable for upsert; we still count attempted
        up += 1

    conn.commit()
    post = conn.execute(
        "SELECT COUNT(*) FROM kokuzo_pages WHERE doc=? AND pdfPage BETWEEN ? AND ?;",
        (args.doc, args.from_page, args.to_page)
    ).fetchone()[0]
    empties = conn.execute(
        "SELECT COUNT(*) FROM kokuzo_pages WHERE doc=? AND pdfPage BETWEEN ? AND ? AND length(text)=0;",
        (args.doc, args.from_page, args.to_page)
    ).fetchone()[0]
    print(f"[OK] upserted={up} post_rows={post} empty_pages={empties} elapsed_s={time.time()-t0:.2f}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("[FATAL]", e, file=sys.stderr)
        raise
