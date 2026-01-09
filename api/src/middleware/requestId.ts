// /opt/tenmon-ark/api/src/middleware/requestId.ts
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

/**
 * requestId を生成して req に付与するミドルウェア
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = randomUUID();
  (req as any).requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

/**
 * req から requestId を取得（型安全）
 */
export function getRequestId(req: Request): string {
  return (req as any).requestId || "unknown";
}

