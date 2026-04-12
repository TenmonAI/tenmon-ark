-- KOKŪZŌ FTS5 Extension (optional - requires FTS5 module)
-- This file is applied separately with error handling.
-- If FTS5 is not available, the server will still start without full-text search.

CREATE VIRTUAL TABLE IF NOT EXISTS kokuzo_pages_fts USING fts5(
  text,
  doc UNINDEXED,
  pdfPage UNINDEXED,
  content='kokuzo_pages',
  content_rowid='rowid'
);

-- Keep FTS in sync (safe even if no inserts happen)
CREATE TRIGGER IF NOT EXISTS kokuzo_pages_ai AFTER INSERT ON kokuzo_pages BEGIN
  INSERT INTO kokuzo_pages_fts(rowid, text, doc, pdfPage)
  VALUES (new.rowid, new.text, new.doc, new.pdfPage);
END;

CREATE TRIGGER IF NOT EXISTS kokuzo_pages_ad AFTER DELETE ON kokuzo_pages BEGIN
  INSERT INTO kokuzo_pages_fts(kokuzo_pages_fts, rowid, text, doc, pdfPage)
  VALUES('delete', old.rowid, old.text, old.doc, old.pdfPage);
END;

CREATE TRIGGER IF NOT EXISTS kokuzo_pages_au AFTER UPDATE ON kokuzo_pages BEGIN
  INSERT INTO kokuzo_pages_fts(kokuzo_pages_fts, rowid, text, doc, pdfPage)
  VALUES('delete', old.rowid, old.text, old.doc, old.pdfPage);
  INSERT INTO kokuzo_pages_fts(rowid, text, doc, pdfPage)
  VALUES (new.rowid, new.text, new.doc, new.pdfPage);
END;
