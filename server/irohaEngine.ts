import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { irohaInterpretations } from "../drizzle/schema";

/**
 * いろは言灵解析エンジン
 * テキストからひらがなを抽出し、いろは言灵解を提供する
 */

export interface IrohaAnalysisResult {
  inputText: string;
  extractedCharacters: string[];
  interpretations: Array<{
    character: string;
    order: number;
    reading: string;
    interpretation: string;
    lifePrinciple: string;
  }>;
  lifePrinciplesSummary: string;
  overallInterpretation: string;
}

/**
 * ひらがなを抽出する
 */
function extractHiragana(text: string): string[] {
  const hiraganaRegex = /[\u3040-\u309F]+/g;
  const matches = text.match(hiraganaRegex);
  if (!matches) return [];
  
  // 各ひらがな文字を個別に抽出
  const characters: string[] = [];
  for (const match of matches) {
    for (const char of match) {
      characters.push(char);
    }
  }
  return characters;
}

/**
 * テキストからいろは言灵解を解析
 */
export async function analyzeIroha(inputText: string): Promise<IrohaAnalysisResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // ひらがなを抽出
  const extractedCharacters = extractHiragana(inputText);

  // 各文字に対応する解釈を検索
  const interpretations: IrohaAnalysisResult["interpretations"] = [];
  for (const character of extractedCharacters) {
    const result = await db
      .select()
      .from(irohaInterpretations)
      .where(eq(irohaInterpretations.character, character))
      .limit(1);

    if (result.length > 0) {
      const interpretation = result[0];
      interpretations.push({
        character: interpretation.character,
        order: interpretation.order,
        reading: interpretation.reading || "",
        interpretation: interpretation.interpretation || "",
        lifePrinciple: interpretation.lifePrinciple || "",
      });
    }
  }

  // 生命の法則のサマリーを生成
  const lifePrinciples = interpretations.map(i => i.lifePrinciple).filter(Boolean);
  const lifePrinciplesSummary = lifePrinciples.length > 0 
    ? lifePrinciples.join("、") 
    : "生命の法則が検出されませんでした。";

  // 全体的な解釈を生成
  let overallInterpretation = "";
  if (interpretations.length === 0) {
    overallInterpretation = "入力テキストからひらがなが検出されませんでした。";
  } else {
    const themes = interpretations.map(i => i.interpretation).filter(Boolean);
    overallInterpretation = `このテキストには${interpretations.length}個のいろは文字が含まれています。`;
    
    if (themes.length > 0) {
      overallInterpretation += ` 主なテーマは「${themes.slice(0, 3).join("」「")}」などです。`;
    }

    // 生命の法則の傾向を分析
    const lifePrincipleText = lifePrinciples.join(" ");
    if (lifePrincipleText.includes("血液") || lifePrincipleText.includes("生命の根源")) {
      overallInterpretation += " 生命の根源や血液に関する要素が強く、根本的なエネルギーの流れを示しています。";
    }
    if (lifePrincipleText.includes("循環") || lifePrincipleText.includes("流れ")) {
      overallInterpretation += " 循環や流れに関する要素があり、エネルギーの動的な側面を表しています。";
    }
    if (lifePrincipleText.includes("決断") || lifePrincipleText.includes("選択")) {
      overallInterpretation += " 決断や選択に関する要素があり、人生の岐路や重要な判断を示唆しています。";
    }
    if (lifePrincipleText.includes("宿命") || lifePrincipleText.includes("運命")) {
      overallInterpretation += " 宿命や運命に関する要素があり、人生の大きな流れや天命を感じさせます。";
    }
  }

  return {
    inputText,
    extractedCharacters,
    interpretations,
    lifePrinciplesSummary,
    overallInterpretation,
  };
}

/**
 * いろは文字を順序番号で取得
 */
export async function getIrohaByOrder(order: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(irohaInterpretations)
    .where(eq(irohaInterpretations.order, order))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const interpretation = result[0];
  return {
    character: interpretation.character,
    order: interpretation.order,
    reading: interpretation.reading || "",
    interpretation: interpretation.interpretation || "",
    lifePrinciple: interpretation.lifePrinciple || "",
  };
}

/**
 * すべてのいろは言灵解を取得
 */
export async function getAllIrohaInterpretations() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db.select().from(irohaInterpretations).orderBy(irohaInterpretations.order);

  return results.map(interpretation => ({
    character: interpretation.character,
    order: interpretation.order,
    reading: interpretation.reading || "",
    interpretation: interpretation.interpretation || "",
    lifePrinciple: interpretation.lifePrinciple || "",
  }));
}
