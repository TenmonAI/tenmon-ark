import { Router, type Request, type Response } from "express";
export const pwaRouter = Router();

pwaRouter.get("/pwa/export", (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: { threads: [], messages: [] },
  });
});

pwaRouter.post("/pwa/import", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as any;
  const data = body.data ?? {};
  return res.json({
    ok: true,
    schemaVersion: typeof body.schemaVersion === "number" ? body.schemaVersion : 1,
    received: {
      threadsCount: Array.isArray(data.threads) ? data.threads.length : 0,
      messagesCount: Array.isArray(data.messages) ? data.messages.length : 0,
    },
  });
});
