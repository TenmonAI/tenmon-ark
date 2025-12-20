import type { MemoryMessage } from "../types/memory.js";
import type { PersonaSummary } from "../types/persona.js";
import { getPersonaResponseLegacy } from "./index.js";
import { tenmonPersona as tenmonDefinition } from "./tenmonPersona.js";

// 互換API: Phase 2 の export を維持（中身は Phase 5 の人格エンジンへ委譲）
export const tenmonPersona: PersonaSummary = tenmonDefinition.summary;

export function generateTenmonReply(params: { message: string; memory: MemoryMessage[] }): string {
  return getPersonaResponseLegacy({
    sessionId: "unknown",
    userMessage: params.message,
    sessionMemory: params.memory,
    kokuzoCore: null,
  }).finalResponse;
}
