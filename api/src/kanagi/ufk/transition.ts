import type { SpiralMotion } from "./spiral.js";

export type UfkState = {
  fire: number;
  water: number;
};

export type UfkTrace = {
  before: UfkState;
  after: UfkState;
  motion: SpiralMotion;
  note: string;
};

/**
 * 決定論の状態遷移（MVP）
 * - 物理エンジン化しない（単純な加算・減算のみ）
 * - 同入力→同出力
 */
export function applyMotion(state: UfkState, motion: SpiralMotion, input = ""): { next: UfkState; trace: UfkTrace } {
  const before: UfkState = { fire: state.fire, water: state.water };

  // 入力テキストの影響は「長さ」だけ（決定論）
  const k = Math.min(5, Math.max(0, (input || "").length % 6));

  let fire = state.fire;
  let water = state.water;
  let note = "";

  switch (motion) {
    case "LEFT_IN":
      fire += 1;
      water -= 1;
      note = "in: gather";
      break;
    case "LEFT_OUT":
      fire -= 1;
      water += 1;
      note = "out: release";
      break;
    case "RIGHT_IN":
      fire += 1 + k;
      note = "in: gather+k";
      break;
    case "RIGHT_OUT":
      water += 1 + k;
      note = "out: release+k";
      break;
  }

  const next: UfkState = { fire, water };
  return { next, trace: { before, after: next, motion, note } };
}
