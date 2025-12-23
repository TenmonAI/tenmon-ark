// 五十音パターンの読み込みと型定義

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * 動き（Movement）の型
 */
export type Movement = "L_IN" | "L_OUT" | "R_IN" | "R_OUT";

/**
 * 五十音パターン
 */
export interface KanagiPattern {
  number: number;
  sound: string;
  category: string;
  type?: string;
  pattern: string;
  movements: string[]; // ["左旋内集", "左旋外発", ...]
  meaning?: string;
  special: boolean;
}

/**
 * パターンデータの型
 */
interface PatternsData {
  name: string;
  description: string;
  version: string;
  patterns: KanagiPattern[];
}

/**
 * パターン辞書（kana -> pattern）
 */
const patternMap = new Map<string, KanagiPattern>();

/**
 * 動き文字列を Movement 型に変換
 */
function normalizeMovement(movement: string): Movement | null {
  if (movement.includes("左旋") && movement.includes("内集")) return "L_IN";
  if (movement.includes("左旋") && movement.includes("外発")) return "L_OUT";
  if (movement.includes("右旋") && movement.includes("内集")) return "R_IN";
  if (movement.includes("右旋") && movement.includes("外発")) return "R_OUT";
  return null;
}

/**
 * パターンデータを読み込む
 */
export function loadPatterns(): Map<string, KanagiPattern> {
  if (patternMap.size > 0) {
    return patternMap; // 既に読み込み済み
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const patternsPath = join(__dirname, "../../../../shared/kanagi/amatsuKanagi50Patterns.json");
    
    const content = readFileSync(patternsPath, "utf-8");
    const data: PatternsData = JSON.parse(content);

    // パターン辞書を構築
    for (const pattern of data.patterns) {
      patternMap.set(pattern.sound, pattern);
    }

    console.log(`[KANAGI-PATTERNS] Loaded ${patternMap.size} patterns`);
    return patternMap;
  } catch (error) {
    console.error("[KANAGI-PATTERNS] Failed to load patterns:", error);
    return patternMap; // 空のMapを返す
  }
}

/**
 * 音からパターンを取得
 */
export function getPatternBySound(sound: string): KanagiPattern | null {
  const map = loadPatterns();
  return map.get(sound) || null;
}

/**
 * すべてのパターンを取得
 */
export function getAllPatterns(): KanagiPattern[] {
  const map = loadPatterns();
  return Array.from(map.values());
}

/**
 * 動きから fire/water 補正を計算
 */
export function calculateMovementEnergy(movements: string[]): { fire: number; water: number } {
  let fire = 0;
  let water = 0;

  for (const movement of movements) {
    if (movement.includes("外発")) fire++;
    if (movement.includes("内集")) water++;
  }

  return { fire, water };
}

