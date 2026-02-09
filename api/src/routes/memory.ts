import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../memory/sessionId.js";
import { memoryClearSession, memoryReadSession } from "../memory/index.js";
import type { MemoryClearResponseBody, MemoryReadResponseBody } from "../types/memory.js";

const router: IRouter = Router();

router.get("/memory/read", (req: Request, res: Response<MemoryReadResponseBody>) => {
  const sessionId = getSessionId(req);

  return res.json({
    sessionId,
    memory: memoryReadSession(sessionId),
  });
});

router.post("/memory/clear", (req: Request, res: Response<MemoryClearResponseBody>) => {
  const sessionId = getSessionId(req);
  memoryClearSession(sessionId);

  return res.json({
    sessionId,
    cleared: true,
  });
});

/** POST /api/memory/seed — P2 gate (deterministic, LLM禁止) */
router.post("/memory/seed", (req, res) => {
  // 最小：契約だけ固定（後で本体を育てる）
  return res.status(200).json({
    ok: true,
    seed: {
      version: "TENMON_MEMORY_SEED_V1",
      threadId: typeof req.body?.threadId === "string" ? req.body.threadId : "unknown",
      digest: "stub",
      tags: ["p2", "seed"],
    },
    decisionFrame: { mode: "DETERMINISTIC", llm: null },
  });
});


export default router;
