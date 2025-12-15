/**
 * ============================================================
 *  MARKET STATE — Market State Engine（最終版）
 * ============================================================
 * 
 * XAUUSD 1分足専用の市場状態判定
 * 
 * 実装ルール:
 * - structureBroken → STATE_BROKEN
 * - timeRegime === "NO_TRADE" → STATE_BROKEN
 * - volClass === "VOL_DEAD" || "VOL_DANGEROUS" → STATE_BROKEN
 * - rejectStrength < 0.6 → STATE_WEAK
 * ============================================================
 */

import type { TimeRegime } from "./timeRegime";
import type { VolatilityClass } from "./volatility";
import type { MarketState } from "../types";

/**
 * 市場状態評価コンテキスト
 */
export interface MarketStateContext {
  atr: number;
  volClass: VolatilityClass;
  timeRegime: TimeRegime;
  rejectStrength: number; // 0-1（反発強度）
  structureBroken: boolean;
}

/**
 * 市場状態を評価
 */
export function evaluateMarketState(ctx: MarketStateContext): MarketState {
  // 状態遷移テーブル（IF文禁止、最優先順）
  const stateTable: Array<{
    condition: (ctx: MarketStateContext) => boolean;
    state: MarketState;
  }> = [
    // 最優先: 構造破壊
    {
      condition: (ctx) => ctx.structureBroken,
      state: "STATE_BROKEN",
    },
    // 次優先: 時間帯レジーム（NO_TRADE）
    {
      condition: (ctx) => ctx.timeRegime === "NO_TRADE",
      state: "STATE_BROKEN",
    },
    // 次優先: ボラティリティ（VOL_DEAD / VOL_DANGEROUS）
    {
      condition: (ctx) =>
        ctx.volClass === "VOL_DEAD" || ctx.volClass === "VOL_DANGEROUS",
      state: "STATE_BROKEN",
    },
    // 次優先: 反発強度（弱い）
    {
      condition: (ctx) => ctx.rejectStrength < 0.6,
      state: "STATE_WEAK",
    },
    // デフォルト: 健全
    {
      condition: () => true,
      state: "STATE_VALID",
    },
  ];

  const state = stateTable.find((s) => s.condition(ctx))?.state || "STATE_BROKEN";

  return state;
}

/**
 * 反発強度を計算（簡易版）
 */
export function calculateRejectStrength(
  candles: Array<{ high: number; low: number; close: number; open: number }>
): number {
  if (candles.length < 3) {
    return 0.5; // デフォルト
  }

  const recent = candles.slice(-3);
  const rejections: number[] = [];

  for (const candle of recent) {
    const body = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;

    if (totalRange > 0) {
      // 反発強度 = ウィックの比率（高いほど強い反発）
      const rejection = (upperWick + lowerWick) / totalRange;
      rejections.push(rejection);
    }
  }

  const avgRejection = rejections.reduce((sum, r) => sum + r, 0) / rejections.length;

  return Math.min(1.0, avgRejection);
}

/**
 * 構造破壊を検出
 */
export function detectStructureBreak(
  candles: Array<{ high: number; low: number; close: number }>
): boolean {
  if (candles.length < 3) {
    return false;
  }

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  // 高値・安値の連続的な破壊を検出
  const highBreak = last.high > prev.high && prev.high > prev2.high;
  const lowBreak = last.low < prev.low && prev.low < prev2.low;

  // 急激な方向転換を検出
  const reversal =
    (last.close > last.open && prev.close < prev.open) ||
    (last.close < last.open && prev.close > prev.open);

  return highBreak || lowBreak || reversal;
}

export default {
  evaluateMarketState,
  calculateRejectStrength,
  detectStructureBreak,
};

