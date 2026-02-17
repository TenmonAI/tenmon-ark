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


export interface KanaPhysicsCellParams {
  fire: number;   // 0..1
  water: number;  // 0..1
  spiral: "L_OUT" | "R_IN" | "L_IN" | "R_OUT";
  evidenceIds: string[]; // MUST be non-empty
}

/**
 * K6: MVP kana physics params (deterministic).
 * NOTE: This is an MVP mapping; replace with grounded mapping later.
 */
export const KANA_PHYSICS_CELL_PARAMS_MVP: Record<string, KanaPhysicsCellParams> = {
  "ア": { fire: 0.1, water: 0.9, spiral: "L_OUT", evidenceIds: ["KZPAGE:KHS:P132"] },
  "ト": { fire: 0.8, water: 0.2, spiral: "R_IN",  evidenceIds: ["KZPAGE:KHS:P132"] },
};

export function applyKanaPhysicsToCell(cell: { content: string; iki: { fire:number; water:number }; spiral: any; evidenceIds: string[] }) {
  const k = String(cell.content || "");
  const p = KANA_PHYSICS_CELL_PARAMS_MVP[k];
  if (!p) return cell; // unknown -> keep defaults (K2)
  return {
    ...cell,
    iki: { fire: p.fire, water: p.water },
    spiral: p.spiral,
    evidenceIds: (Array.isArray(cell.evidenceIds) && cell.evidenceIds.length ? cell.evidenceIds : p.evidenceIds),
  };
}
