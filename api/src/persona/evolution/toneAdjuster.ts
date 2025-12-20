import type { MemoryMessage } from "../../memory/memoryTypes.js";
import type { PersonaStateDelta } from "../personaState.js";

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

export function computeToneDelta(params: { history: MemoryMessage[]; kokuzoSummary?: string }): PersonaStateDelta {
  const lastUser = [...params.history].reverse().find((m) => m.role === "user")?.content ?? "";
  const summary = params.kokuzoSummary ?? "";

  let toneDelta = 0;
  const wantsConcise =
    includesAny(lastUser, ["短く", "結論だけ", "要点だけ", "急いで"]) || includesAny(summary, ["短く", "結論"]);
  const wantsDetail = includesAny(lastUser, ["詳しく", "丁寧に", "根拠", "背景"]) || includesAny(summary, ["詳しく"]);

  // tone_level > 1.0 ほど「より簡潔」
  if (wantsConcise) toneDelta += 0.01;
  if (wantsDetail) toneDelta -= 0.01;

  return { toneDelta, stanceDelta: 0, boundaryDelta: 0, reason: "toneAdjuster" };
}


