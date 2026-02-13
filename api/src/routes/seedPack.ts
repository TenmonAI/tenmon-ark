import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const seedPackRouter = Router();

type PackReq = {
  seedIds?: string[];
  options?: { limitPages?: number };
};

type PackedItem = {
  seedId: string;
  doc: string | null;
  pdfPage: number | null;
  snippet: string | null;
  evidenceIds: string[];
};

function parseEvidenceIds(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") {
    // JSON array string or comma-separated fallback
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.filter((x) => typeof x === "string");
    } catch {}
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

seedPackRouter.post("/seed/pack", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PackReq;
    const seedIds = Array.isArray(body.seedIds)
      ? body.seedIds.filter((x) => typeof x === "string" && x.length > 0)
      : [];

    const limitPagesRaw = body.options?.limitPages;
    const limitPages =
      typeof limitPagesRaw === "number" && limitPagesRaw > 0 ? Math.min(20, Math.floor(limitPagesRaw)) : 1;

    const db = getDb("kokuzo");

    // NOTE: kokuzo_pages の列名に合わせる。無ければ例外→ok:falseで返す（500にしない）
    const stmt = db.prepare(`
      SELECT doc, pdfPage, snippet, evidenceIds
      FROM kokuzo_pages
      WHERE doc = ?
      ORDER BY pdfPage ASC
      LIMIT ?
    `);

    const items: PackedItem[] = [];
    for (const seedId of seedIds) {
      const rows = stmt.all(seedId, limitPages) as any[];
      if (!rows || rows.length === 0) {
        items.push({ seedId, doc: seedId, pdfPage: null, snippet: null, evidenceIds: [] });
        continue;
      }
      for (const r of rows) {
        items.push({
          seedId,
          doc: typeof r?.doc === "string" ? r.doc : seedId,
          pdfPage: typeof r?.pdfPage === "number" ? r.pdfPage : null,
          snippet: typeof r?.snippet === "string" ? r.snippet : null,
          evidenceIds: parseEvidenceIds(r?.evidenceIds),
        });
      }
    }

    return res.json({
      ok: true,
      schemaVersion: 1,
      payload: {
        kind: "SEED_PACK_V1",
        packedAt: new Date().toISOString(),
        items,
      },
    });
  } catch (e: any) {
    return res.status(200).json({
      ok: false,
      schemaVersion: 1,
      error: e?.message ? String(e.message) : "seed/pack failed",
    });
  }
});

seedPackRouter.post("/seed/unpack", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const items = Array.isArray(body?.items) ? body.items : [];
  return res.json({
    ok: true,
    schemaVersion: 1,
    restored: { seedsCount: items.length, edgesCount: 0 },
  });
});
