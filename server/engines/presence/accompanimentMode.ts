/**
 * Accompaniment Mode Engine
 * 寄り添いモードエンジン
 * 
 * ユーザーの心の波に合わせて声色・間を調整する。
 */

import type { EmotionalPresence } from "./emotionalPresenceDetector";
import type { PresenceDirection } from "./presenceDirectionEstimator";
import type { BreathRhythm } from "./breathRhythmEstimator";

export interface AccompanimentSettings {
  /** 寄り添いの強さ（0-100） */
  strength: number;
  /** 同期の速度（0-100） */
  syncSpeed: number;
  /** 距離感（0-100、0=密着、100=離れる） */
  distance: number;
  /** モード */
  mode: "mirror" | "complement" | "lead" | "follow";
}

export interface VoiceAdjustment {
  /** 声色の火水バランス調整 */
  fireWaterAdjustment: {
    fire: number; // -50 〜 +50
    water: number; // -50 〜 +50
  };
  /** ピッチ調整（-50 〜 +50） */
  pitchAdjustment: number;
  /** 速度調整（-50 〜 +50） */
  speedAdjustment: number;
  /** 音量調整（-50 〜 +50） */
  volumeAdjustment: number;
  /** 間の長さ調整（-50 〜 +50） */
  pauseAdjustment: number;
}

export interface AccompanimentResult {
  voiceAdjustment: VoiceAdjustment;
  /** 推奨される応答スタイル */
  responseStyle: "empathetic" | "supportive" | "encouraging" | "calming" | "energizing";
  /** 推奨される間の長さ（ミリ秒） */
  recommendedPauseDuration: number;
  /** 寄り添いの質（0-100） */
  accompanimentQuality: number;
}

/**
 * 寄り添いモードで声色・間を調整
 */
export function adjustForAccompaniment(
  userState: {
    emotion: EmotionalPresence;
    direction: PresenceDirection;
    breath: BreathRhythm;
  },
  settings: AccompanimentSettings
): AccompanimentResult {
  const { emotion, direction, breath } = userState;
  const { strength, syncSpeed, distance, mode } = settings;

  // モードに応じた調整を計算
  let voiceAdjustment: VoiceAdjustment;
  
  switch (mode) {
    case "mirror":
      voiceAdjustment = calculateMirrorAdjustment(emotion, direction, strength);
      break;
    case "complement":
      voiceAdjustment = calculateComplementAdjustment(emotion, direction, strength);
      break;
    case "lead":
      voiceAdjustment = calculateLeadAdjustment(emotion, direction, strength);
      break;
    case "follow":
      voiceAdjustment = calculateFollowAdjustment(emotion, direction, strength);
      break;
  }

  // 距離感に応じて調整を減衰
  voiceAdjustment = applyDistanceFactor(voiceAdjustment, distance);

  // 応答スタイルを決定
  const responseStyle = determineResponseStyle(emotion, direction, mode);

  // 推奨される間の長さを計算
  const recommendedPauseDuration = calculateRecommendedPause(breath, emotion, syncSpeed);

  // 寄り添いの質を評価
  const accompanimentQuality = evaluateAccompanimentQuality(
    emotion,
    direction,
    voiceAdjustment,
    settings
  );

  return {
    voiceAdjustment,
    responseStyle,
    recommendedPauseDuration,
    accompanimentQuality,
  };
}

/**
 * ミラーリング調整（相手と同じ）
 */
function calculateMirrorAdjustment(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  strength: number
): VoiceAdjustment {
  const factor = strength / 100;

  // 火水バランスを合わせる
  const fireAdjustment = (direction.fireDirection - 50) * factor;
  const waterAdjustment = (direction.waterDirection - 50) * factor;

  // 感情に応じたピッチ・速度調整
  let pitchAdjustment = 0;
  let speedAdjustment = 0;

  if (emotion.emotion === "joy") {
    pitchAdjustment = 20 * factor;
    speedAdjustment = 15 * factor;
  } else if (emotion.emotion === "sadness") {
    pitchAdjustment = -20 * factor;
    speedAdjustment = -15 * factor;
  } else if (emotion.emotion === "anger") {
    pitchAdjustment = -10 * factor;
    speedAdjustment = 20 * factor;
  } else if (emotion.emotion === "fear") {
    pitchAdjustment = 15 * factor;
    speedAdjustment = 10 * factor;
  }

  // 音量は感情の強度に合わせる
  const volumeAdjustment = ((emotion.intensity - 50) / 2) * factor;

  // 間は呼吸に合わせる（ミラーリングでは同期）
  const pauseAdjustment = 0;

  return {
    fireWaterAdjustment: { fire: fireAdjustment, water: waterAdjustment },
    pitchAdjustment,
    speedAdjustment,
    volumeAdjustment,
    pauseAdjustment,
  };
}

/**
 * 補完調整（相手と逆）
 */
function calculateComplementAdjustment(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  strength: number
): VoiceAdjustment {
  const factor = strength / 100;

  // 火水バランスを逆にする
  const fireAdjustment = (50 - direction.fireDirection) * factor;
  const waterAdjustment = (50 - direction.waterDirection) * factor;

  // 感情を補完する
  let pitchAdjustment = 0;
  let speedAdjustment = 0;

  if (emotion.emotion === "joy") {
    // 喜びには落ち着きを
    pitchAdjustment = -10 * factor;
    speedAdjustment = -10 * factor;
  } else if (emotion.emotion === "sadness") {
    // 悲しみには明るさを
    pitchAdjustment = 15 * factor;
    speedAdjustment = 10 * factor;
  } else if (emotion.emotion === "anger") {
    // 怒りには柔らかさを
    pitchAdjustment = 10 * factor;
    speedAdjustment = -15 * factor;
  } else if (emotion.emotion === "fear") {
    // 恐れには安心を
    pitchAdjustment = -15 * factor;
    speedAdjustment = -10 * factor;
  }

  const volumeAdjustment = ((50 - emotion.intensity) / 2) * factor;
  const pauseAdjustment = 10 * factor; // 補完では少し間を取る

  return {
    fireWaterAdjustment: { fire: fireAdjustment, water: waterAdjustment },
    pitchAdjustment,
    speedAdjustment,
    volumeAdjustment,
    pauseAdjustment,
  };
}

/**
 * リード調整（導く）
 */
function calculateLeadAdjustment(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  strength: number
): VoiceAdjustment {
  const factor = strength / 100;

  // 理想的なバランスに導く
  const fireAdjustment = (60 - direction.fireDirection) * 0.5 * factor;
  const waterAdjustment = (40 - direction.waterDirection) * 0.5 * factor;

  // ポジティブな方向に導く
  const pitchAdjustment = 10 * factor;
  const speedAdjustment = 5 * factor;
  const volumeAdjustment = 10 * factor;
  const pauseAdjustment = -5 * factor; // リードでは間を短く

  return {
    fireWaterAdjustment: { fire: fireAdjustment, water: waterAdjustment },
    pitchAdjustment,
    speedAdjustment,
    volumeAdjustment,
    pauseAdjustment,
  };
}

/**
 * フォロー調整（追従）
 */
function calculateFollowAdjustment(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  strength: number
): VoiceAdjustment {
  const factor = strength / 100;

  // 相手のバランスに少し遅れて追従
  const fireAdjustment = (direction.fireDirection - 50) * 0.8 * factor;
  const waterAdjustment = (direction.waterDirection - 50) * 0.8 * factor;

  // 感情に少し遅れて追従
  let pitchAdjustment = 0;
  let speedAdjustment = 0;

  if (emotion.emotion === "joy") {
    pitchAdjustment = 15 * factor;
    speedAdjustment = 10 * factor;
  } else if (emotion.emotion === "sadness") {
    pitchAdjustment = -15 * factor;
    speedAdjustment = -10 * factor;
  }

  const volumeAdjustment = ((emotion.intensity - 50) / 3) * factor;
  const pauseAdjustment = 5 * factor; // フォローでは少し間を取る

  return {
    fireWaterAdjustment: { fire: fireAdjustment, water: waterAdjustment },
    pitchAdjustment,
    speedAdjustment,
    volumeAdjustment,
    pauseAdjustment,
  };
}

/**
 * 距離感を適用
 */
function applyDistanceFactor(adjustment: VoiceAdjustment, distance: number): VoiceAdjustment {
  const factor = 1 - distance / 100;

  return {
    fireWaterAdjustment: {
      fire: adjustment.fireWaterAdjustment.fire * factor,
      water: adjustment.fireWaterAdjustment.water * factor,
    },
    pitchAdjustment: adjustment.pitchAdjustment * factor,
    speedAdjustment: adjustment.speedAdjustment * factor,
    volumeAdjustment: adjustment.volumeAdjustment * factor,
    pauseAdjustment: adjustment.pauseAdjustment * factor,
  };
}

/**
 * 応答スタイルを決定
 */
function determineResponseStyle(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  mode: string
): "empathetic" | "supportive" | "encouraging" | "calming" | "energizing" {
  if (mode === "mirror") {
    // ミラーリングでは共感的
    return "empathetic";
  }

  if (mode === "complement") {
    // 補完では感情に応じて
    if (emotion.emotion === "sadness" || emotion.emotion === "fear") {
      return "supportive";
    }
    if (emotion.emotion === "anger") {
      return "calming";
    }
    return "encouraging";
  }

  if (mode === "lead") {
    // リードでは励まし
    return "encouraging";
  }

  if (mode === "follow") {
    // フォローでは支援的
    return "supportive";
  }

  return "empathetic";
}

/**
 * 推奨される間の長さを計算
 */
function calculateRecommendedPause(
  breath: BreathRhythm,
  emotion: EmotionalPresence,
  syncSpeed: number
): number {
  // 呼吸周期に基づく基本的な間
  const basePause = breath.cycleMs * 0.3; // 呼吸周期の30%

  // 感情に応じた調整
  let emotionFactor = 1.0;
  if (emotion.emotion === "sadness" || emotion.emotion === "calm") {
    emotionFactor = 1.3; // 長めの間
  } else if (emotion.emotion === "joy") {
    emotionFactor = 0.7; // 短めの間
  }

  // 同期速度に応じた調整
  const speedFactor = syncSpeed / 100;

  return basePause * emotionFactor * speedFactor;
}

/**
 * 寄り添いの質を評価
 */
function evaluateAccompanimentQuality(
  emotion: EmotionalPresence,
  direction: PresenceDirection,
  adjustment: VoiceAdjustment,
  settings: AccompanimentSettings
): number {
  // 感情の安定性が高いほど質が高い
  const stabilityScore = emotion.stability;

  // 方向性の明確さが高いほど質が高い
  const clarityScore = Math.abs(direction.fireDirection - direction.waterDirection);

  // 調整の適切さ（過度な調整は質を下げる）
  const adjustmentMagnitude =
    Math.abs(adjustment.pitchAdjustment) +
    Math.abs(adjustment.speedAdjustment) +
    Math.abs(adjustment.volumeAdjustment);
  const adjustmentScore = Math.max(0, 100 - adjustmentMagnitude);

  // 設定の強さに応じた重み付け
  const strengthFactor = settings.strength / 100;

  return Math.min(
    100,
    (stabilityScore * 0.4 + clarityScore * 0.3 + adjustmentScore * 0.3) * strengthFactor
  );
}
