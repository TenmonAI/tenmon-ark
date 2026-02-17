import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";

const router: IRouter = Router();

const greetingPattern = /\b(hello|hi|hey|greetings)\b/i;
const datetimePattern = /\b(date|time|today|now)\b/i;
const helpPattern = /\b(help)\b/i;

function buildNaturalDecisionFrame(reason: string) {
  return {
    mode: "NATURAL",
    intent: "chat",
    llm: null,
    ku: {
      stance: "ANSWER",
      reason,
      nextNeed: [],
      selected: null,
    },
  };
}

function formatJstNow() {
  return new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * PHASE 1: 人格モード（PersonaState）に基づく分岐ロジック
 * 
 * 固定応答を廃止し、モードに応じた応答を返す
 */
router.post("/chat", (req: Request, res: Response<ChatResponseBody>) => {
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");
  
  if (!sanitized.isValid) {
    return res.status(400).json({
      response: sanitized.error || "message is required",
      timestamp: new Date().toISOString(),
    });
  }

  const normalized = sanitized.text.toLowerCase();
  if (greetingPattern.test(normalized)) {
    return res.json({
      response: "Hello. How can I help you today?",
      timestamp: new Date().toISOString(),
      decisionFrame: buildNaturalDecisionFrame("NATURAL(greeting)"),
    });
  }
  if (datetimePattern.test(normalized)) {
    return res.json({
      response: `Current time (JST): ${formatJstNow()}`,
      timestamp: new Date().toISOString(),
      decisionFrame: buildNaturalDecisionFrame("NATURAL(datetime)"),
    });
  }
  if (helpPattern.test(normalized)) {
    return res.json({
      response: [
        "I can help with the following:",
        "1) Provide guidance on available features",
        "2) Explain how to use the chat mode",
        "3) Share the system status or next steps",
      ].join("\n"),
      timestamp: new Date().toISOString(),
      decisionFrame: buildNaturalDecisionFrame("NATURAL(other)"),
    });
  }

  // モード取得（省略時は 'calm'）
  const mode = (req.body as any)?.mode || "calm";

  // モードに応じた応答を生成（外部AIは使用しない）
  let responseText: string;
  switch (mode) {
    case "calm":
      // 静寂: 静かに耳を傾けている
      responseText = "……。（静かに耳を傾けている）";
      break;
    case "thinking":
      // 思考: 認識・解析中
      responseText = "……認識。解析中……。";
      break;
    case "engaged":
      // 共鳴: 確かに受け取った
      responseText = "肯定。その言葉、確かに受け取った。";
      break;
    case "silent":
      // 無: 気配のみが漂う
      responseText = "（……気配のみが漂う……）";
      break;
    default:
      // モード不明: 静観する
      responseText = "……（モード不明。静観する）";
      break;
  }

  // 既存のレスポンス形式を維持（互換性）
  return res.json({
    response: responseText,
    timestamp: new Date().toISOString(),
  });
});

export default router;
