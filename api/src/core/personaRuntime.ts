import { getPersonaById, getPersonaForThread, isPersonaActive } from "./personaRegistry.js";
import { buildMemoryProjectionPack, logMemoryProjection } from "./memoryProjection.js";
import { composePersonaPrompt } from "./personaPromptComposer.js";
import { isPreviewThread } from "./personaPreviewIsolation.js";
import type { PersonaPromptComposition } from "./personaPromptComposer.js";

export interface PersonaRuntimeResult {
  hasPersona: boolean;
  composition: PersonaPromptComposition | null;
  personaId: string | null;
  personaSlug: string | null;
  isPreview: boolean;
}

export function resolvePersonaForRequest(args: {
  threadId: string;
  explicitPersonaId?: string;
}): PersonaRuntimeResult {
  const { threadId, explicitPersonaId } = args;
  const preview = isPreviewThread(threadId);

  let persona = explicitPersonaId ? getPersonaById(explicitPersonaId) : null;
  if (persona && !preview && !isPersonaActive(persona.id)) {
    persona = null;
  }

  if (!persona) {
    persona = getPersonaForThread(threadId);
    if (persona && !preview && !isPersonaActive(persona.id)) {
      persona = null;
    }
  }

  if (!persona) {
    return {
      hasPersona: false,
      composition: null,
      personaId: null,
      personaSlug: null,
      isPreview: preview,
    };
  }

  const memoryPack = buildMemoryProjectionPack({ threadId, persona, isPreview: preview });
  const composition = composePersonaPrompt({ persona, memoryPack });
  try {
    logMemoryProjection(memoryPack);
  } catch {
    // best-effort observability only
  }

  return {
    hasPersona: true,
    composition,
    personaId: persona.id,
    personaSlug: persona.slug,
    isPreview: preview,
  };
}
