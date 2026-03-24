/**
 * CHAT_SAFE_REFACTOR_PATCH41_ENTRY_EXTRACTION_MIN_V1
 * request body から answer profile を読む最小入口責務。
 */

import type { AnswerLength, AnswerMode, AnswerFrame, AnswerProfile } from "../../planning/responsePlanCore.js";

/**
 * body から answerLength/answerMode/answerFrame を取得し、未指定時は現行互換で正規化する。
 * CARD_ANSWER_PROFILE_V1 の pure 部分。
 */
export function parseAnswerProfileFromBody(body: any): AnswerProfile {
  const b = body || {};
  const rawLength = b.answerLength;
  const rawMode = b.answerMode;
  const rawFrame = b.answerFrame;
  const validLength: AnswerLength | null = ["short", "medium", "long"].includes(rawLength) ? rawLength : null;
  const validMode: AnswerMode | null = ["support", "define", "analysis", "worldview", "continuity"].includes(rawMode) ? rawMode : null;
  let validFrame: AnswerFrame | null = ["one_step", "statement_plus_one_question", "d_delta_s_one_step"].includes(rawFrame) ? rawFrame : null;
  if (validFrame === "d_delta_s_one_step" && validLength !== "long") validFrame = "statement_plus_one_question";
  let answerLength: AnswerLength | null = validLength;
  let answerMode: AnswerMode | null = validMode;
  let answerFrame: AnswerFrame | null = validFrame;
  if (validMode && (answerLength == null || answerFrame == null)) {
    if (answerLength == null) {
      if (validMode === "support" || validMode === "continuity") answerLength = "short";
      else answerLength = "medium";
    }
    if (answerFrame == null) {
      if (validMode === "support" || validMode === "continuity") answerFrame = "one_step";
      else answerFrame = "statement_plus_one_question";
    }
  }
  return { answerLength: answerLength ?? null, answerMode: answerMode ?? null, answerFrame: answerFrame ?? null };
}

/**
 * body から message / threadId を正規化する。PATCH44 entry 抽出。
 * input または message のどちらでも受け付ける（後方互換）。
 */
export function normalizeChatEntryFromBody(body: any): { message: string; threadId: string } {
  const b = body || {};
  const messageRaw = b.input ?? b.message;
  const message = String(messageRaw ?? "").trim();
  const threadId = String(b.threadId ?? b.sessionId ?? "default").trim();
  return { message, threadId };
}

/**
 * ku に answerLength/answerMode/answerFrame を未設定時のみ注入（既存キーは上書きしない）。
 * CARD_ANSWER_PROFILE_V1（PATCH42 entry 抽出）。
 */
export function injectAnswerProfileToKu(ku: any, profile: AnswerProfile | null | undefined): void {
  if (ku == null || typeof ku !== "object") return;
  if (ku.answerLength === undefined) ku.answerLength = profile?.answerLength ?? null;
  if (ku.answerMode === undefined) ku.answerMode = profile?.answerMode ?? null;
  if (ku.answerFrame === undefined) ku.answerFrame = profile?.answerFrame ?? null;
}
