/**
 * Spiritual Response Mode Engine
 * 霊核応答モードエンジン
 * 
 * 霊性反応（直感的な一言、静かな間、柔らかい相槌）
 */

import type { EmotionalPresence } from "./emotionalPresenceDetector";
import type { PresenceDirection } from "./presenceDirectionEstimator";

export interface SpiritualResponse {
  /** 応答タイプ */
  type: "intuitive" | "silent" | "backchannel" | "deep" | "light";
  /** 応答テキスト */
  text: string;
  /** 間の長さ（ミリ秒） */
  pauseDuration: number;
  /** 霊性レベル（0-100） */
  spiritualLevel: number;
  /** 声色の調整 */
  voiceAdjustment: {
    pitch: number; // -50 〜 +50
    speed: number; // -50 〜 +50
    volume: number; // -50 〜 +50
  };
}

export interface SpiritualResponseContext {
  /** ユーザーの感情 */
  userEmotion: EmotionalPresence;
  /** ユーザーの気配方向性 */
  userDirection: PresenceDirection;
  /** 会話の深さ（0-100） */
  conversationDepth: number;
  /** 霊的共鳴度（0-100） */
  spiritualResonance: number;
}

/**
 * 霊核応答を生成
 */
export function generateSpiritualResponse(context: SpiritualResponseContext): SpiritualResponse {
  const { userEmotion, userDirection, conversationDepth, spiritualResonance } = context;

  // 応答タイプを決定
  const type = determineSpiritualResponseType(userEmotion, userDirection, conversationDepth);

  // 応答テキストを生成
  const text = generateResponseText(type, userEmotion, userDirection);

  // 間の長さを計算
  const pauseDuration = calculateSpiritualPause(type, conversationDepth, spiritualResonance);

  // 霊性レベルを計算
  const spiritualLevel = calculateSpiritualLevel(type, conversationDepth, spiritualResonance);

  // 声色の調整を計算
  const voiceAdjustment = calculateSpiritualVoiceAdjustment(type, userDirection);

  return {
    type,
    text,
    pauseDuration,
    spiritualLevel,
    voiceAdjustment,
  };
}

/**
 * 霊核応答タイプを決定
 */
function determineSpiritualResponseType(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  depth: number
): "intuitive" | "silent" | "backchannel" | "deep" | "light" {
  // 深い会話→深い応答
  if (depth > 70) {
    return "deep";
  }

  // 水の方向性が強い→静かな間
  if (direction.waterDirection > 70) {
    return "silent";
  }

  // 火の方向性が強い→直感的な一言
  if (direction.fireDirection > 70) {
    return "intuitive";
  }

  // 感情が安定している→相槌
  if (emotion.stability > 70) {
    return "backchannel";
  }

  // 感情が軽い→軽い応答
  if (emotion.intensity < 40) {
    return "light";
  }

  return "backchannel";
}

/**
 * 応答テキストを生成
 */
function generateResponseText(
  type: string,
  emotion: EmotionalPresence,
  direction: PresenceDirection
): string {
  switch (type) {
    case "intuitive":
      return generateIntuitiveResponse(emotion);
    case "silent":
      return ""; // 静かな間
    case "backchannel":
      return generateBackchannelResponse(emotion);
    case "deep":
      return generateDeepResponse(direction);
    case "light":
      return generateLightResponse(emotion);
    default:
      return "うん";
  }
}

/**
 * 直感的な一言を生成
 */
function generateIntuitiveResponse(emotion: EmotionalPresence): string {
  const responses = {
    joy: ["そうですね", "いいですね", "わかります"],
    sadness: ["そうですか", "そうなんですね", "うん"],
    anger: ["そうですか", "なるほど", "うん"],
    fear: ["大丈夫ですよ", "そうですね", "わかります"],
    calm: ["そうですね", "うん", "ええ"],
    neutral: ["うん", "そうですね", "なるほど"],
  };

  const options = responses[emotion.emotion] || responses.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 相槌を生成
 */
function generateBackchannelResponse(emotion: EmotionalPresence): string {
  const responses = {
    joy: ["ええ", "うん", "そうですね"],
    sadness: ["うん", "そうですか", "ええ"],
    anger: ["うん", "そうですか", "なるほど"],
    fear: ["うん", "ええ", "そうですね"],
    calm: ["ええ", "うん", "そうですね"],
    neutral: ["うん", "ええ", "そうですね"],
  };

  const options = responses[emotion.emotion] || responses.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 深い応答を生成
 */
function generateDeepResponse(direction: PresenceDirection): string {
  if (direction.waterDirection > direction.fireDirection) {
    return "…そうですね"; // 水の深さ
  } else {
    return "なるほど、そうですね"; // 火の明確さ
  }
}

/**
 * 軽い応答を生成
 */
function generateLightResponse(emotion: EmotionalPresence): string {
  const responses = {
    joy: ["ええ", "うん", "そうですね"],
    sadness: ["うん", "そうですか"],
    anger: ["うん", "そうですか"],
    fear: ["うん", "ええ"],
    calm: ["ええ", "うん"],
    neutral: ["うん", "ええ"],
  };

  const options = responses[emotion.emotion] || responses.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * 霊核的な間の長さを計算
 */
function calculateSpiritualPause(
  type: string,
  depth: number,
  resonance: number
): number {
  let basePause = 1000; // 基本1秒

  switch (type) {
    case "intuitive":
      basePause = 500; // 直感的な応答は短い間
      break;
    case "silent":
      basePause = 3000; // 静かな間は長い
      break;
    case "backchannel":
      basePause = 800; // 相槌は短め
      break;
    case "deep":
      basePause = 2000; // 深い応答は長めの間
      break;
    case "light":
      basePause = 600; // 軽い応答は短い間
      break;
  }

  // 会話の深さに応じて調整
  const depthFactor = 1 + (depth / 100) * 0.5;

  // 霊的共鳴度に応じて調整
  const resonanceFactor = 1 + (resonance / 100) * 0.3;

  return basePause * depthFactor * resonanceFactor;
}

/**
 * 霊性レベルを計算
 */
function calculateSpiritualLevel(
  type: string,
  depth: number,
  resonance: number
): number {
  let baseLevel = 50;

  switch (type) {
    case "intuitive":
      baseLevel = 70; // 直感的な応答は霊性が高い
      break;
    case "silent":
      baseLevel = 90; // 静かな間は最も霊性が高い
      break;
    case "backchannel":
      baseLevel = 40; // 相槌は霊性が低め
      break;
    case "deep":
      baseLevel = 80; // 深い応答は霊性が高い
      break;
    case "light":
      baseLevel = 30; // 軽い応答は霊性が低い
      break;
  }

  // 会話の深さと共鳴度を加味
  return Math.min(100, baseLevel + depth * 0.2 + resonance * 0.1);
}

/**
 * 霊核的な声色調整を計算
 */
function calculateSpiritualVoiceAdjustment(
  type: string,
  direction: PresenceDirection
): {
  pitch: number;
  speed: number;
  volume: number;
} {
  let pitch = 0;
  let speed = 0;
  let volume = 0;

  switch (type) {
    case "intuitive":
      // 直感的：やや高音、やや速い、普通の音量
      pitch = 10;
      speed = 5;
      volume = 0;
      break;
    case "silent":
      // 静かな間：音なし
      pitch = 0;
      speed = 0;
      volume = -50;
      break;
    case "backchannel":
      // 相槌：普通、やや速い、やや小さい
      pitch = 0;
      speed = 10;
      volume = -10;
      break;
    case "deep":
      // 深い：低音、遅い、普通の音量
      pitch = -15;
      speed = -20;
      volume = 0;
      break;
    case "light":
      // 軽い：やや高音、速い、やや小さい
      pitch = 5;
      speed = 15;
      volume = -5;
      break;
  }

  // 気配の方向性に応じて微調整
  if (direction.waterDirection > direction.fireDirection) {
    // 水の方向性が強い→より柔らかく
    pitch -= 5;
    speed -= 5;
    volume -= 5;
  } else if (direction.fireDirection > direction.waterDirection) {
    // 火の方向性が強い→より明確に
    pitch += 5;
    speed += 5;
    volume += 5;
  }

  return { pitch, speed, volume };
}

/**
 * 霊的共鳴度を計算
 */
export function calculateSpiritualResonance(
  userEmotion: EmotionalPresence,
  userDirection: PresenceDirection,
  arkEmotion: EmotionalPresence,
  arkDirection: PresenceDirection
): number {
  // 感情の一致度
  const emotionMatch = userEmotion.emotion === arkEmotion.emotion ? 100 : 50;

  // 方向性の一致度
  const directionDiff = Math.abs(
    (userDirection.fireDirection - userDirection.waterDirection) -
    (arkDirection.fireDirection - arkDirection.waterDirection)
  );
  const directionMatch = Math.max(0, 100 - directionDiff);

  // 深さの一致度
  const depthDiff = Math.abs(userEmotion.depth - arkEmotion.depth);
  const depthMatch = Math.max(0, 100 - depthDiff);

  // 総合的な共鳴度
  return (emotionMatch * 0.4 + directionMatch * 0.4 + depthMatch * 0.2);
}
