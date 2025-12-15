/**
 * Fractal Expansion Engine
 * フラクタルシードから多様な形式への展開（虚空蔵求聞持法の再現）
 */

import type { FractalSeed } from "./compression";
import { expandFractalSeed } from "./compression";
import { callLLM } from "../../server/_core/llm";

export type ExpansionForm = 
  | "summary"      // 要約（condensation）
  | "fullText"     // 完全テキスト（expansion）
  | "newForm"      // 新形式（recombination）
  | "teaching"     // 説明モデル（explanatory model）
  | "deepForm"     // 深層形式（universal principle extraction）
  | "outline"      // アウトライン
  | "keywords";    // キーワード

/**
 * フラクタルシードを指定された形式に展開（虚空蔵求聞持法の再現）
 */
export async function expandSeed(
  seed: FractalSeed,
  form: ExpansionForm
): Promise<string> {
  // 虚空蔵求聞持法に基づく展開
  switch (form) {
    case "summary":
      return await expandCondensation(seed);
    case "fullText":
      return await expandExpansion(seed);
    case "newForm":
      return await expandRecombination(seed);
    case "teaching":
      return await expandExplanatoryModel(seed);
    case "deepForm":
      return await expandUniversalPrinciple(seed);
    case "outline":
      const fullText = await expandExpansion(seed);
      return convertToOutline(fullText);
    case "keywords":
      const summary = await expandCondensation(seed);
      return extractKeywords(summary);
    default:
      return await expandFractalSeed(seed, "summary");
  }
}

/**
 * 要約（condensation）: 構文核を凝縮して要約を生成
 */
async function expandCondensation(seed: FractalSeed): Promise<string> {
  const prompt = `
以下の構文核から、その本質を凝縮した要約を生成してください。

構文核ベクトル: ${JSON.stringify(seed.compressedRepresentation.centroidVector.slice(0, 10))} (最初の10次元)
言霊ベクトル: 母音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.vowelVector)}, 子音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.consonantVector)}
火水バランス: ${seed.compressedRepresentation.fireWaterBalance.toFixed(3)} (${seed.compressedRepresentation.fireWaterBalance > 0 ? '火優勢' : '水優勢'})
天津金木フェーズ: ${seed.compressedRepresentation.kanagiPhaseMode}
主タグ: ${seed.compressedRepresentation.mainTags.join(", ")}
法則ID: ${seed.compressedRepresentation.lawIds.join(", ")}
生成力: ${seed.compressedRepresentation.seedWeight.toFixed(3)}

要約は、この構文核の本質を最も簡潔に表現してください。
`;

  try {
    const response = await callLLM({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fractal condensation engine. Condense the given semantic seed into a concise summary.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return typeof response === 'string' 
      ? response 
      : (response as any)?.choices?.[0]?.message?.content || (response as any)?.text || "要約の生成に失敗しました";
  } catch (error) {
    console.error("[Fractal Condensation] Error:", error);
    return "要約生成中にエラーが発生しました";
  }
}

/**
 * 完全テキスト（expansion）: 構文核を展開して完全なテキストを生成
 */
async function expandExpansion(seed: FractalSeed): Promise<string> {
  const prompt = `
以下の構文核から、その本質を完全に展開したテキストを生成してください。

構文核ベクトル: ${JSON.stringify(seed.compressedRepresentation.centroidVector.slice(0, 10))} (最初の10次元)
言霊ベクトル: 母音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.vowelVector)}, 子音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.consonantVector)}
火水バランス: ${seed.compressedRepresentation.fireWaterBalance.toFixed(3)}
天津金木フェーズ: ${seed.compressedRepresentation.kanagiPhaseMode}
主タグ: ${seed.compressedRepresentation.mainTags.join(", ")}
法則ID: ${seed.compressedRepresentation.lawIds.join(", ")}
生成力: ${seed.compressedRepresentation.seedWeight.toFixed(3)}

完全なテキストは、この構文核の本質を詳細に展開してください。
`;

  try {
    const response = await callLLM({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fractal expansion engine. Expand the given semantic seed into a full text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return typeof response === 'string' 
      ? response 
      : (response as any)?.choices?.[0]?.message?.content || (response as any)?.text || "展開に失敗しました";
  } catch (error) {
    console.error("[Fractal Expansion] Error:", error);
    return "展開中にエラーが発生しました";
  }
}

/**
 * 新形式（recombination）: 構文核を再結合して新しい形式を生成
 */
async function expandRecombination(seed: FractalSeed): Promise<string> {
  const prompt = `
以下の構文核から、その本質を再結合して新しい形式を生成してください。

構文核ベクトル: ${JSON.stringify(seed.compressedRepresentation.centroidVector.slice(0, 10))} (最初の10次元)
言霊ベクトル: 母音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.vowelVector)}, 子音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.consonantVector)}
火水バランス: ${seed.compressedRepresentation.fireWaterBalance.toFixed(3)}
天津金木フェーズ: ${seed.compressedRepresentation.kanagiPhaseMode}
主タグ: ${seed.compressedRepresentation.mainTags.join(", ")}
法則ID: ${seed.compressedRepresentation.lawIds.join(", ")}
生成力: ${seed.compressedRepresentation.seedWeight.toFixed(3)}

新しい形式は、この構文核の要素を再結合して創造的な表現を生成してください。
`;

  try {
    const response = await callLLM({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fractal recombination engine. Recombine the given semantic seed into a new creative form.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return typeof response === 'string' 
      ? response 
      : (response as any)?.choices?.[0]?.message?.content || (response as any)?.text || "再結合に失敗しました";
  } catch (error) {
    console.error("[Fractal Recombination] Error:", error);
    return "再結合中にエラーが発生しました";
  }
}

/**
 * 説明モデル（explanatory model）: 構文核を説明モデルとして展開
 */
async function expandExplanatoryModel(seed: FractalSeed): Promise<string> {
  const prompt = `
以下の構文核から、その本質を説明モデルとして展開してください。

構文核ベクトル: ${JSON.stringify(seed.compressedRepresentation.centroidVector.slice(0, 10))} (最初の10次元)
言霊ベクトル: 母音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.vowelVector)}, 子音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.consonantVector)}
火水バランス: ${seed.compressedRepresentation.fireWaterBalance.toFixed(3)}
天津金木フェーズ: ${seed.compressedRepresentation.kanagiPhaseMode}
主タグ: ${seed.compressedRepresentation.mainTags.join(", ")}
法則ID: ${seed.compressedRepresentation.lawIds.join(", ")}
生成力: ${seed.compressedRepresentation.seedWeight.toFixed(3)}

説明モデルは、この構文核の本質を教育的に説明してください。
`;

  try {
    const response = await callLLM({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fractal explanatory model engine. Explain the given semantic seed in an educational manner.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return typeof response === 'string' 
      ? response 
      : (response as any)?.choices?.[0]?.message?.content || (response as any)?.text || "説明モデルの生成に失敗しました";
  } catch (error) {
    console.error("[Fractal Explanatory Model] Error:", error);
    return "説明モデル生成中にエラーが発生しました";
  }
}

/**
 * 深層形式（universal principle extraction）: 構文核から普遍的原理を抽出
 */
async function expandUniversalPrinciple(seed: FractalSeed): Promise<string> {
  const prompt = `
以下の構文核から、その本質を普遍的原理として抽出してください。

構文核ベクトル: ${JSON.stringify(seed.compressedRepresentation.centroidVector.slice(0, 10))} (最初の10次元)
言霊ベクトル: 母音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.vowelVector)}, 子音=${JSON.stringify(seed.compressedRepresentation.kotodamaVector.consonantVector)}
火水バランス: ${seed.compressedRepresentation.fireWaterBalance.toFixed(3)}
天津金木フェーズ: ${seed.compressedRepresentation.kanagiPhaseMode}
主タグ: ${seed.compressedRepresentation.mainTags.join(", ")}
法則ID: ${seed.compressedRepresentation.lawIds.join(", ")}
生成力: ${seed.compressedRepresentation.seedWeight.toFixed(3)}

普遍的原理は、この構文核の本質を最も抽象的なレベルで表現してください。
`;

  try {
    const response = await callLLM({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fractal universal principle extraction engine. Extract the universal principle from the given semantic seed.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return typeof response === 'string' 
      ? response 
      : (response as any)?.choices?.[0]?.message?.content || (response as any)?.text || "普遍的原理の抽出に失敗しました";
  } catch (error) {
    console.error("[Fractal Universal Principle] Error:", error);
    return "普遍的原理抽出中にエラーが発生しました";
  }
}

/**
 * テキストをアウトライン形式に変換
 */
function convertToOutline(text: string): string {
  const lines = text.split('\n');
  const outline: string[] = [];
  let level = 0;
  
  for (const line of lines) {
    if (line.trim().match(/^#+\s/)) {
      level = (line.match(/^#+/)?.[0]?.length || 1) - 1;
      outline.push('  '.repeat(level) + line.replace(/^#+\s/, ''));
    } else if (line.trim().length > 0) {
      outline.push('  '.repeat(level + 1) + '- ' + line.trim());
    }
  }
  
  return outline.join('\n');
}

/**
 * キーワードを抽出
 */
function extractKeywords(text: string): string {
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['の', 'に', 'は', 'を', 'が', 'で', 'と', 'も', 'など', 'the', 'a', 'an', 'is', 'are']);
  const keywords = words
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 20);
  return keywords.join(', ');
}

