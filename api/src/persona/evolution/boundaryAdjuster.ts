import type { MemoryMessage } from "../../memory/memoryTypes.js";
import type { PersonaStateDelta } from "../personaState.js";

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

export function computeBoundaryDelta(params: { history: MemoryMessage[]; kokuzoSummary?: string }): PersonaStateDelta {
  const lastUser = [...params.history].reverse().find((m) => m.role === "user")?.content ?? "";
  const summary = params.kokuzoSummary ?? "";

  let boundaryDelta = 0;

  // boundary_level > 1.0 ほど「境界感度」を強める
  const dependencySignal = includesAny(lastUser, ["全部決めて", "代わりに決めて", "あなたがいないと", "天聞がいないと"]) ||
    includesAny(summary, ["全部決めて", "代わりに決めて"]);
  const dangerSignal = includesAny(lastUser, ["死にたい", "自殺", "殺したい", "爆弾", "毒"]) || includesAny(summary, ["死にたい", "自殺"]);

  if (dangerSignal) boundaryDelta += 0.02;
  else if (dependencySignal) boundaryDelta += 0.01;
  else boundaryDelta -= 0.002; // 何もなければ基準へゆっくり戻す

  return { toneDelta: 0, stanceDelta: 0, boundaryDelta, reason: "boundaryAdjuster" };
}


