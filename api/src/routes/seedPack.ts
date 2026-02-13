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

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function makeSnippet(text: string, max = 160): string | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

seedPackRouter.post("/seed/pack", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PackReq;
    const seedIds = Array.isArray(body.seedIds)
      ? body.seedIds.filter((x) => typeof x === "string" && x.length > 0)
      : [];

    const limitPages =
      typeof body.options?.limitPages === "number" && body.options.limitPages > 0
        ? Math.min(50, Math.floor(body.options.limitPages))
        : 1;

    const db = getDb("kokuzo");

    const items: PackedItem[] = [];
    const stmt = db.prepare(
      `SELECT doc, pdfPage, text
       FROM kokuzo_pages
       WHERE doc = ?
       ORDER BY pdfPage ASC
       LIMIT ?`
    );

    for (const seedId of seedIds) {
      const rows = stmt.all(seedId, limitPages) as any[];
      for (const r of rows) {
        const doc = asStr(r?.doc);
        const pdfPage = asNum(r?.pdfPage);
        const text = typeof r?.text === "string" ? r.text : "";
        const snippet = makeSnippet(text);
        const evidenceIds = doc && pdfPage ? [`doc=${doc}#pdfPage=${pdfPage}`] : [];
        items.push({ seedId, doc, pdfPage, snippet, evidenceIds });
      }
    }

    return res.json({
      ok: true,
      schemaVersion: 1,
      payload: {
        kind: "SEED_PACK_V1",
        createdAt: new Date().toISOString(),
        items,
      },
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      schemaVersion: 1,
      error: e?.message ?? String(e),
    });
  }
});

seedPackRouter.post("/seed/unpack", (_req: Request, res: Response) => {
  // P2では復元は契約だけ固定（実装は次カード）
  return res.json({
    ok: true,
    schemaVersion: 1,
    restored: { seedsCount: 0, edgesCount: 0 },
  });
});
