/**
 * ============================================================
 *  TRADE DECISION SYNTHESIZER — 最終判断統合器
 * ============================================================
 * 
 * 判断は 100% TENMON-ARK
 * 
 * Phase T-1: WAIT / LOCK / ALLOW（実行しない）
 * Phase T-2: PROPOSE_BUY / PROPOSE_SELL（人間最終判断）
 * Phase T-3: EXECUTE_BUY / EXECUTE_SELL / STOP（限定自動）
 * ============================================================
 */

import type { Decision, DecisionContext } from "./types";

/**
 * Trade Decision Synthesizer
 * 
 * 最終判断を統合（状態遷移ベース、IF文禁止）
 */
export class TradeDecisionSynthesizer {
  /**
   * 決定を統合
   */
  decide(ctx: DecisionContext): Decision {
    // 状態遷移テーブル（IF文禁止）
    const decisionTable: Array<{
      condition: (ctx: DecisionContext) => boolean;
      decision: Decision;
    }> = [
      // 最優先: STATE_BROKEN → 即 STOP
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
        condition: (ctx) => ctx.loss === "DANGEROUS",
        decision: "STOP",
      },
      // Phase T-1: 観測のみ
      {
        condition: (ctx) => ctx.phase === "T-1",
        decision: ctx.saturation.locked ? "LOCK" : "ALLOW",
      },
      // Phase T-2: 提案（人間最終判断）
      {
        condition: (ctx) => ctx.phase === "T-2" && !ctx.rejectConfirmed,
        decision: "WAIT",
      },
      {
        condition: (ctx) => ctx.phase === "T-2" && ctx.rejectConfirmed,
        decision: ctx.direction === "BUY" ? "PROPOSE_BUY" : "PROPOSE_SELL",
      },
      // Phase T-3: 限定自動（極小ロット）
      {
        condition: (ctx) => ctx.phase === "T-3" && ctx.auto,
        decision: ctx.direction === "BUY" ? "EXECUTE_BUY" : "EXECUTE_SELL",
      },
      // デフォルト: WAIT
      {
        condition: () => true,
        decision: "WAIT",
      },
    ];

    // 状態遷移テーブルから決定を取得
    const decision = decisionTable.find((d) => d.condition(ctx))?.decision || "WAIT";

    return decision;
  }
}

export default TradeDecisionSynthesizer;

