import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { amatsuKanagiPatterns, basicMovements } from "../drizzle/schema";

/**
 * 天津金木演算エンジン
 * テキストから言霊を抽出し、天津金木パターンを解析する
 */

export interface AmatsuKanagiAnalysisResult {
  inputText: string;
  extractedSounds: string[];
  patterns: Array<{
    number: number;
    sound: string;
    category: string;
    type?: string;
    pattern: string;
    movements: string[];
    meaning?: string;
    special: boolean;
  }>;
  energyBalance: {
    fire: number; // 外発（火）のエネルギー
    water: number; // 内集（水）のエネルギー
    balance: number; // -1（水優勢）〜 0（調和）〜 +1（火優勢）
  };
  spiralStructure: {
    leftRotation: number; // 左旋の数
    rightRotation: number; // 右旋の数
    innerConvergence: number; // 内集の数
    outerDivergence: number; // 外発の数
  };
  interpretation: string;
}

/**
 * カタカナを抽出する
 */
function extractKatakana(text: string): string[] {
  const katakanaRegex = /[\u30A0-\u30FF]+/g;
  const matches = text.match(katakanaRegex);
  if (!matches) return [];
  
  // 各カタカナ文字を個別に抽出
  const sounds: string[] = [];
  for (const match of matches) {
    for (const char of match) {
      sounds.push(char);
    }
  }
  return sounds;
}

/**
 * テキストから天津金木パターンを解析
 */
export async function analyzeAmatsuKanagi(inputText: string): Promise<AmatsuKanagiAnalysisResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // カタカナを抽出
  const extractedSounds = extractKatakana(inputText);

  // 各音に対応するパターンを検索
  const patterns: AmatsuKanagiAnalysisResult["patterns"] = [];
  for (const sound of extractedSounds) {
    const result = await db
      .select()
      .from(amatsuKanagiPatterns)
      .where(eq(amatsuKanagiPatterns.sound, sound))
      .limit(1);

    if (result.length > 0) {
      const pattern = result[0];
      patterns.push({
        number: pattern.number,
        sound: pattern.sound,
        category: pattern.category,
        type: pattern.type || undefined,
        pattern: pattern.pattern,
        movements: JSON.parse(pattern.movements as string),
        meaning: pattern.meaning || undefined,
        special: pattern.special === 1,
      });
    }
  }

  // エネルギーバランスを計算
  let fireCount = 0; // 外発（火）
  let waterCount = 0; // 内集（水）
  let leftRotationCount = 0; // 左旋
  let rightRotationCount = 0; // 右旋
  let innerConvergenceCount = 0; // 内集
  let outerDivergenceCount = 0; // 外発

  for (const pattern of patterns) {
    for (const movement of pattern.movements) {
      if (movement.includes("左旋")) leftRotationCount++;
      if (movement.includes("右旋")) rightRotationCount++;
      if (movement.includes("内集")) {
        innerConvergenceCount++;
        waterCount++;
      }
      if (movement.includes("外発")) {
        outerDivergenceCount++;
        fireCount++;
      }
    }
  }

  const totalEnergy = fireCount + waterCount;
  const balance = totalEnergy > 0 ? (fireCount - waterCount) / totalEnergy : 0;

  // 解釈を生成
  let interpretation = "";
  if (patterns.length === 0) {
    interpretation = "入力テキストから言霊（カタカナ）が検出されませんでした。";
  } else {
    const specialPatterns = patterns.filter(p => p.special);
    if (specialPatterns.length > 0) {
      interpretation += `中心霊（${specialPatterns.map(p => p.type).join("、")}）が検出されました。`;
    }
    
    if (balance > 0.3) {
      interpretation += " 火（外発）のエネルギーが優勢で、拡散・発展・創造の傾向があります。";
    } else if (balance < -0.3) {
      interpretation += " 水（内集）のエネルギーが優勢で、収縮・統合・凝縮の傾向があります。";
    } else {
      interpretation += " 火と水のエネルギーが調和しており、バランスの取れた状態です。";
    }

    if (leftRotationCount > rightRotationCount) {
      interpretation += " 左旋（反時計回り）の動きが多く、内向的・吸収的なエネルギーの流れがあります。";
    } else if (rightRotationCount > leftRotationCount) {
      interpretation += " 右旋（時計回り）の動きが多く、外向的・放射的なエネルギーの流れがあります。";
    }
  }

  return {
    inputText,
    extractedSounds,
    patterns,
    energyBalance: {
      fire: fireCount,
      water: waterCount,
      balance,
    },
    spiralStructure: {
      leftRotation: leftRotationCount,
      rightRotation: rightRotationCount,
      innerConvergence: innerConvergenceCount,
      outerDivergence: outerDivergenceCount,
    },
    interpretation,
  };
}

/**
 * 天津金木パターンを番号で取得
 */
export async function getPatternByNumber(number: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(amatsuKanagiPatterns)
    .where(eq(amatsuKanagiPatterns.number, number))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const pattern = result[0];
  return {
    number: pattern.number,
    sound: pattern.sound,
    category: pattern.category,
    type: pattern.type || undefined,
    pattern: pattern.pattern,
    movements: JSON.parse(pattern.movements as string),
    meaning: pattern.meaning || undefined,
    special: pattern.special === 1,
  };
}

/**
 * すべての天津金木パターンを取得
 */
export async function getAllPatterns() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db.select().from(amatsuKanagiPatterns).orderBy(amatsuKanagiPatterns.number);

  return results.map(pattern => ({
    number: pattern.number,
    sound: pattern.sound,
    category: pattern.category,
    type: pattern.type || undefined,
    pattern: pattern.pattern,
    movements: JSON.parse(pattern.movements as string),
    meaning: pattern.meaning || undefined,
    special: pattern.special === 1,
  }));
}

/**
 * すべての基本動作を取得
 */
export async function getAllBasicMovements() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(basicMovements);
}
