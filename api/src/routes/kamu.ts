import express from "express";
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";

export const kamuRouter = express.Router();

function s(v: unknown): string { return typeof v === "string" ? v : ""; }
function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}
function safeJsonArray(v: any, max = 4000): string {
  const arr = Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.length > 0) : [];
  const j = JSON.stringify(arr);
  return j.length <= max ? j : j.slice(0, max);
}

/**
 * POST /api/kamu/restore/propose
 * NOTE: 正文は触らない。候補のみ保存。
 * DB制約（NOT NULL）を必ず満たす：method/confidence/createdAt。
 */
kamuRouter.post("/kamu/restore/propose", (req: Request, res: Response) => {
  try {
    const body: any = req.body || {};
    const doc = s(body.doc).trim();
    const pdfPage = n(body.pdfPage);
    const suggestion = s(body.suggestion).trim();

    if (!doc || pdfPage <= 0 || !suggestion) {
      return res.status(400).json({ ok: false, error: "doc/pdfPage/suggestion required" });
    }

    const span = s(body.span).trim().slice(0, 200);
    const method = (s(body.method).trim() || "manual").slice(0, 64); // NOT NULL
    const confidenceRaw = Number(body.confidence);
    const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0.5; // NOT NULL想定でデフォルト
    const basisJson = safeJsonArray(body.basis_evidenceIds);

    const db = getDb("kokuzo");

    // createdAt が NOT NULL の場合でも確実に入るよう、SQL側で datetime('now') を設定
    db.prepare(
      `INSERT INTO kokuzo_restore_suggestions
        (doc, pdfPage, span, suggestion, basis_evidenceIds, method, confidence, status, createdAt)
       VALUES
        (?,   ?,       ?,    ?,         ?,                ?,      ?,          'proposed', datetime('now'))`
    ).run(doc, pdfPage, span, suggestion, basisJson, method, confidence);

    return res.json({ ok: true, schemaVersion: 1, doc, pdfPage, status: "proposed" });
  } catch (e: any) {
    console.error("[kamu/restore/propose]", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

/**
 * GET /api/kamu/restore/list?doc=...&pdfPage=...
 */
kamuRouter.get("/kamu/restore/list", (req: Request, res: Response) => {
  try {
    const doc = s(req.query.doc).trim();
    const pdfPage = n(req.query.pdfPage);
    if (!doc || pdfPage <= 0) {
      return res.status(400).json({ ok: false, error: "doc/pdfPage required" });
    }

    const db = getDb("kokuzo");
    const rows = db.prepare(
      `SELECT *
         FROM kokuzo_restore_suggestions
        WHERE doc = ? AND pdfPage = ?
        ORDER BY createdAt DESC
        LIMIT 50`
    ).all(doc, pdfPage) as any[];

    return res.json({ ok: true, schemaVersion: 1, doc, pdfPage, items: rows });
  } catch (e: any) {
    console.error("[kamu/restore/list]", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
