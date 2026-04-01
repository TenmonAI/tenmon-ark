import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

export const personaStudioRouter = Router();

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

personaStudioRouter.get("/persona/list", (_req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const personas = db.prepare("SELECT * FROM persona_profiles ORDER BY updated_at DESC LIMIT 50").all();
    return res.json({ ok: true, personas, count: (personas as any[]).length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/create", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const name = s(body.name) || "新規ペルソナ";
    const slug = s(body.slug) || `persona-${Date.now()}`;
    const id = randomUUID();
    const db = getDb("kokuzo");

    db.prepare(`INSERT INTO persona_profiles
      (id,slug,name,description,category,status,role_summary,system_mantra,mission,
       answer_contract,forbidden_behaviors_json,tone,verbosity,strictness,creativity,
       retrieval_mode,evidence_threshold,hallucination_fallback,preview_isolation,
       memory_inheritance_mode,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
      id,
      slug,
      name,
      s(body.description) || null,
      s(body.category) || null,
      "draft",
      s(body.role_summary) || null,
      s(body.system_mantra) || null,
      s(body.mission) || null,
      s(body.answer_contract) || null,
      "[]",
      s(body.tone) || null,
      s(body.verbosity) || null,
      Number(body.strictness) || 0.8,
      Number(body.creativity) || 0.3,
      "grounded_first",
      0.75,
      "admit_unknown",
      1,
      "user_plus_project",
    );

    db.prepare(`INSERT INTO persona_versions(id,persona_id,version_no,config_json,change_summary,created_at)
      VALUES(?,?,1,?,'initial',datetime('now'))`).run(randomUUID(), id, JSON.stringify(body));

    return res.status(201).json({ ok: true, id, slug, name, status: "draft" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.get("/persona/:id", (req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const persona = db.prepare("SELECT * FROM persona_profiles WHERE id=? LIMIT 1").get(req.params.id);
    if (!persona) return res.status(404).json({ ok: false, error: "not found" });
    const bindings = db.prepare("SELECT * FROM persona_knowledge_bindings WHERE persona_id=? ORDER BY priority DESC").all(req.params.id);
    const policy = db.prepare("SELECT * FROM persona_memory_policies WHERE persona_id=? ORDER BY created_at DESC LIMIT 1").get(req.params.id);
    return res.json({ ok: true, persona, bindings, policy });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.patch("/persona/:id", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const db = getDb("kokuzo");
    const existing = db.prepare("SELECT id FROM persona_profiles WHERE id=? LIMIT 1").get(req.params.id) as any;
    if (!existing) return res.status(404).json({ ok: false, error: "not found" });

    const fields = [
      "name",
      "description",
      "role_summary",
      "system_mantra",
      "mission",
      "answer_contract",
      "tone",
      "verbosity",
      "status",
      "strictness",
      "creativity",
      "memory_inheritance_mode",
    ];
    const updates: string[] = [];
    const values: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f}=?`);
        values.push(body[f]);
      }
    }

    if (updates.length) {
      updates.push("updated_at=datetime('now')");
      values.push(req.params.id);
      db.prepare(`UPDATE persona_profiles SET ${updates.join(",")} WHERE id=?`).run(...values);
    }

    return res.json({ ok: true, id: req.params.id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/:id/deploy", (req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const persona = db.prepare("SELECT * FROM persona_profiles WHERE id=? LIMIT 1").get(req.params.id) as any;
    if (!persona) return res.status(404).json({ ok: false, error: "not found" });

    db.prepare("UPDATE persona_profiles SET status='active',updated_at=datetime('now') WHERE id=?").run(req.params.id);
    db.prepare(`INSERT INTO persona_deployments(id,persona_id,deployment_target,status,notes,created_at,updated_at)
      VALUES(?,?,'production','active',?,datetime('now'),datetime('now'))`).run(
      randomUUID(),
      req.params.id,
      s((req.body as any)?.notes),
    );

    return res.json({ ok: true, id: req.params.id, status: "active" });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

personaStudioRouter.post("/persona/:id/preview/start", (req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const persona = db.prepare("SELECT id FROM persona_profiles WHERE id=? LIMIT 1").get(req.params.id) as any;
    if (!persona) return res.status(404).json({ ok: false, error: "not found" });

    const previewThreadId = `preview_persona_${req.params.id}_${Date.now()}`;
    const sessionId = randomUUID();
    db.prepare(`INSERT INTO persona_preview_sessions(id,persona_id,preview_thread_id,status,created_at,updated_at)
      VALUES(?,?,?,'open',datetime('now'),datetime('now'))`).run(sessionId, req.params.id, previewThreadId);

    return res.json({ ok: true, sessionId, previewThreadId, personaId: req.params.id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});
