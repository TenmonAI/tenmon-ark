#!/usr/bin/env python3
# C0_10A2_FIX_INSERT_PDFPAGE_V1: write into kokuzo_pages(doc,pdfPage,text) (schema-aligned)
import argparse, hashlib, sqlite3, sys, time
from pathlib import Path

def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="/opt/tenmon-ark-data/kokuzo.sqlite")
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--prefix", default="NAS:PDF:KOTODAMA_HISYO")
    ap.add_argument("--limit-pages", type=int, default=0, help="0 = all pages (for quick test, set 5/10)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"[FATAL] pdf not found: {pdf_path}")

    try:
        import pypdf  # pypdf is lightweight; if missing, we'll fail clearly
    except Exception as e:
        raise SystemExit("[FATAL] missing python module pypdf. Install: python3 -m pip install pypdf") from e

    t0 = time.time()
    file_hash = sha256_file(pdf_path)
    doc = f"{args.prefix}:{file_hash[:12]}"

    reader = pypdf.PdfReader(str(pdf_path))
    n_pages = len(reader.pages)
    lim = args.limit_pages if args.limit_pages and args.limit_pages > 0 else n_pages

    print(f"[OBSERVE] pdf={pdf_path} pages={n_pages} limit={lim} doc={doc}")

    # Extract text per page (text layer only)
    extracted_total = 0
    page_rows = []
    for i in range(lim):
        page = reader.pages[i]
        txt = ""
        try:
            txt = page.extract_text() or ""
        except Exception:
            txt = ""
        txt = txt.strip()
        extracted_total += len(txt)
        page_rows.append((doc, i + 1, txt))

    print(f"[OBSERVE] extracted_chars_total={extracted_total}")

    if args.dry_run:
        # show first 2 pages head
        for (d, pno, txt) in page_rows[:2]:
            head = (txt[:120] + "…") if len(txt) > 120 else txt
            print(f"[DRYRUN] page={pno} chars={len(txt)} head={head!r}")
        return

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # Ensure kokuzo_pages has a pdfPage column? We cannot assume.
    # We store pdfPage in doc string + text; page number is embedded in doc+loc in this first version.
    # BUT we need a structured place. So we store as separate doc per page:
    # doc = <doc>#p<NNN>  (deterministic)
    # This avoids schema assumptions.
    inserted = 0
    for (d, pno, txt) in page_rows:        # Insert into kokuzo_pages as (doc,text). Keep it minimal; other columns default.
        cur = conn.execute(
            "INSERT OR IGNORE INTO kokuzo_pages(doc, pdfPage, text) VALUES(?, ?, ?);",
            (d, pno, txt)
        )
        if cur.rowcount and cur.rowcount > 0:
            inserted += 1

    conn.commit()
    print(f"[OK] inserted_pages={inserted} elapsed_s={time.time()-t0:.2f}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(e, file=sys.stderr)
        raise
