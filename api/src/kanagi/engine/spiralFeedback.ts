// フィードバック回路 (Feedback Logic)
// 観測を「次の事実」へ変換する純粋関数

import type { KanagiSpiral } from "../types/spiral.js";

/**
 * 観測円を次の思考へ戻す
 * 
 * 禁止事項:
 * 1. 解釈しない
 * 2. 要約しない
 * 3. 統合しない（矛盾を保持したまま渡す）
 * 
 * 過去の観測円は、次の瞬間の「動かぬ事実（躰の一部）」となる
 */
export function feedBackToSpiral(
  observation: string,
  currentDepth: number
): KanagiSpiral {
  return {
    previousObservation: observation,
    nextFactSeed: observation, // そのまま戻す（解釈・要約・統合しない）
    depth: currentDepth + 1,   // 位相を上げる
  };
}

