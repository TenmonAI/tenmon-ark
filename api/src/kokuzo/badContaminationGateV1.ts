/**
 * BAD（品質劣化・汚染）観測 / 遮断ゲート — 段階導入用。
 * 参照除外ロジックは core/kokuzoBadGuardV1 と同一ヒューリスティック。
 */
import { evaluateKokuzoBadHeuristicV1 } from "../core/kokuzoBadGuardV1.js";

export type BadGateDecisionV1 = {
  observeOnly: boolean;
  blockPayloadMutation: boolean;
  reasons: string[];
};

/** 観測のみ（payload 改変なし）。reasons に BAD 理由を載せる。 */
export function observeKokuzoBadContaminationV1(text: string): BadGateDecisionV1 {
  const r = evaluateKokuzoBadHeuristicV1(text);
  return {
    observeOnly: true,
    blockPayloadMutation: false,
    reasons: r.isBad ? r.reasons : [],
  };
}

/** @deprecated 後方互換: observeKokuzoBadContaminationV1 と同じ */
export function observeBadContaminationStubV1(text: string): BadGateDecisionV1 {
  return observeKokuzoBadContaminationV1(text);
}
