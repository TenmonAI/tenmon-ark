import { getDb, dbPrepare } from "../db/index.js";

export type KokuzoLaw = {
  id: number;
  threadId: string;
  doc: string;
  pdfPage: number;
  quote: string;
  tags: string[];
  name: string | null;
  definition: string | null;
  evidenceIds: string[];
  createdAt: string;
};

export function listThreadLaws(threadId: string, limit = 20): KokuzoLaw[] {
  const db = getDb("kokuzo");
  const stmt = dbPrepare(
    "kokuzo",
    "SELECT id, threadId, doc, pdfPage, quote, tags, name, definition, evidenceIds, createdAt " +
      "FROM kokuzo_laws WHERE threadId = ? ORDER BY createdAt DESC LIMIT ?"
  );
  const rows = stmt.all(threadId, limit) as any[];

  return rows.map((r) => ({
    id: r.id,
    threadId: r.threadId,
    doc: r.doc,
    pdfPage: r.pdfPage,
    quote: r.quote,
    tags: r.tags ? JSON.parse(r.tags) : [],
    name: r.name ?? null,
    definition: r.definition ?? null,
    evidenceIds: r.evidenceIds ? JSON.parse(r.evidenceIds) : [],
    createdAt: r.createdAt,
  }));
}
