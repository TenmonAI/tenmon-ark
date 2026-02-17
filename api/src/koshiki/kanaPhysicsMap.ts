/**
 * KOSHIKI K1 (DBなし): KanaPhysicsMap MVP
 * - evidenceIds は必須（空は禁止）
 * - まだ /api/chat へ接続しない（次カード）
 */

export interface KanaPhysicsEntry {
  name: string;
  definition: string;
  evidenceIds: string[]; // MUST be non-empty
}

export type KanaPhysicsMap = Record<string, KanaPhysicsEntry>;

export function assertKanaPhysicsMap(map: KanaPhysicsMap): void {
  for (const [k, v] of Object.entries(map)) {
    if (!v || typeof v !== "object") throw new Error(`kanaPhysicsMap invalid entry: ${k}`);
    if (!Array.isArray(v.evidenceIds) || v.evidenceIds.length < 1) {
      throw new Error(`kanaPhysicsMap evidenceIds required: ${k}`);
    }
  }
}

// MVP seed (placeholder; replace with real evidenceIds later)
export const KANA_PHYSICS_MAP_MVP: KanaPhysicsMap = {
  "A": { name: "A", definition: "MVP placeholder", evidenceIds: ["KZPAGE:KHS:P132"] },
};
