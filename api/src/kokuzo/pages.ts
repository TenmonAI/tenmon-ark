import { getDb, dbPrepare } from "../db/index.js";

// kokuzo_pages テーブルの自動作成
const INIT_SQL = `
CREATE TABLE IF NOT EXISTS kokuzo_pages (
  doc TEXT NOT NULL,
  pdfPage INTEGER NOT NULL,
  text TEXT NOT NULL,
  sha TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (doc, pdfPage)
);
CREATE INDEX IF NOT EXISTS idx_kokuzo_pages_doc_page ON kokuzo_pages(doc, pdfPage);
`;

let initialized = false;

function ensureTable(): void {
  if (initialized) return;
  try {
    const db = getDb("kokuzo");
    db.exec(INIT_SQL);
    initialized = true;
  } catch (e) {
    console.warn("[KOKUZO-PAGES] Failed to initialize table:", e);
  }
}

/**
 * ページ本文を取得
 */
export function getPageText(doc: string, pdfPage: number): string | null {
  ensureTable();
  try {
    const stmt = dbPrepare("kokuzo", "SELECT text FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?");
    const row = stmt.get(doc, pdfPage) as { text: string } | undefined;
    return row ? row.text : null;
  } catch (e) {
    console.warn(`[KOKUZO-PAGES] Failed to get page ${doc} P${pdfPage}:`, e);
    return null;
  }
}

/**
 * ページ本文を保存または更新
 */
export function upsertPage(doc: string, pdfPage: number, text: string, sha: string): void {
  ensureTable();
  try {
    const stmt = dbPrepare(
      "kokuzo",
      "INSERT OR REPLACE INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(doc, pdfPage, text, sha, new Date().toISOString());
  } catch (e) {
    console.warn(`[KOKUZO-PAGES] Failed to upsert page ${doc} P${pdfPage}:`, e);
  }
}
