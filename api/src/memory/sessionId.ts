import type { Request } from "express";

export function getSessionId(req: Request): string {
  const header = req.header("x-session-id") ?? req.header("X-Session-Id");
  const fromQuery = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  const fromBody =
    req.body && typeof (req.body as any).sessionId === "string" ? (req.body as any).sessionId : undefined;

  const sessionId = (header ?? fromQuery ?? fromBody ?? "default").trim();
  return sessionId.length > 0 ? sessionId : "default";
}
