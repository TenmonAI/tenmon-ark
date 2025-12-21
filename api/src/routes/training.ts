// Training Chat: API Routes

import { Router, type IRouter, type Request, type Response } from "express";
import { createSession, addMessages, listSessions, getSession, saveRules, listRules } from "../training/storage.js";
import { parseConversationDump, extractRules } from "../training/extract.js";

const router: IRouter = Router();

/**
 * POST /api/training/session
 * Create a new training session
 */
router.post("/training/session", (req: Request, res: Response) => {
  const body = req.body as { title?: string };

  if (!body.title || typeof body.title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const session = createSession(body.title);
    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("[TRAINING SESSION ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create session",
    });
  }
});

/**
 * POST /api/training/ingest
 * Ingest conversation dump and extract rules
 */
router.post("/training/ingest", (req: Request, res: Response) => {
  const body = req.body as { session_id?: string; dump_text?: string };

  if (!body.session_id || typeof body.session_id !== "string") {
    return res.status(400).json({ error: "session_id is required" });
  }

  if (!body.dump_text || typeof body.dump_text !== "string") {
    return res.status(400).json({ error: "dump_text is required" });
  }

  try {
    // Parse conversation dump
    const parseResult = parseConversationDump(body.dump_text);

    if (parseResult.messages.length === 0) {
      return res.status(400).json({ error: "No messages found in dump_text" });
    }

    // Add messages to session
    const savedMessages = addMessages(body.session_id, parseResult.messages);

    // Extract rules (with explicit rule candidates if available)
    const extractedRules = extractRules(savedMessages, parseResult.ruleCandidates);

    // Save rules
    const savedRules = saveRules(body.session_id, extractedRules);

    return res.json({
      success: true,
      messagesCount: savedMessages.length,
      rulesCount: savedRules.length,
      rules: savedRules,
      extractedTitle: parseResult.extractedTitle,
      context: parseResult.context,
    });
  } catch (error) {
    console.error("[TRAINING INGEST ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to ingest conversation",
    });
  }
});

/**
 * GET /api/training/sessions
 * List all training sessions
 */
router.get("/training/sessions", (_req: Request, res: Response) => {
  try {
    const sessions = listSessions();
    return res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("[TRAINING SESSIONS ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list sessions",
    });
  }
});

/**
 * GET /api/training/session/:id
 * Get a training session with messages
 */
router.get("/training/session/:id", (req: Request, res: Response) => {
  const sessionId = req.params.id;

  if (!sessionId) {
    return res.status(400).json({ error: "session_id is required" });
  }

  try {
    const result = getSession(sessionId);

    if (!result.session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      success: true,
      session: result.session,
      messages: result.messages,
    });
  } catch (error) {
    console.error("[TRAINING SESSION ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get session",
    });
  }
});

/**
 * GET /api/training/rules?session_id=xxx
 * List rules for a session
 */
router.get("/training/rules", (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string | undefined;

  if (!sessionId) {
    return res.status(400).json({ error: "session_id query parameter is required" });
  }

  try {
    const rules = listRules(sessionId);
    return res.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error("[TRAINING RULES ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list rules",
    });
  }
});

export default router;

