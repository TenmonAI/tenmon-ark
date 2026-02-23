#!/usr/bin/env python3
import argparse, hashlib, sqlite3, sys, re

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def unit_id(doc: str, pdfPage: int, quote: str, tag: str) -> str:
    # deterministic
    h = sha256_hex(f"{tag}|{doc}|{pdfPage}|{quote}")[:12]
    return f"KHSBR:{tag}:{h}"

def pick_notion_snippet(text: str) -> str:
    # deterministic: take first occurrence of 'p450' and slice window
    if not text:
        return ""
    idx = text.find("p450")
    if idx < 0:
        idx = text.find("P450")
    if idx < 0:
        idx = text.find("450頁")
    if idx < 0:
        idx = text.find("450ページ")
    if idx < 0:
        return ""
    start = max(0, idx - 40)
    end = min(len(text), idx + 220)
    sn = re.sub(r"\s+", " ", text[start:end]).strip()
    return sn

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--notion-doc", required=True)
    ap.add_argument("--pdf-doc", required=True)
    ap.add_argument("--page", type=int, required=True)
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")

    # 1) fetch notion text (kokuzo_pages has pdfPage NOT NULL; notion rows are stored without page notion.
    # We select all rows for that doc and concat (deterministic order).
    nrows = conn.execute(
        "SELECT pdfPage, text FROM kokuzo_pages WHERE doc=? ORDER BY pdfPage ASC;",
        (args.notion_doc,)
    ).fetchall()
    notion_text = "\n".join([r[1] or "" for r in nrows])
    snippet = pick_notion_snippet(notion_text)

    if not snippet:
        print("[FATAL] cannot find p450 snippet in notion doc text", file=sys.stderr)
        raise SystemExit(2)

    # 2) fetch pdf page text
    prow = conn.execute(
        "SELECT text FROM kokuzo_pages WHERE doc=? AND pdfPage=?;",
        (args.pdf_doc, args.page)
    ).fetchone()
    if not prow:
        print("[FATAL] pdf page not found in kokuzo_pages", file=sys.stderr)
        raise SystemExit(3)
    pdf_text = (prow[0] or "").strip()
    pdf_quote = pdf_text[:600]

    # 3) insert bridge units into khs_units (doc/pdfPage/quote/quoteHash/locHint)
    # khs_units schema exists from C-0
    def insert_unit(doc: str, pdfPage: int, quote: str, locHint: str, tag: str) -> str:
        qh = sha256_hex(quote)
        uid = unit_id(doc, pdfPage, qh, tag)
        conn.execute(
            "INSERT OR IGNORE INTO khs_units(unitId, doc, pdfPage, quote, quoteHash, locHint) VALUES(?,?,?,?,?,?);",
            (uid, doc, int(pdfPage), quote, qh, locHint)
        )
        return uid

    bridge_loc = f"bridge-> {args.pdf_doc} pdfPage={args.page}"
    pdf_loc = "source=PDF(poppler)"

    u1 = insert_unit(args.notion_doc, args.page, snippet, bridge_loc, "NOTION")
    u2 = insert_unit(args.pdf_doc, args.page, pdf_quote, pdf_loc, "PDF")

    conn.commit()
    print("[OK] inserted_bridge_units:")
    print(" -", u1, args.notion_doc, args.page)
    print(" -", u2, args.pdf_doc, args.page)

