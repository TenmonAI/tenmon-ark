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
 * Rate Limit設定（Atlas Chat用）
 */
export const atlasChatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 30, // 15分で30リクエスト（推論処理は負荷が高いため制限を厳しく）
  message: "Too many Atlas Chat requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limit設定（Whisper STT用）
 */
export const whisperRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 20, // 15分で20リクエスト（音声処理は負荷が高いため制限を厳しく）
  message: "Too many Whisper STT requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limit設定（Semantic Search用）
 */
export const semanticSearchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分で100リクエスト
  message: "Too many Semantic Search requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limit設定（DeviceCluster用）
 */
export const deviceClusterRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 200, // 15分で200リクエスト（デバイス通信は頻繁）
  message: "Too many DeviceCluster requests from this IP, please try again later.",
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

/**
 * Authentication Middleware for Express APIs
 * すべての /api/* エンドポイントに認証を強制
 * 
 * PUBLIC ENDPOINT として明示的にマークされたものは認証不要
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // PUBLIC ENDPOINT チェック（リクエストに public フラグがある場合は認証不要）
  // これは各ルーターで明示的に設定する必要がある
  if ((req as any).isPublicEndpoint) {
    next();
    return;
  }

  try {
    // sdk.authenticateRequest を使用して認証チェック
    const { sdk } = await import("./sdk");
    const user = await sdk.authenticateRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    // 認証成功: ユーザー情報をリクエストに追加
    (req as any).user = user;
    next();
  } catch (error) {
    // 認証エラー
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: error instanceof Error ? error.message : "Authentication failed",
      },
    });
  }
}
