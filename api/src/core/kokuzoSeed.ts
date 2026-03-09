export type SeedId = string;

export interface KotodamaSignature {
  vowelVector: number[];
  consonantVector: number[];
  water: number;
  fire: number;
  motion: "rise" | "fall" | "spiral" | "expand" | "contract";
}

export interface FractalSeed {
  id: SeedId;
  ownerId: string;
  semanticUnitIds: string[];
  centroid?: number[];
  tags: string[];
  laws: string[];
  phaseProfile: string[];
  kotodamaSignature?: KotodamaSignature | null;
  integrityAnchor?: string | null;
  createdAt: number;
}

export interface SeedFactoryInput {
  ownerId: string;
  semanticUnitIds?: string[];
  tags?: string[];
  laws?: string[];
  phaseProfile?: string[];
  kotodamaSignature?: KotodamaSignature | null;
  integrityAnchor?: string | null;
  createdAt?: number;
}

export interface SeedSummary {
  id: SeedId;
  ownerId: string;
  semanticUnitCount: number;
  tagCount: number;
  lawCount: number;
  phaseCount: number;
  hasKotodamaSignature: boolean;
  hasIntegrityAnchor: boolean;
}

export interface SeedIndexEntry {
  seedId: SeedId;
  ownerId: string;
  tokens: string[];
  lawTokens: string[];
  phaseTokens: string[];
  anchorToken?: string | null;
}

function normalizeSeedPart(s: string): string {
  return String(s || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9:_-]+/g, "")
    .slice(0, 80);
}

function normalizeStringList(xs?: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of xs ?? []) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function normalizeIndexTokens(xs?: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of xs ?? []) {
    const v = String(raw ?? "").trim().toLowerCase();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function buildDeterministicSeedId(input: SeedFactoryInput): SeedId {
  const parts = [
    input.ownerId,
    ...(input.semanticUnitIds ?? []),
    ...(input.laws ?? []),
    ...(input.phaseProfile ?? []),
    input.integrityAnchor ?? "",
  ].map(normalizeSeedPart).filter(Boolean);

  const joined = parts.join(":").slice(0, 80) || "PLACEHOLDER";
  return `SEED:${joined}`;
}

export function createEmptySeed(ownerId: string): FractalSeed {
  return {
    id: "SEED_PLACEHOLDER",
    ownerId,
    semanticUnitIds: [],
    tags: [],
    laws: [],
    phaseProfile: [],
    kotodamaSignature: null,
    integrityAnchor: null,
    createdAt: Date.now(),
  };
}

export function createSeed(input: SeedFactoryInput): FractalSeed {
  const semanticUnitIds = normalizeStringList(input.semanticUnitIds);
  const tags = normalizeStringList(input.tags);
  const laws = normalizeStringList(input.laws);
  const phaseProfile = normalizeStringList(input.phaseProfile);

  return {
    id: buildDeterministicSeedId({
      ...input,
      semanticUnitIds,
      laws,
      phaseProfile,
    }),
    ownerId: input.ownerId,
    semanticUnitIds,
    tags,
    laws,
    phaseProfile,
    kotodamaSignature: input.kotodamaSignature ?? null,
    integrityAnchor: input.integrityAnchor ?? null,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function summarizeSeed(seed: FractalSeed): SeedSummary {
  return {
    id: seed.id,
    ownerId: seed.ownerId,
    semanticUnitCount: seed.semanticUnitIds.length,
    tagCount: seed.tags.length,
    lawCount: seed.laws.length,
    phaseCount: seed.phaseProfile.length,
    hasKotodamaSignature: !!seed.kotodamaSignature,
    hasIntegrityAnchor: !!seed.integrityAnchor,
  };
}

export function toSeedIndexEntry(seed: FractalSeed): SeedIndexEntry {
  return {
    seedId: seed.id,
    ownerId: seed.ownerId,
    tokens: normalizeIndexTokens([...seed.semanticUnitIds, ...seed.tags]),
    lawTokens: normalizeIndexTokens(seed.laws),
    phaseTokens: normalizeIndexTokens(seed.phaseProfile),
    anchorToken: seed.integrityAnchor ?? null,
  };
}
