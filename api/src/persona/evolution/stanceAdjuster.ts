import type { MemoryMessage } from "../../memory/memoryTypes.js";
import type { PersonaStateDelta } from "../personaState.js";

function countQuestions(text: string): number {
  const q = (text.match(/\?/g) ?? []).length + (text.match(/？/g) ?? []).length;
  return q;
}

export function computeStanceDelta(params: { history: MemoryMessage[]; kokuzoSummary?: string }): PersonaStateDelta {
  const lastUser = [...params.history].reverse().find((m) => m.role === "user")?.content ?? "";
  const summary = params.kokuzoSummary ?? "";

  let stanceDelta = 0;

  // stance_level > 1.0 ほど「判断の明示」を強める
  const manyQuestions = countQuestions(lastUser) >= 2 || countQuestions(summary) >= 2;
  const asksForJudgement = lastUser.includes("判断") || lastUser.includes("結論") || lastUser.includes("決め方");
  const asksForOnlyAnswer = lastUser.includes("答えだけ") || lastUser.includes("結論だけ");

  if (manyQuestions || asksForJudgement) stanceDelta += 0.01;
  if (asksForOnlyAnswer) stanceDelta -= 0.005; // 微量

  return { toneDelta: 0, stanceDelta, boundaryDelta: 0, reason: "stanceAdjuster" };
}


