import fs from "node:fs";
import path from "node:path";

type CanonMode = "short" | "standard" | "deep";

type CanonConcept = {
  displayName: string;
  canonicalRouteReason: string;
  preferredMode?: string;
  requiredPriority?: number;
  aliases: string[];
  short_definition: string;
  standard_definition: string;
  deep_definition: string;
  negative_definition: string[];
  core_axes: string[];
  related_concepts: string[];
  source_priority: string[];
  antiGenericDrift?: string[];
  evidence: any[];
  next_axes: string[];
};

type CanonSchema = {
  schema: string;
  updated_at: string;
  concepts: Record<string, CanonConcept>;
};

const CANON_PATH = path.resolve("/opt/tenmon-ark-repo/canon/tenmon_concept_canon_v1.json");
const CANON_SCHEMA = "TENMON_CONCEPT_CANON_V1";

let __canonCache: CanonSchema | null = null;

export function loadTenmonConceptCanon(): CanonSchema {
  if (__canonCache) return __canonCache;
  const raw = fs.readFileSync(CANON_PATH, "utf-8");
  const obj = JSON.parse(raw) as CanonSchema;
  if (!obj || obj.schema !== CANON_SCHEMA || typeof obj.concepts !== "object") {
    throw new Error("INVALID_TENMON_CONCEPT_CANON");
  }
  __canonCache = obj;
  return obj;
}

export function normalizeConceptQuery(text: string): string {
  return String(text || "")
    .trim()
    .replace(/[？?]+$/g, "")
    .replace(/ってどういうこと$/u, "")
    .replace(/って何$/u, "")
    .replace(/とは何$/u, "")
    .replace(/とは$/u, "")
    .replace(/って$/u, "")
    .trim();
}

export function resolveTenmonConcept(text: string): string | null {
  const canon = loadTenmonConceptCanon();
  const q = normalizeConceptQuery(text);
  if (!q) return null;

  const pairs: { conceptKey: string; alias: string }[] = [];
  for (const [conceptKey, concept] of Object.entries(canon.concepts)) {
    const aliases = Array.isArray(concept.aliases) ? concept.aliases : [];
    for (const a of aliases) {
      const alias = normalizeConceptQuery(a);
      if (!alias) continue;
      pairs.push({ conceptKey, alias });
    }
    const displayName = (concept.displayName ?? "").trim();
    if (displayName) pairs.push({ conceptKey, alias: normalizeConceptQuery(displayName) || displayName });
  }
  pairs.sort((a, b) => b.alias.length - a.alias.length);

  for (const { conceptKey, alias } of pairs) {
    if (!alias) continue;
    if (q === alias) return conceptKey;
  }
  for (const { conceptKey, alias } of pairs) {
    if (!alias) continue;
    if (q.startsWith(alias) || alias.startsWith(q)) return conceptKey;
  }
  for (const { conceptKey, alias } of pairs) {
    if (!alias) continue;
    if (q.includes(alias) || alias.includes(q)) return conceptKey;
  }
  return null;
}

export function buildConceptCanonResponse(conceptKey: string, mode: CanonMode = "standard") {
  const canon = loadTenmonConceptCanon();
  const concept = canon.concepts[String(conceptKey)];
  if (!concept) return null;

  const text =
    mode === "short"
      ? concept.short_definition
      : mode === "deep"
        ? concept.deep_definition
        : concept.standard_definition;

  return {
    conceptKey,
    displayName: concept.displayName,
    canonicalRouteReason: concept.canonicalRouteReason,
    text,
    negative_definition: concept.negative_definition,
    next_axes: concept.next_axes,
    evidence: Array.isArray(concept.evidence) ? concept.evidence : [],
  };
}

const GENERIC_DRIFT_PHRASES = [
  "言葉に宿る力",
  "現実に影響",
  "柔軟さと情熱",
  "心に響く言葉",
  "過去の経験を見直す",
  "ヒントが詰まっている",
  "日常に変化をもたらす",
  "望む変化を考える",
];

/** True if the text resolves to one of the 4 canonical concepts (katakamuna / kotodama / water_fire_law / kotodama_hisho). */
export function isConceptCanonTarget(text: string): boolean {
  return resolveTenmonConcept(String(text ?? "")) != null;
}

/** Returns phrases from GENERIC_DRIFT_PHRASES that appear in the given text. */
export function detectGenericDrift(text: string): string[] {
  const t = String(text ?? "");
  return GENERIC_DRIFT_PHRASES.filter((phrase) => t.includes(phrase));
}
