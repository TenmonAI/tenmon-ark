/**
 * CUSTOM_GPT_MEMORY_IMPORT_BOX_V1 + MEMORY_INHERITANCE_RENDERER_V1
 * 旧カスタム GPT 継承プロンプトの user スコープ保存（保存・確認のみ。chat runtime へは注入しない）。
 * kokuzo_schema.sql no-touch。persona DB の既存 user_shared_profile_slice を利用。
 */
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { getAuthUserIdForSyncV1 } from "./userDeviceMemorySyncV1.js";
import {
  renderInheritanceStructuredV1,
  type InheritanceStructuredV1,
} from "./memoryInheritanceRendererV1.js";

const SLICE_KEY = "inheritance" as const;
const MAX_RAW = 512_000;

export const customGptMemoryImportBoxV1Router = Router();

/** POST /api/memory/custom-gpt-import/v1/save */
customGptMemoryImportBoxV1Router.post("/v1/save", (req: Request, res: Response) => {
  const userId = getAuthUserIdForSyncV1(req);
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const raw = String((req.body as Record<string, unknown>)?.inheritance_prompt_raw ?? "").trim();
  if (!raw) {
    return res.status(400).json({ ok: false, error: "INHERITANCE_PROMPT_RAW_REQUIRED" });
  }
  if (raw.length > MAX_RAW) {
    return res.status(400).json({ ok: false, error: "INHERITANCE_PROMPT_RAW_TOO_LONG", max: MAX_RAW });
  }

  const source = String((req.body as Record<string, unknown>)?.source ?? "custom_gpt_paste")
    .trim()
    .slice(0, 160);

  const inheritance_structured: InheritanceStructuredV1 = renderInheritanceStructuredV1(raw);

  const updatedAt = new Date().toISOString();
  const payload = {
    inheritance_prompt_raw: raw,
    inheritance_structured,
    source,
    updated_at: updatedAt,
    user_id: userId,
    import_box_version: "CUSTOM_GPT_MEMORY_IMPORT_BOX_V1",
    inheritance_renderer_version: "MEMORY_INHERITANCE_RENDERER_V1",
    /** 会話 API へ自動注入しない（明示フラグ） */
    runtime_chat_injection: false,
  };

  const pdb = getDb("persona");
  try {
    pdb.prepare(
      `INSERT INTO user_shared_profile_slice (userId, sliceKey, payloadJson, updatedAt)
       VALUES (?,?,?,?)
       ON CONFLICT(userId, sliceKey) DO UPDATE SET
         payloadJson = excluded.payloadJson,
         updatedAt = excluded.updatedAt`
    ).run(userId, SLICE_KEY, JSON.stringify(payload), updatedAt);

    return res.json({
      ok: true,
      version: "CUSTOM_GPT_MEMORY_IMPORT_BOX_V1",
      userId,
      updated_at: updatedAt,
      raw_length: raw.length,
      inheritance_structured,
      note: "Saved to user_shared_profile_slice(inheritance). Not applied to /api/chat.",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[CUSTOM_GPT_MEMORY_IMPORT_BOX_V1] save failed", e);
    return res.status(500).json({ ok: false, error: "SAVE_FAILED", detail: msg });
  }
});

/** GET /api/memory/custom-gpt-import/v1/status */
customGptMemoryImportBoxV1Router.get("/v1/status", (req: Request, res: Response) => {
  const userId = getAuthUserIdForSyncV1(req);
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const pdb = getDb("persona");
  try {
    const row = pdb
      .prepare(
        `SELECT payloadJson, updatedAt FROM user_shared_profile_slice WHERE userId = ? AND sliceKey = ? LIMIT 1`
      )
      .get(userId, SLICE_KEY) as { payloadJson?: string; updatedAt?: string } | undefined;

    if (!row) {
      return res.json({
        ok: true,
        version: "CUSTOM_GPT_MEMORY_IMPORT_BOX_V1",
        saved: false,
        userId,
        runtime_chat_injection: false,
      });
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = JSON.parse(String(row.payloadJson || "null")) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    const raw = String(payload?.inheritance_prompt_raw ?? "");
    let inheritance_structured = payload?.inheritance_structured as InheritanceStructuredV1 | undefined;
    if (!inheritance_structured || typeof inheritance_structured !== "object") {
      inheritance_structured = renderInheritanceStructuredV1(raw);
    }
    return res.json({
      ok: true,
      version: "CUSTOM_GPT_MEMORY_IMPORT_BOX_V1",
      saved: true,
      userId,
      updated_at: row.updatedAt,
      source: payload?.source ?? null,
      raw_length: raw.length,
      raw_head: raw.slice(0, 320),
      inheritance_structured,
      /** 旧ペイロード互換（新保存では未使用） */
      structured_preview_placeholder: payload?.structured_preview_placeholder ?? null,
      runtime_chat_injection: Boolean(payload?.runtime_chat_injection) === true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: "STATUS_FAILED", detail: msg });
  }
});
