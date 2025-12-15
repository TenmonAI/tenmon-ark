/**
 * Rate Limit Middleware
 * 全APIに適用するRate Limit設定
 * DoS攻撃を防止し、サーバー負荷を制御
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

/**
 * 一般API用のRate Limit
 * 15分で100リクエスト
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分で100リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // スキップ条件: 開発環境では緩和
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * Atlas Chat用のRate Limit
 * 15分で30リクエスト（推論処理は負荷が高いため制限を厳しく）
 */
export const atlasChatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 30, // 15分で30リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many Atlas Chat requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * Chat Streaming用のRate Limit
 * 15分で50リクエスト（ストリーミングは負荷が高いため制限を厳しく）
 */
export const chatStreamingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 50, // 15分で50リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many chat streaming requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * Whisper STT用のRate Limit
 * 15分で20リクエスト（音声処理は負荷が高いため制限を厳しく）
 */
export const whisperRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 20, // 15分で20リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many Whisper STT requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * Semantic Search用のRate Limit
 * 15分で100リクエスト
 */
export const semanticSearchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分で100リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many Semantic Search requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * DeviceCluster用のRate Limit
 * 15分で200リクエスト（デバイス通信は頻繁）
 */
export const deviceClusterRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 200, // 15分で200リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many DeviceCluster requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * Self-Evolution用のRate Limit
 * 15分で10リクエスト（重い処理のため制限を厳しく）
 */
export const selfEvolutionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 15分で10リクエスト
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many Self-Evolution requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    return process.env.NODE_ENV === "development" && req.ip === "::1";
  },
});

/**
 * Rate Limit状態を取得（デバッグ用）
 */
export function getRateLimitStatus(req: Request): {
  ip: string;
  windowMs: number;
  max: number;
} {
  return {
    ip: req.ip || "unknown",
    windowMs: 15 * 60 * 1000,
    max: 100, // デフォルト値
  };
}

