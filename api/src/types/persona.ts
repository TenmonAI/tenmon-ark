import type { PersonaSummary } from "../persona/personaTypes.js";

export type { PersonaId, PersonaSummary } from "../persona/personaTypes.js";

export type PersonaListResponseBody = {
  personas: PersonaSummary[];
};

export type PersonaCurrentResponseBody = {
  persona: PersonaSummary;
};
