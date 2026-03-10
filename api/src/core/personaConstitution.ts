import fs from "node:fs";
import path from "node:path";

export type PersonaConstitutionItem = {
  constitutionKey: string;
  identityCore: string[];
  canonicalAuthorities: string[];
  nonNegotiables: string[];
  antiGenericDrift: string[];
  judgementDiscipline: string[];
  responseEthics: string[];
  languageStyle: string[];
  routePriorities: string[];
  growthPolicy: string[];
};

export type PersonaConstitutionFile = {
  schema: string;
  updated_at: string;
  constitutions: PersonaConstitutionItem[];
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_persona_constitution_v1.json");
}

let __cache: PersonaConstitutionFile | null = null;

export function loadTenmonPersonaConstitution(): PersonaConstitutionFile {
  if (__cache) return __cache;
  const p = canonPath();
  const raw = fs.readFileSync(p, "utf-8");
  const json = JSON.parse(raw) as PersonaConstitutionFile;
  __cache = json;
  return json;
}

export type PersonaConstitutionSummary = {
  constitutionKey: string;
  identityCore: string[];
  canonicalAuthorities: string[];
  nonNegotiables: string[];
  antiGenericDrift: string[];
  judgementDiscipline: string[];
};

export function getPersonaConstitutionSummary(): PersonaConstitutionSummary | null {
  const canon = loadTenmonPersonaConstitution();
  const hit =
    canon.constitutions.find((c) => c.constitutionKey === "TENMON_CORE_V1") ||
    canon.constitutions[0];
  if (!hit) return null;
  return {
    constitutionKey: hit.constitutionKey,
    identityCore: hit.identityCore,
    canonicalAuthorities: hit.canonicalAuthorities,
    nonNegotiables: hit.nonNegotiables,
    antiGenericDrift: hit.antiGenericDrift,
    judgementDiscipline: hit.judgementDiscipline,
  };
}

