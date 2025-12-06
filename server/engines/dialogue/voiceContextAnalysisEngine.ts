/**
 * Voice Context Analysis Engine
 * 音声文脈解析エンジン
 * 
 * 機能:
 * - 声のトーン（怒り・悲しみ・不安・喜び）
 * - 息の強さ・弱さ
 * - 躊躇や戸惑い
 * - 小声の「…」も解析
 */

/**
 * 音声特徴
 */
export interface VoiceFeatures {
  /** ピッチ（Hz） */
  pitch: number;
  /** ボリューム（0-1） */
  volume: number;
  /** スピード（wpm） */
  speed: number;
  /** ピッチの変動（標準偏差） */
  pitchVariation: number;
  /** ボリュームの変動（標準偏差） */
  volumeVariation: number;
  /** ポーズの頻度（回/分） */
  pauseFrequency: number;
  /** 平均ポーズ長（ミリ秒） */
  averagePauseDuration: number;
}

/**
 * 感情トーン
 */
export type EmotionTone =
  | 'joy'        // 喜び
  | 'anger'      // 怒り
  | 'sadness'    // 悲しみ
  | 'anxiety'    // 不安
  | 'calm'       // 落ち着き
  | 'excitement' // 興奮
  | 'neutral'    // 中立
  | 'confusion'; // 混乱

/**
 * 息の強さ
 */
export type BreathStrength =
  | 'strong'   // 強い（興奮・怒り）
  | 'normal'   // 普通
  | 'weak'     // 弱い（不安・疲労）
  | 'shallow'; // 浅い（緊張）

/**
 * 躊躇レベル
 */
export type HesitationLevel =
  | 'none'     // なし
  | 'slight'   // わずか
  | 'moderate' // 中程度
  | 'high';    // 高い

/**
 * 音声文脈分析結果
 */
export interface VoiceContextAnalysis {
  /** 感情トーン */
  emotionTone: EmotionTone;
  /** 感情の確信度（0-1） */
  emotionConfidence: number;
  /** 息の強さ */
  breathStrength: BreathStrength;
  /** 躊躇レベル */
  hesitationLevel: HesitationLevel;
  /** 小声かどうか */
  isWhispering: boolean;
  /** ストレスレベル（0-100） */
  stressLevel: number;
  /** エネルギーレベル（0-100） */
  energyLevel: number;
  /** 話し方の特徴 */
  speakingStyle: {
    /** 自信があるか */
    confident: boolean;
    /** 急いでいるか */
    hurried: boolean;
    /** 疲れているか */
    tired: boolean;
    /** 緊張しているか */
    nervous: boolean;
  };
}

/**
 * 音声特徴から感情トーンを分析
 */
export function analyzeEmotionTone(features: VoiceFeatures): {
  tone: EmotionTone;
  confidence: number;
} {
  const scores: Record<EmotionTone, number> = {
    joy: 0,
    anger: 0,
    sadness: 0,
    anxiety: 0,
    calm: 0,
    excitement: 0,
    neutral: 0,
    confusion: 0,
  };

  // ピッチから判定
  if (features.pitch > 250) {
    scores.excitement += 30;
    scores.joy += 20;
    scores.anxiety += 15;
  } else if (features.pitch < 150) {
    scores.sadness += 25;
    scores.calm += 20;
  }

  // ボリュームから判定
  if (features.volume > 0.7) {
    scores.anger += 30;
    scores.excitement += 25;
    scores.joy += 15;
  } else if (features.volume < 0.3) {
    scores.sadness += 25;
    scores.anxiety += 20;
  }

  // スピードから判定
  if (features.speed > 180) {
    scores.excitement += 25;
    scores.anxiety += 20;
    scores.anger += 15;
  } else if (features.speed < 120) {
    scores.sadness += 25;
    scores.calm += 20;
  }

  // ピッチの変動から判定
  if (features.pitchVariation > 50) {
    scores.excitement += 20;
    scores.anger += 15;
    scores.confusion += 10;
  } else if (features.pitchVariation < 20) {
    scores.calm += 20;
    scores.sadness += 15;
  }

  // ボリュームの変動から判定
  if (features.volumeVariation > 0.3) {
    scores.anger += 20;
    scores.excitement += 15;
  }

  // ポーズの頻度から判定
  if (features.pauseFrequency > 10) {
    scores.anxiety += 20;
    scores.confusion += 15;
  } else if (features.pauseFrequency < 3) {
    scores.excitement += 15;
    scores.anger += 10;
  }

  // 最も高いスコアの感情を選択
  let maxScore = 0;
  let detectedTone: EmotionTone = 'neutral';
  for (const [tone, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedTone = tone as EmotionTone;
    }
  }

  // 確信度を計算（0-1）
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

  return {
    tone: detectedTone,
    confidence,
  };
}

/**
 * 音声特徴から息の強さを分析
 */
export function analyzeBreathStrength(features: VoiceFeatures): BreathStrength {
  // ボリュームとスピードから判定
  if (features.volume > 0.7 && features.speed > 160) {
    return 'strong';
  }
  if (features.volume < 0.3 || features.speed < 100) {
    return 'weak';
  }
  if (features.pauseFrequency > 8 && features.averagePauseDuration < 300) {
    return 'shallow';
  }
  return 'normal';
}

/**
 * 音声特徴から躊躇レベルを分析
 */
export function analyzeHesitationLevel(
  features: VoiceFeatures,
  transcript: string
): HesitationLevel {
  let hesitationScore = 0;

  // ポーズの頻度から判定
  if (features.pauseFrequency > 10) {
    hesitationScore += 30;
  } else if (features.pauseFrequency > 6) {
    hesitationScore += 15;
  }

  // スピードから判定（遅い場合は躊躇の可能性）
  if (features.speed < 100) {
    hesitationScore += 20;
  }

  // テキストから判定
  const hesitationWords = ['えっと', 'あの', 'その', 'まあ', 'うーん', 'ん', 'あー'];
  const hesitationCount = hesitationWords.reduce(
    (count, word) => count + (transcript.match(new RegExp(word, 'g')) || []).length,
    0
  );
  hesitationScore += hesitationCount * 10;

  // スコアからレベルを判定
  if (hesitationScore >= 50) {
    return 'high';
  }
  if (hesitationScore >= 25) {
    return 'moderate';
  }
  if (hesitationScore >= 10) {
    return 'slight';
  }
  return 'none';
}

/**
 * 小声かどうかを判定
 */
export function isWhispering(features: VoiceFeatures): boolean {
  return features.volume < 0.2 && features.speed < 120;
}

/**
 * ストレスレベルを計算
 */
export function calculateStressLevel(features: VoiceFeatures): number {
  let stressScore = 0;

  // ピッチの変動が大きい場合
  if (features.pitchVariation > 50) {
    stressScore += 30;
  }

  // ボリュームの変動が大きい場合
  if (features.volumeVariation > 0.3) {
    stressScore += 25;
  }

  // スピードが速い場合
  if (features.speed > 180) {
    stressScore += 20;
  }

  // ポーズが多い場合
  if (features.pauseFrequency > 10) {
    stressScore += 25;
  }

  return Math.min(100, stressScore);
}

/**
 * エネルギーレベルを計算
 */
export function calculateEnergyLevel(features: VoiceFeatures): number {
  let energyScore = 50; // ベースライン

  // ボリュームから判定
  energyScore += (features.volume - 0.5) * 40;

  // スピードから判定
  energyScore += (features.speed - 150) / 150 * 30;

  // ピッチから判定
  energyScore += (features.pitch - 200) / 200 * 20;

  return Math.max(0, Math.min(100, energyScore));
}

/**
 * 話し方の特徴を分析
 */
export function analyzeSpeakingStyle(features: VoiceFeatures): {
  confident: boolean;
  hurried: boolean;
  tired: boolean;
  nervous: boolean;
} {
  return {
    confident: features.volume > 0.6 && features.pitchVariation < 30 && features.pauseFrequency < 5,
    hurried: features.speed > 180 && features.pauseFrequency < 3,
    tired: features.volume < 0.4 && features.speed < 120 && features.pitchVariation < 25,
    nervous: features.pitchVariation > 50 || features.pauseFrequency > 10,
  };
}

/**
 * 総合的な音声文脈分析
 */
export function analyzeVoiceContext(
  features: VoiceFeatures,
  transcript: string
): VoiceContextAnalysis {
  // 感情トーン分析
  const { tone: emotionTone, confidence: emotionConfidence } = analyzeEmotionTone(features);

  // 息の強さ分析
  const breathStrength = analyzeBreathStrength(features);

  // 躊躇レベル分析
  const hesitationLevel = analyzeHesitationLevel(features, transcript);

  // 小声判定
  const isWhisper = isWhispering(features);

  // ストレスレベル計算
  const stressLevel = calculateStressLevel(features);

  // エネルギーレベル計算
  const energyLevel = calculateEnergyLevel(features);

  // 話し方の特徴分析
  const speakingStyle = analyzeSpeakingStyle(features);

  return {
    emotionTone,
    emotionConfidence,
    breathStrength,
    hesitationLevel,
    isWhispering: isWhisper,
    stressLevel,
    energyLevel,
    speakingStyle,
  };
}

/**
 * 音声特徴を推定（テキストのみから）
 */
export function estimateVoiceFeaturesFromText(transcript: string): VoiceFeatures {
  // テキストから音声特徴を推定
  const textLength = transcript.length;
  const sentenceCount = (transcript.match(/[。！？]/g) || []).length + 1;
  const pauseCount = (transcript.match(/[、，]/g) || []).length;

  // 感嘆符や疑問符から感情を推定
  const hasExclamation = transcript.includes('！') || transcript.includes('!');
  const hasQuestion = transcript.includes('？') || transcript.includes('?');

  // 推定値を計算
  const estimatedSpeed = 150; // デフォルト
  const estimatedPitch = hasExclamation ? 220 : 200;
  const estimatedVolume = hasExclamation ? 0.7 : 0.5;
  const estimatedPitchVariation = hasExclamation || hasQuestion ? 40 : 25;
  const estimatedVolumeVariation = hasExclamation ? 0.3 : 0.2;
  const estimatedPauseFrequency = (pauseCount / textLength) * 100;
  const estimatedAveragePauseDuration = 500;

  return {
    pitch: estimatedPitch,
    volume: estimatedVolume,
    speed: estimatedSpeed,
    pitchVariation: estimatedPitchVariation,
    volumeVariation: estimatedVolumeVariation,
    pauseFrequency: estimatedPauseFrequency,
    averagePauseDuration: estimatedAveragePauseDuration,
  };
}
