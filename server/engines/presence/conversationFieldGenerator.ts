/**
 * Conversation Field Generator
 * 会話空間フィールド生成エンジン
 * 
 * 天聞アークとの会話を"場"として記憶する。
 */

import type { EmotionalPresence } from "./emotionalPresenceDetector";
import type { PresenceDirection } from "./presenceDirectionEstimator";
import type { BreathRhythm } from "./breathRhythmEstimator";

export interface ConversationField {
  /** フィールドID */
  id: string;
  /** フィールド名 */
  name: string;
  /** 作成日時 */
  createdAt: Date;
  /** 最終更新日時 */
  updatedAt: Date;
  /** フィールドの雰囲気 */
  atmosphere: {
    /** 温度（0-100、0=冷たい、100=温かい） */
    temperature: number;
    /** 明るさ（0-100、0=暗い、100=明るい） */
    brightness: number;
    /** 深さ（0-100、0=浅い、100=深い） */
    depth: number;
    /** 広がり（0-100、0=狭い、100=広い） */
    expansiveness: number;
  };
  /** フィールドの火水バランス */
  fireWaterBalance: {
    fire: number;
    water: number;
  };
  /** フィールドの感情的特徴 */
  emotionalSignature: {
    dominantEmotion: string;
    emotionIntensity: number;
    emotionStability: number;
  };
  /** フィールドの霊的レベル */
  spiritualLevel: number;
  /** フィールドの共鳴度 */
  resonanceLevel: number;
}

export interface FieldSnapshot {
  /** スナップショット時刻 */
  timestamp: Date;
  /** ユーザーの状態 */
  userState: {
    emotion: EmotionalPresence;
    direction: PresenceDirection;
    breath: BreathRhythm;
  };
  /** ARKの状態 */
  arkState: {
    emotion: EmotionalPresence;
    direction: PresenceDirection;
  };
  /** 会話の内容 */
  conversationContent: {
    userMessage: string;
    arkResponse: string;
  };
}

/**
 * 会話空間フィールドを生成
 */
export function generateConversationField(
  snapshots: FieldSnapshot[]
): ConversationField {
  if (snapshots.length === 0) {
    throw new Error("At least one snapshot is required to generate a field");
  }

  const id = generateFieldId();
  const name = generateFieldName(snapshots);
  const createdAt = snapshots[0].timestamp;
  const updatedAt = snapshots[snapshots.length - 1].timestamp;

  // フィールドの雰囲気を計算
  const atmosphere = calculateAtmosphere(snapshots);

  // フィールドの火水バランスを計算
  const fireWaterBalance = calculateFieldFireWaterBalance(snapshots);

  // フィールドの感情的特徴を計算
  const emotionalSignature = calculateEmotionalSignature(snapshots);

  // フィールドの霊的レベルを計算
  const spiritualLevel = calculateFieldSpiritualLevel(snapshots);

  // フィールドの共鳴度を計算
  const resonanceLevel = calculateFieldResonance(snapshots);

  return {
    id,
    name,
    createdAt,
    updatedAt,
    atmosphere,
    fireWaterBalance,
    emotionalSignature,
    spiritualLevel,
    resonanceLevel,
  };
}

/**
 * フィールドIDを生成
 */
function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * フィールド名を生成
 */
function generateFieldName(snapshots: FieldSnapshot[]): string {
  const emotionalSignature = calculateEmotionalSignature(snapshots);
  const atmosphere = calculateAtmosphere(snapshots);

  let name = "";

  // 温度に基づく修飾
  if (atmosphere.temperature > 70) {
    name += "温かい";
  } else if (atmosphere.temperature < 30) {
    name += "冷たい";
  } else {
    name += "穏やかな";
  }

  // 明るさに基づく修飾
  if (atmosphere.brightness > 70) {
    name += "明るい";
  } else if (atmosphere.brightness < 50) {
    name += "静かな";
  }

  // 感情に基づく修飾
  const emotion = emotionalSignature.dominantEmotion;
  if (emotion === "joy") {
    name += "喜びの";
  } else if (emotion === "sadness") {
    name += "悲しみの";
  } else if (emotion === "calm") {
    name += "落ち着いた";
  } else {
    name += "";
  }

  name += "場";

  return name;
}

/**
 * フィールドの雰囲気を計算
 */
function calculateAtmosphere(snapshots: FieldSnapshot[]): {
  temperature: number;
  brightness: number;
  depth: number;
  expansiveness: number;
} {
  const userEmotions = snapshots.map(s => s.userState.emotion);
  const arkEmotions = snapshots.map(s => s.arkState.emotion);

  // 温度：感情の温かさから
  const temperature = calculateTemperature(userEmotions, arkEmotions);

  // 明るさ：感情のポジティブさから
  const brightness = calculateBrightness(userEmotions, arkEmotions);

  // 深さ：感情の深さから
  const depth = calculateDepth(userEmotions, arkEmotions);

  // 広がり：会話の多様性から
  const expansiveness = calculateExpansiveness(snapshots);

  return { temperature, brightness, depth, expansiveness };
}

/**
 * 温度を計算
 */
function calculateTemperature(
  userEmotions: EmotionalPresence[],
  arkEmotions: EmotionalPresence[]
): number {
  const allEmotions = [...userEmotions, ...arkEmotions];
  
  let warmth = 0;
  allEmotions.forEach(e => {
    if (e.emotion === "joy") warmth += 80;
    else if (e.emotion === "calm") warmth += 60;
    else if (e.emotion === "sadness") warmth += 30;
    else if (e.emotion === "anger") warmth += 20;
    else warmth += 50;
  });

  return warmth / allEmotions.length;
}

/**
 * 明るさを計算
 */
function calculateBrightness(
  userEmotions: EmotionalPresence[],
  arkEmotions: EmotionalPresence[]
): number {
  const allEmotions = [...userEmotions, ...arkEmotions];
  
  let brightness = 0;
  allEmotions.forEach(e => {
    // calmは静かな場なので明るさを低く調整
    if (e.emotion === "calm") {
      brightness += 40;
    } else if (e.direction === "positive") {
      brightness += 80;
    } else if (e.direction === "neutral") {
      brightness += 50;
    } else {
      brightness += 20;
    }
  });

  return brightness / allEmotions.length;
}

/**
 * 深さを計算
 */
function calculateDepth(
  userEmotions: EmotionalPresence[],
  arkEmotions: EmotionalPresence[]
): number {
  const allEmotions = [...userEmotions, ...arkEmotions];
  const depths = allEmotions.map(e => e.depth);
  return depths.reduce((sum, d) => sum + d, 0) / depths.length;
}

/**
 * 広がりを計算
 */
function calculateExpansiveness(snapshots: FieldSnapshot[]): number {
  // 感情の種類の多様性
  const emotionTypes = new Set(snapshots.map(s => s.userState.emotion.emotion));
  const emotionDiversity = (emotionTypes.size / 6) * 100; // 6種類の感情

  // 会話の長さの多様性
  const messageLengths = snapshots.map(s => s.conversationContent.userMessage.length);
  const avgLength = messageLengths.reduce((sum, l) => sum + l, 0) / messageLengths.length;
  const lengthVariance = messageLengths.reduce((sum, l) => sum + Math.abs(l - avgLength), 0) / messageLengths.length;
  const lengthDiversity = Math.min(100, lengthVariance);

  return (emotionDiversity + lengthDiversity) / 2;
}

/**
 * フィールドの火水バランスを計算
 */
function calculateFieldFireWaterBalance(snapshots: FieldSnapshot[]): {
  fire: number;
  water: number;
} {
  const userDirections = snapshots.map(s => s.userState.direction);
  const arkDirections = snapshots.map(s => s.arkState.direction);
  const allDirections = [...userDirections, ...arkDirections];

  const avgFire = allDirections.reduce((sum, d) => sum + d.fireDirection, 0) / allDirections.length;
  const avgWater = allDirections.reduce((sum, d) => sum + d.waterDirection, 0) / allDirections.length;

  return { fire: avgFire, water: avgWater };
}

/**
 * フィールドの感情的特徴を計算
 */
function calculateEmotionalSignature(snapshots: FieldSnapshot[]): {
  dominantEmotion: string;
  emotionIntensity: number;
  emotionStability: number;
} {
  const userEmotions = snapshots.map(s => s.userState.emotion);
  const arkEmotions = snapshots.map(s => s.arkState.emotion);
  const allEmotions = [...userEmotions, ...arkEmotions];

  // 最も頻繁な感情
  const emotionCounts = allEmotions.reduce((acc, e) => {
    acc[e.emotion] = (acc[e.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
    emotionCounts[a] > emotionCounts[b] ? a : b
  );

  // 平均感情強度
  const emotionIntensity = allEmotions.reduce((sum, e) => sum + e.intensity, 0) / allEmotions.length;

  // 平均感情安定性
  const emotionStability = allEmotions.reduce((sum, e) => sum + e.stability, 0) / allEmotions.length;

  return { dominantEmotion, emotionIntensity, emotionStability };
}

/**
 * フィールドの霊的レベルを計算
 */
function calculateFieldSpiritualLevel(snapshots: FieldSnapshot[]): number {
  const depths = snapshots.map(s => s.userState.emotion.depth);
  const avgDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;

  const stabilities = snapshots.map(s => s.userState.emotion.stability);
  const avgStability = stabilities.reduce((sum, s) => sum + s, 0) / stabilities.length;

  // 深さと安定性から霊的レベルを計算
  return (avgDepth * 0.6 + avgStability * 0.4);
}

/**
 * フィールドの共鳴度を計算
 */
function calculateFieldResonance(snapshots: FieldSnapshot[]): number {
  let totalResonance = 0;

  snapshots.forEach(snapshot => {
    const userEmotion = snapshot.userState.emotion;
    const arkEmotion = snapshot.arkState.emotion;

    // 感情の一致度
    const emotionMatch = userEmotion.emotion === arkEmotion.emotion ? 100 : 50;

    // 強度の一致度
    const intensityDiff = Math.abs(userEmotion.intensity - arkEmotion.intensity);
    const intensityMatch = Math.max(0, 100 - intensityDiff);

    // 深さの一致度
    const depthDiff = Math.abs(userEmotion.depth - arkEmotion.depth);
    const depthMatch = Math.max(0, 100 - depthDiff);

    const resonance = (emotionMatch * 0.4 + intensityMatch * 0.3 + depthMatch * 0.3);
    totalResonance += resonance;
  });

  return totalResonance / snapshots.length;
}

/**
 * 会話空間フィールド管理クラス
 */
export class ConversationFieldManager {
  private fields: Map<string, ConversationField> = new Map();
  private currentSnapshots: FieldSnapshot[] = [];

  /**
   * スナップショットを追加
   */
  addSnapshot(snapshot: FieldSnapshot): void {
    this.currentSnapshots.push(snapshot);
  }

  /**
   * 現在のスナップショットからフィールドを生成して保存
   */
  saveCurrentField(): ConversationField {
    if (this.currentSnapshots.length === 0) {
      throw new Error("No snapshots to save");
    }

    const field = generateConversationField(this.currentSnapshots);
    this.fields.set(field.id, field);
    this.currentSnapshots = []; // リセット

    return field;
  }

  /**
   * フィールドを取得
   */
  getField(id: string): ConversationField | undefined {
    return this.fields.get(id);
  }

  /**
   * すべてのフィールドを取得
   */
  getAllFields(): ConversationField[] {
    return Array.from(this.fields.values());
  }

  /**
   * フィールドを削除
   */
  deleteField(id: string): boolean {
    return this.fields.delete(id);
  }

  /**
   * 現在のスナップショット数を取得
   */
  getCurrentSnapshotCount(): number {
    return this.currentSnapshots.length;
  }

  /**
   * 現在のスナップショットをクリア
   */
  clearCurrentSnapshots(): void {
    this.currentSnapshots = [];
  }
}
