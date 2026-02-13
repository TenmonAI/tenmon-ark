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
  err?: string; // 監査用（500にしないための保険）
};

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function safeSnippet(text: string, max = 220): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function parseEvidenceIds(v: unknown): string[] {
  const raw = s(v);
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}

seedPackRouter.post("/seed/pack", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as PackReq;
  const seedIds = Array.isArray(body.seedIds)
    ? body.seedIds.filter((x) => typeof x === "string" && x.length > 0)
    : [];

  const limitPages =
    typeof body.options?.limitPages === "number"
      ? Math.max(1, Math.min(50, body.options.limitPages))
      : 1;

  const db = getDb("kokuzo");

  const items: PackedItem[] = [];

  for (const seedId of seedIds) {
    try {
      // 列名差異で落ちないように SELECT * で拾う（P2-1の安全版）
      const row = db
        .prepare(
          `SELECT * FROM kokuzo_pages
           WHERE doc LIKE ?
           ORDER BY rowid ASC
           LIMIT ?`
        )
        .get(`%${seedId}%`, limitPages) as any;

      if (!row) {
        items.push({ seedId, doc: null, pdfPage: null, snippet: null, evidenceIds: [] });
        continue;
      }

      const doc = s(row.doc) || null;

      // pdfPage候補（環境差対応）
      const pdfPage =
        numOrNull(row.pdfPage) ??
        numOrNull(row.page) ??
        numOrNull(row.pdf_page) ??
        null;

      const snippetSrc =
        s(row.snippet) ||
        s(row.text) ||
        s(row.pageText) ||
        s(row.content) ||
        "";

      const snippet = snippetSrc ? safeSnippet(snippetSrc) : null;

      const evidenceIds =
        parseEvidenceIds(row.evidenceIds) ||
        parseEvidenceIds(row.evidence_ids) ||
        [];

      items.push({ seedId, doc, pdfPage, snippet, evidenceIds });
    } catch (e: any) {
      // 500にしない。失敗は item に封じ込める
      items.push({
        seedId,
        doc: null,
        pdfPage: null,
        snippet: null,
        evidenceIds: [],
        err: e?.message ? String(e.message) : String(e),
      });
    }
  }

  return res.json({
    ok: true,
    schemaVersion: 1,
    packId: `pack_${Date.now()}`,
    seedIds,
    payload: { kind: "SEED_PACK_V1", items },
  });
});

type UnpackReq = { packId?: string; payload?: any };

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
