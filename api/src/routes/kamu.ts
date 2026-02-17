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
      `SELECT rowid AS rid, *
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

/**
 * POST /api/kamu/restore/auto
 * body: { doc, pdfPage, radius? }
 * - 近傍ページ（±radius）の本文から “読める” ものを拾い、
 *   restore_suggestions に method="neighbor" で提案を積む（正文は不変）
 */
kamuRouter.post("/kamu/restore/auto", (req: Request, res: Response) => {
  // KAMU_DBG_V1: deterministic trace (no behavior change)
  const __kamuDbg = {
    v: 1,
    route: "kamu/restore/auto",
    at: new Date().toISOString(),
    ip: String(req.ip || ""),
    ua: String(req.get("user-agent") || ""),
    bodyKeys: Object.keys((req.body || {}) as any),
    doc: (req.body as any)?.doc ?? null,
    pdfPage: (req.body as any)?.pdfPage ?? null,
    threadId: (req.body as any)?.threadId ?? null,
  };
  console.log("[KAMU_DBG]", JSON.stringify(__kamuDbg));

  try {
    const body: any = req.body || {};
    const doc = String(body.doc || "").trim();
    const pdfPage = Number(body.pdfPage || 0);

    let radius = Number(body.radius || 2);
    radius = Number.isFinite(radius) ? radius : 2;
    radius = Math.max(1, Math.min(5, Math.floor(radius)));

    if (!doc || !Number.isFinite(pdfPage) || pdfPage <= 0) {
      return res.status(400).json({ ok: false, error: "doc/pdfPage required" });
    }

    const db = getDb("kokuzo");

    const near = db.prepare(
      `SELECT pdfPage, text
         FROM kokuzo_pages
        WHERE doc = ? AND pdfPage BETWEEN ? AND ?
        ORDER BY ABS(pdfPage - ?) ASC
        LIMIT 25`
    ).all(doc, pdfPage - radius, pdfPage + radius, pdfPage) as any[];

    function readableScore(t: string): number {
      const s = (t || "").trim();
      if (!s || s.length < 40) return 0;
      const bad = (s.match(/[�\u0000-\u001F]/g) || []).length;
      if (bad / Math.max(1, s.length) > 0.01) return 0;
      const jp = (s.match(/[\u3040-\u30FF\u3400-\u9FFF]/g) || []).length;
      const jpRate = jp / Math.max(1, s.length);
      return jpRate;
    }

    const picked = near
      .map((r) => {
        const p = Number(r?.pdfPage || 0);
        const text = typeof r?.text === "string" ? r.text : "";
        const score = readableScore(text);
        return { pdfPage: p, text, score };
      })
      .filter((x) => x.pdfPage > 0 && x.pdfPage !== pdfPage && x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const ins = db.prepare(
      `INSERT INTO kokuzo_restore_suggestions
        (doc, pdfPage, span, suggestion, basis_evidenceIds, method, confidence, status, createdAt)
       VALUES
        (?,   ?,       ?,    ?,         ?,                ?,      ?,          'proposed', datetime('now'))`
    );

    let inserted = 0;
    for (const c of picked) {
      const basisJson = JSON.stringify([`doc=${doc}#pdfPage=${c.pdfPage}`]).slice(0, 4000);
      const span = `neighbor:P${c.pdfPage}`.slice(0, 200);
      const suggestion = c.text.trim().slice(0, 8000);
      const method = "neighbor";      // NOT NULL
      const confidence = c.score || 0; // NOT NULL (REAL default 0)
      ins.run(doc, pdfPage, span, suggestion, basisJson, method, confidence);
      inserted++;
    }

    return res.json({
      ok: true,
      schemaVersion: 1,
      doc,
      pdfPage,
      radius,
      inserted,
      picked: picked.map((x) => ({ sourcePdfPage: x.pdfPage, score: x.score })),
    });
  } catch (e: any) {
    console.error("[kamu/restore/auto]", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});


/**
 * POST /api/kamu/restore/accept
 * body: { rid?: number, id?: string }
 * - 既存データに id が無い場合があるため、rowid(rid) を主キーとして受ける。
 */

/**
 * POST /api/kamu/restore/accept
 * body: { rid: number }
 * - id列が空の個体があるため、rowid(rid)で accepted 化する。
 * - 原本（kokuzo_pages.text）は触らない。
 */
kamuRouter.post("/kamu/restore/accept", (req: Request, res: Response) => {
  // KAMU_DBG_V1: deterministic trace (no behavior change)
  const __kamuDbg = {
    v: 1,
    route: "kamu/restore/accept",
    at: new Date().toISOString(),
    ip: String(req.ip || ""),
    ua: String(req.get("user-agent") || ""),
    bodyKeys: Object.keys((req.body || {}) as any),
    rid: (req.body as any)?.rid ?? null,
    threadId: (req.body as any)?.threadId ?? null,
  };
  console.log("[KAMU_DBG]", JSON.stringify(__kamuDbg));

  try {
    const body: any = req.body || {};
    const rid = Number(body.rid || 0);
    if (!Number.isFinite(rid) || rid <= 0) {
      return res.status(400).json({ ok: false, error: "rid required" });
    }

    const db = getDb("kokuzo");
    const info = db.prepare(
      `UPDATE kokuzo_restore_suggestions
          SET status='accepted'
        WHERE rowid = ?`
    ).run(rid);

    const changes = (info as any)?.changes ?? 0;
    if (changes <= 0) return res.status(404).json({ ok: false, error: "not found" });

    return res.json({ ok: true, schemaVersion: 1, rid, status: "accepted" });
  } catch (e: any) {
    console.error("[kamu/restore/accept]", e);
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
