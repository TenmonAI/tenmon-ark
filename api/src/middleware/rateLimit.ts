// /opt/tenmon-ark/api/src/middleware/rateLimit.ts
import type { Request, Response, NextFunction } from "express";

type RateLimitStore = Map<string, { count: number; resetAt: number }>;

// メモリベースのレート制限ストア（本番ではRedis推奨）
const store: RateLimitStore = new Map();

// クリーンアップ（古いエントリを削除）
function cleanup() {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) {
      store.delete(key);
    }
  }
}

// 定期的にクリーンアップ（5分ごと）
setInterval(cleanup, 5 * 60 * 1000);

/**
 * IPアドレスを取得
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * レート制限ミドルウェア
 */
export function rateLimitMiddleware(
  windowMs: number,
  maxRequests: number
) {
  return (req: Request, res: Response, next: NextFunction) => {
    cleanup();

    const ip = getClientIp(req);
    const now = Date.now();
    const key = ip;

    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      // 新しいウィンドウ
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      // レート制限超過
      res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    // カウント増加
    entry.count += 1;
    store.set(key, entry);

    next();
  };
}

/**
 * /api/chat 用のレート制限（30req/min）
 */
export const chatRateLimit = rateLimitMiddleware(60 * 1000, 30);

/**
 * LIVEモード用のレート制限（10req/min）
 */
export const liveRateLimit = rateLimitMiddleware(60 * 1000, 10);

