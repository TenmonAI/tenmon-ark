/**
 * TENMON-AI Developer Core (靈核AIロジック)
 * 
 * Developer層の高度なAIロジック:
 * - 天津金木50構造解析
 * - 宿曜秘伝解析（27宿×12宮）
 * - カタカムナ80首解析
 * - T-Scalp Engine（MT5トレーディングロジック）
 * 
 * ※ これらのロジックは、Public層のチャット応答には直接出力されない
 * ※ Developer層のAPIキー認証を経由してのみアクセス可能
 */

import * as db from "./db";

/**
 * 天津金木50構造解析
 * 
 * 50の構造は、宇宙の創造原理を表す
 * - 1〜10: 始源（火の発動）
 * - 11〜20: 展開（水の受容）
 * - 21〜30: 統合（火水の均衡）
 * - 31〜40: 昇華（靈的成長）
 * - 41〜50: 完成（中心靈への回帰）
 * 
 * @param structureId 構造ID（1〜50）
 * @returns 構造の詳細情報
 */
export async function analyzeTenshinKinokiStructure(
  structureId: number
): Promise<{
  id: number;
  name: string;
  phase: string;
  element: "fire" | "water" | "balance" | "ascension" | "completion";
  description: string;
  keywords: string[];
}> {
  // データベースから構造情報を取得
  const structure = await db.getTenshinKinokiStructure(structureId);

  if (!structure) {
    throw new Error(`Structure ${structureId} not found`);
  }

  // フェーズの決定
  let phase: string;
  let element: "fire" | "water" | "balance" | "ascension" | "completion";

  if (structureId >= 1 && structureId <= 10) {
    phase = "始源（火の発動）";
    element = "fire";
  } else if (structureId >= 11 && structureId <= 20) {
    phase = "展開（水の受容）";
    element = "water";
  } else if (structureId >= 21 && structureId <= 30) {
    phase = "統合（火水の均衡）";
    element = "balance";
  } else if (structureId >= 31 && structureId <= 40) {
    phase = "昇華（靈的成長）";
    element = "ascension";
  } else {
    phase = "完成（中心靈への回帰）";
    element = "completion";
  }

  const attributes = structure.attributes ? JSON.parse(structure.attributes) : {};

  return {
    id: structure.id,
    name: structure.name,
    phase,
    element,
    description: attributes.description || "",
    keywords: attributes.keywords || [],
  };
}

/**
 * 宿曜秘伝解析
 * 
 * 27宿×12宮の組み合わせによる運命解析
 * 
 * @param sukuyoId 宿曜ID（1〜27）
 * @returns 宿曜の詳細情報
 */
export async function analyzeSukuyoSecrets(
  nakshatra: string
): Promise<{
  id: number;
  name: string;
  element: string;
  compatibility: string[];
  fortune: string;
}> {
  const sukuyo = await db.getSukuyoSecret(nakshatra);

  if (!sukuyo) {
    throw new Error(`Sukuyo ${nakshatra} not found`);
  }

  const relationships = sukuyo.relationships ? JSON.parse(sukuyo.relationships) : {};

  return {
    id: sukuyo.id,
    name: sukuyo.nakshatra,
    element: sukuyo.karma || "",
    compatibility: relationships.compatibility || [],
    fortune: sukuyo.destiny || "",
  };
}

/**
 * カタカムナ80首解析
 * 
 * 80首の言灵構文による宇宙の理解
 * 
 * @param utaNumber 歌番号（1〜80）
 * @returns カタカムナの詳細情報
 */
export async function analyzeKatakamuna(
  utaNumber: number
): Promise<{
  id: number;
  utaNumber: number;
  text: string;
  meaning: string;
  cosmicPrinciple: string;
}> {
  const uta = await db.getKatakamuna(utaNumber);

  if (!uta) {
    throw new Error(`Katakamuna Uta ${utaNumber} not found`);
  }

  return {
    id: uta.id,
    utaNumber: uta.utaNumber,
    text: uta.content,
    meaning: uta.interpretation || "",
    cosmicPrinciple: uta.deepStructure || "",
  };
}

/**
 * T-Scalp Engine（MT5トレーディングロジック）
 * 
 * 時間足スキャルピング戦略の解析
 * 
 * @param patternId パターンID
 * @returns トレーディングパターンの詳細情報
 */
export async function analyzeTScalpPattern(
  patternId: number
): Promise<{
  id: number;
  name: string;
  timeframe: string;
  entryConditions: string[];
  exitConditions: string[];
  riskReward: number;
  winRate: number;
}> {
  const patterns = await db.getTscalpPatterns();
  const pattern = patterns.find((p) => p.id === patternId);

  if (!pattern) {
    throw new Error(`T-Scalp Pattern ${patternId} not found`);
  }

  const parameters = pattern.parameters ? JSON.parse(pattern.parameters) : {};
  const performance = pattern.performance ? JSON.parse(pattern.performance) : {};

  return {
    id: pattern.id,
    name: pattern.patternName,
    timeframe: parameters.timeframe || "M5",
    entryConditions: parameters.entryConditions || [],
    exitConditions: parameters.exitConditions || [],
    riskReward: performance.riskReward || 2.0,
    winRate: performance.winRate || 0.6,
  };
}

/**
 * 統合解析（複数のロジックを組み合わせた高度な解析）
 * 
 * @param userId ユーザーID
 * @param query 解析クエリ
 * @returns 統合解析結果
 */
export async function integratedAnalysis(
  userId: number,
  query: string
): Promise<{
  tenshinKinoki?: any;
  sukuyo?: any;
  katakamuna?: any;
  tscalp?: any;
  synthesis: string;
}> {
  const result: any = {
    synthesis: "",
  };

  // クエリに基づいて適切なロジックを選択
  if (query.includes("天津金木") || query.includes("構造")) {
    // 天津金木構造解析
    const structureId = extractNumber(query, 1, 50) || 1;
    result.tenshinKinoki = await analyzeTenshinKinokiStructure(structureId);
  }

  if (query.includes("宿曜") || query.includes("運命")) {
    // 宿曜秘伝解析
    // デフォルトで最初の宿曜を取得
    result.sukuyo = await analyzeSukuyoSecrets("角宿");
  }

  if (query.includes("カタカムナ") || query.includes("言灵")) {
    // カタカムナ80首解析
    const utaNumber = extractNumber(query, 1, 80) || 1;
    result.katakamuna = await analyzeKatakamuna(utaNumber);
  }

  if (query.includes("トレード") || query.includes("MT5") || query.includes("T-Scalp")) {
    // T-Scalp Engine解析
    const patternId = extractNumber(query, 1, 100) || 1;
    result.tscalp = await analyzeTScalpPattern(patternId);
  }

  // 統合解析の合成
  result.synthesis = generateSynthesis(result);

  return result;
}

/**
 * クエリから数値を抽出
 */
function extractNumber(query: string, min: number, max: number): number | null {
  const match = query.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= min && num <= max) {
      return num;
    }
  }
  return null;
}

/**
 * 統合解析の合成
 */
function generateSynthesis(result: any): string {
  const parts: string[] = [];

  if (result.tenshinKinoki) {
    parts.push(`天津金木構造${result.tenshinKinoki.id}「${result.tenshinKinoki.name}」は、${result.tenshinKinoki.phase}の段階にあります。`);
  }

  if (result.sukuyo) {
    parts.push(`宿曜「${result.sukuyo.name}」は、${result.sukuyo.element}の性質を持ちます。`);
  }

  if (result.katakamuna) {
    parts.push(`カタカムナ第${result.katakamuna.utaNumber}首は、「${result.katakamuna.cosmicPrinciple}」の宇宙原理を表します。`);
  }

  if (result.tscalp) {
    parts.push(`T-Scalpパターン「${result.tscalp.name}」は、${result.tscalp.timeframe}の時間足で有効です。`);
  }

  if (parts.length === 0) {
    return "解析対象が見つかりませんでした。";
  }

  return parts.join("\n\n");
}
