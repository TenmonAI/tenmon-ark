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
 * ロード状態（Phase 4: 失敗時は状態として保持）
 */
let patternsLoaded = false;
let patternsLoadPath: string | null = null;

/**
 * ロード状態を取得
 */
export function getPatternsLoadStatus(): { loaded: boolean; count: number; path: string | null } {
  return {
    loaded: patternsLoaded,
    count: patternMap.size,
    path: patternsLoadPath,
  };
}

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
 * パターンデータを読み込む（Phase 4: ロード状態を保持）
 */
export function loadPatterns(): Map<string, KanagiPattern> {
  if (patternsLoaded) {
    return patternMap; // 既に読み込み済み（成功時）
  }

  // 既に試行済みで失敗した場合も空のMapを返す（再試行しない）
  if (patternMap.size === 0 && patternsLoadPath === null) {
    // まだ試行していない場合は試行
    tryLoadPatterns();
  }

  return patternMap;
}

/**
 * パターンを読み込む（内部関数）
 */
function tryLoadPatterns(): void {
  // 既にロード済みの場合は何もしない
  if (patternsLoaded) return;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // 複数のパスを試行（dist内を優先、次にshared/kanagi/、server/）
    const candidatePaths = [
      join(__dirname, "amatsuKanagi50Patterns.json"), // dist/kanagi/patterns/ 内（ビルド時にコピー）
      join(__dirname, "../../../../shared/kanagi/amatsuKanagi50Patterns.json"),
      join(__dirname, "../../../../server/amatsuKanagi50Patterns.json"),
    ];
    
    let foundPath: string | null = null;
    for (const path of candidatePaths) {
      try {
        if (readFileSync(path, "utf-8")) {
          foundPath = path;
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!foundPath) {
      console.warn("[KANAGI-PATTERNS] amatsuKanagi50Patterns.json not found, using empty patterns");
      patternsLoaded = false;
      patternsLoadPath = null;
      return; // 空のMapのまま（起動継続）
    }
    
    const content = readFileSync(foundPath, "utf-8");
    const data: PatternsData = JSON.parse(content);

    // パターン辞書を構築
    for (const pattern of data.patterns) {
      patternMap.set(pattern.sound, pattern);
    }

    patternsLoaded = true;
    patternsLoadPath = foundPath;
    console.log(`[KANAGI-PATTERNS] Loaded ${patternMap.size} patterns from ${foundPath}`);
  } catch (error: any) {
    console.warn(`[KANAGI-PATTERNS] Failed to load patterns (non-fatal): ${error?.message || error}`);
    patternsLoaded = false;
    patternsLoadPath = null;
    // 空のMapのまま（起動継続）
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // 複数のパスを試行（dist内を優先、次にshared/kanagi/、server/）
    const candidatePaths = [
      join(__dirname, "amatsuKanagi50Patterns.json"), // dist/kanagi/patterns/ 内（ビルド時にコピー）
      join(__dirname, "../../../../shared/kanagi/amatsuKanagi50Patterns.json"),
      join(__dirname, "../../../../server/amatsuKanagi50Patterns.json"),
    ];
    
    let patternsPath: string | null = null;
    for (const path of candidatePaths) {
      try {
        if (readFileSync(path, "utf-8")) {
          patternsPath = path;
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!patternsPath) {
      console.warn("[KANAGI-PATTERNS] amatsuKanagi50Patterns.json not found, using empty patterns");
      patternsLoaded = false;
      patternsLoadPath = null;
      return; // void を返す（起動継続）
    }
    
    const content = readFileSync(patternsPath, "utf-8");
    const data: PatternsData = JSON.parse(content);

    // パターン辞書を構築
    for (const pattern of data.patterns) {
      patternMap.set(pattern.sound, pattern);
    }

    patternsLoaded = true;
    patternsLoadPath = patternsPath;
    console.log(`[KANAGI-PATTERNS] Loaded ${patternMap.size} patterns from ${patternsPath}`);
  } catch (error: any) {
    console.warn(`[KANAGI-PATTERNS] Failed to load patterns (non-fatal): ${error?.message || error}`);
    patternsLoaded = false;
    patternsLoadPath = null;
    // void を返す（起動継続）
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

