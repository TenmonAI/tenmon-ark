/**
 * Fire-Water Voice Engine
 * 火水ボイスエンジン
 * 
 * 機能:
 * - 火水バランスに基づく音声パラメータ調整
 * - 声質の動的制御（鋭い/柔らかい）
 * - 感情に応じた音声変調
 * - リアルタイム音声合成
 */

import type { FireWaterVoiceParams } from './kttsEngine';

/**
 * 火水ボイス設定
 */
export interface FireWaterVoiceConfig {
  /** 基準ピッチ（Hz） */
  basePitch: number;
  /** 基準スピード（wpm - words per minute） */
  baseSpeed: number;
  /** 基準ボリューム（0-1） */
  baseVolume: number;
  /** 火の強度（0-100） */
  fireIntensity: number;
  /** 水の強度（0-100） */
  waterIntensity: number;
}

/**
 * 音声合成オプション
 */
export interface SynthesisOptions {
  /** 言語（デフォルト: ja-JP） */
  lang?: string;
  /** 声の種類（male/female/neutral） */
  voiceType?: 'male' | 'female' | 'neutral';
  /** ピッチ調整（0.5-2.0） */
  pitch?: number;
  /** スピード調整（0.5-2.0） */
  rate?: number;
  /** ボリューム調整（0-1） */
  volume?: number;
}

/**
 * 火水バランスから音声パラメータを生成
 */
export function generateFireWaterVoiceParams(
  fireEnergy: number,
  waterEnergy: number,
  config?: Partial<FireWaterVoiceConfig>
): FireWaterVoiceParams {
  const defaultConfig: FireWaterVoiceConfig = {
    basePitch: 1.0,
    baseSpeed: 1.0,
    baseVolume: 0.8,
    fireIntensity: fireEnergy,
    waterIntensity: waterEnergy,
    ...config,
  };

  // 火水バランス計算（-100 ~ 100）
  const balance = defaultConfig.fireIntensity - defaultConfig.waterIntensity;

  // ピッチ調整（火が強いほど高く、水が強いほど低く）
  const pitch = defaultConfig.basePitch + (balance / 200);

  // スピード調整（火が強いほど速く、水が強いほど遅く）
  const rate = defaultConfig.baseSpeed + (balance / 300);

  // ボリューム調整（火が強いほど大きく、水が強いほど小さく）
  const volume = defaultConfig.baseVolume + (balance / 500);

  // 声質判定
  let voiceQuality: 'sharp' | 'soft' | 'balanced';
  if (balance > 30) {
    voiceQuality = 'sharp'; // 火が強い：鋭い声
  } else if (balance < -30) {
    voiceQuality = 'soft'; // 水が強い：柔らかい声
  } else {
    voiceQuality = 'balanced'; // バランス：中庸の声
  }

  return {
    fireEnergy: defaultConfig.fireIntensity,
    waterEnergy: defaultConfig.waterIntensity,
    pitch: Math.max(0.5, Math.min(2.0, pitch)),
    rate: Math.max(0.5, Math.min(2.0, rate)),
    volume: Math.max(0.0, Math.min(1.0, volume)),
    voiceQuality,
  };
}

/**
 * 感情モードから火水バランスを推定
 */
export function emotionToFireWater(
  emotion: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral'
): { fire: number; water: number } {
  const emotionMap: Record<string, { fire: number; water: number }> = {
    joy: { fire: 70, water: 30 }, // 喜び：火が強い
    anger: { fire: 90, water: 10 }, // 怒り：火が非常に強い
    sadness: { fire: 20, water: 80 }, // 悲しみ：水が強い
    calm: { fire: 30, water: 70 }, // 穏やか：水が強い
    excitement: { fire: 80, water: 20 }, // 興奮：火が強い
    neutral: { fire: 50, water: 50 }, // 中立：バランス
  };

  return emotionMap[emotion] || { fire: 50, water: 50 };
}

/**
 * 時間帯から火水バランスを推定
 */
export function timeToFireWater(hour: number): { fire: number; water: number } {
  // 朝（6-12時）：火が強い
  if (hour >= 6 && hour < 12) {
    return { fire: 70, water: 30 };
  }
  // 昼（12-18時）：バランス
  else if (hour >= 12 && hour < 18) {
    return { fire: 60, water: 40 };
  }
  // 夕方（18-21時）：水が強くなる
  else if (hour >= 18 && hour < 21) {
    return { fire: 40, water: 60 };
  }
  // 夜（21-6時）：水が非常に強い
  else {
    return { fire: 20, water: 80 };
  }
}

/**
 * 文脈から火水バランスを推定
 */
export function contextToFireWater(
  context: 'formal' | 'casual' | 'urgent' | 'gentle' | 'professional' | 'friendly'
): { fire: number; water: number } {
  const contextMap: Record<string, { fire: number; water: number }> = {
    formal: { fire: 40, water: 60 }, // フォーマル：水が強い（落ち着き）
    casual: { fire: 60, water: 40 }, // カジュアル：火が強い（活発）
    urgent: { fire: 85, water: 15 }, // 緊急：火が非常に強い
    gentle: { fire: 25, water: 75 }, // 優しい：水が強い
    professional: { fire: 50, water: 50 }, // プロフェッショナル：バランス
    friendly: { fire: 65, water: 35 }, // フレンドリー：火が強い
  };

  return contextMap[context] || { fire: 50, water: 50 };
}

/**
 * 複数の要因から総合的な火水バランスを計算
 */
export function calculateComprehensiveFireWater(factors: {
  emotion?: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral';
  time?: number;
  context?: 'formal' | 'casual' | 'urgent' | 'gentle' | 'professional' | 'friendly';
  userPreference?: { fire: number; water: number };
}): { fire: number; water: number } {
  const balances: Array<{ fire: number; water: number }> = [];

  // 感情
  if (factors.emotion) {
    balances.push(emotionToFireWater(factors.emotion));
  }

  // 時間帯
  if (factors.time !== undefined) {
    balances.push(timeToFireWater(factors.time));
  }

  // 文脈
  if (factors.context) {
    balances.push(contextToFireWater(factors.context));
  }

  // ユーザー設定
  if (factors.userPreference) {
    balances.push(factors.userPreference);
  }

  // 平均を計算
  if (balances.length === 0) {
    return { fire: 50, water: 50 };
  }

  const avgFire = balances.reduce((sum, b) => sum + b.fire, 0) / balances.length;
  const avgWater = balances.reduce((sum, b) => sum + b.water, 0) / balances.length;

  return {
    fire: Math.round(avgFire),
    water: Math.round(avgWater),
  };
}

/**
 * 火水ボイスパラメータを適用した音声合成設定を生成
 */
export function applyFireWaterToSynthesis(
  voiceParams: FireWaterVoiceParams,
  baseOptions?: SynthesisOptions
): SynthesisOptions {
  const defaultOptions: SynthesisOptions = {
    lang: 'ja-JP',
    voiceType: 'neutral',
    pitch: 1.0,
    rate: 1.0,
    volume: 0.8,
    ...baseOptions,
  };

  return {
    ...defaultOptions,
    pitch: voiceParams.pitch,
    rate: voiceParams.rate,
    volume: voiceParams.volume,
  };
}

/**
 * 火水ボイスエンジンの状態管理
 */
export class FireWaterVoiceEngine {
  private currentParams: FireWaterVoiceParams;
  private config: FireWaterVoiceConfig;

  constructor(config?: Partial<FireWaterVoiceConfig>) {
    this.config = {
      basePitch: 1.0,
      baseSpeed: 1.0,
      baseVolume: 0.8,
      fireIntensity: 50,
      waterIntensity: 50,
      ...config,
    };

    this.currentParams = generateFireWaterVoiceParams(
      this.config.fireIntensity,
      this.config.waterIntensity,
      this.config
    );
  }

  /**
   * 火水バランスを更新
   */
  updateBalance(fire: number, water: number): void {
    this.config.fireIntensity = fire;
    this.config.waterIntensity = water;
    this.currentParams = generateFireWaterVoiceParams(fire, water, this.config);
  }

  /**
   * 感情に基づいて火水バランスを更新
   */
  updateByEmotion(emotion: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral'): void {
    const { fire, water } = emotionToFireWater(emotion);
    this.updateBalance(fire, water);
  }

  /**
   * 文脈に基づいて火水バランスを更新
   */
  updateByContext(context: 'formal' | 'casual' | 'urgent' | 'gentle' | 'professional' | 'friendly'): void {
    const { fire, water } = contextToFireWater(context);
    this.updateBalance(fire, water);
  }

  /**
   * 現在の火水ボイスパラメータを取得
   */
  getCurrentParams(): FireWaterVoiceParams {
    return { ...this.currentParams };
  }

  /**
   * 音声合成オプションを取得
   */
  getSynthesisOptions(baseOptions?: SynthesisOptions): SynthesisOptions {
    return applyFireWaterToSynthesis(this.currentParams, baseOptions);
  }

  /**
   * 設定をリセット
   */
  reset(): void {
    this.config.fireIntensity = 50;
    this.config.waterIntensity = 50;
    this.currentParams = generateFireWaterVoiceParams(50, 50, this.config);
  }
}
