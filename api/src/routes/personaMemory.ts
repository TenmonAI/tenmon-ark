import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { dbPrepare } from "../db/index.js";

const router = Router();

router.get("/persona/active", (_req: Request, res: Response) => {
  try {
    const row = dbPrepare(
      "persona",
      "SELECT id, profile_name, assistant_call_name, user_call_name, forbidden_moves, is_active, created_at FROM persona_profiles WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
    ).get() as any;
    return res.json({ ok: true, persona: row ?? null });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/persona", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const profileName = String(body.profile_name ?? "").trim();
    if (!profileName) return res.status(400).json({ ok: false, error: "profile_name is required" });
    const id = String(body.id ?? randomUUID());
    const now = new Date().toISOString();
    dbPrepare(
      "persona",
      "INSERT INTO persona_profiles (id, profile_name, assistant_call_name, user_call_name, forbidden_moves, is_active, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
    ).run(
      id,
      profileName,
      body.assistant_call_name != null ? String(body.assistant_call_name) : null,
      body.user_call_name != null ? String(body.user_call_name) : null,
      body.forbidden_moves != null ? String(body.forbidden_moves) : null,
      now
    );
    return res.json({ ok: true, id });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.put("/persona/:id/activate", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id is required" });
    dbPrepare("persona", "UPDATE persona_profiles SET is_active = 0").run();
    const update = dbPrepare("persona", "UPDATE persona_profiles SET is_active = 1 WHERE id = ?").run(id) as any;
    if (!update || Number(update.changes ?? 0) < 1) {
      return res.status(404).json({ ok: false, error: "persona not found" });
    }
    return res.json({ ok: true, id, activated: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/memory", (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id != null ? String(req.query.user_id) : null;
    const rows = userId
      ? dbPrepare(
          "persona",
          "SELECT id, user_id, memory_type, memory_key, memory_value, is_pinned, created_at FROM user_memory_entries WHERE user_id = ? ORDER BY created_at DESC"
        ).all(userId)
      : dbPrepare(
          "persona",
          "SELECT id, user_id, memory_type, memory_key, memory_value, is_pinned, created_at FROM user_memory_entries ORDER BY created_at DESC"
        ).all();
    return res.json({ ok: true, items: rows });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/memory", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const memoryKey = String(body.memory_key ?? "").trim();
    const memoryValue = body.memory_value != null ? String(body.memory_value) : "";
    if (!memoryKey) return res.status(400).json({ ok: false, error: "memory_key is required" });
    const id = String(body.id ?? randomUUID());
    const now = new Date().toISOString();
    dbPrepare(
      "persona",
      "INSERT INTO user_memory_entries (id, user_id, memory_type, memory_key, memory_value, is_pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      id,
      body.user_id != null ? String(body.user_id) : null,
      body.memory_type != null ? String(body.memory_type) : null,
      memoryKey,
      memoryValue,
      body.is_pinned ? 1 : 0,
      now
    );
    return res.json({ ok: true, id });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

router.delete("/memory/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "id is required" });
    const out = dbPrepare("persona", "DELETE FROM user_memory_entries WHERE id = ?").run(id) as any;
    return res.json({ ok: true, deleted: Number(out?.changes ?? 0) > 0 });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;
