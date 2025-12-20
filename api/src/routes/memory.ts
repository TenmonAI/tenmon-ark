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

export default router;
