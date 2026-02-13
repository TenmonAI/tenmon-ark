import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const seedPackRouter = Router();

type PackReq = {
  seedIds?: string[];
  options?: { level?: number; includeEdges?: boolean; limitPages?: number };
};

type PackedItem = {
  seedId: string;
  doc: string | null;
  pdfPage: number | null;
  snippet: string | null;
  evidenceIds: string[];
};

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function n(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function safeSnippet(text: string, max = 220): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * P2-1 最小実装：
 * seedId -> kokuzo_pages を「部分一致」で当て、最初の1件を返す。
 * - seedId と doc の対応表がまだ無い前提なので「doc LIKE」で暫定対応（後でP2-2で強化）
 * - doc/pdfPage/snippet/evidenceIds を payload.items に詰める
 */
seedPackRouter.post("/seed/pack", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as PackReq;
  const seedIds = Array.isArray(body.seedIds) ? body.seedIds.filter((x) => typeof x === "string" && x.length > 0) : [];
  const limitPages = typeof body.options?.limitPages === "number" ? Math.max(1, Math.min(50, body.options!.limitPages!)) : 1;

  const db = getDb("kokuzo");

  const items: PackedItem[] = [];
  for (const seedId of seedIds) {
    // kokuzo_pages: columnsは環境差があるので「存在しそうなもの」だけ読む（NULL許容）
    // doc は必ずあるはず、pdfPage は pdfPage or page のどちらかの場合があるので COALESCE。
    const row = db.prepare(
      `SELECT
         doc as doc,
         COALESCE(pdfPage, page, 0) as pdfPage,
         COALESCE(snippet, text, '') as snippet,
         COALESCE(evidenceIds, '') as evidenceIds
       FROM kokuzo_pages
       WHERE doc LIKE ?
       ORDER BY COALESCE(pdfPage, page, 0) ASC
       LIMIT ?`
    ).get(`%${seedId}%`, limitPages) as any;

    if (!row) {
      // 見つからない場合も item は返す（契約：落とさない）
      items.push({ seedId, doc: null, pdfPage: null, snippet: null, evidenceIds: [] });
      continue;
    }

    const evRaw = s(row.evidenceIds);
    const evidenceIds =
      evRaw.startsWith("[") ? (() => { try { const a = JSON.parse(evRaw); return Array.isArray(a) ? a.filter((x)=>typeof x==="string") : []; } catch { return []; } })()
      : evRaw.length ? evRaw.split(",").map((x)=>x.trim()).filter(Boolean)
      : [];

    items.push({
      seedId,
      doc: s(row.doc) || null,
      pdfPage: (() => {
        const p = Number(row.pdfPage);
        return Number.isFinite(p) && p > 0 ? p : null;
      })(),
      snippet: (() => {
        const t = s(row.snippet);
        return t ? safeSnippet(t) : null;
      })(),
      evidenceIds,
    });
  }

  return res.json({
    ok: true,
    schemaVersion: 1,
    packId: `pack_${Date.now()}`,
    seedIds,
    payload: { kind: "SEED_PACK_V1", items },
  });
});

type UnpackReq = {
  packId?: string;
  payload?: any;
};

seedPackRouter.post("/seed/unpack", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as UnpackReq;
  const payload = body.payload ?? {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  return res.json({
    ok: true,
    schemaVersion: 1,
    packId: typeof body.packId === "string" ? body.packId : null,
    restored: { seedsCount: items.length, edgesCount: 0 },
  });
});
