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

// LAW_DEDUP_COMPACT_V2: exported helper to dedup by doc/pdfPage deterministically
export function dedupLawsByDocPage<T extends { id?: any; doc?: any; pdfPage?: any }>(items: T[]): T[] {
  try {
    const seen = new Map<string, T>();
    for (const x of (Array.isArray(items) ? items : [])) {
      const k = String((x as any)?.doc ?? "") + "#" + String((x as any)?.pdfPage ?? "");
      if (!k || k === "#") continue;
      const prev = seen.get(k);
      const xid = Number((x as any)?.id ?? 0);
      const pid = Number((prev as any)?.id ?? 0);
      if (!prev || xid >= pid) seen.set(k, x);
    }
    const arr = Array.from(seen.values());
    arr.sort((a: any, b: any) => {
      const ad = String((a as any)?.doc ?? "");
      const bd = String((b as any)?.doc ?? "");
      if (ad !== bd) return ad < bd ? -1 : 1;
      const ap = Number((a as any)?.pdfPage ?? 0);
      const bp = Number((b as any)?.pdfPage ?? 0);
      if (ap !== bp) return ap - bp;
      return Number((b as any)?.id ?? 0) - Number((a as any)?.id ?? 0);
    });
    return arr as T[];
  } catch {
    return Array.isArray(items) ? items : [];
  }
}
