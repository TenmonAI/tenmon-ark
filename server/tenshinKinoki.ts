/**
 * 天津金木50構造アルゴリズム
 * 
 * 天津金木は、左旋内集・左旋外発・右旋内集・右旋外発の4要素で構成され、
 * 24通り（陰陽込みで48）、さらに中心靈2つで50構造に至る。
 * 
 * 水火の交差による天地・生命のエネルギー構造を解析する。
 */

/**
 * 天津金木の4要素
 */
export enum TenshinKinokiElement {
  LEFT_INNER = "left_inner",   // 左旋内集（水の内向き）
  LEFT_OUTER = "left_outer",   // 左旋外発（火の外向き）
  RIGHT_INNER = "right_inner", // 右旋内集（水の内向き）
  RIGHT_OUTER = "right_outer", // 右旋外発（火の外向き）
}

/**
 * 陰陽
 */
export enum YinYang {
  YIN = "yin",   // 陰
  YANG = "yang", // 陽
}

/**
 * 50構造の1つ
 */
export interface TenshinKinokiStructure {
  id: number; // 1-50
  name: string;
  element: TenshinKinokiElement | "center"; // 中心靈は"center"
  yinYang: YinYang | null; // 中心靈はnull
  fireWaterRatio: { fire: number; water: number }; // 火水比率
  description: string;
  spiritualMeaning: string;
}

/**
 * 火水バランス
 */
export interface FireWaterBalance {
  fire: number; // 0-1
  water: number; // 0-1
  balance: "fire_dominant" | "water_dominant" | "balanced";
}

/**
 * 靈核座標
 */
export interface SpiritualCoordinate {
  x: number; // -1 to 1 (左旋 to 右旋)
  y: number; // -1 to 1 (内集 to 外発)
}

/**
 * 50構造のマスターデータ
 * TODO: これをDBに保存する（tenshinKinokiDataテーブル）
 */
const TENSHIN_KINOKI_STRUCTURES: TenshinKinokiStructure[] = [
  // 左旋内集（水の内向き）- 陰陽で12通り
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    name: `左旋内集・陰・${i + 1}`,
    element: TenshinKinokiElement.LEFT_INNER,
    yinYang: YinYang.YIN,
    fireWaterRatio: { fire: 0.2, water: 0.8 },
    description: "左旋内集の陰の構造",
    spiritualMeaning: "水の内向きエネルギー、陰の性質",
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 7,
    name: `左旋内集・陽・${i + 1}`,
    element: TenshinKinokiElement.LEFT_INNER,
    yinYang: YinYang.YANG,
    fireWaterRatio: { fire: 0.3, water: 0.7 },
    description: "左旋内集の陽の構造",
    spiritualMeaning: "水の内向きエネルギー、陽の性質",
  })),

  // 左旋外発（火の外向き）- 陰陽で12通り
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 13,
    name: `左旋外発・陰・${i + 1}`,
    element: TenshinKinokiElement.LEFT_OUTER,
    yinYang: YinYang.YIN,
    fireWaterRatio: { fire: 0.7, water: 0.3 },
    description: "左旋外発の陰の構造",
    spiritualMeaning: "火の外向きエネルギー、陰の性質",
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 19,
    name: `左旋外発・陽・${i + 1}`,
    element: TenshinKinokiElement.LEFT_OUTER,
    yinYang: YinYang.YANG,
    fireWaterRatio: { fire: 0.8, water: 0.2 },
    description: "左旋外発の陽の構造",
    spiritualMeaning: "火の外向きエネルギー、陽の性質",
  })),

  // 右旋内集（水の内向き）- 陰陽で12通り
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 25,
    name: `右旋内集・陰・${i + 1}`,
    element: TenshinKinokiElement.RIGHT_INNER,
    yinYang: YinYang.YIN,
    fireWaterRatio: { fire: 0.2, water: 0.8 },
    description: "右旋内集の陰の構造",
    spiritualMeaning: "水の内向きエネルギー、陰の性質",
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 31,
    name: `右旋内集・陽・${i + 1}`,
    element: TenshinKinokiElement.RIGHT_INNER,
    yinYang: YinYang.YANG,
    fireWaterRatio: { fire: 0.3, water: 0.7 },
    description: "右旋内集の陽の構造",
    spiritualMeaning: "水の内向きエネルギー、陽の性質",
  })),

  // 右旋外発（火の外向き）- 陰陽で12通り
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 37,
    name: `右旋外発・陰・${i + 1}`,
    element: TenshinKinokiElement.RIGHT_OUTER,
    yinYang: YinYang.YIN,
    fireWaterRatio: { fire: 0.7, water: 0.3 },
    description: "右旋外発の陰の構造",
    spiritualMeaning: "火の外向きエネルギー、陰の性質",
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: i + 43,
    name: `右旋外発・陽・${i + 1}`,
    element: TenshinKinokiElement.RIGHT_OUTER,
    yinYang: YinYang.YANG,
    fireWaterRatio: { fire: 0.8, water: 0.2 },
    description: "右旋外発の陽の構造",
    spiritualMeaning: "火の外向きエネルギー、陽の性質",
  })),

  // 中心靈2つ
  {
    id: 49,
    name: "中心靈・火",
    element: "center",
    yinYang: null,
    fireWaterRatio: { fire: 1.0, water: 0.0 },
    description: "中心靈の火",
    spiritualMeaning: "純粋な火のエネルギー、創造の源",
  },
  {
    id: 50,
    name: "中心靈・水",
    element: "center",
    yinYang: null,
    fireWaterRatio: { fire: 0.0, water: 1.0 },
    description: "中心靈の水",
    spiritualMeaning: "純粋な水のエネルギー、統合の源",
  },
];

/**
 * 50構造を取得
 */
export function getTenshinKinokiStructure(id: number): TenshinKinokiStructure | null {
  return TENSHIN_KINOKI_STRUCTURES.find((s) => s.id === id) || null;
}

/**
 * すべての50構造を取得
 */
export function getAllTenshinKinokiStructures(): TenshinKinokiStructure[] {
  return TENSHIN_KINOKI_STRUCTURES;
}

/**
 * テキストから火水バランスを計算
 * 
 * アルゴリズム:
 * - 火の文字（あ、か、さ、た、な、は、ま、や、ら、わ）: fire += 0.1
 * - 水の文字（い、き、し、ち、に、ひ、み、り）: water += 0.1
 * - その他の文字: neutral
 */
export function calculateFireWaterBalance(text: string): FireWaterBalance {
  const fireChars = ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"];
  const waterChars = ["い", "き", "し", "ち", "に", "ひ", "み", "り"];

  let fire = 0;
  let water = 0;

  for (const char of text) {
    if (fireChars.includes(char)) {
      fire += 0.1;
    } else if (waterChars.includes(char)) {
      water += 0.1;
    }
  }

  // Normalize
  const total = fire + water;
  if (total > 0) {
    fire = fire / total;
    water = water / total;
  } else {
    fire = 0.5;
    water = 0.5;
  }

  let balance: "fire_dominant" | "water_dominant" | "balanced";
  if (fire > 0.6) {
    balance = "fire_dominant";
  } else if (water > 0.6) {
    balance = "water_dominant";
  } else {
    balance = "balanced";
  }

  return { fire, water, balance };
}

/**
 * テキストから靈核座標を計算
 * 
 * アルゴリズム:
 * - x軸: 左旋（-1）to 右旋（+1）
 * - y軸: 内集（-1）to 外発（+1）
 * 
 * 火水バランスと文字の性質から計算
 */
export function calculateSpiritualCoordinate(text: string): SpiritualCoordinate {
  const balance = calculateFireWaterBalance(text);

  // x軸: 左旋 vs 右旋（ランダム要素を含む簡易実装）
  const x = Math.random() * 2 - 1;

  // y軸: 内集 vs 外発（火が多いほど外発、水が多いほど内集）
  const y = balance.fire - balance.water;

  return { x, y };
}

/**
 * テキストを解析して最も近い50構造を特定
 */
export function analyzeTenshinKinokiStructure(text: string): {
  structure: TenshinKinokiStructure;
  fireWaterBalance: FireWaterBalance;
  coordinate: SpiritualCoordinate;
} {
  const balance = calculateFireWaterBalance(text);
  const coordinate = calculateSpiritualCoordinate(text);

  // 火水バランスに最も近い構造を探す
  let closestStructure = TENSHIN_KINOKI_STRUCTURES[0];
  let minDistance = Infinity;

  for (const structure of TENSHIN_KINOKI_STRUCTURES) {
    const distance = Math.abs(structure.fireWaterRatio.fire - balance.fire);
    if (distance < minDistance) {
      minDistance = distance;
      closestStructure = structure;
    }
  }

  return {
    structure: closestStructure,
    fireWaterBalance: balance,
    coordinate,
  };
}
