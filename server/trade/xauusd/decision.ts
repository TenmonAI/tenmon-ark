/**
 * ============================================================
 *  DECISION — 最終 Decision Synthesizer
 * ============================================================
 * 
 * XAUUSD 1分足専用の最終決定統合器
 * 
 * ルール:
 * - STATE_BROKEN → STOP
 * - saturation.locked → LOCK
 * - lossQuality === "DANGEROUS" → STOP
 * - Phase T-1 → WAIT
 * - Phase T-2 → PROPOSE
 * - Phase T-3 → EXECUTE
 * ============================================================
 */

import type { Decision, TradePhase } from "../types";
import type { MarketState } from "../types";
import type { SaturationState } from "./entrySaturation";
import type { LossQuality } from "../types";

/**
 * 決定コンテキスト
 */
export interface DecisionContext {
  market: MarketState;
  saturation: SaturationState;
  lossQuality: LossQuality;
  phase: TradePhase;
  direction?: "BUY" | "SELL";
  timeRegime?: "HIGH_EXPECTANCY" | "MID_EXPECTANCY" | "LOW_EXPECTANCY" | "NO_TRADE";
  volClass?: "VOL_DEAD" | "VOL_WEAK" | "VOL_IDEAL" | "VOL_STRONG" | "VOL_DANGEROUS";
}

/**
 * 決定を統合
 */
export function decide(ctx: DecisionContext, emergencyStop?: {
  all: boolean;
  buy: boolean;
  sell: boolean;
}): Decision {
  // 緊急停止チェック（最優先）
  if (emergencyStop) {
    if (emergencyStop.all) {
      return "STOP";
    }
    if (emergencyStop.buy && ctx.direction === "BUY") {
      return "STOP";
    }
    if (emergencyStop.sell && ctx.direction === "SELL") {
      return "STOP";
    }
  }

  // 状態遷移テーブル（IF文禁止、最優先順）
  const decisionTable: Array<{
    condition: (ctx: DecisionContext) => boolean;
    decision: Decision;
  }> = [
    // 最優先: STATE_BROKEN → STOP
    {
      condition: (ctx) => ctx.market === "STATE_BROKEN",
      decision: "STOP",
    },
    // 次優先: 飽和ロック → LOCK
    {
      condition: (ctx) => ctx.saturation.locked,
      decision: "LOCK",
    },
    // 次優先: 損失品質が危険 → STOP
    {
      condition: (ctx) => ctx.lossQuality === "DANGEROUS",
      decision: "STOP",
    },
    // Phase T-1: 観測のみ → WAIT
    {
      condition: (ctx) => ctx.phase === "T-1",
      decision: "WAIT",
    },
    // Phase T-2: 提案 → PROPOSE
    {
      condition: (ctx) => ctx.phase === "T-2",
      decision: ctx.direction === "BUY" ? "PROPOSE_BUY" : "PROPOSE_SELL",
    },
    // Phase T-3: 限定自動 → EXECUTE
    {
      condition: (ctx) => ctx.phase === "T-3",
      decision: ctx.direction === "BUY" ? "EXECUTE_BUY" : "EXECUTE_SELL",
    },
    // デフォルト: WAIT
    {
      condition: () => true,
      decision: "WAIT",
    },
  ];

  const decision = decisionTable.find((d) => d.condition(ctx))?.decision || "WAIT";

  return decision;
}

export default {
  decide,
};

