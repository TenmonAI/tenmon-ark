/**
 * ============================================================
 *  LOSS QUALITY — Loss Quality Analyzer（逆行の質）
 * ============================================================
 * 
 * XAUUSD 1分足専用の損失品質分析
 * 
 * ルール:
 * - DANGEROUS → 即 STOP + クールダウン
 * - クールダウン中は 提案すら禁止
 * ============================================================
 */

import type { Candle, LossQuality } from "../types";

/**
 * 損失品質分析コンテキスト
 */
export interface LossQualityContext {
  candle: Candle;
  atr: number;
  atrTrend: "rising" | "falling" | "stable"; // ATR のトレンド
  consecutiveBearish: number; // 連続陰線数
  rejectionShrinking: boolean; // 反発量が縮小しているか
}

/**
 * 損失品質を分析
 */
export function analyzeLoss(ctx: LossQualityContext): LossQuality {
  const { candle, atr, atrTrend, consecutiveBearish, rejectionShrinking } = ctx;

  // ウィック比率を計算
  const body = Math.abs(candle.close - candle.open);
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const wickRatio = body > 0 ? (upperWick + lowerWick) / body : 0;

  // 状態遷移テーブル（IF文禁止）
  const qualityTable: Array<{
    condition: (ctx: LossQualityContext, wickRatio: number) => boolean;
    quality: LossQuality;
  }> = [
    // 最優先: ウィック比率が低く、ATR が下降中
    {
      condition: (ctx, wickRatio) =>
        wickRatio < 0.3 && ctx.atrTrend === "falling",
      quality: "DANGEROUS",
    },
    // 次優先: 連続陰線かつ反発量が縮小
    {
      condition: (ctx, wickRatio) =>
        ctx.consecutiveBearish >= 3 && ctx.rejectionShrinking,
      quality: "DANGEROUS",
    },
    // デフォルト: 健全
    {
      condition: () => true,
      quality: "HEALTHY",
    },
  ];

  const quality = qualityTable.find((q) => q.condition(ctx, wickRatio))?.quality || "HEALTHY";

  return quality;
}

/**
 * ATR トレンドを計算
 */
export function calculateATRTrend(
  atrHistory: number[]
): "rising" | "falling" | "stable" {
  if (atrHistory.length < 3) {
    return "stable";
  }

  const recent = atrHistory.slice(-3);
  const first = recent[0];
  const last = recent[recent.length - 1];

  const threshold = 0.05; // 5% の変化でトレンドと判定

  if (last > first * (1 + threshold)) {
    return "rising";
  } else if (last < first * (1 - threshold)) {
    return "falling";
  } else {
    return "stable";
  }
}

/**
 * 連続陰線数を計算
 */
export function countConsecutiveBearish(
  candles: Array<{ close: number; open: number }>
): number {
  let count = 0;

  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].close < candles[i].open) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * 反発量が縮小しているか判定
 */
export function isRejectionShrinking(
  candles: Array<{ high: number; low: number; close: number; open: number }>
): boolean {
  if (candles.length < 3) {
    return false;
  }

  const recent = candles.slice(-3);
  const rejections: number[] = [];

  for (const candle of recent) {
    const body = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const totalRange = candle.high - candle.low;

    if (totalRange > 0) {
      const rejection = (upperWick + lowerWick) / totalRange;
      rejections.push(rejection);
    }
  }

  if (rejections.length < 3) {
    return false;
  }

  // 反発量が減少しているか
  return rejections[0] > rejections[1] && rejections[1] > rejections[2];
}

export default {
  analyzeLoss,
  calculateATRTrend,
  countConsecutiveBearish,
  isRejectionShrinking,
};

