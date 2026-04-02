import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { createPreviewThreadId, verifyPreviewIsolation } from "../core/personaPreviewIsolation.js";
import { buildMemoryProjectionPack, logMemoryProjection } from "../core/memoryProjection.js";
import { getActivePersonas, getPersonaById } from "../core/personaRegistry.js";

export const personaStudioRouter = Router();

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function ensurePersonaStudioTables(): void {
  const db = getDb("kokuzo");
  db.exec(`
    CREATE TABLE IF NOT EXISTS persona_profiles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      role_summary TEXT,
      system_mantra TEXT,
      mission TEXT,
      answer_contract TEXT,
      forbidden_behaviors_json TEXT,
      tone TEXT,
      strictness REAL,
      creativity REAL,
      memory_inheritance_mode TEXT,
      retrieval_mode TEXT,
      evidence_threshold REAL,
      hallucination_fallback TEXT,
      preview_isolation INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_persona_links (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      persona_id TEXT NOT NULL,
      link_mode TEXT NOT NULL DEFAULT 'fixed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS persona_preview_sessions (
      id TEXT PRIMARY KEY,
      persona_id TEXT NOT NULL,
      preview_thread_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

personaStudioRouter.get("/persona/list", (_req: Request, res: Response) => {
  try {
    ensurePersonaStudioTables();
    const db = getDb("kokuzo");
    const personas = db
      .prepare(
        "SELECT id, slug, name, status, role_summary, system_mantra, tone, memory_inheritance_mode FROM persona_profiles ORDER BY COALESCE(updated_at, created_at) DESC"
      )
      .all();
    return res.json({ ok: true, personas });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/create", (req: Request, res: Response) => {
  try {
    ensurePersonaStudioTables();
    const name = s((req.body ?? {}).name);
    const slug = s((req.body ?? {}).slug);
    if (!name) return res.status(400).json({ ok: false, error: "name required" });
    if (!slug) return res.status(400).json({ ok: false, error: "slug required" });

    const profile = {
      id: randomUUID(),
      slug,
      name,
      status: "draft",
      role_summary: s((req.body ?? {}).role_summary) || null,
      system_mantra: s((req.body ?? {}).system_mantra) || null,
      mission: s((req.body ?? {}).mission) || null,
      answer_contract: s((req.body ?? {}).answer_contract) || null,
      forbidden_behaviors_json: JSON.stringify((req.body ?? {}).forbidden_behaviors ?? []),
      tone: s((req.body ?? {}).tone) || null,
      strictness: Number((req.body ?? {}).strictness || 0.5),
      creativity: Number((req.body ?? {}).creativity || 0.5),
      memory_inheritance_mode: s((req.body ?? {}).memory_inheritance_mode) || "user_plus_project",
      retrieval_mode: s((req.body ?? {}).retrieval_mode) || "balanced",
      evidence_threshold: Number((req.body ?? {}).evidence_threshold || 0.5),
      hallucination_fallback: s((req.body ?? {}).hallucination_fallback) || "abstain",
      preview_isolation: Number((req.body ?? {}).preview_isolation ?? 1),
    };

    const db = getDb("kokuzo");
    db.prepare(
      `INSERT INTO persona_profiles(
        id, slug, name, status, role_summary, system_mantra, mission, answer_contract,
        forbidden_behaviors_json, tone, strictness, creativity, memory_inheritance_mode,
        retrieval_mode, evidence_threshold, hallucination_fallback, preview_isolation, created_at, updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`
    ).run(
      profile.id,
      profile.slug,
      profile.name,
      profile.status,
      profile.role_summary,
      profile.system_mantra,
      profile.mission,
      profile.answer_contract,
      profile.forbidden_behaviors_json,
      profile.tone,
      profile.strictness,
      profile.creativity,
      profile.memory_inheritance_mode,
      profile.retrieval_mode,
      profile.evidence_threshold,
      profile.hallucination_fallback,
      profile.preview_isolation
    );

    return res.json({ ok: true, ...profile });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/:id/deploy", (req: Request, res: Response) => {
  try {
    ensurePersonaStudioTables();
    const personaId = s(req.params.id);
    if (!personaId) return res.status(400).json({ ok: false, error: "persona id required" });
    const db = getDb("kokuzo");
    const exists = db.prepare("SELECT id FROM persona_profiles WHERE id=? LIMIT 1").get(personaId) as any;
    if (!exists?.id) return res.status(404).json({ ok: false, error: "persona not found" });
    db.prepare("UPDATE persona_profiles SET status='active', updated_at=datetime('now') WHERE id=?").run(personaId);
    return res.json({ ok: true, personaId, status: "active", activeCount: getActivePersonas().length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/:id/preview/start", (req: Request, res: Response) => {
  try {
    ensurePersonaStudioTables();
    const personaId = s(req.params.id);
    if (!personaId) return res.status(400).json({ ok: false, error: "persona id required" });
    const db = getDb("kokuzo");
    const exists = db.prepare("SELECT id FROM persona_profiles WHERE id=? LIMIT 1").get(personaId) as any;
    if (!exists?.id) return res.status(404).json({ ok: false, error: "persona not found" });

    const previewThreadId = createPreviewThreadId(personaId);
    const sessionId = randomUUID();
    db.prepare(
      "INSERT INTO persona_preview_sessions(id, persona_id, preview_thread_id, status, created_at, updated_at) VALUES(?,?,?,'open',datetime('now'),datetime('now'))"
    ).run(sessionId, personaId, previewThreadId);
    db.prepare(
      "INSERT INTO thread_persona_links(id, thread_id, persona_id, link_mode, created_at) VALUES(?,?,?,?,datetime('now'))"
    ).run(randomUUID(), previewThreadId, personaId, "preview");

    const isolation = verifyPreviewIsolation(previewThreadId);
    return res.json({
      ok: true,
      sessionId,
      personaId,
      previewThreadId,
      isolation,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/:id/memory-projection", (req: Request, res: Response) => {
  try {
    ensurePersonaStudioTables();
    const personaId = s(req.params.id);
    const threadId = s((req.body ?? {}).threadId);
    const isPreview = Boolean((req.body ?? {}).isPreview);
    if (!personaId) return res.status(400).json({ ok: false, error: "persona id required" });
    if (!threadId) return res.status(400).json({ ok: false, error: "threadId required" });
    const persona = getPersonaById(personaId);
    if (!persona) return res.status(404).json({ ok: false, error: "persona not found" });

    const pack = buildMemoryProjectionPack({ threadId, persona, isPreview });
    logMemoryProjection(pack);
    return res.json({
      ok: true,
      personaId,
      threadId,
      itemCount: pack.items.length,
      compactSummary: pack.compactSummary,
      sourceMemoryIds: pack.items.map((item) => item.memoryUnitId),
      sourceBindingIds: pack.items.flatMap((item) => item.sourceBindingIds ?? []),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
