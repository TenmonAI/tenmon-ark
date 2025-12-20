import type { MemoryMessage } from "../types/memory.js";
import { getCurrentPersona, getPersonaResponseLegacy, listPersonas } from "./index.js";

export { listPersonas, getCurrentPersona };

// 互換API: Phase 2 の署名を維持しつつ、Phase 5 の人格エンジンにブリッジする
export function generateCurrentReply(params: { message: string; memory: MemoryMessage[] }): string {
  const applied = getPersonaResponseLegacy({
    sessionId: "unknown",
    userMessage: params.message,
    sessionMemory: params.memory,
    kokuzoCore: null,
  });

  return applied.finalResponse;
}
