/**
 * Soul Voice Integration
 * KTTS × Soul Sync 完全統合
 * 
 * 機能:
 * - 魂プロファイル → 音声特徴変換
 * - 火／水の声色比率を魂特性に反映
 * - 感情状態に応じた音声調整
 * - リアルタイム音声人格同期
 */

import { getSoulSyncStatus } from '../../soulSync/soulSyncEngine';
import type { FireWaterVoiceParams } from './kttsEngine';
import { generateFireWaterVoiceParams, emotionToFireWater, contextToFireWater } from './fireWaterVoiceEngine';

/**
 * 魂プロファイル
 */
export interface SoulProfile {
  /** ユーザーID */
  userId: number;
  /** 火のエネルギー（0-100） */
  fireEnergy: number;
  /** 水のエネルギー（0-100） */
  waterEnergy: number;
  /** 陽のエネルギー（0-100） */
  yangEnergy: number;
  /** 陰のエネルギー（0-100） */
  yinEnergy: number;
  /** 直感力（0-100） */
  intuition: number;
  /** 論理力（0-100） */
  logic: number;
  /** 共感力（0-100） */
  empathy: number;
  /** 創造力（0-100） */
  creativity: number;
  /** ポジティビティ（0-1） */
  positivity: number;
  /** 合理性（0-1） */
  rationality: number;
}

/**
 * 感情状態
 */
export interface EmotionalState {
  /** 現在の感情 */
  currentEmotion: 'joy' | 'anger' | 'sadness' | 'calm' | 'excitement' | 'neutral' | 'anxiety' | 'confusion';
  /** 感情の強度（0-1） */
  intensity: number;
  /** ストレスレベル（0-100） */
  stressLevel: number;
  /** エネルギーレベル（0-100） */
  energyLevel: number;
}

/**
 * 音声調整モード
 */
export type VoiceAdjustmentMode = 
  | 'calm_down'      // 落ち着かせる（水系）
  | 'encourage'      // 勇気づける（火系）
  | 'empathize'      // 共感する（水系）
  | 'energize'       // 元気づける（火系）
  | 'comfort'        // 慰める（水系）
  | 'motivate'       // やる気を出させる（火系）
  | 'neutral';       // 中立

/**
 * Soul Syncから魂プロファイルを取得
 */
export async function getSoulProfile(userId: number): Promise<SoulProfile> {
  const soulStatus = await getSoulSyncStatus(userId);

  // Soul Syncのデータから魂プロファイルを構築
  // TODO: Soul Syncエンジンから実際のデータを取得
  return {
    userId,
    fireEnergy: 55,
    waterEnergy: 45,
    yangEnergy: 60,
    yinEnergy: 40,
    intuition: 70,
    logic: 60,
    empathy: 75,
    creativity: 80,
    positivity: 0.65,
    rationality: 0.70,
  };
}

/**
 * 感情状態を分析
 */
export async function analyzeEmotionalState(
  userId: number,
  recentInteractions?: string[]
): Promise<EmotionalState> {
  // TODO: Soul Syncエンジンから実際の感情状態を取得
  // 現在は仮実装
  return {
    currentEmotion: 'neutral',
    intensity: 0.5,
    stressLevel: 30,
    energyLevel: 70,
  };
}

/**
 * 魂プロファイルから火水バランスを計算
 */
export function soulProfileToFireWater(profile: SoulProfile): { fire: number; water: number } {
  // 魂特性から火水バランスを計算
  const fire = (
    profile.fireEnergy * 0.4 +
    profile.yangEnergy * 0.3 +
    profile.intuition * 0.2 +
    profile.creativity * 0.1
  ) / 100 * 100;

  const water = (
    profile.waterEnergy * 0.4 +
    profile.yinEnergy * 0.3 +
    profile.empathy * 0.2 +
    profile.logic * 0.1
  ) / 100 * 100;

  return { fire, water };
}

/**
 * 感情状態に応じた音声調整モードを判定
 */
export function determineVoiceAdjustmentMode(emotional: EmotionalState): VoiceAdjustmentMode {
  // ストレスが高い場合は落ち着かせる
  if (emotional.stressLevel > 70) {
    return 'calm_down';
  }

  // エネルギーが低い場合は元気づける
  if (emotional.energyLevel < 30) {
    return 'energize';
  }

  // 感情に応じた調整
  switch (emotional.currentEmotion) {
    case 'sadness':
      return emotional.intensity > 0.7 ? 'comfort' : 'empathize';
    case 'anger':
      return 'calm_down';
    case 'anxiety':
      return 'calm_down';
    case 'confusion':
      return 'empathize';
    case 'joy':
      return 'neutral';
    case 'excitement':
      return emotional.intensity > 0.8 ? 'calm_down' : 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * 音声調整モードから火水バランスを計算
 */
export function adjustmentModeToFireWater(mode: VoiceAdjustmentMode): { fire: number; water: number } {
  const modeMap: Record<VoiceAdjustmentMode, { fire: number; water: number }> = {
    calm_down: { fire: 20, water: 80 },      // 落ち着かせる：水を強く
    encourage: { fire: 80, water: 20 },      // 勇気づける：火を強く
    empathize: { fire: 30, water: 70 },      // 共感する：水を強く
    energize: { fire: 85, water: 15 },       // 元気づける：火を非常に強く
    comfort: { fire: 25, water: 75 },        // 慰める：水を強く
    motivate: { fire: 75, water: 25 },       // やる気を出させる：火を強く
    neutral: { fire: 50, water: 50 },        // 中立：バランス
  };

  return modeMap[mode];
}

/**
 * 魂プロファイルと感情状態から総合的な火水バランスを計算
 */
export function calculateIntegratedFireWater(
  soulProfile: SoulProfile,
  emotionalState: EmotionalState,
  adjustmentMode?: VoiceAdjustmentMode
): { fire: number; water: number } {
  // 魂プロファイルからの火水バランス
  const soulFireWater = soulProfileToFireWater(soulProfile);

  // 感情状態からの火水バランス
  const emotionFireWater = emotionToFireWater(
    emotionalState.currentEmotion === 'anxiety' ? 'calm' :
    emotionalState.currentEmotion === 'confusion' ? 'neutral' :
    emotionalState.currentEmotion as any
  );

  // 音声調整モードからの火水バランス
  const mode = adjustmentMode || determineVoiceAdjustmentMode(emotionalState);
  const adjustmentFireWater = adjustmentModeToFireWater(mode);

  // 重み付け平均
  // 魂プロファイル: 40%
  // 感情状態: 30%
  // 音声調整モード: 30%
  const fire = Math.round(
    soulFireWater.fire * 0.4 +
    emotionFireWater.fire * 0.3 +
    adjustmentFireWater.fire * 0.3
  );

  const water = Math.round(
    soulFireWater.water * 0.4 +
    emotionFireWater.water * 0.3 +
    adjustmentFireWater.water * 0.3
  );

  return { fire, water };
}

/**
 * 魂と同期した音声パラメータを生成
 */
export async function generateSoulSyncedVoiceParams(
  userId: number,
  options: {
    adjustmentMode?: VoiceAdjustmentMode;
    recentInteractions?: string[];
  } = {}
): Promise<FireWaterVoiceParams> {
  // 魂プロファイル取得
  const soulProfile = await getSoulProfile(userId);

  // 感情状態分析
  const emotionalState = await analyzeEmotionalState(userId, options.recentInteractions);

  // 総合的な火水バランス計算
  const { fire, water } = calculateIntegratedFireWater(
    soulProfile,
    emotionalState,
    options.adjustmentMode
  );

  // 火水ボイスパラメータ生成
  return generateFireWaterVoiceParams(fire, water);
}

/**
 * リアルタイム音声人格同期
 */
export class SoulVoiceSync {
  private userId: number;
  private currentProfile: SoulProfile | null = null;
  private currentEmotionalState: EmotionalState | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 5000; // 5秒ごとに更新

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * 音声パラメータを取得（キャッシュ付き）
   */
  async getVoiceParams(
    options: {
      adjustmentMode?: VoiceAdjustmentMode;
      forceUpdate?: boolean;
    } = {}
  ): Promise<FireWaterVoiceParams> {
    const now = Date.now();

    // キャッシュが有効かチェック
    if (
      !options.forceUpdate &&
      this.currentProfile &&
      this.currentEmotionalState &&
      (now - this.lastUpdateTime) < this.updateInterval
    ) {
      // キャッシュから計算
      const { fire, water } = calculateIntegratedFireWater(
        this.currentProfile,
        this.currentEmotionalState,
        options.adjustmentMode
      );
      return generateFireWaterVoiceParams(fire, water);
    }

    // 新しいデータを取得
    this.currentProfile = await getSoulProfile(this.userId);
    this.currentEmotionalState = await analyzeEmotionalState(this.userId);
    this.lastUpdateTime = now;

    // 音声パラメータ生成
    const { fire, water } = calculateIntegratedFireWater(
      this.currentProfile,
      this.currentEmotionalState,
      options.adjustmentMode
    );

    return generateFireWaterVoiceParams(fire, water);
  }

  /**
   * 感情状態を手動更新
   */
  updateEmotionalState(state: Partial<EmotionalState>): void {
    if (this.currentEmotionalState) {
      this.currentEmotionalState = {
        ...this.currentEmotionalState,
        ...state,
      };
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.currentProfile = null;
    this.currentEmotionalState = null;
    this.lastUpdateTime = 0;
  }
}
