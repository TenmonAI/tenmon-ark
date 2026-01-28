// KanagiReasoner（思考の器の差し込み位置を固定するための stub）
// 工程3: CorePlan 型を返せる形に更新（推論は工程4以降）

import type { CorePlan } from "./corePlan.js";

export type KanagiReasonerInput = unknown;
export type KanagiReasonerOutput = {
  corePlan: CorePlan;
  warnings: string[];
};

/**
 * KanagiReasoner（stub）
 * 工程3: CorePlan の器だけ返す（推論は工程4以降で実装）
 */
export function kanagiReasoner(input: KanagiReasonerInput): KanagiReasonerOutput {
  const corePlan: CorePlan = {
    centerClaim: "",
    claims: [],
    evidenceIds: [],
    warnings: [],
    chainOrder: [],
  };
  return {
    corePlan,
    warnings: [],
  };
}

