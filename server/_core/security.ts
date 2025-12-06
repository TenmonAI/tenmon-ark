/**
 * Security Middleware
 * CORS + Rate Limit + Origin Validation
 */

import cors from "cors";
import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

/**
 * 許可されたOriginリスト
 */
const ALLOWED_ORIGINS = [
  "https://futomani88.com",
  "https://www.futomani88.com",
  "https://tenmon-ai.com",
  "https://www.tenmon-ai.com",
  "http://localhost:5173", // 開発環境
  "http://localhost:3000", // 開発環境
];

/**
 * CORS設定
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Originがない場合（サーバー間通信など）は許可
    if (!origin) {
      callback(null, true);
      return;
    }

    // 開発環境の場合はすべて許可
    if (process.env.NODE_ENV === "development") {
      callback(null, true);
      return;
    }

    // Embed OS: 外部サイト埋め込み用にすべてのOriginを許可
    // 本番環境でも外部サイトからのアクセスを許可
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Length", "X-Request-Id"],
  maxAge: 86400, // 24時間
});

/**
 * Rate Limit設定（一般API用）
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分で100リクエスト
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limit設定（LP-QA用）
 */
export const lpQaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分で100リクエスト
  message: "Too many LP-QA requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limit設定（Chat Streaming用）
 */
export const chatStreamingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 50, // 15分で50リクエスト（ストリーミングは負荷が高いため制限を厳しく）
  message: "Too many chat streaming requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Origin Validation Middleware
 */
export function validateOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("origin");

  // Originがない場合（サーバー間通信など）は許可
  if (!origin) {
    next();
    return;
  }

  // 許可されたOriginかチェック
  if (ALLOWED_ORIGINS.includes(origin)) {
    next();
  } else {
    res.status(403).json({
      error: "Forbidden",
      message: "Origin not allowed",
    });
  }
}

/**
 * API Key Validation Middleware（LP-QA用）
 */
export function validateLpQaApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.get("X-API-Key") || req.query.apiKey;

  // 環境変数からAPI Keyを取得
  const validApiKey = process.env.ARK_PUBLIC_KEY;

  // API Keyが設定されていない場合は警告を出して許可（開発環境用）
  if (!validApiKey) {
    console.warn("[Security] ARK_PUBLIC_KEY is not set. Skipping API key validation.");
    next();
    return;
  }

  // API Keyが一致するかチェック
  if (apiKey === validApiKey) {
    next();
  } else {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API key",
    });
  }
}
