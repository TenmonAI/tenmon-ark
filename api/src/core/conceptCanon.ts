import fs from "node:fs";
import path from "node:path";

const CANON_SCHEMA = "TENMON_CONCEPT_CANON_V1";

type ConceptEntry = {
  displayName?: string;
  canonicalRouteReason?: string;
  preferredMode?: string;
  requiredPriority?: number;
  aliases?: string[];
  short_definition?: string;
  standard_definition?: string;
  deep_definition?: string;
  negative_definition?: string | string[];
  core_axes?: string[];
  related_concepts?: string[];
  source_priority?: string[];
  antiGenericDrift?: string[];
  evidence?: unknown[];
  next_axes?: string[];
};

type CanonDoc = {
  schema?: string;
  updated_at?: string;
  concepts?: Record<string, ConceptEntry>;
};

let __canonCache: CanonDoc | null = null;

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_concept_canon_v1.json");
}

/**
 * Load and parse tenmon_concept_canon_v1.json. Verifies schema. Cached after first load.
 */
export function loadTenmonConceptCanon(): CanonDoc | null {
  try {
    if (__canonCache) return __canonCache;
    const p = canonPath();
    const raw = fs.readFileSync(p, "utf-8");
    const doc = JSON.parse(raw) as CanonDoc;
    if (doc.schema !== CANON_SCHEMA) return null;
    __canonCache = doc;
    return doc;
  } catch {
    return null;
  }
}

/**
 * Normalize user query for concept lookup: trim, strip trailing とは/って何/ってどういうこと etc.
 */
export function normalizeConceptQuery(text: string): string {
  let t = String(text ?? "").trim();
  const suffixes = [
    /とは\s*$/,
    /って何\s*$/,
    /ってなに\s*$/,
    /ってどういうこと\s*$/,
    /って何ですか\s*$/,
    /とは何ですか\s*$/,
    /とは何\s*$/,
    /の真相\s*$/,
    /の説明\s*$/,
  ];
  for (const re of suffixes) {
    t = t.replace(re, "").trim();
  }
  return t;
}

/**
 * Resolve normalized query to a conceptKey via aliases (prefix or partial match). Returns null if no hit.
 */
export function resolveTenmonConcept(text: string): string | null {
  const canon = loadTenmonConceptCanon();
  if (!canon?.concepts) return null;
  const normalized = normalizeConceptQuery(text);
  if (!normalized) return null;

  for (const [key, concept] of Object.entries(canon.concepts)) {
    const aliases = concept.aliases ?? [];
    for (const alias of aliases) {
      const a = String(alias).trim();
      if (!a) continue;
      if (normalized === a) return key;
      if (normalized.startsWith(a) || a.startsWith(normalized)) return key;
      if (normalized.includes(a) || a.includes(normalized)) return key;
    }
    if (normalized === (concept.displayName ?? "").trim()) return key;
  }
  return null;
}

export type ConceptCanonResponse = {
  conceptKey: string;
  displayName: string;
  canonicalRouteReason: string;
  text: string;
  negative_definition: string | string[];
  next_axes: string[];
};

/**
 * Build canonical response for a concept. mode selects short/standard/deep definition text.
 */
export function buildConceptCanonResponse(
  conceptKey: string,
  mode: "short" | "standard" | "deep" = "standard"
): ConceptCanonResponse | null {
  const canon = loadTenmonConceptCanon();
  if (!canon?.concepts) return null;
  const concept = canon.concepts[conceptKey];
  if (!concept) return null;

  const text =
    mode === "short"
      ? concept.short_definition ?? ""
      : mode === "deep"
        ? concept.deep_definition ?? ""
        : concept.standard_definition ?? concept.short_definition ?? "";

  const negative = concept.negative_definition ?? [];
  const nextAxes = Array.isArray(concept.next_axes) ? concept.next_axes : [];

  return {
    conceptKey,
    displayName: concept.displayName ?? conceptKey,
    canonicalRouteReason: concept.canonicalRouteReason ?? "",
    text,
    negative_definition: Array.isArray(negative) ? negative : [negative],
    next_axes: nextAxes,
  };
}
