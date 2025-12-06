/**
 * TENMON-ARK Kotodama Engine
 * 
 * 言灵構文解析エンジン
 * - 五十音解析（ア/ウ/ン階層）
 * - 火水解析（外発/内集）
 * - 天津金木50構造解析
 * - 中心（ミナカ）定位
 * - 呼吸（息）検出
 * - ストーリー構造解析
 * - エネルギー解析
 */

import { getDb } from "../db";
import { kotodamaAnalysis } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * 五十音の分類
 */
const GOJIUON_CLASSIFICATION = {
  // ア段（始源・発動・火）
  A: ["あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ"],
  // ウ段（循環・渦・統合）
  U: ["う", "く", "す", "つ", "ぬ", "ふ", "む", "ゆ", "る"],
  // ン（終結・凝縮・水）
  N: ["ん"],
  // イ段（展開・外発）
  I: ["い", "き", "し", "ち", "に", "ひ", "み", "り"],
  // エ段（受容・内集）
  E: ["え", "け", "せ", "て", "ね", "へ", "め", "れ"],
  // オ段（中心・統治）
  O: ["お", "こ", "そ", "と", "の", "ほ", "も", "よ", "ろ", "を"],
};

/**
 * 火水の分類
 */
const FIRE_WATER_CLASSIFICATION = {
  // 火（外発・創造・顕現）
  FIRE: [...GOJIUON_CLASSIFICATION.A, ...GOJIUON_CLASSIFICATION.I],
  // 水（内集・受容・蓄積）
  WATER: [...GOJIUON_CLASSIFICATION.E, ...GOJIUON_CLASSIFICATION.N],
  // 中心（統合・均衡）
  CENTER: [...GOJIUON_CLASSIFICATION.O, ...GOJIUON_CLASSIFICATION.U],
};

/**
 * 呼吸点を検出
 */
export function detectBreathPoints(segments: Array<{ start: number; end: number; text: string }>) {
  const breathPoints: Array<{ time: number; type: "pause" | "sentence_end" | "paragraph_end" }> = [];

  for (let i = 0; i < segments.length - 1; i++) {
    const current = segments[i];
    const next = segments[i + 1];

    if (!current || !next) continue;

    const gap = next.start - current.end;

    // 0.5秒以上の間隔 = 呼吸点
    if (gap > 0.5) {
      breathPoints.push({
        time: current.end,
        type: gap > 2 ? "paragraph_end" : gap > 1 ? "sentence_end" : "pause",
      });
    }

    // 句読点チェック
    if (current.text.endsWith("。") || current.text.endsWith("！") || current.text.endsWith("？")) {
      breathPoints.push({
        time: current.end,
        type: "sentence_end",
      });
    }
  }

  return breathPoints;
}

/**
 * 五十音解析
 */
export function analyzeGojiuon(text: string) {
  const chars = text.split("");
  const counts = {
    A: 0,
    U: 0,
    N: 0,
    I: 0,
    E: 0,
    O: 0,
  };

  chars.forEach(char => {
    if (GOJIUON_CLASSIFICATION.A.includes(char)) counts.A++;
    else if (GOJIUON_CLASSIFICATION.U.includes(char)) counts.U++;
    else if (GOJIUON_CLASSIFICATION.N.includes(char)) counts.N++;
    else if (GOJIUON_CLASSIFICATION.I.includes(char)) counts.I++;
    else if (GOJIUON_CLASSIFICATION.E.includes(char)) counts.E++;
    else if (GOJIUON_CLASSIFICATION.O.includes(char)) counts.O++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const percentages = {
    A: total > 0 ? (counts.A / total) * 100 : 0,
    U: total > 0 ? (counts.U / total) * 100 : 0,
    N: total > 0 ? (counts.N / total) * 100 : 0,
    I: total > 0 ? (counts.I / total) * 100 : 0,
    E: total > 0 ? (counts.E / total) * 100 : 0,
    O: total > 0 ? (counts.O / total) * 100 : 0,
  };

  return { counts, percentages };
}

/**
 * 火水解析
 */
export function analyzeFireWater(text: string) {
  const chars = text.split("");
  const counts = {
    FIRE: 0,
    WATER: 0,
    CENTER: 0,
  };

  chars.forEach(char => {
    if (FIRE_WATER_CLASSIFICATION.FIRE.includes(char)) counts.FIRE++;
    else if (FIRE_WATER_CLASSIFICATION.WATER.includes(char)) counts.WATER++;
    else if (FIRE_WATER_CLASSIFICATION.CENTER.includes(char)) counts.CENTER++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const balance = total > 0 ? (counts.FIRE - counts.WATER) / total : 0;

  return {
    counts,
    balance, // -1 (完全水) 〜 0 (均衡) 〜 +1 (完全火)
    firePercentage: total > 0 ? (counts.FIRE / total) * 100 : 0,
    waterPercentage: total > 0 ? (counts.WATER / total) * 100 : 0,
    centerPercentage: total > 0 ? (counts.CENTER / total) * 100 : 0,
  };
}

/**
 * 中心（ミナカ）を定位
 * 
 * LLMを使用してテキストの核心テーマを抽出
 */
export async function findCenter(text: string) {
  const prompt = `以下のテキストから、最も核心的なテーマ（ミナカ）を1文で抽出してください。

テキスト：
${text}

核心テーマ（ミナカ）：`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "あなたは言灵解析の専門家です。テキストの核心を見抜く能力を持っています。" },
      { role: "user", content: prompt },
    ],
  });

  if ('error' in response) {
    throw new Error(`Failed to find center: ${response.error}`);
  }

  return response.choices[0]?.message?.content || "";
}

/**
 * ストーリー構造解析（起承転結）
 */
export async function analyzeStoryStructure(segments: Array<{ start: number; end: number; text: string }>) {
  const totalDuration = segments[segments.length - 1]?.end || 0;
  const quarterDuration = totalDuration / 4;

  const structure = {
    ki: [] as typeof segments, // 起（0-25%）
    sho: [] as typeof segments, // 承（25-50%）
    ten: [] as typeof segments, // 転（50-75%）
    ketsu: [] as typeof segments, // 結（75-100%）
  };

  segments.forEach(seg => {
    if (seg.start < quarterDuration) {
      structure.ki.push(seg);
    } else if (seg.start < quarterDuration * 2) {
      structure.sho.push(seg);
    } else if (seg.start < quarterDuration * 3) {
      structure.ten.push(seg);
    } else {
      structure.ketsu.push(seg);
    }
  });

  return structure;
}

/**
 * 完全な言灵構文解析を実行
 */
export async function analyzeKotodama(params: {
  projectId: number;
  transcriptionId: number;
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. 呼吸点検出
  const breathPoints = detectBreathPoints(params.segments);

  // 2. 五十音解析
  const gojiuon = analyzeGojiuon(params.text);

  // 3. 火水解析
  const fireWater = analyzeFireWater(params.text);

  // 4. 中心（ミナカ）定位
  const centerResult = await findCenter(params.text);
  const center = typeof centerResult === 'string' ? centerResult : String(centerResult);

  // 5. ストーリー構造解析
  const storyStructure = await analyzeStoryStructure(params.segments);

  // 6. DBに保存
  const [analysis] = await db.insert(kotodamaAnalysis).values({
    projectId: params.projectId,
    transcriptionId: params.transcriptionId,
    center,
    fire: JSON.stringify({
      elements: fireWater.counts.FIRE,
      percentage: fireWater.firePercentage,
    }),
    water: JSON.stringify({
      elements: fireWater.counts.WATER,
      percentage: fireWater.waterPercentage,
    }),
    spiral: JSON.stringify({
      // 螺旋構造（天津金木50構造）は後で実装
      rotation: "right",
      phase: "yang",
    }),
    rhythm: JSON.stringify({
      breathPoints: breathPoints.length,
      averageGap: breathPoints.length > 0
        ? breathPoints.reduce((sum, p, i, arr) => {
            if (i === 0) return 0;
            return sum + (p.time - (arr[i - 1]?.time || 0));
          }, 0) / breathPoints.length
        : 0,
    }),
    kotodama: JSON.stringify(gojiuon),
    sequence: JSON.stringify({
      segments: params.segments.length,
      totalDuration: params.segments[params.segments.length - 1]?.end || 0,
    }),
    breathPoints: JSON.stringify(breathPoints),
    storyStructure: JSON.stringify(storyStructure),
    energyBalance: JSON.stringify({
      balance: fireWater.balance,
      fire: fireWater.firePercentage,
      water: fireWater.waterPercentage,
      center: fireWater.centerPercentage,
    }),
  }).$returningId();

  return {
    analysisId: analysis.id,
    center,
    gojiuon,
    fireWater,
    breathPoints,
    storyStructure,
  };
}
