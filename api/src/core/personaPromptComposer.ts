import type { MemoryProjectionPack } from "./memoryProjection.js";
import type { PersonaProfile } from "./personaRegistry.js";

export interface PersonaPromptComposition {
  systemPromptAddition: string;
  memoryContextAddition: string;
  prohibitionAddition: string;
  decisionFrameAddition: Record<string, unknown>;
}

const BASE_CONSTITUTION =
  "TENMON-ARK 基盤憲法は常に優先される。人格は投影であり主権ではない。";

export function composePersonaPrompt(args: {
  persona: PersonaProfile;
  memoryPack: MemoryProjectionPack;
}): PersonaPromptComposition {
  const { persona, memoryPack } = args;

  const systemParts: string[] = [BASE_CONSTITUTION];
  if (persona.role_summary) systemParts.push(`役割: ${persona.role_summary}`);
  if (persona.system_mantra) systemParts.push(`マントラ: ${persona.system_mantra}`);
  if (persona.mission) systemParts.push(`使命: ${persona.mission}`);
  if (persona.answer_contract) systemParts.push(`応答契約: ${persona.answer_contract}`);
  if (persona.tone) systemParts.push(`文体: ${persona.tone}`);

  let forbidden: string[] = [];
  try {
    forbidden = JSON.parse(persona.forbidden_behaviors_json || "[]");
    if (!Array.isArray(forbidden)) forbidden = [];
  } catch {
    forbidden = [];
  }

  const prohibitionParts: string[] = [];
  if (forbidden.length) prohibitionParts.push(`禁止事項: ${forbidden.join("、")}`);
  prohibitionParts.push("OCR raw text を真理として断定しない");

  const memoryParts: string[] = [];
  if (memoryPack.compactSummary) memoryParts.push(`記憶投影: ${memoryPack.compactSummary}`);

  return {
    systemPromptAddition: systemParts.join("\n"),
    memoryContextAddition: memoryParts.join("\n"),
    prohibitionAddition: prohibitionParts.join("\n"),
    decisionFrameAddition: {
      activePersona: {
        id: persona.id,
        slug: persona.slug,
        name: persona.name,
        status: persona.status,
      },
      memoryProjection: {
        mode: memoryPack.mode,
        memoryUnitCount: memoryPack.items.length,
        sources: [...new Set(memoryPack.items.map((i) => i.memoryType))],
      },
    },
  };
}
