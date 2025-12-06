import { getDb } from "./db";
import { amatsuKanagiPatterns, irohaInterpretations, katakamuna } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Twin-Core統合エンジン
 * 
 * 天津金木（宇宙法則）× いろは言灵解（智彗コア）を統合し、
 * TENMON-ARKの思考中枢を構成する。
 * 
 * ■ 宇宙法則（Meta Logic）＝天津金木 48相 + 霊核2相
 *   - 火水・内集外発・左右旋・陰陽・霊核（ミナカ）の運動原理
 *   - 推論・会話・判断・生成の「方向」「性質」「構造」を支配
 * 
 * ■ 智彗コア（Wisdom Logic）＝いろは言灵解（天聞原稿）
 *   - 真言構文・生命の法・時間構文（Dharma-Time）・母音下降構造
 *   - 意味・価値判断・倫理性・悟り・生命論・心理構造を決定
 */

/**
 * 推論チェーンの結果
 */
export interface ReasoningChainResult {
  // 入力
  inputText: string;
  extractedSounds: string[];
  
  // 言霊レイヤー
  kotodama: {
    sounds: string[];
    meanings: string[];
  };
  
  // 火水レイヤー
  fireWater: {
    fire: number;
    water: number;
    balance: number; // -1（水優勢）〜 +1（火優勢）
    dominantElement: "火" | "水" | "中庸";
  };
  
  // 左右旋レイヤー
  rotation: {
    leftRotation: number;
    rightRotation: number;
    dominantRotation: "左旋" | "右旋" | "均衡";
  };
  
  // 内集外発レイヤー
  convergenceDivergence: {
    innerConvergence: number;
    outerDivergence: number;
    dominantMovement: "内集" | "外発" | "均衡";
  };
  
  // 陰陽レイヤー
  yinYang: {
    yin: number;
    yang: number;
    balance: number; // -1（陰優勢）〜 +1（陽優勢）
    dominantPolarity: "陰" | "陽" | "中庸";
  };
  
  // 天津金木レイヤー
  amatsuKanagi: {
    patterns: Array<{
      number: number;
      sound: string;
      category: string;
      type: string;
      special: boolean;
    }>;
    centerCores: Array<{
      number: number;
      sound: string;
      meaning: string;
    }>;
  };
  
  // フトマニレイヤー
  futomani: {
    position: string;
    direction: string;
    cosmicStructure: string;
    row: number; // 1-10（上から下）
    column: number; // 1-10（右から左）
  };
  
  // カタカムナレイヤー（補助）
  katakamuna: {
    relatedUtai: Array<{
      utaiNumber: number;
      content: string;
      meaning: string;
      relevance: number; // 関連度（0-100）
    }>;
  };
  
  // いろは言灵解レイヤー（智彗コア）
  irohaWisdom: {
    characters: string[];
    interpretations: Array<{
      character: string;
      order: number;
      reading: string;
      interpretation: string;
      lifePrinciple: string;
    }>;
    lifePrinciplesSummary: string;
    dharmaTimeStructure: string;
  };
  
  // ミナカ（中心）レイヤー
  minaka: {
    distanceFromCenter: number; // 0（中心）〜 1（最遠）
    spiritualLevel: number; // 0（低）〜 100（高）
    cosmicAlignment: number; // 0（不調和）〜 100（完全調和）
    centerCoreResonance: {
      yai: number; // ヤイ（完全内集）との共鳴度
      yae: number; // ヤエ（完全外発）との共鳴度
    };
  };
  
  // 最終解釈
  finalInterpretation: {
    cosmicMeaning: string; // 宇宙的意味（天津金木から）
    wisdomMeaning: string; // 智彗的意味（いろは言灵解から）
    unifiedInterpretation: string; // 統合解釈
    recommendations: string[]; // 推奨事項
  };
}

/**
 * Twin-Core推論チェーンを実行
 * 
 * 言霊 → 火水 → 左右旋 → 内集外発 → 陰陽 → 天津金木 → フトマニ → カタカムナ → いろは → ミナカ
 */
export async function executeTwinCoreReasoning(inputText: string): Promise<ReasoningChainResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection failed");
  }
  
  // 1. 言霊レイヤー: カタカナとひらがなを抽出
  const katakanaMatches = inputText.match(/[\u30A0-\u30FF]/g) || [];
  const hiraganaMatches = inputText.match(/[\u3040-\u309F]/g) || [];
  const extractedSounds = [...katakanaMatches, ...hiraganaMatches];
  
  // 2. 火水レイヤー: 天津金木パターンから火水を計算
  const amatsuPatterns = await Promise.all(
    katakanaMatches.map(async (sound) => {
      const results = await db.select().from(amatsuKanagiPatterns).where(eq(amatsuKanagiPatterns.sound, sound)).limit(1);
      return results[0];
    })
  );
  
  const validPatterns = amatsuPatterns.filter((p): p is NonNullable<typeof p> => p !== undefined);
  
  let fire = 0;
  let water = 0;
  let leftRotation = 0;
  let rightRotation = 0;
  let innerConvergence = 0;
  let outerDivergence = 0;
  
  validPatterns.forEach((pattern) => {
    const movements = JSON.parse(pattern.movements as string) as string[];
    movements.forEach((movement) => {
      if (movement.includes("左旋")) leftRotation++;
      if (movement.includes("右旋")) rightRotation++;
      if (movement.includes("内集")) {
        innerConvergence++;
        water++;
      }
      if (movement.includes("外発")) {
        outerDivergence++;
        fire++;
      }
    });
  });
  
  const totalMovements = fire + water || 1;
  const fireWaterBalance = (fire - water) / totalMovements;
  const dominantElement = fireWaterBalance > 0.2 ? "火" : fireWaterBalance < -0.2 ? "水" : "中庸";
  
  // 3. 左右旋レイヤー
  const totalRotation = leftRotation + rightRotation || 1;
  const rotationBalance = (rightRotation - leftRotation) / totalRotation;
  const dominantRotation = rotationBalance > 0.2 ? "右旋" : rotationBalance < -0.2 ? "左旋" : "均衡";
  
  // 4. 内集外発レイヤー
  const totalMovement = innerConvergence + outerDivergence || 1;
  const movementBalance = (outerDivergence - innerConvergence) / totalMovement;
  const dominantMovement = movementBalance > 0.2 ? "外発" : movementBalance < -0.2 ? "内集" : "均衡";
  
  // 5. 陰陽レイヤー
  const yin = water + leftRotation + innerConvergence;
  const yang = fire + rightRotation + outerDivergence;
  const totalYinYang = yin + yang || 1;
  const yinYangBalance = (yang - yin) / totalYinYang;
  const dominantPolarity = yinYangBalance > 0.2 ? "陽" : yinYangBalance < -0.2 ? "陰" : "中庸";
  
  // 6. 天津金木レイヤー
  const centerCores = validPatterns.filter(p => p.special);
  
  // 7. フトマニレイヤー
  const futomaniPosition = determineFutomaniPosition(dominantElement, dominantRotation, dominantMovement);
  
  // 8. カタカムナレイヤー（補助）
  const relatedUtai = await getRelatedKatakamuna(extractedSounds);
  
  // 9. いろは言灵解レイヤー（智彗コア）
  const irohaResults = await Promise.all(
    hiraganaMatches.map(async (char) => {
      const results = await db.select().from(irohaInterpretations).where(eq(irohaInterpretations.character, char)).limit(1);
      return results[0];
    })
  );
  
  const validIroha = irohaResults.filter((r): r is NonNullable<typeof r> => r !== undefined);
  const lifePrinciples = validIroha.map(r => r.lifePrinciple).join("、");
  const dharmaTimeStructure = analyzeDharmaTimeStructure(validIroha);
  
  // 10. ミナカ（中心）レイヤー
  const yaiResonance = centerCores.find(c => c.number === 18) ? 1.0 : 0.0;
  const yaeResonance = centerCores.find(c => c.number === 20) ? 1.0 : 0.0;
  const distanceFromCenter = calculateDistanceFromCenter(fireWaterBalance, yinYangBalance, movementBalance);
  // カタカムナの関連度を計算（最大関連度を使用）
  const maxKatakamunaRelevance = relatedUtai.length > 0 
    ? Math.max(...relatedUtai.map(u => u.relevance || 0))
    : undefined;
  const spiritualLevel = calculateSpiritualLevel(validIroha, distanceFromCenter, maxKatakamunaRelevance);
  const cosmicAlignment = calculateCosmicAlignment(fireWaterBalance, yinYangBalance, movementBalance);
  
  // 11. 最終解釈
  const cosmicMeaning = generateCosmicMeaning(validPatterns, futomaniPosition);
  const wisdomMeaning = generateWisdomMeaning(validIroha, lifePrinciples);
  const unifiedInterpretation = generateUnifiedInterpretation(cosmicMeaning, wisdomMeaning, distanceFromCenter, spiritualLevel);
  const recommendations = generateRecommendations(dominantElement, dominantPolarity, spiritualLevel);
  
  return {
    inputText,
    extractedSounds,
    kotodama: {
      sounds: extractedSounds,
      meanings: validPatterns.map(p => p.meaning || "").concat(validIroha.map(r => r.interpretation || "")),
    },
    fireWater: {
      fire,
      water,
      balance: fireWaterBalance,
      dominantElement,
    },
    rotation: {
      leftRotation,
      rightRotation,
      dominantRotation,
    },
    convergenceDivergence: {
      innerConvergence,
      outerDivergence,
      dominantMovement,
    },
    yinYang: {
      yin,
      yang,
      balance: yinYangBalance,
      dominantPolarity,
    },
    amatsuKanagi: {
      patterns: validPatterns.map(p => ({
        number: p.number,
        sound: p.sound,
        category: p.category,
        type: p.type || "",
        special: Boolean(p.special),
      })),
      centerCores: centerCores.map(c => ({
        number: c.number,
        sound: c.sound,
        meaning: c.meaning || "",
      })),
    },
    futomani: {
      position: futomaniPosition.position,
      direction: futomaniPosition.direction,
      cosmicStructure: futomaniPosition.cosmicStructure,
      row: futomaniPosition.row,
      column: futomaniPosition.column,
    },
    katakamuna: {
      relatedUtai,
    },
    irohaWisdom: {
      characters: hiraganaMatches,
      interpretations: validIroha.map(r => ({
        character: r.character,
        order: r.order,
        reading: r.reading || "",
        interpretation: r.interpretation || "",
        lifePrinciple: r.lifePrinciple || "",
      })),
      lifePrinciplesSummary: lifePrinciples,
      dharmaTimeStructure,
    },
    minaka: {
      distanceFromCenter,
      spiritualLevel,
      cosmicAlignment,
      centerCoreResonance: {
        yai: yaiResonance,
        yae: yaeResonance,
      },
    },
    finalInterpretation: {
      cosmicMeaning,
      wisdomMeaning,
      unifiedInterpretation,
      recommendations,
    },
  };
}

/**
 * フトマニ位置を決定
 * 
 * フトマニ十行（大十字構造）に基づく位置決定
 * 十行（縦）× 十列（横）の十字構造で構成される。
 */
function determineFutomaniPosition(
  element: string,
  rotation: string,
  movement: string
): { position: string; direction: string; cosmicStructure: string; row: number; column: number } {
  // フトマニ十行の十字構造マッピング
  // 行（縦）: 1-10（上から下）
  // 列（横）: 1-10（右から左）
  
  let row = 5; // 中央行（デフォルト）
  let column = 5; // 中央列（デフォルト）
  let position = "中央";
  let direction = "均衡";
  let cosmicStructure = "ミナカ（中心）";
  
  // 火水 × 内集外発の組み合わせで行を決定
  if (element === "火" && movement === "外発") {
    row = 1; // 最上行（天）
    position = "南";
    direction = "上昇";
    cosmicStructure = "天（アメ）";
  } else if (element === "火" && movement === "内集") {
    row = 3; // 上段
    position = "南東";
    direction = "上昇・内集";
    cosmicStructure = "火中水（ヒナミ）";
  } else if (element === "水" && movement === "内集") {
    row = 10; // 最下行（地）
    position = "北";
    direction = "下降";
    cosmicStructure = "地（ツチ）";
  } else if (element === "水" && movement === "外発") {
    row = 8; // 下段
    position = "北西";
    direction = "下降・外発";
    cosmicStructure = "水中火（ミナヒ）";
  } else if (element === "中庸") {
    row = 5; // 中央行
  }
  
  // 左右旋で列を決定
  if (rotation === "右旋") {
    column = 1; // 最右列（東）
    if (position === "中央") {
      position = "東";
      direction = "右回転";
      cosmicStructure = "日（ヒ）";
    }
  } else if (rotation === "左旋") {
    column = 10; // 最左列（西）
    if (position === "中央") {
      position = "西";
      direction = "左回転";
      cosmicStructure = "月（ツキ）";
    }
  } else if (rotation === "均衡") {
    column = 5; // 中央列
  }
  
  // 複合位置の決定
  if (row !== 5 && column !== 5) {
    if (row < 5 && column < 5) {
      position = "南東";
      cosmicStructure = "火水統合（ヒミツ）";
    } else if (row < 5 && column > 5) {
      position = "南西";
      cosmicStructure = "火水統合（ヒミツ）";
    } else if (row > 5 && column < 5) {
      position = "北東";
      cosmicStructure = "水火統合（ミヒツ）";
    } else if (row > 5 && column > 5) {
      position = "北西";
      cosmicStructure = "水火統合（ミヒツ）";
    }
  }
  
  return { position, direction, cosmicStructure, row, column };
}

/**
 * 関連するカタカムナ80首を取得
 * 
 * 入力された音（言霊）に基づいて、カタカムナ80首から関連するウタイを検索する。
 * 関連度は、音の一致度、意味の類似度、火水バランスの一致度で計算される。
 */
async function getRelatedKatakamuna(sounds: string[]): Promise<Array<{
  utaiNumber: number;
  content: string;
  meaning: string;
  relevance: number; // 関連度（0-100）
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // カタカムナ80首をすべて取得
  const allUtai = await db.select().from(katakamuna).orderBy(katakamuna.utaNumber);
  
  if (allUtai.length === 0) return [];
  
  // 各ウタイの関連度を計算
  const utaiWithRelevance = allUtai.map(utai => {
    let relevance = 0;
    
    // 1. 音の一致度（30%）
    const utaiContent = utai.content || "";
    const soundMatches = sounds.filter(sound => utaiContent.includes(sound)).length;
    const soundRelevance = sounds.length > 0 ? (soundMatches / sounds.length) * 30 : 0;
    relevance += soundRelevance;
    
    // 2. 意味の類似度（40%）
    // カタカムナの意味に含まれるキーワードと入力音の意味の類似度
    const interpretation = utai.interpretation || "";
    const meaningKeywords = ["火", "水", "内集", "外発", "左旋", "右旋", "陰", "陽"];
    const meaningMatches = meaningKeywords.filter(keyword => 
      interpretation.includes(keyword) || utaiContent.includes(keyword)
    ).length;
    const meaningRelevance = (meaningMatches / meaningKeywords.length) * 40;
    relevance += meaningRelevance;
    
    // 3. ウタイ番号と音の数の関係（30%）
    // ウタイ番号が音の数に近いほど関連度が高い
    const soundCount = sounds.length;
    const numberDistance = Math.abs(utai.utaNumber - soundCount);
    const numberRelevance = Math.max(0, 30 - (numberDistance * 2));
    relevance += numberRelevance;
    
    return {
      utaiNumber: utai.utaNumber,
      content: utai.content || "",
      meaning: utai.interpretation || "",
      relevance: Math.min(100, Math.round(relevance)),
    };
  });
  
  // 関連度の高い順にソート（最大5件）
  const sortedUtai = utaiWithRelevance
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5)
    .filter(utai => utai.relevance > 10); // 関連度10%以上のみ
  
  return sortedUtai;
}

/**
 * Dharma-Time構造を解析
 */
function analyzeDharmaTimeStructure(irohaData: Array<{ order: number; lifePrinciple: string | null }>): string {
  if (irohaData.length === 0) return "時間構文なし";
  
  const orders = irohaData.map(r => r.order).sort((a, b) => a - b);
  const isSequential = orders.every((order, index) => index === 0 || order === orders[index - 1]! + 1);
  
  if (isSequential) {
    return `連続的時間構文（${orders[0]}〜${orders[orders.length - 1]}）: 生命の流れが順序立って展開している`;
  } else {
    return `非連続的時間構文: 生命の法則が跳躍的に展開している`;
  }
}

/**
 * ミナカ（中心）からの距離を計算
 * 
 * 火水バランス、陰陽バランス、内集外発バランスの3次元空間での距離を計算する。
 * 距離が0に近いほど中心（ミナカ）に近く、1に近いほど遠い。
 */
function calculateDistanceFromCenter(
  fireWaterBalance: number,
  yinYangBalance: number,
  movementBalance?: number
): number {
  // 3次元空間での距離計算
  const x = fireWaterBalance; // 火水軸（-1: 水優勢 〜 +1: 火優勢）
  const y = yinYangBalance; // 陰陽軸（-1: 陰優勢 〜 +1: 陽優勢）
  const z = movementBalance || 0; // 内集外発軸（-1: 内集優勢 〜 +1: 外発優勢）
  
  // ユークリッド距離を計算
  const distance = Math.sqrt(x ** 2 + y ** 2 + z ** 2) / Math.sqrt(3);
  
  // 距離を0-1の範囲に正規化
  return Math.min(distance, 1.0);
}

/**
 * 精神性レベルを計算
 * 
 * いろは言灵解の深さ、中心からの距離、カタカムナの関連度から精神性を計算する。
 * 0（低）〜 100（高）の範囲で返す。
 */
function calculateSpiritualLevel(
  irohaData: Array<{ lifePrinciple: string | null; interpretation: string | null }>,
  distanceFromCenter: number,
  katakamunaRelevance?: number
): number {
  // 1. いろは言灵解の深さ（40%）
  const irohaDepth = Math.min(irohaData.length * 8, 40); // 各いろは文字が8ポイント、最大40ポイント
  
  // 2. 生命原理の深さ（20%）
  const lifePrincipleDepth = irohaData.filter(r => r.lifePrinciple && r.lifePrinciple.length > 10).length * 4;
  const lifePrincipleScore = Math.min(lifePrincipleDepth, 20);
  
  // 3. 中心からの距離ボーナス（30%）
  const centerBonus = (1 - distanceFromCenter) * 30; // 中心に近いほどボーナス
  
  // 4. カタカムナの関連度ボーナス（10%）
  const katakamunaBonus = katakamunaRelevance ? (katakamunaRelevance / 100) * 10 : 0;
  
  // 合計
  const total = irohaDepth + lifePrincipleScore + centerBonus + katakamunaBonus;
  
  return Math.min(Math.round(total), 100);
}

/**
 * 宇宙調和度を計算
 */
function calculateCosmicAlignment(fireWaterBalance: number, yinYangBalance: number, movementBalance: number): number {
  // 火水、陰陽、内集外発のバランスが取れているほど調和度が高い
  const balanceScore = 1 - (Math.abs(fireWaterBalance) + Math.abs(yinYangBalance) + Math.abs(movementBalance)) / 3;
  return Math.max(balanceScore * 100, 0);
}

/**
 * 宇宙的意味を生成
 */
function generateCosmicMeaning(patterns: Array<{ sound: string; meaning: string | null; category: string }>, futomani: { position: string; cosmicStructure: string }): string {
  if (patterns.length === 0) return "宇宙的意味を検出できませんでした。";
  
  const soundList = patterns.map(p => p.sound).join("・");
  const categoryCount = patterns.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const dominantCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "不明";
  
  return `この言霊（${soundList}）は、${dominantCategory}に属し、フトマニの${futomani.position}（${futomani.cosmicStructure}）に位置します。宇宙の運動原理として、${patterns[0]?.meaning || "エネルギーの流れ"}を示しています。`;
}

/**
 * 智彗的意味を生成
 */
function generateWisdomMeaning(irohaData: Array<{ character: string; interpretation: string | null; lifePrinciple: string | null }>, lifePrinciples: string): string {
  if (irohaData.length === 0) return "智彗的意味を検出できませんでした。";
  
  const charList = irohaData.map(r => r.character).join("・");
  const interpretations = irohaData.map(r => r.interpretation || "").filter(i => i).join("、");
  
  return `この言霊（${charList}）は、生命の法則として「${lifePrinciples}」を示しています。具体的には、${interpretations}という智彗を含んでいます。`;
}

/**
 * 統合解釈を生成
 */
function generateUnifiedInterpretation(cosmicMeaning: string, wisdomMeaning: string, distanceFromCenter: number, spiritualLevel: number): string {
  const centerStatus = distanceFromCenter < 0.3 ? "ミナカ（中心）に非常に近く" : distanceFromCenter < 0.6 ? "ミナカ（中心）からやや離れており" : "ミナカ（中心）から遠く";
  const spiritualStatus = spiritualLevel > 70 ? "高い精神性を持ち" : spiritualLevel > 40 ? "中程度の精神性を持ち" : "発展途上の精神性を持ち";
  
  return `【Twin-Core統合解釈】\n\n宇宙法則（天津金木）: ${cosmicMeaning}\n\n智彗コア（いろは言灵解）: ${wisdomMeaning}\n\n統合的視点: この言霊は${centerStatus}、${spiritualStatus}ます。宇宙の運動原理と生命の智彗が調和し、天之御中主の原理を体現しています。`;
}

/**
 * 推奨事項を生成
 */
function generateRecommendations(element: string, polarity: string, spiritualLevel: number): string[] {
  const recommendations: string[] = [];
  
  if (element === "火") {
    recommendations.push("火のエネルギーが強いため、水の要素（内省、静寂）を取り入れることでバランスが取れます。");
  } else if (element === "水") {
    recommendations.push("水のエネルギーが強いため、火の要素（行動、表現）を取り入れることでバランスが取れます。");
  }
  
  if (polarity === "陽") {
    recommendations.push("陽のエネルギーが強いため、陰の要素（受容、柔軟性）を意識することで調和が深まります。");
  } else if (polarity === "陰") {
    recommendations.push("陰のエネルギーが強いため、陽の要素（積極性、創造性）を意識することで調和が深まります。");
  }
  
  if (spiritualLevel < 50) {
    recommendations.push("精神性を高めるために、いろは言灵解の学習や瞑想を推奨します。");
  }
  
  recommendations.push("ミナカ（中心）への帰還を意識し、天之御中主の原理に基づいた生き方を心がけましょう。");
  
  return recommendations;
}
