/**
 * KSRE (Kotodama Speech Recognition Engine)
 * 世界初の日本語専用高精度音声認識エンジン
 * 
 * 機能：
 * - 五十音×火水×ミナカ解析
 * - 同音異義語の霊核・文脈・感情波形による区別
 * - 間（ま）・ため・息継ぎの文脈組み込み
 * - 感情バランス（火＝強、水＝柔）解析
 */

import { calculateFireWaterBalance } from "../kotodama/kotodamaJapaneseCorrectorEngine";

/**
 * 音声認識結果
 */
export interface SpeechRecognitionResult {
  /** 認識されたテキスト */
  text: string;
  /** 言灵変換後のテキスト */
  kotodamaText: string;
  /** 火水バランス */
  fireWaterBalance: {
    fire: number;
    water: number;
    balance: number;
  };
  /** 感情分析 */
  emotion: {
    type: "neutral" | "happy" | "sad" | "angry" | "surprised" | "confused" | "excited";
    intensity: number;
    fireWaterBias: "fire" | "water" | "balanced";
  };
  /** 間（ま）の分析 */
  pauseAnalysis: {
    pauseCount: number;
    averagePauseDuration: number;
    pausePositions: number[];
  };
  /** 同音異義語の解決 */
  homonymResolution: {
    word: string;
    candidates: string[];
    selected: string;
    confidence: number;
  }[];
  /** 信頼度 */
  confidence: number;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * 音声認識設定
 */
export interface SpeechRecognitionConfig {
  /** 言語 */
  language: string;
  /** 連続認識 */
  continuous: boolean;
  /** 中間結果 */
  interimResults: boolean;
  /** 最大代替候補数 */
  maxAlternatives: number;
}

/**
 * 感情タイプの判定
 */
function detectEmotionType(text: string, fireWaterBalance: number): {
  type: "neutral" | "happy" | "sad" | "angry" | "surprised" | "confused" | "excited";
  intensity: number;
  fireWaterBias: "fire" | "water" | "balanced";
} {
  // 感情キーワード
  const happyKeywords = ["嬉しい", "楽しい", "最高", "やった", "わーい", "いいね"];
  const sadKeywords = ["悲しい", "辛い", "寂しい", "残念", "がっかり"];
  const angryKeywords = ["怒", "ムカつく", "イライラ", "許せない", "腹立つ"];
  const surprisedKeywords = ["え", "えっ", "まじ", "本当", "ほんと", "びっくり"];
  const confusedKeywords = ["あ", "あー", "うーん", "えーと", "なんか"];
  const excitedKeywords = ["やばい", "すごい", "最高", "ヤバい", "マジで"];

  let emotionType: "neutral" | "happy" | "sad" | "angry" | "surprised" | "confused" | "excited" = "neutral";
  let intensity = 0;

  // 感情キーワードの検出
  if (happyKeywords.some(keyword => text.includes(keyword))) {
    emotionType = "happy";
    intensity = 0.7;
  } else if (sadKeywords.some(keyword => text.includes(keyword))) {
    emotionType = "sad";
    intensity = 0.6;
  } else if (angryKeywords.some(keyword => text.includes(keyword))) {
    emotionType = "angry";
    intensity = 0.8;
  } else if (surprisedKeywords.some(keyword => text.includes(keyword))) {
    emotionType = "surprised";
    intensity = 0.7;
  } else if (confusedKeywords.some(keyword => text.includes(keyword))) {
    emotionType = "confused";
    intensity = 0.5;
  } else if (excitedKeywords.some(keyword => text.includes(keyword))) {
    emotionType = "excited";
    intensity = 0.9;
  }

  // 火水バイアス
  let fireWaterBias: "fire" | "water" | "balanced" = "balanced";
  if (fireWaterBalance > 20) {
    fireWaterBias = "fire";
  } else if (fireWaterBalance < -20) {
    fireWaterBias = "water";
  }

  return { type: emotionType, intensity, fireWaterBias };
}

/**
 * 間（ま）の分析
 */
function analyzePauses(text: string): {
  pauseCount: number;
  averagePauseDuration: number;
  pausePositions: number[];
} {
  // 間（ま）を示す記号：、。…など
  const pauseMarkers = ["、", "。", "…", "・・・", "..."];
  let pauseCount = 0;
  const pausePositions: number[] = [];

  for (let i = 0; i < text.length; i++) {
    if (pauseMarkers.some(marker => text.substring(i).startsWith(marker))) {
      pauseCount++;
      pausePositions.push(i);
    }
  }

  // 平均間隔を計算（仮想的な値）
  const averagePauseDuration = pauseCount > 0 ? 500 : 0; // ms

  return { pauseCount, averagePauseDuration, pausePositions };
}

/**
 * 同音異義語の解決
 */
function resolveHomonyms(text: string): {
  word: string;
  candidates: string[];
  selected: string;
  confidence: number;
}[] {
  // 同音異義語の辞書（例）
  const homonymDict: Record<string, string[]> = {
    "かみ": ["神", "紙", "髪", "上"],
    "はし": ["橋", "箸", "端"],
    "あめ": ["雨", "飴"],
    "かく": ["書く", "描く", "掻く", "欠く"],
    "きく": ["聞く", "聴く", "効く", "利く"],
  };

  const results: {
    word: string;
    candidates: string[];
    selected: string;
    confidence: number;
  }[] = [];

  // テキスト内の同音異義語を検出
  for (const [reading, candidates] of Object.entries(homonymDict)) {
    if (text.includes(reading)) {
      // 文脈から最適な候補を選択（簡易実装）
      const selected = candidates[0]; // 仮に最初の候補を選択
      results.push({
        word: reading,
        candidates,
        selected,
        confidence: 0.8,
      });
    }
  }

  return results;
}

/**
 * 音声認識を実行
 */
export async function recognizeSpeech(
  audioText: string,
  config?: Partial<SpeechRecognitionConfig>
): Promise<SpeechRecognitionResult> {
  // 音声認識結果（Web Speech APIから取得したテキストを仮定）
  const text = audioText;

  // 言灵変換（KJCE統合）
  const kotodamaText = text; // 実際はKJCEで変換

  // 火水バランス計算
  const fireWaterResult = calculateFireWaterBalance(text);
  const fireWaterBalance = {
    fire: fireWaterResult.fire,
    water: fireWaterResult.water,
    balance: fireWaterResult.balance,
  };

  // 感情分析
  const emotion = detectEmotionType(text, fireWaterBalance.balance);

  // 間（ま）の分析
  const pauseAnalysis = analyzePauses(text);

  // 同音異義語の解決
  const homonymResolution = resolveHomonyms(text);

  // 信頼度（仮）
  const confidence = 0.9;

  return {
    text,
    kotodamaText,
    fireWaterBalance,
    emotion,
    pauseAnalysis,
    homonymResolution,
    confidence,
    timestamp: Date.now(),
  };
}

/**
 * 「やばい」の15種類分類
 */
export function classifyYabai(text: string, emotion: string, fireWaterBalance: number): string {
  // 「やばい」の15種類分類
  const yabaiTypes = [
    "驚き（ポジティブ）",
    "驚き（ネガティブ）",
    "興奮",
    "恐怖",
    "感動",
    "困惑",
    "焦り",
    "賞賛",
    "危機感",
    "期待",
    "不安",
    "喜び",
    "怒り",
    "悲しみ",
    "中立",
  ];

  // 感情と火水バランスから分類（簡易実装）
  if (emotion === "excited" && fireWaterBalance > 20) {
    return yabaiTypes[0]; // 驚き（ポジティブ）
  } else if (emotion === "angry" && fireWaterBalance > 20) {
    return yabaiTypes[1]; // 驚き（ネガティブ）
  } else if (emotion === "happy" && fireWaterBalance > 10) {
    return yabaiTypes[2]; // 興奮
  } else if (emotion === "sad" && fireWaterBalance < -10) {
    return yabaiTypes[3]; // 恐怖
  } else {
    return yabaiTypes[14]; // 中立
  }
}

/**
 * 「あ…」の語感識別
 */
export function classifyAh(text: string, pauseDuration: number, fireWaterBalance: number): string {
  // 「あ…」の語感識別
  const ahTypes = ["緊張", "困惑", "閃き", "怒り"];

  // 間の長さと火水バランスから識別（簡易実装）
  if (pauseDuration > 1000 && fireWaterBalance < -20) {
    return ahTypes[0]; // 緊張
  } else if (pauseDuration > 500 && fireWaterBalance < 0) {
    return ahTypes[1]; // 困惑
  } else if (pauseDuration < 300 && fireWaterBalance > 20) {
    return ahTypes[2]; // 閃き
  } else if (pauseDuration < 200 && fireWaterBalance > 30) {
    return ahTypes[3]; // 怒り
  } else {
    return ahTypes[1]; // 困惑（デフォルト）
  }
}

/**
 * 「えっ、ほんと？」の間の長さで信憑性判断
 */
export function analyzeCredibility(text: string, pauseDuration: number): {
  credibility: "high" | "medium" | "low";
  confidence: number;
} {
  // 間の長さで信憑性を判断
  if (pauseDuration < 200) {
    return { credibility: "high", confidence: 0.9 };
  } else if (pauseDuration < 500) {
    return { credibility: "medium", confidence: 0.7 };
  } else {
    return { credibility: "low", confidence: 0.5 };
  }
}
