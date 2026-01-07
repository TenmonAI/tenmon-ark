import { dbPrepare } from "../db/index.js";
import type { DetectedLaw, KotodamaLaw, KotodamaPage } from "./types.js";

const upsertPageStmt = dbPrepare(
  "kokuzo",
  `INSERT INTO kotodama_pages
    (doc, pdf_page, book_page, section, text_raw, text_norm, hash, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(doc, pdf_page) DO UPDATE SET
     book_page = excluded.book_page,
     section = excluded.section,
     text_raw = excluded.text_raw,
     text_norm = excluded.text_norm,
     hash = excluded.hash,
     updated_at = excluded.updated_at`
);

const selectPagesStmt = dbPrepare(
  "kokuzo",
  `SELECT id, doc, pdf_page, book_page, section, text_raw, text_norm
   FROM kotodama_pages
   WHERE doc = ? AND pdf_page BETWEEN ? AND ?
   ORDER BY pdf_page ASC`
);

const insertLawStmt = dbPrepare(
  "kokuzo",
  `INSERT OR REPLACE INTO kotodama_laws
    (id, doc, pdf_page, title, quote, normalized, tags, confidence, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const selectLawsByDocPageStmt = dbPrepare(
  "kokuzo",
  `SELECT id, doc, pdf_page, title, quote, normalized, tags, confidence, created_at
   FROM kotodama_laws
   WHERE doc = ? AND pdf_page = ?
   ORDER BY id ASC`
);

export function upsertPage(args: {
  doc: string;
  pdfPage: number;
  bookPage?: string | null;
  section?: string | null;
  textRaw: string;
  textNorm?: string | null;
  hash?: string | null;
}): void {
  const now = Math.floor(Date.now() / 1000);
  upsertPageStmt.run(
    args.doc,
    args.pdfPage,
    args.bookPage ?? null,
    args.section ?? null,
    args.textRaw,
    args.textNorm ?? null,
    args.hash ?? null,
    now,
    now
  );
}

export function listPages(doc: string, fromPage: number, toPage: number): KotodamaPage[] {
  const rows = selectPagesStmt.all(doc, fromPage, toPage) as Array<{
    id: number;
    doc: string;
    pdf_page: number;
    book_page?: string | null;
    section?: string | null;
    text_raw: string;
    text_norm?: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    doc: r.doc,
    pdfPage: r.pdf_page,
    bookPage: r.book_page ?? null,
    section: r.section ?? null,
    textRaw: r.text_raw,
    textNorm: r.text_norm ?? null,
  }));
}

export function insertDetectedLaw(
  doc: string,
  pdfPage: number,
  lawId: string,
  law: DetectedLaw
): void {
  const now = Math.floor(Date.now() / 1000);
  insertLawStmt.run(
    lawId,
    doc,
    pdfPage,
    law.title,
    law.quote,
    law.normalized,
    JSON.stringify(law.tags ?? []),
    law.confidence,
    now
  );
}

export function listLawsByDocAndPage(doc: string, pdfPage: number): KotodamaLaw[] {
  const rows = selectLawsByDocPageStmt.all(doc, pdfPage) as Array<{
    id: string;
    doc: string;
    pdf_page: number;
    title: string;
    quote: string;
    normalized: string;
    tags: string;
    confidence: number;
    created_at: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    doc: r.doc,
    pdfPage: r.pdf_page,
    title: r.title,
    quote: r.quote,
    normalized: r.normalized,
    tags: safeParseTags(r.tags),
    confidence: r.confidence,
    createdAt: r.created_at,
  }));
}

function safeParseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}


