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

const KHS_EVIDENCE = ["KZPAGE:KHS:P132"];

function makeGroup(
  chars: string[],
  fire: number,
  water: number,
  spiral: KanaPhysicsCellParams["spiral"]
): Record<string, KanaPhysicsCellParams> {
  const out: Record<string, KanaPhysicsCellParams> = {};
  for (const ch of chars) {
    out[ch] = { fire, water, spiral, evidenceIds: KHS_EVIDENCE };
  }
  return out;
}

/**
 * K6: MVP kana physics params (deterministic).
 * NOTE: This is an MVP mapping; replace with grounded mapping later.
 */
export const KANA_PHYSICS_CELL_PARAMS_MVP: Record<string, KanaPhysicsCellParams> = {
  ...makeGroup(["ア", "イ", "ウ", "エ", "オ"], 0.2, 0.8, "L_OUT"), // ア行: 水型・展開型
  ...makeGroup(["カ", "キ", "ク", "ケ", "コ"], 0.8, 0.2, "R_IN"),  // カ行: 火型・収束型
  ...makeGroup(["サ", "シ", "ス", "セ", "ソ"], 0.5, 0.5, "L_IN"),  // サ行: 水火両型
  ...makeGroup(["タ", "チ", "ツ", "テ", "ト"], 0.75, 0.25, "R_OUT"), // タ行: 火型・転換型
  ...makeGroup(["ナ", "ニ", "ヌ", "ネ", "ノ"], 0.35, 0.65, "L_IN"), // ナ行: 水型・深化型
  ...makeGroup(["ハ", "ヒ", "フ", "ヘ", "ホ"], 0.55, 0.45, "L_OUT"), // ハ行: 両型・開放型
  ...makeGroup(["マ", "ミ", "ム", "メ", "モ"], 0.4, 0.6, "R_IN"),  // マ行: 水型・統合型
  ...makeGroup(["ヤ", "ユ", "ヨ"], 0.7, 0.3, "R_OUT"),             // ヤ行: 火型・生成型
  ...makeGroup(["ラ", "リ", "ル", "レ", "ロ"], 0.5, 0.5, "L_OUT"), // ラ行: 両型・循環型
  ...makeGroup(["ワ", "ヰ", "ヱ", "ヲ", "ン"], 0.3, 0.7, "L_IN"),  // ワ行: 水型・完結型
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
