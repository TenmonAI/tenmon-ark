// Training Chat: API Routes

import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../memory/sessionId.js";
import { executeTrainingMessage, clearAxisHistory } from "../train/engine.js";
import { commitTrainingSession, type CommitPolicy } from "../train/commit.js";
import { getTrainingSession } from "../train/session.js";
import type { TrainingIntent } from "../train/session.js";

const router: IRouter = Router();

/**
 * POST /api/train/message
 * Send a training message through the core engine
 */
router.post("/train/message", (req: Request, res: Response) => {
  const body = req.body as {
    message?: string;
    intent?: string;
    importance?: number;
    session_id?: string;
  };

  if (!body.message || typeof body.message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  const intent = (body.intent || "teach") as TrainingIntent;
  if (!["teach", "question", "verify", "correct"].includes(intent)) {
    return res.status(400).json({ error: "invalid intent" });
  }

  const importance = typeof body.importance === "number" ? body.importance : 3;
  if (importance < 1 || importance > 5) {
    return res.status(400).json({ error: "importance must be 1-5" });
  }

  const sessionId = body.session_id || getSessionId(req);

  try {
    const result = executeTrainingMessage(sessionId, body.message, intent, importance);

    return res.json({
      success: true,
      response: result.response,
      thinkingAxis: result.thinkingAxis,
      thinkingAxisTransitions: result.thinkingAxisTransitions,
      sessionId,
    });
  } catch (error) {
    console.error("[TRAIN MESSAGE ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Training message failed",
    });
  }
});

/**
 * POST /api/train/commit
 * Commit training session to KOKŪZŌ seed
 */
router.post("/train/commit", (req: Request, res: Response) => {
  const body = req.body as {
    session_id?: string;
    commit_policy?: string;
  };

  const sessionId = body.session_id || getSessionId(req);
  const policy = (body.commit_policy || "save") as CommitPolicy;

  if (!["save", "compress", "discard"].includes(policy)) {
    return res.status(400).json({ error: "invalid commit_policy" });
  }

  try {
    const result = commitTrainingSession(sessionId, policy);

    if (!result.success) {
      return res.status(400).json({
        error: result.message || "Commit failed",
      });
    }

    // Clear axis history after commit
    clearAxisHistory(sessionId);

    return res.json({
      success: true,
      seedId: result.seedId,
      message: result.message,
    });
  } catch (error) {
    console.error("[TRAIN COMMIT ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Commit failed",
    });
  }
});

/**
 * GET /api/train/session?session_id=xxx
 * Get training session info
 */
router.get("/train/session", (req: Request, res: Response) => {
  const sessionId = (req.query.session_id as string) || getSessionId(req);

  try {
    const session = getTrainingSession(sessionId);
    if (!session) {
      return res.json({
        success: true,
        session: null,
        message: "Session not found",
      });
    }

    return res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
        lastUpdated: session.lastUpdated,
      },
      messages: session.messages.map((m) => ({
        id: m.id,
        timestamp: m.timestamp,
        message: m.message,
        intent: m.intent,
        importance: m.importance,
        response: m.response,
        thinkingAxis: m.thinkingAxis,
      })),
    });
  } catch (error) {
    console.error("[TRAIN SESSION ERROR]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get session",
    });
  }
});

export default router;

