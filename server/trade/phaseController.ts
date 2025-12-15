/**
 * ============================================================
 *  PHASE CONTROLLER — フェーズ制御
 * ============================================================
 * 
 * T-3 は UI と API 両方で二重確認
 * Kokūzō に必ず記録
 * ============================================================
 */

import { getXAUUSDTradeEngine } from "./tradeSystemInitializer";
import { auditLog } from "./auditLog";
import KokuzoMemoryIntegration from "./kokuzoMemoryIntegration";
import type { TradePhase } from "./types";

// 確認トークン（T-3 用）
const confirmTokens = new Map<string, { phase: TradePhase; expiresAt: number }>();

/**
 * 確認トークンを生成（T-3 用）
 */
export function generateConfirmToken(phase: TradePhase): string {
  const token = Math.random().toString(36).substring(2, 15);
  confirmTokens.set(token, {
    phase,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5分有効
  });

  // 古いトークンを削除
  for (const [key, value] of confirmTokens.entries()) {
    if (value.expiresAt < Date.now()) {
      confirmTokens.delete(key);
    }
  }

  return token;
}

/**
 * 確認トークンを検証
 */
export function assertValidConfirmToken(
  token: string | undefined,
  expectedPhase: TradePhase
): void {
  if (expectedPhase !== "T-3") {
    return; // T-3 以外はトークン不要
  }

  if (!token) {
    throw new Error("T-3 への変更には確認トークンが必要です");
  }

  const tokenData = confirmTokens.get(token);
  if (!tokenData) {
    throw new Error("無効な確認トークンです");
  }

  if (tokenData.expiresAt < Date.now()) {
    confirmTokens.delete(token);
    throw new Error("確認トークンの有効期限が切れています");
  }

  if (tokenData.phase !== expectedPhase) {
    throw new Error("確認トークンが一致しません");
  }

  // 使用済みトークンを削除
  confirmTokens.delete(token);
}

/**
 * 現在のフェーズを取得
 */
export function getPhase(): { phase: TradePhase; updatedAt: number } {
  const engine = getXAUUSDTradeEngine();
  if (!engine) {
    return { phase: "T-1", updatedAt: Date.now() };
  }

  return {
    phase: engine.getPhase(),
    updatedAt: Date.now(), // TODO: 実際の更新時刻を記録
  };
}

/**
 * フェーズを設定
 */
export function setPhase(
  phase: TradePhase,
  confirmToken?: string,
  userId: string = "TENMON",
  ipAddress?: string
): void {
  // T-3 は確認トークン必須
  if (phase === "T-3") {
    assertValidConfirmToken(confirmToken, phase);
  }

  const engine = getXAUUSDTradeEngine();
  if (!engine) {
    throw new Error("Trade engine not initialized");
  }

  engine.setPhase(phase);

  // Kokūzō に記録
  const kokuzo = new KokuzoMemoryIntegration();
  kokuzo
    .saveProhibitedPattern({
      type: "ENTRY_REJECTED",
      symbol: "SYSTEM",
      price: 0,
      reason: `Phase changed to ${phase}`,
      timestamp: Date.now(),
    })
    .catch((error) => {
      console.error("[PHASE-CONTROLLER] Failed to save to Kokūzō:", error);
    });

  // 監査ログに記録
  auditLog("PHASE_CHANGE", { phase }, userId, ipAddress);
}

export default {
  getPhase,
  setPhase,
  generateConfirmToken,
  assertValidConfirmToken,
};

