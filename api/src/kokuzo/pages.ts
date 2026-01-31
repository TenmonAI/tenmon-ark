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

-- FTS5 テーブル（Phase27: 全文検索用）
CREATE VIRTUAL TABLE IF NOT EXISTS kokuzo_pages_fts USING fts5(
  doc,
  pdfPage,
  text,
  content='kokuzo_pages',
  content_rowid='rowid'
);
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
 * ページ本文を保存または更新（FTS5 も更新）
 */
export function upsertPage(doc: string, pdfPage: number, text: string, sha: string): void {
  ensureTable();
  try {
    const db = getDb("kokuzo");
    const now = new Date().toISOString();
    
    // kokuzo_pages に UPSERT（rowid を取得するため、まず DELETE してから INSERT）
    const deleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?");
    deleteStmt.run(doc, pdfPage);
    
    const insertStmt = dbPrepare(
      "kokuzo",
      "INSERT INTO kokuzo_pages (doc, pdfPage, text, sha, updatedAt) VALUES (?, ?, ?, ?, ?)"
    );
    insertStmt.run(doc, pdfPage, text, sha, now);
    
    // FTS5 も更新（Phase27）
    // rowid を取得してから FTS に INSERT
    const rowidStmt = dbPrepare("kokuzo", "SELECT rowid FROM kokuzo_pages WHERE doc = ? AND pdfPage = ?");
    const row = rowidStmt.get(doc, pdfPage) as { rowid: number } | undefined;
    if (row) {
      // FTS5 の既存エントリを削除してから INSERT
      const ftsDeleteStmt = dbPrepare("kokuzo", "DELETE FROM kokuzo_pages_fts WHERE rowid = ?");
      ftsDeleteStmt.run(row.rowid);
      
      const ftsInsertStmt = dbPrepare(
        "kokuzo",
        "INSERT INTO kokuzo_pages_fts(rowid, doc, pdfPage, text) VALUES (?, ?, ?, ?)"
      );
      ftsInsertStmt.run(row.rowid, doc, pdfPage, text);
    }
  } catch (e) {
    console.warn(`[KOKUZO-PAGES] Failed to upsert page ${doc} P${pdfPage}:`, e);
  }
}
