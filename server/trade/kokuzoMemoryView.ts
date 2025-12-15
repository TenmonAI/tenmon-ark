/**
 * ============================================================
 *  KOKUZO MEMORY VIEW — Kokūzō Memory Viewer（READ ONLY）
 * ============================================================
 * 
 * 完全閲覧専用
 * 編集・削除禁止
 * ============================================================
 */

import KokuzoMemoryIntegration from "./kokuzoMemoryIntegration";

export interface ProhibitedPattern {
  timestamp: number;
  symbol: string;
  price: number;
  direction?: "BUY" | "SELL";
  reason: string;
}

/**
 * 最近ブロックされた構文を取得
 */
export async function getRecentBlocked(limit: number = 50): Promise<ProhibitedPattern[]> {
  const kokuzo = new KokuzoMemoryIntegration();
  
  try {
    // symbol と type はオプション
    const patterns = await kokuzo.searchProhibitedPatterns("XAUUSD");

    // タイムスタンプでソート（新しい順）
    const sorted = patterns
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return sorted.map((pattern) => ({
      timestamp: pattern.timestamp,
      symbol: pattern.symbol || "XAUUSD",
      price: pattern.price || 0,
      direction: pattern.direction,
      reason: pattern.reason || "Unknown",
    }));
  } catch (error) {
    console.error("[KOKUZO-MEMORY-VIEW] Failed to get recent blocked patterns:", error);
    return [];
  }
}

export default {
  getRecentBlocked,
};

