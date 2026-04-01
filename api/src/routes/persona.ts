import { Router, type IRouter, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { getCurrentPersona, listPersonas } from "../persona/registry.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import type {
  PersonaCurrentResponseBody,
  PersonaListResponseBody,
} from "../types/persona.js";
import {
  buildPersonaProjectionPromptV1,
  getActivePersonaProfileV1,
  insertPersonaMemoryV1,
} from "../core/tenmonPersonaProjectionV1.js";

const router: IRouter = Router();

router.get("/persona/list", (_req: Request, res: Response<PersonaListResponseBody>) => {
  return res.json({ personas: listPersonas() });
});

router.get("/persona/current", (_req: Request, res: Response<PersonaCurrentResponseBody>) => {
  return res.json({ persona: getCurrentPersona() });
});

router.get("/persona", (_req: Request, res: Response) => {
  const state = getCurrentPersonaState();
  return res.json({
    personaId: state.personaId,
    ok: true,
    state: {
      mode: state.mode,
      phase: state.phase,
      inertia: state.inertia,
    },
  });
});

router.get("/persona/active", async (_req: Request, res: Response) => {
  try {
    const profile = await getActivePersonaProfileV1();
    return res.json({ ok: true, profile });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/persona/memory", (_req: Request, res: Response) => {
  try {
    const db = getDb("kokuzo");
    const memory = db
      .prepare(
        "SELECT memory_id,user_id,memory_type,memory_key,memory_value,is_hard_field,confidence,source,is_pinned,created_at,updated_at FROM persona_memory_v1 ORDER BY updated_at DESC"
      )
      .all();
    return res.json({ ok: true, memory });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/persona/memory", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const memory_type = String(body.memory_type ?? "").trim();
    const memory_key = String(body.memory_key ?? "").trim();
    const memory_value = String(body.memory_value ?? "").trim();
    if (!memory_type || !memory_key || !memory_value) {
      return res.status(400).json({
        ok: false,
        error: "memory_type, memory_key, memory_value are required",
      });
    }
    const memory_id = await insertPersonaMemoryV1({
      user_id:
        typeof body.user_id === "string" && body.user_id.trim()
          ? body.user_id.trim()
          : "default",
      memory_type,
      memory_key,
      memory_value,
      is_hard_field: Boolean(body.is_hard_field),
      confidence: Number(body.confidence ?? 1),
      source:
        typeof body.source === "string" && body.source.trim()
          ? body.source.trim()
          : "explicit",
      is_pinned: Boolean(body.is_pinned),
    });
    if (!memory_id) {
      return res.status(500).json({ ok: false, error: "insert failed" });
    }
    return res.json({ ok: true, memory_id });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.delete("/persona/memory/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id is required" });
    const db = getDb("kokuzo");
    db.prepare("DELETE FROM persona_memory_v1 WHERE memory_id = ?").run(id);
    return res.json({ ok: true, memory_id: id });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.put("/persona/:id", (req: Request, res: Response) => {
  try {
    const profileId = String(req.params.id || "").trim();
    if (!profileId) return res.status(400).json({ ok: false, error: "id is required" });
    const body = (req.body ?? {}) as Record<string, unknown>;
    const assistant = String(body.assistant_call_name ?? "天聞");
    const user = String(body.user_call_name ?? "あなた");
    const forbidden = JSON.stringify(
      Array.isArray(body.forbidden_moves) ? body.forbidden_moves : []
    );
    const worldview = JSON.stringify(
      Array.isArray(body.worldview_constraints) ? body.worldview_constraints : []
    );
    const db = getDb("kokuzo");
    db.prepare(
      "UPDATE persona_profiles_v1 SET assistant_call_name=?, user_call_name=?, forbidden_moves=?, worldview_constraints=?, updated_at=datetime('now') WHERE profile_id=?"
    ).run(assistant, user, forbidden, worldview, profileId);
    return res.json({ ok: true, profile_id: profileId });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/persona/projection/:userId", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId || "default");
    const projection = await buildPersonaProjectionPromptV1(userId);
    return res.json({ ok: true, projection });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export const personaRouter = router;
export default router;
