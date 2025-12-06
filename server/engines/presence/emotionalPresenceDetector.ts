/**
 * Emotional Presence Detector
 * 感情波の存在感計測エンジン
 * 
 * 音声の揺れ・速度・震えから感情波を推定する。
 */

export interface EmotionalPresence {
  /** 感情の種類 */
  emotion: "joy" | "sadness" | "anger" | "fear" | "calm" | "neutral";
  /** 感情の強度（0-100） */
  intensity: number;
  /** 感情の安定性（0-100） */
  stability: number;
  /** 感情の方向性（positive/negative/neutral） */
  direction: "positive" | "negative" | "neutral";
  /** 感情の深さ（0-100） */
  depth: number;
}

export interface EmotionalWave {
  /** 波の振幅（0-100） */
  amplitude: number;
  /** 波の周波数（Hz） */
  frequency: number;
  /** 波の位相（0-360度） */
  phase: number;
  /** 波の複雑度（0-100） */
  complexity: number;
}

export interface PresenceAnalysisResult {
  presence: EmotionalPresence;
  wave: EmotionalWave;
  /** 存在感の強さ（0-100） */
  presenceStrength: number;
  /** 推定信頼度（0-100） */
  confidence: number;
}

/**
 * 音声データから感情波の存在感を計測
 */
export function detectEmotionalPresence(audioData: {
  /** 音声の揺れ（0-100） */
  tremor: number;
  /** 音声の速度（words per minute） */
  speed: number;
  /** 音声の震え（0-100） */
  vibration: number;
  /** 音量レベル（0-100） */
  volumeLevel: number;
  /** 音声周波数（Hz） */
  frequency: number;
  /** ピッチの変動（0-100） */
  pitchVariation: number;
}): PresenceAnalysisResult {
  const { tremor, speed, vibration, volumeLevel, frequency, pitchVariation } = audioData;

  // 感情の種類を判定
  const emotion = detectEmotion(tremor, speed, vibration, frequency);
  
  // 感情の強度を計算
  const intensity = calculateIntensity(volumeLevel, pitchVariation, tremor);
  
  // 感情の安定性を計算
  const stability = calculateStability(tremor, vibration, pitchVariation);
  
  // 感情の方向性を判定
  const direction = determineDirection(emotion);
  
  // 感情の深さを計算
  const depth = calculateDepth(intensity, stability, frequency);
  
  // 感情波のパラメータを計算
  const amplitude = calculateAmplitude(intensity, volumeLevel);
  const waveFrequency = calculateWaveFrequency(speed, frequency);
  const phase = calculatePhase(tremor, vibration);
  const complexity = calculateComplexity(pitchVariation, tremor, vibration);
  
  // 存在感の強さを計算
  const presenceStrength = calculatePresenceStrength(intensity, depth, amplitude);
  
  // 信頼度を計算
  const confidence = calculateConfidence(volumeLevel, stability);

  return {
    presence: {
      emotion,
      intensity,
      stability,
      direction,
      depth,
    },
    wave: {
      amplitude,
      frequency: waveFrequency,
      phase,
      complexity,
    },
    presenceStrength,
    confidence,
  };
}

/**
 * 感情の種類を検出
 */
function detectEmotion(
  tremor: number,
  speed: number,
  vibration: number,
  frequency: number
): "joy" | "sadness" | "anger" | "fear" | "calm" | "neutral" {
  // 喜び：高周波数、速い、揺れ少ない
  if (frequency > 200 && speed > 150 && tremor < 40) {
    return "joy";
  }
  
  // 悲しみ：低周波数、遅い、揺れ大きい
  if (frequency < 150 && speed < 100 && tremor > 60) {
    return "sadness";
  }
  
  // 怒り：低周波数、速い、震え大きい
  if (frequency < 150 && speed > 150 && vibration > 70) {
    return "anger";
  }
  
  // 恐れ：高周波数、速い、震え大きい
  if (frequency > 200 && speed > 120 && vibration > 60) {
    return "fear";
  }
  
  // 落ち着き：中周波数、遅い、揺れ少ない
  if (frequency >= 150 && frequency <= 200 && speed < 120 && tremor < 30) {
    return "calm";
  }
  
  return "neutral";
}

/**
 * 感情の強度を計算
 */
function calculateIntensity(volumeLevel: number, pitchVariation: number, tremor: number): number {
  // 音量、ピッチ変動、揺れから強度を計算
  return Math.min(100, (volumeLevel + pitchVariation + tremor) / 3);
}

/**
 * 感情の安定性を計算
 */
function calculateStability(tremor: number, vibration: number, pitchVariation: number): number {
  // 揺れ、震え、ピッチ変動が少ないほど安定
  const instability = (tremor + vibration + pitchVariation) / 3;
  return Math.max(0, 100 - instability);
}

/**
 * 感情の方向性を判定
 */
function determineDirection(emotion: string): "positive" | "negative" | "neutral" {
  if (emotion === "joy" || emotion === "calm") return "positive";
  if (emotion === "sadness" || emotion === "anger" || emotion === "fear") return "negative";
  return "neutral";
}

/**
 * 感情の深さを計算
 */
function calculateDepth(intensity: number, stability: number, frequency: number): number {
  // 強度が高く、安定していて、周波数が低いほど深い
  const frequencyFactor = Math.max(0, 100 - frequency / 3); // 低周波数ほど深い
  return Math.min(100, (intensity + stability + frequencyFactor) / 3);
}

/**
 * 波の振幅を計算
 */
function calculateAmplitude(intensity: number, volumeLevel: number): number {
  return Math.min(100, (intensity + volumeLevel) / 2);
}

/**
 * 波の周波数を計算
 */
function calculateWaveFrequency(speed: number, frequency: number): number {
  // 音声速度と周波数から波の周波数を計算
  return (speed / 100) * (frequency / 200);
}

/**
 * 波の位相を計算
 */
function calculatePhase(tremor: number, vibration: number): number {
  // 揺れと震えから位相を計算（0-360度）
  return ((tremor + vibration) / 2) * 3.6;
}

/**
 * 波の複雑度を計算
 */
function calculateComplexity(pitchVariation: number, tremor: number, vibration: number): number {
  return Math.min(100, (pitchVariation + tremor + vibration) / 3);
}

/**
 * 存在感の強さを計算
 */
function calculatePresenceStrength(intensity: number, depth: number, amplitude: number): number {
  return Math.min(100, (intensity + depth + amplitude) / 3);
}

/**
 * 信頼度を計算
 */
function calculateConfidence(volumeLevel: number, stability: number): number {
  // 音量が適切で、安定しているほど信頼度が高い
  const volumeConfidence = volumeLevel > 20 && volumeLevel < 90 ? 100 : 50;
  return Math.min(100, (volumeConfidence + stability) / 2);
}

/**
 * 感情波の追跡クラス
 */
export class EmotionalWaveTracker {
  private history: PresenceAnalysisResult[] = [];
  private maxHistorySize = 20;

  /**
   * 新しい感情波データを追加
   */
  addWaveData(result: PresenceAnalysisResult): void {
    this.history.push(result);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 感情の変化傾向を取得
   */
  getEmotionTrend(): {
    currentEmotion: string;
    previousEmotion: string;
    trend: "intensifying" | "weakening" | "stable" | "shifting";
  } {
    if (this.history.length < 2) {
      return {
        currentEmotion: "neutral",
        previousEmotion: "neutral",
        trend: "stable",
      };
    }

    const current = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];

    const currentEmotion = current.presence.emotion;
    const previousEmotion = previous.presence.emotion;

    let trend: "intensifying" | "weakening" | "stable" | "shifting";
    
    if (currentEmotion !== previousEmotion) {
      trend = "shifting";
    } else if (current.presence.intensity > previous.presence.intensity + 10) {
      trend = "intensifying";
    } else if (current.presence.intensity < previous.presence.intensity - 10) {
      trend = "weakening";
    } else {
      trend = "stable";
    }

    return { currentEmotion, previousEmotion, trend };
  }

  /**
   * 感情波の平均を取得
   */
  getAverageWave(): EmotionalWave | null {
    if (this.history.length === 0) return null;

    const sum = this.history.reduce(
      (acc, r) => ({
        amplitude: acc.amplitude + r.wave.amplitude,
        frequency: acc.frequency + r.wave.frequency,
        phase: acc.phase + r.wave.phase,
        complexity: acc.complexity + r.wave.complexity,
      }),
      { amplitude: 0, frequency: 0, phase: 0, complexity: 0 }
    );

    const count = this.history.length;

    return {
      amplitude: sum.amplitude / count,
      frequency: sum.frequency / count,
      phase: sum.phase / count,
      complexity: sum.complexity / count,
    };
  }

  /**
   * 存在感の強さの推移を取得
   */
  getPresenceStrengthHistory(): number[] {
    return this.history.map(r => r.presenceStrength);
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.history = [];
  }
}
