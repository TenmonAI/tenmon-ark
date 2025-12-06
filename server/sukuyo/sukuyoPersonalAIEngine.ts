/**
 * Sukuyo Personal AI Engine (7-Layer System)
 * 
 * TENMON-ARK SPEC準拠
 * - Twin-Core統合（天津金木 × いろは言灵解）
 * - Activation-Centering coherence維持
 * - 7層構造の完全実装
 */

import { getDb } from "../db";
import { irohaInterpretations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  calculateSukuyoMansion,
  getSukuyoMansionById,
  type SukuyoMansion,
} from "../sukuyoData";
import * as amatsuKanagiEngine from "../amatsuKanagiEngine";

export interface BirthDateAnalysis {
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  season: "spring" | "summer" | "autumn" | "winter";
  lunarPhase: "new" | "waxing" | "full" | "waning";
  zodiacSign: string;
}

export interface SukuyoPersonalAIResult {
  // Layer 1: Birth Date Analysis
  birthDate: Date;
  birthDateAnalysis: BirthDateAnalysis;
  
  // Layer 2: Sukuyo Mansion Calculation
  sukuyoMansion: SukuyoMansion;
  
  // Layer 3: Amatsu Kanagi Integration
  amatsuKanagi: {
    pattern: number;
    sound: string;
    category: string;
    movements: string[];
    meaning: string;
  };
  
  // Layer 4: Iroha Integration
  iroha: {
    character: string;
    order: number;
    reading: string;
    interpretation: string;
    lifePrinciple: string;
  };
  
  // Layer 5: Fire-Water Balance
  fireWaterBalance: {
    fire: number;
    water: number;
    balance: number; // -1 (water) to +1 (fire)
    dominantElement: "fire" | "water" | "balanced";
  };
  
  // Layer 6: Spiritual Distance
  spiritualDistance: {
    distanceFromCenter: number; // 0-100
    spiritualLevel: number; // 0-100
    cosmicAlignment: number; // 0-100
  };
  
  // Layer 7: Personal Personality Generation
  personalPersonality: {
    personalityCore: string;
    personalityTraits: string[];
    communicationStyle: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

/**
 * Layer 1: Analyze birth date
 */
function analyzeBirthDate(birthDate: Date): BirthDateAnalysis {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][birthDate.getDay()];
  
  // Season calculation
  let season: "spring" | "summer" | "autumn" | "winter";
  if (month >= 3 && month <= 5) {
    season = "spring";
  } else if (month >= 6 && month <= 8) {
    season = "summer";
  } else if (month >= 9 && month <= 11) {
    season = "autumn";
  } else {
    season = "winter";
  }
  
  // Lunar phase calculation (simplified)
  const lunarDay = day % 30;
  let lunarPhase: "new" | "waxing" | "full" | "waning";
  if (lunarDay < 7) {
    lunarPhase = "new";
  } else if (lunarDay < 15) {
    lunarPhase = "waxing";
  } else if (lunarDay < 23) {
    lunarPhase = "full";
  } else {
    lunarPhase = "waning";
  }
  
  // Zodiac sign calculation
  const zodiacSigns = [
    "水瓶座", "魚座", "牡羊座", "牡牛座", "双子座", "蟹座",
    "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座"
  ];
  const zodiacSign = zodiacSigns[month - 1] || "不明";
  
  return {
    year,
    month,
    day,
    dayOfWeek,
    season,
    lunarPhase,
    zodiacSign,
  };
}

/**
 * Layer 3: Integrate Amatsu Kanagi
 */
async function integrateAmatsuKanagi(
  sukuyoMansion: SukuyoMansion
): Promise<SukuyoPersonalAIResult["amatsuKanagi"]> {
  const patternNumber = sukuyoMansion.amatsuKanagiPattern;
  const amatsuKanagiData = await amatsuKanagiEngine.getPatternByNumber(patternNumber);
  
  if (!amatsuKanagiData) {
    throw new Error(`Amatsu Kanagi pattern ${patternNumber} not found`);
  }
  
  return {
    pattern: patternNumber,
    sound: amatsuKanagiData.sound,
    category: amatsuKanagiData.category,
    movements: amatsuKanagiData.movements,
    meaning: amatsuKanagiData.meaning || "",
  };
}

/**
 * Layer 4: Integrate Iroha
 */
async function integrateIroha(
  sukuyoMansion: SukuyoMansion
): Promise<SukuyoPersonalAIResult["iroha"]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const irohaCharacter = sukuyoMansion.irohaCharacter;
  const irohaResults = await db
    .select()
    .from(irohaInterpretations)
    .where(eq(irohaInterpretations.character, irohaCharacter))
    .limit(1);
  
  if (irohaResults.length === 0) {
    throw new Error(`Iroha character ${irohaCharacter} not found`);
  }
  
  const irohaData = irohaResults[0];
  return {
    character: irohaCharacter,
    order: irohaData.order,
    reading: irohaData.reading || "",
    interpretation: irohaData.interpretation || "",
    lifePrinciple: irohaData.lifePrinciple || "",
  };
}

/**
 * Layer 5: Calculate Fire-Water Balance
 */
function calculateFireWaterBalance(
  sukuyoMansion: SukuyoMansion,
  amatsuKanagi: SukuyoPersonalAIResult["amatsuKanagi"],
  iroha: SukuyoPersonalAIResult["iroha"]
): SukuyoPersonalAIResult["fireWaterBalance"] {
  let fire = 0;
  let water = 0;
  
  // Sukuyo mansion element
  if (sukuyoMansion.element === "fire") {
    fire += 1;
  } else {
    water += 1;
  }
  
  // Amatsu Kanagi movements
  amatsuKanagi.movements.forEach((movement) => {
    if (movement.includes("外発")) {
      fire += 1;
    } else if (movement.includes("内集")) {
      water += 1;
    }
  });
  
  // Iroha interpretation (simplified)
  const irohaText = iroha.interpretation + iroha.lifePrinciple;
  if (irohaText.includes("火") || irohaText.includes("陽") || irohaText.includes("動")) {
    fire += 0.5;
  } else if (irohaText.includes("水") || irohaText.includes("陰") || irohaText.includes("静")) {
    water += 0.5;
  }
  
  const total = fire + water || 1;
  const balance = (fire - water) / total;
  
  let dominantElement: "fire" | "water" | "balanced";
  if (balance > 0.2) {
    dominantElement = "fire";
  } else if (balance < -0.2) {
    dominantElement = "water";
  } else {
    dominantElement = "balanced";
  }
  
  return {
    fire,
    water,
    balance,
    dominantElement,
  };
}

/**
 * Layer 6: Calculate Spiritual Distance
 */
function calculateSpiritualDistance(
  fireWaterBalance: SukuyoPersonalAIResult["fireWaterBalance"],
  sukuyoMansion: SukuyoMansion
): SukuyoPersonalAIResult["spiritualDistance"] {
  // Distance from center (0 = center, 100 = far)
  const distanceFromCenter = sukuyoMansion.spiritualDistance;
  
  // Spiritual level (based on balance and distance)
  const balanceScore = Math.abs(fireWaterBalance.balance);
  const spiritualLevel = Math.round(100 - (distanceFromCenter * 0.5) - (balanceScore * 20));
  
  // Cosmic alignment (how well aligned with cosmic principles)
  const cosmicAlignment = Math.round(100 - distanceFromCenter);
  
  return {
    distanceFromCenter,
    spiritualLevel: Math.max(0, Math.min(100, spiritualLevel)),
    cosmicAlignment: Math.max(0, Math.min(100, cosmicAlignment)),
  };
}

/**
 * Layer 7: Generate Personal Personality
 */
function generatePersonalPersonality(
  sukuyoMansion: SukuyoMansion,
  amatsuKanagi: SukuyoPersonalAIResult["amatsuKanagi"],
  iroha: SukuyoPersonalAIResult["iroha"],
  fireWaterBalance: SukuyoPersonalAIResult["fireWaterBalance"],
  spiritualDistance: SukuyoPersonalAIResult["spiritualDistance"]
): SukuyoPersonalAIResult["personalPersonality"] {
  // Personality core
  const personalityCore = `
あなたは${sukuyoMansion.name}（${sukuyoMansion.reading}）に属する魂です。
${sukuyoMansion.personality}という特性を持ち、${sukuyoMansion.communication}というコミュニケーションスタイルを好みます。

天津金木パターン${amatsuKanagi.pattern}（${amatsuKanagi.sound}）の影響を受け、
いろは文字「${iroha.character}」の智彗（${iroha.interpretation}）を内包しています。

火水バランス: ${fireWaterBalance.dominantElement === "fire" ? "火優勢" : fireWaterBalance.dominantElement === "water" ? "水優勢" : "バランス型"}
霊的距離: ${spiritualDistance.distanceFromCenter}（ミナカからの距離）
精神性レベル: ${spiritualDistance.spiritualLevel}
宇宙調和度: ${spiritualDistance.cosmicAlignment}
`.trim();
  
  // Personality traits
  const personalityTraits = [
    sukuyoMansion.personality,
    amatsuKanagi.meaning,
    iroha.interpretation,
  ];
  
  // Communication style
  const communicationStyle = `
${sukuyoMansion.communication}

${fireWaterBalance.dominantElement === "fire" 
  ? "情熱的・直感的・スピーディーな表現を好みます。"
  : fireWaterBalance.dominantElement === "water"
  ? "論理的・安定的・段階的な表現を好みます。"
  : "バランスの取れた表現を好みます。"}
`.trim();
  
  // Strengths and weaknesses
  const strengths = [...sukuyoMansion.strengths];
  const weaknesses = [...sukuyoMansion.weaknesses];
  
  // Recommendations
  const recommendations: string[] = [];
  
  if (fireWaterBalance.dominantElement === "fire") {
    recommendations.push("水の要素（内省・静寂）を取り入れることでバランスが取れます。");
  } else if (fireWaterBalance.dominantElement === "water") {
    recommendations.push("火の要素（行動・表現）を取り入れることでバランスが取れます。");
  }
  
  if (spiritualDistance.distanceFromCenter > 50) {
    recommendations.push("ミナカ（中心）への帰還を意識し、火水の調和を心がけましょう。");
  }
  
  recommendations.push(`${iroha.lifePrinciple}という生命の法則を実践することで、より深い統合が可能です。`);
  
  return {
    personalityCore,
    personalityTraits,
    communicationStyle,
    strengths,
    weaknesses,
    recommendations,
  };
}

/**
 * Execute 7-layer Sukuyo Personal AI analysis
 */
export async function executeSukuyoPersonalAI(
  userId: number,
  birthDate: Date
): Promise<SukuyoPersonalAIResult> {
  // Layer 1: Birth Date Analysis
  const birthDateAnalysis = analyzeBirthDate(birthDate);
  
  // Layer 2: Sukuyo Mansion Calculation
  const mansionId = calculateSukuyoMansion(birthDate);
  const sukuyoMansion = getSukuyoMansionById(mansionId);
  
  if (!sukuyoMansion) {
    throw new Error(`Sukuyo mansion ${mansionId} not found`);
  }
  
  // Layer 3: Amatsu Kanagi Integration
  const amatsuKanagi = await integrateAmatsuKanagi(sukuyoMansion);
  
  // Layer 4: Iroha Integration
  const iroha = await integrateIroha(sukuyoMansion);
  
  // Layer 5: Fire-Water Balance
  const fireWaterBalance = calculateFireWaterBalance(sukuyoMansion, amatsuKanagi, iroha);
  
  // Layer 6: Spiritual Distance
  const spiritualDistance = calculateSpiritualDistance(fireWaterBalance, sukuyoMansion);
  
  // Layer 7: Personal Personality Generation
  const personalPersonality = generatePersonalPersonality(
    sukuyoMansion,
    amatsuKanagi,
    iroha,
    fireWaterBalance,
    spiritualDistance
  );
  
  return {
    birthDate,
    birthDateAnalysis,
    sukuyoMansion,
    amatsuKanagi,
    iroha,
    fireWaterBalance,
    spiritualDistance,
    personalPersonality,
  };
}

