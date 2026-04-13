/**
 * 天津金木 × 宿曜経 統合診断アルゴリズム
 * 
 * 三層位相（宿命・運命・天命）の統合判定
 * 躰/用の総合判定
 * 統合相性診断
 * 
 * 原典: 統合アルゴリズム設計書、暦言灵算出アルゴリズム
 */

import {
  type Nakshatra, type TaiYou, type RelationshipType,
  NAKSHATRAS, NAKSHATRA_DATA,
  runFullDiagnosis, getRelationship, getMutualCompatibility,
  type FullDiagnosisResult
} from "./sukuyouEngine.js";
import { daysFromBaseDate, solarToLunar } from "./lunarCalendar.js";

// ============================================
// 1. 言霊50音の順序と水火属性（暦言灵算出アルゴリズム準拠）
// ============================================

interface KotodamaEntry {
  number: number;
  sound: string;
  attribute: string;
  fireScore: number;  // 0-100
  waterScore: number; // 0-100
}

/** 言霊の並び順（ホ〜マ）と水火属性 */
const KOTODAMA_SEQUENCE: KotodamaEntry[] = [
  { number: 1, sound: "ホ", attribute: "正火の灵", fireScore: 90, waterScore: 10 },
  { number: 2, sound: "オ", attribute: "空中の水灵", fireScore: 20, waterScore: 80 },
  { number: 3, sound: "ヲ", attribute: "水火の灵", fireScore: 50, waterScore: 50 },
  { number: 4, sound: "ヘ", attribute: "正火の灵", fireScore: 90, waterScore: 10 },
  { number: 5, sound: "エ", attribute: "空中の水灵", fireScore: 20, waterScore: 80 },
  { number: 6, sound: "ヱ", attribute: "水火灵", fireScore: 50, waterScore: 50 },
  { number: 7, sound: "フ", attribute: "正火の灵", fireScore: 90, waterScore: 10 },
  { number: 8, sound: "ウ", attribute: "空中の水灵", fireScore: 20, waterScore: 80 },
  { number: 9, sound: "ゥ", attribute: "水火の灵", fireScore: 50, waterScore: 50 },
  { number: 10, sound: "ヒ", attribute: "正火の灵", fireScore: 90, waterScore: 10 },
  { number: 11, sound: "ミ", attribute: "火中の水灵", fireScore: 40, waterScore: 60 },
  { number: 12, sound: "イ", attribute: "空中の水灵", fireScore: 20, waterScore: 80 },
  { number: 13, sound: "井", attribute: "水火灵", fireScore: 50, waterScore: 50 },
  { number: 14, sound: "ハ", attribute: "正火の灵", fireScore: 90, waterScore: 10 },
  { number: 15, sound: "ア", attribute: "空水の水灵", fireScore: 20, waterScore: 80 },
  { number: 16, sound: "ワ", attribute: "水火の灵", fireScore: 50, waterScore: 50 },
  { number: 17, sound: "ヤ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 18, sound: "ィ", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 19, sound: "ユ", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 20, sound: "ェ", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 21, sound: "ヨ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 22, sound: "ノ", attribute: "水の灵", fireScore: 10, waterScore: 90 },
  { number: 23, sound: "ネ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 24, sound: "ヌ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 25, sound: "ニ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 26, sound: "ナ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 27, sound: "ラ", attribute: "濁水の灵", fireScore: 15, waterScore: 85 },
  { number: 28, sound: "リ", attribute: "濁水の灵", fireScore: 15, waterScore: 85 },
  { number: 29, sound: "ル", attribute: "濁水の灵", fireScore: 15, waterScore: 85 },
  { number: 30, sound: "レ", attribute: "濁水の灵", fireScore: 15, waterScore: 85 },
  { number: 31, sound: "ロ", attribute: "濁水の灵", fireScore: 15, waterScore: 85 },
  { number: 32, sound: "コ", attribute: "影の火の灵", fireScore: 75, waterScore: 25 },
  { number: 33, sound: "ソ", attribute: "水火の灵", fireScore: 50, waterScore: 50 },
  { number: 34, sound: "ケ", attribute: "影の火灵", fireScore: 75, waterScore: 25 },
  { number: 35, sound: "セ", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 36, sound: "ク", attribute: "影の火灵", fireScore: 75, waterScore: 25 },
  { number: 37, sound: "ス", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 38, sound: "キ", attribute: "影の火灵", fireScore: 75, waterScore: 25 },
  { number: 39, sound: "カ", attribute: "輝火の灵", fireScore: 95, waterScore: 5 },
  { number: 40, sound: "シ", attribute: "昇水の灵", fireScore: 10, waterScore: 90 },
  { number: 41, sound: "サ", attribute: "昇水の灵", fireScore: 10, waterScore: 90 },
  { number: 42, sound: "タ", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 43, sound: "チ", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 44, sound: "ツ", attribute: "火中の水灵", fireScore: 40, waterScore: 60 },
  { number: 45, sound: "テ", attribute: "火水の灵", fireScore: 55, waterScore: 45 },
  { number: 46, sound: "ト", attribute: "水中の火灵", fireScore: 60, waterScore: 40 },
  { number: 47, sound: "モ", attribute: "火中の水灵", fireScore: 40, waterScore: 60 },
  { number: 48, sound: "メ", attribute: "火中の水灵", fireScore: 40, waterScore: 60 },
  { number: 49, sound: "ム", attribute: "火中の水灵", fireScore: 40, waterScore: 60 },
  { number: 50, sound: "マ", attribute: "火中の水灵", fireScore: 40, waterScore: 60 },
];

// ============================================
// 2. フラクタルスケール言霊位相算出
// ============================================

/** フラクタルスケール定数 */
const SCALE = {
  CIVILIZATION_DAYS: 4_670_000, // 12800年 = 1音（文明スケール）
  LIFE_DAYS: 46_700,            // 128年 = 1音（人生スケール）
  YEAR_DAYS: 4_670,             // 12.8年 = 1音（年スケール）
  DAY_CYCLE: 93.4,              // 93.4日 = 1音（日スケール）
};

/**
 * 経過日数からフラクタルスケールの言霊位相を算出
 * 
 * 暦言灵算出アルゴリズムに基づく:
 * 1. 基準日（2030年旧暦七夕）からの経過日数を算出
 * 2. 各スケールの周期で除算
 * 3. 50音の位相を特定
 */
function getKotodamaPhase(daysFromBase: number, scale: number): KotodamaEntry {
  // 基準日 = マ（50番目）= 文明サイクルの終着点
  // 過去に遡る場合は負の値
  const totalCycle = scale * 50;
  // 正規化: 0-49の範囲に
  let phase = Math.floor(((daysFromBase % totalCycle) + totalCycle) / scale) % 50;
  return KOTODAMA_SEQUENCE[phase];
}

/**
 * 三層位相の算出
 */
export function calculateThreeLayerPhase(targetDate: Date): {
  civilization: { kotodama: KotodamaEntry; description: string };
  year: { kotodama: KotodamaEntry; description: string };
  day: { kotodama: KotodamaEntry; description: string };
} {
  const days = daysFromBaseDate(targetDate);

  const civKotodama = getKotodamaPhase(days, SCALE.CIVILIZATION_DAYS);
  const yearKotodama = getKotodamaPhase(days, SCALE.YEAR_DAYS);
  const dayKotodama = getKotodamaPhase(days, SCALE.DAY_CYCLE);

  return {
    civilization: {
      kotodama: civKotodama,
      description: `文明スケール（12800年周期）: 現在は「${civKotodama.sound}」（${civKotodama.attribute}）の位相にある。`
    },
    year: {
      kotodama: yearKotodama,
      description: `年スケール（12.8年周期）: 現在は「${yearKotodama.sound}」（${yearKotodama.attribute}）の位相にある。`
    },
    day: {
      kotodama: dayKotodama,
      description: `日スケール（93.4日周期）: 現在は「${dayKotodama.sound}」（${dayKotodama.attribute}）の位相にある。`
    }
  };
}

// ============================================
// 3. 名前の言霊解析
// ============================================

/** カタカナ→言霊マッピング */
const KATAKANA_TO_KOTODAMA: Record<string, KotodamaEntry | undefined> = {};
for (const entry of KOTODAMA_SEQUENCE) {
  KATAKANA_TO_KOTODAMA[entry.sound] = entry;
}

// 追加マッピング（通常のカタカナ表記対応）
const KANA_ALIASES: Record<string, string> = {
  "ホ": "ホ", "オ": "オ", "ヲ": "ヲ", "ヘ": "ヘ", "エ": "エ",
  "フ": "フ", "ウ": "ウ", "ヒ": "ヒ", "ミ": "ミ", "イ": "イ",
  "ハ": "ハ", "ア": "ア", "ワ": "ワ", "ヤ": "ヤ", "ユ": "ユ",
  "ヨ": "ヨ", "ノ": "ノ", "ネ": "ネ", "ヌ": "ヌ", "ニ": "ニ", "ナ": "ナ",
  "ラ": "ラ", "リ": "リ", "ル": "ル", "レ": "レ", "ロ": "ロ",
  "コ": "コ", "ソ": "ソ", "ケ": "ケ", "セ": "セ", "ク": "ク",
  "ス": "ス", "キ": "キ", "カ": "カ", "シ": "シ", "サ": "サ",
  "タ": "タ", "チ": "チ", "ツ": "ツ", "テ": "テ", "ト": "ト",
  "モ": "モ", "メ": "メ", "ム": "ム", "マ": "マ",
  // 濁音・半濁音は清音に還元
  "ガ": "カ", "ギ": "キ", "グ": "ク", "ゲ": "ケ", "ゴ": "コ",
  "ザ": "サ", "ジ": "シ", "ズ": "ス", "ゼ": "セ", "ゾ": "ソ",
  "ダ": "タ", "ヂ": "チ", "ヅ": "ツ", "デ": "テ", "ド": "ト",
  "バ": "ハ", "ビ": "ヒ", "ブ": "フ", "ベ": "ヘ", "ボ": "ホ",
  "パ": "ハ", "ピ": "ヒ", "プ": "フ", "ペ": "ヘ", "ポ": "ホ",
  "ン": "ナ", // ンはナ行に還元
};

/**
 * 名前の言霊解析
 * カタカナ名を五十音に展開し、水火バランスを算出
 */
export function analyzeNameKotodama(katakanaName: string): {
  sounds: { char: string; kotodama: KotodamaEntry | null }[];
  fireScore: number;
  waterScore: number;
  balance: number; // -1(完全水) 〜 +1(完全火)
  dominantAttribute: string;
} {
  const sounds: { char: string; kotodama: KotodamaEntry | null }[] = [];
  let totalFire = 0;
  let totalWater = 0;
  let count = 0;

  for (const char of katakanaName) {
    const alias = KANA_ALIASES[char];
    const kotodama = alias ? KATAKANA_TO_KOTODAMA[alias] : undefined;
    if (kotodama) {
      sounds.push({ char, kotodama });
      totalFire += kotodama.fireScore;
      totalWater += kotodama.waterScore;
      count++;
    } else {
      sounds.push({ char, kotodama: null });
    }
  }

  const avgFire = count > 0 ? totalFire / count : 50;
  const avgWater = count > 0 ? totalWater / count : 50;
  const balance = count > 0 ? (avgFire - avgWater) / 100 : 0;

  let dominantAttribute: string;
  if (balance > 0.3) dominantAttribute = "火（外発）優勢";
  else if (balance < -0.3) dominantAttribute = "水（内集）優勢";
  else dominantAttribute = "水火均衡";

  return { sounds, fireScore: avgFire, waterScore: avgWater, balance, dominantAttribute };
}

// ============================================
// 4. 躰/用 総合判定
// ============================================

export interface TaiYouResult {
  taiYou: TaiYou;
  totalFireScore: number;
  totalWaterScore: number;
  layers: {
    shukuFire: number;
    shukuWater: number;
    nameFire: number;
    nameWater: number;
    civilizationFire: number;
    civilizationWater: number;
    yearFire: number;
    yearWater: number;
    dayFire: number;
    dayWater: number;
  };
  interpretation: string;
}

/**
 * 躰/用の総合判定
 * 
 * 宿命（文明）、運命（年・日）、天命（個人：宿+名前）の三層を統合
 * 
 * 重み付け:
 * - 天命層（個人）: 50%（宿30% + 名前20%）
 * - 運命層（年）: 30%
 * - 宿命層（文明）: 10%
 * - 日運: 10%
 */
export function determineTaiYou(
  honmeiShuku: Nakshatra,
  nameBalance: number,
  targetDate: Date
): TaiYouResult {
  const shukuData = NAKSHATRA_DATA[honmeiShuku];
  const threeLayer = calculateThreeLayerPhase(targetDate);

  // 各層の水火スコア
  const shukuFire = shukuData.fireScore;
  const shukuWater = shukuData.waterScore;
  const nameFire = (nameBalance + 1) * 50;
  const nameWater = 100 - nameFire;
  const civFire = threeLayer.civilization.kotodama.fireScore;
  const civWater = threeLayer.civilization.kotodama.waterScore;
  const yearFire = threeLayer.year.kotodama.fireScore;
  const yearWater = threeLayer.year.kotodama.waterScore;
  const dayFire = threeLayer.day.kotodama.fireScore;
  const dayWater = threeLayer.day.kotodama.waterScore;

  // 重み付け統合
  const totalFire = (shukuFire * 0.30) + (nameFire * 0.20) + (yearFire * 0.30) + (civFire * 0.10) + (dayFire * 0.10);
  const totalWater = (shukuWater * 0.30) + (nameWater * 0.20) + (yearWater * 0.30) + (civWater * 0.10) + (dayWater * 0.10);

  let taiYou: TaiYou = "均衡";
  let interpretation: string;

  if (totalWater > totalFire + 8) {
    taiYou = "躰";
    interpretation = `現在の総合エネルギー状態は「躰（水・内集）」が優位です（火${Math.round(totalFire)}:水${Math.round(totalWater)}）。`
      + `今は根幹を守り、内面を充実させ、エネルギーを蓄える時期です。`
      + `${honmeiShuku}宿の${shukuData.element}の性質と、`
      + `年の言霊「${threeLayer.year.kotodama.sound}」（${threeLayer.year.kotodama.attribute}）が水の方向に合流しています。`
      + `躰を固め、次の外発の時期に備えてください。`;
  } else if (totalFire > totalWater + 8) {
    taiYou = "用";
    interpretation = `現在の総合エネルギー状態は「用（火・外発）」が優位です（火${Math.round(totalFire)}:水${Math.round(totalWater)}）。`
      + `今は外に向けて表現し、行動を起こし、世界を広げていく時期です。`
      + `${honmeiShuku}宿の${shukuData.element}の性質と、`
      + `年の言霊「${threeLayer.year.kotodama.sound}」（${threeLayer.year.kotodama.attribute}）が火の方向に合流しています。`
      + `用を発揮し、積極的に動いてください。`;
  } else {
    interpretation = `現在の総合エネルギー状態は「水火均衡」です（火${Math.round(totalFire)}:水${Math.round(totalWater)}）。`
      + `内集と外発のバランスが取れた調和の状態にあります。`
      + `${honmeiShuku}宿の${shukuData.element}の性質が中心にあり、`
      + `年の言霊「${threeLayer.year.kotodama.sound}」（${threeLayer.year.kotodama.attribute}）と調和しています。`
      + `この均衡を活かし、状況に応じて柔軟に対応してください。`;
  }

  return {
    taiYou,
    totalFireScore: totalFire,
    totalWaterScore: totalWater,
    layers: {
      shukuFire, shukuWater, nameFire, nameWater,
      civilizationFire: civFire, civilizationWater: civWater,
      yearFire, yearWater, dayFire, dayWater
    },
    interpretation
  };
}

// ============================================
// 5. 統合相性診断
// ============================================

export interface IntegratedCompatibilityResult {
  // 宿曜経の三九法
  sankuResult: ReturnType<typeof getMutualCompatibility>;
  sankuScore: number; // 0-100

  // 天津金木の水火相性
  waterFireCompatibility: {
    complementarity: number; // 補完性 0-100
    harmony: number;         // 調和度 0-100
    description: string;
  };

  // 統合スコア
  totalScore: number;
  totalGrade: "最良" | "良好" | "普通" | "注意" | "困難";
  interpretation: string;
}

/**
 * 統合相性診断
 * 宿曜経の三九法 + 天津金木の水火相性を統合
 */
export function integratedCompatibility(
  personA: { honmeiShuku: Nakshatra; nameBalance: number },
  personB: { honmeiShuku: Nakshatra; nameBalance: number }
): IntegratedCompatibilityResult {
  // 1. 三九法による相性
  const sankuResult = getMutualCompatibility(personA.honmeiShuku, personB.honmeiShuku);

  // 三九法スコア算出
  const SANKU_SCORES: Record<string, number> = {
    "彼我共善": 90, "彼善我悪": 50, "彼悪我善": 50,
    "彼我共悪": 20, "彼我同宿": 70, "業の縁": 60, "胎の縁": 65, "特殊関係": 55
  };
  const sankuScore = SANKU_SCORES[sankuResult.mutual] || 50;

  // 2. 水火相性（天津金木）
  const aData = NAKSHATRA_DATA[personA.honmeiShuku];
  const bData = NAKSHATRA_DATA[personB.honmeiShuku];

  // 補完性: 一方が火優位、他方が水優位なら補完的
  const fireDiff = Math.abs((aData.fireScore + personA.nameBalance * 50) - (bData.fireScore + personB.nameBalance * 50));
  const complementarity = Math.min(100, fireDiff * 1.5);

  // 調和度: 似た属性なら調和的
  const harmony = 100 - fireDiff;

  let wfDescription: string;
  if (complementarity > 60) {
    wfDescription = `水火の補完性が高い関係です。${personA.honmeiShuku}宿（${aData.element}）と${personB.honmeiShuku}宿（${bData.element}）は互いに欠けている要素を補い合います。`;
  } else if (harmony > 60) {
    wfDescription = `水火の調和度が高い関係です。${personA.honmeiShuku}宿（${aData.element}）と${personB.honmeiShuku}宿（${bData.element}）は似た性質を持ち、共鳴し合います。`;
  } else {
    wfDescription = `水火のバランスが中庸な関係です。${personA.honmeiShuku}宿と${personB.honmeiShuku}宿は適度な距離感を持ちます。`;
  }

  // 3. 統合スコア（宿曜60% + 水火40%）
  const wfScore = (complementarity * 0.5 + harmony * 0.5);
  const totalScore = Math.round(sankuScore * 0.6 + wfScore * 0.4);

  let totalGrade: IntegratedCompatibilityResult["totalGrade"];
  if (totalScore >= 80) totalGrade = "最良";
  else if (totalScore >= 65) totalGrade = "良好";
  else if (totalScore >= 50) totalGrade = "普通";
  else if (totalScore >= 35) totalGrade = "注意";
  else totalGrade = "困難";

  const interpretation = `【統合相性診断】\n`
    + `三九法: ${sankuResult.mutual}（${sankuResult.relAtoB}↔${sankuResult.relBtoA}）\n`
    + `水火相性: 補完性${Math.round(complementarity)}%、調和度${Math.round(harmony)}%\n`
    + `総合評価: ${totalGrade}（${totalScore}点）\n\n`
    + `${sankuResult.description}\n${wfDescription}`;

  return {
    sankuResult, sankuScore,
    waterFireCompatibility: { complementarity, harmony, description: wfDescription },
    totalScore, totalGrade, interpretation
  };
}

// ============================================
// 6. 完全統合診断メインエントリ
// ============================================

export interface CompleteDiagnosisResult {
  // 宿曜経診断
  sukuyou: FullDiagnosisResult;

  // 天津金木三層位相
  threeLayer: ReturnType<typeof calculateThreeLayerPhase>;

  // 名前の言霊解析
  nameAnalysis: ReturnType<typeof analyzeNameKotodama> | null;

  // 躰/用判定
  taiYou: TaiYouResult;

  // 総合解釈テキスト
  fullInterpretation: string;
}

/**
 * 天聞アーク 完全統合診断
 * 
 * 宿曜経 × 天津金木 × 言霊の三体系を統合した精密診断
 */
export function runCompleteDiagnosis(
  birthDate: Date,
  katakanaName?: string
): CompleteDiagnosisResult {
  // 1. 宿曜経 完全診断
  const sukuyou = runFullDiagnosis(birthDate);

  // 2. 天津金木 三層位相
  const threeLayer = calculateThreeLayerPhase(new Date());

  // 3. 名前の言霊解析
  const nameAnalysis = katakanaName ? analyzeNameKotodama(katakanaName) : null;
  const nameBalance = nameAnalysis ? nameAnalysis.balance : 0;

  // 4. 躰/用 総合判定
  const taiYou = determineTaiYou(sukuyou.honmeiShuku, nameBalance, new Date());

  // 5. 総合解釈テキスト生成（超高品質版）
  const shukuData = sukuyou.shukuData;
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  const dateStr = `${birthYear}年${birthMonth}月${birthDay}日`;

  let fullInterpretation = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  fullInterpretation += `　　天聞アーク 宿曜経×天津金木 精密統合診断\n`;
  fullInterpretation += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  fullInterpretation += `　生年月日: ${dateStr}\n`;
  fullInterpretation += `　旧暦: ${sukuyou.lunarDate.year}年${sukuyou.lunarDate.month}月${sukuyou.lunarDate.day}日\n`;
  fullInterpretation += `　算出精度: ${sukuyou.lookupUsed ? "ルックアップテーブル（syukuyo.com完全一致）" : "旧暦計算（フォールバック）"}\n\n`;

  // === 命宿 ===
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　【命宿】${sukuyou.honmeiShuku}宿（${shukuData.reading}）\n`;
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　梵名（サンスクリット）: ${shukuData.sanskrit}\n`;
  fullInterpretation += `　守護神: ${shukuData.deity}\n`;
  fullInterpretation += `　星数: ${shukuData.starCount}星（${shukuData.starShape}）\n`;
  fullInterpretation += `　言霊属性: ${shukuData.element}（${shukuData.phase}）\n`;
  fullInterpretation += `　水火スコア: 火${shukuData.fireScore} : 水${shukuData.waterScore}\n`;
  fullInterpretation += `　性質分類: ${shukuData.nature}（${shukuData.category}）\n`;
  fullInterpretation += `　運勢タイプ: ${shukuData.fortuneType}\n`;
  fullInterpretation += `　真言: ${shukuData.mantra}\n\n`;

  // === 十二宮 ===
  fullInterpretation += `【十二宮配置】\n`;
  fullInterpretation += `　命宮: ${sukuyou.meikyu}\n`;
  fullInterpretation += `　所属宮: ${shukuData.palaceBelong}（${shukuData.palaceFoot}）\n`;
  fullInterpretation += `　エレメント: ${shukuData.elementType}\n`;
  fullInterpretation += `　クオリティ: ${shukuData.quality}\n`;
  fullInterpretation += `　支配惑星: ${shukuData.planetInfluence}\n\n`;

  // === 本命曜・九星 ===
  fullInterpretation += `【本命曜】${sukuyou.honmeiYo}曜（${sukuyou.planetData.celestial}）\n`;
  fullInterpretation += `　梵名: ${sukuyou.planetData.sanskrit}\n`;
  fullInterpretation += `　五行: ${sukuyou.planetData.element}\n`;
  fullInterpretation += `　言霊属性: ${sukuyou.planetData.kotodamaElement}\n\n`;

  fullInterpretation += `【九星】${sukuyou.kyusei}\n\n`;

  // === 基本的性格 ===
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　【基本的性格】\n`;
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `${shukuData.personality}\n\n`;

  // === 対人関係 ===
  fullInterpretation += `【対人関係の特徴】\n`;
  fullInterpretation += `${shukuData.interpersonalStyle}\n\n`;

  // === 成長課題 ===
  fullInterpretation += `【成長課題】\n`;
  fullInterpretation += `${shukuData.growthChallenge}\n\n`;

  // === 恋愛運 ===
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　【恋愛運】\n`;
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `${shukuData.loveAdvice}\n\n`;

  // === 仕事運 ===
  fullInterpretation += `【仕事運・適職】\n`;
  fullInterpretation += `${shukuData.workAdvice}\n\n`;

  // === 金運 ===
  fullInterpretation += `【金運】\n`;
  fullInterpretation += `${shukuData.moneyAdvice}\n\n`;

  // === 健康運 ===
  fullInterpretation += `【健康運】\n`;
  fullInterpretation += `${shukuData.healthAdvice}\n`;
  fullInterpretation += `　対応部位: ${shukuData.bodyPart}\n\n`;

  // === 開運法 ===
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　【開運法アドバイス】\n`;
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `${shukuData.openingAdvice}\n\n`;
  fullInterpretation += `　ラッキーカラー: ${shukuData.luckyColor}\n`;
  fullInterpretation += `　パワーストーン: ${shukuData.powerStone}\n`;
  fullInterpretation += `　吉行事: ${shukuData.auspicious.join("、")}\n`;
  fullInterpretation += `　凶行事: ${shukuData.inauspicious.join("、") || "特になし"}\n\n`;

  // === 同宿の有名人 ===
  if (shukuData.famousPeople && shukuData.famousPeople.length > 0) {
    fullInterpretation += `【同宿の有名人】\n`;
    fullInterpretation += `　${shukuData.famousPeople.join("、")}\n\n`;
  }

  // === 名前の言霊解析 ===
  if (nameAnalysis) {
    fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
    fullInterpretation += `　【名前の言霊解析】\n`;
    fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
    fullInterpretation += `　名前: ${katakanaName}\n`;
    fullInterpretation += `　水火バランス: 火${Math.round(nameAnalysis.fireScore)} : 水${Math.round(nameAnalysis.waterScore)}\n`;
    fullInterpretation += `　属性: ${nameAnalysis.dominantAttribute}\n`;
    for (const s of nameAnalysis.sounds) {
      if (s.kotodama) {
        fullInterpretation += `　　${s.char} → ${s.kotodama.attribute}（火${s.kotodama.fireScore}:水${s.kotodama.waterScore}）\n`;
      }
    }
    // 名前と宿の相性解析
    const nameFireDominant = nameAnalysis.fireScore > nameAnalysis.waterScore;
    const shukuFireDominant = shukuData.fireScore > shukuData.waterScore;
    if (nameFireDominant === shukuFireDominant) {
      fullInterpretation += `\n　→ 名前と命宿の水火属性が一致しており、天命に沿った名前である。名前の持つ言霊の力が宿の特性を強化し、本来の才能を最大限に引き出す。\n`;
    } else {
      fullInterpretation += `\n　→ 名前と命宿の水火属性が対照的であり、内面にバランスの取れた二面性を持つ。名前の言霊が宿の偏りを補完し、より調和のとれた人格形成を促す。\n`;
    }
    fullInterpretation += `\n`;
  }

  // === 天津金木 三層位相 ===
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　【天津金木 三層位相（現在の宇宙的位相）】\n`;
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　文明層: ${threeLayer.civilization.description}\n`;
  fullInterpretation += `　年層: ${threeLayer.year.description}\n`;
  fullInterpretation += `　日層: ${threeLayer.day.description}\n\n`;

  // === 躰/用 総合判定 ===
  fullInterpretation += `【躰/用 総合判定】\n`;
  fullInterpretation += `　判定: ${taiYou.taiYou}\n`;
  fullInterpretation += `　総合火水: 火${Math.round(taiYou.totalFireScore)} : 水${Math.round(taiYou.totalWaterScore)}\n`;
  fullInterpretation += `　${taiYou.interpretation}\n\n`;

  // === 今日の運勢 ===
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　【今日の運勢】\n`;
  fullInterpretation += `◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n`;
  fullInterpretation += `　直宿: ${sukuyou.dailyNakshatra}宿\n`;
  fullInterpretation += `　命宿との関係: ${sukuyou.dailyRelation}\n`;
  fullInterpretation += `　直曜: ${sukuyou.dailyPlanet}曜\n`;
  fullInterpretation += `　十二直: ${sukuyou.juniChoku}\n`;
  fullInterpretation += `　遊年八卦: ${sukuyou.yunenHakke.trigram}（${sukuyou.yunenHakke.fortune}）\n`;
  // 日運の吉凶解釈
  const dailyRelationMeaning: Record<string, string> = {
    "命": "命の日。自分自身と向き合う日。内省と自己理解を深めるのに最適。大きな決断は避け、静かに過ごすのが吉。",
    "栄": "栄の日。大吉日。あらゆる物事が順調に進み、新しいことを始めるのに最適。積極的に行動せよ。",
    "衰": "衰の日。運気が低下する日。無理をせず、体を休めることを優先。大きな決断や契約は避けるのが賢明。",
    "安": "安の日。穏やかで安定した日。日常の業務をこなすのに適している。人間関係も円満に進む。",
    "危": "危の日。注意が必要な日。思わぬトラブルに巻き込まれやすい。慎重な行動を心がけ、冒険は避けよ。",
    "成": "成の日。物事が成就する日。努力が実を結び、成果が得られる。契約や交渉に最適。",
    "壊": "壊の日。破壊と再生の日。古いものを手放し、新しい道を切り開く力がある。ただし、人間関係のトラブルに注意。",
    "友": "友の日。友情と交流の日。人との出会いに恵まれ、良い縁が生まれる。社交的に過ごすのが吉。",
    "親": "親の日。親密な関係が深まる日。家族や恋人との時間を大切に。趣味や創作活動にも好日。",
    "業": "業の日。前世からの因縁が動く日。予測不能な出来事が起こりやすいが、それは魂の成長に必要な試練。",
    "胎": "胎の日。新しい命が宿る日。新しいプロジェクトや計画の種を蒔くのに最適。未来への投資を。"
  };
  const dailyMeaning = dailyRelationMeaning[sukuyou.dailyRelation] || "";
  if (dailyMeaning) {
    fullInterpretation += `\n　${dailyMeaning}\n`;
  }

  return {
    sukuyou, threeLayer, nameAnalysis, taiYou, fullInterpretation
  };
}
