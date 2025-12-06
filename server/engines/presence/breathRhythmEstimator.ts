/**
 * Breath Rhythm Estimator
 * 呼吸リズム推定エンジン
 * 
 * マイク入力から呼吸周期を推定し、緊張/安心/興奮のフラグを検知する。
 */

export interface BreathRhythm {
  /** 呼吸周期（ミリ秒） */
  cycleMs: number;
  /** 吸気時間（ミリ秒） */
  inhaleMs: number;
  /** 呼気時間（ミリ秒） */
  exhaleMs: number;
  /** 呼吸の深さ（0-100） */
  depth: number;
  /** 呼吸の規則性（0-100） */
  regularity: number;
  /** 状態フラグ */
  state: "tension" | "calm" | "excitement" | "neutral";
}

export interface BreathAnalysisResult {
  rhythm: BreathRhythm;
  /** 緊張度（0-100） */
  tensionLevel: number;
  /** 安心度（0-100） */
  calmLevel: number;
  /** 興奮度（0-100） */
  excitementLevel: number;
  /** 推定信頼度（0-100） */
  confidence: number;
}

/**
 * 音声データから呼吸リズムを推定
 */
export function estimateBreathRhythm(audioData: {
  /** 音量レベル（0-100） */
  volumeLevel: number;
  /** 音声周波数（Hz） */
  frequency: number;
  /** 音声の揺れ（0-100） */
  tremor: number;
  /** サンプリング時間（ミリ秒） */
  durationMs: number;
}): BreathAnalysisResult {
  const { volumeLevel, frequency, tremor, durationMs } = audioData;

  // 呼吸周期の推定（音量の変動から）
  const cycleMs = estimateCycleFromVolume(volumeLevel, durationMs);
  
  // 吸気・呼気の時間推定
  const inhaleMs = cycleMs * 0.4; // 通常は吸気40%
  const exhaleMs = cycleMs * 0.6; // 呼気60%
  
  // 呼吸の深さ推定（音量から）
  const depth = Math.min(100, volumeLevel * 1.2);
  
  // 呼吸の規則性推定（音声の揺れから逆算）
  const regularity = Math.max(0, 100 - tremor);
  
  // 状態判定
  const state = determineBreathState(cycleMs, depth, regularity, tremor);
  
  // 緊張度・安心度・興奮度の計算
  const tensionLevel = calculateTensionLevel(cycleMs, tremor, regularity);
  const calmLevel = calculateCalmLevel(cycleMs, depth, regularity);
  const excitementLevel = calculateExcitementLevel(cycleMs, frequency, tremor);
  
  // 信頼度の計算（データの質に基づく）
  const confidence = calculateConfidence(volumeLevel, durationMs);

  return {
    rhythm: {
      cycleMs,
      inhaleMs,
      exhaleMs,
      depth,
      regularity,
      state,
    },
    tensionLevel,
    calmLevel,
    excitementLevel,
    confidence,
  };
}

/**
 * 音量変動から呼吸周期を推定
 */
function estimateCycleFromVolume(volumeLevel: number, durationMs: number): number {
  // 音量が低い→呼吸が浅い→周期が短い
  // 音量が高い→呼吸が深い→周期が長い
  const baseCycle = 4000; // 基準4秒
  const volumeFactor = volumeLevel / 50; // 0.0 - 2.0
  
  return baseCycle * volumeFactor;
}

/**
 * 呼吸状態の判定
 */
function determineBreathState(
  cycleMs: number,
  depth: number,
  regularity: number,
  tremor: number
): "tension" | "calm" | "excitement" | "neutral" {
  // 緊張：短い周期、浅い呼吸、不規則
  if (cycleMs < 3000 && depth < 40 && regularity < 50) {
    return "tension";
  }
  
  // 安心：長い周期、深い呼吸、規則的
  if (cycleMs > 5000 && depth > 60 && regularity > 70) {
    return "calm";
  }
  
  // 興奮：短い周期、深い呼吸、揺れが大きい
  if (cycleMs < 3500 && depth > 50 && tremor > 60) {
    return "excitement";
  }
  
  return "neutral";
}

/**
 * 緊張度の計算
 */
function calculateTensionLevel(cycleMs: number, tremor: number, regularity: number): number {
  // 短い周期、揺れが大きい、不規則→緊張度高い
  const cycleFactor = Math.max(0, 100 - (cycleMs / 60)); // 短いほど高い
  const tremorFactor = tremor;
  const irregularityFactor = 100 - regularity;
  
  return Math.min(100, (cycleFactor + tremorFactor + irregularityFactor) / 3);
}

/**
 * 安心度の計算
 */
function calculateCalmLevel(cycleMs: number, depth: number, regularity: number): number {
  // 長い周期、深い呼吸、規則的→安心度高い
  const cycleFactor = Math.min(100, cycleMs / 60); // 長いほど高い
  const depthFactor = depth;
  const regularityFactor = regularity;
  
  return Math.min(100, (cycleFactor + depthFactor + regularityFactor) / 3);
}

/**
 * 興奮度の計算
 */
function calculateExcitementLevel(cycleMs: number, frequency: number, tremor: number): number {
  // 短い周期、高い周波数、揺れが大きい→興奮度高い
  const cycleFactor = Math.max(0, 100 - (cycleMs / 60));
  const frequencyFactor = Math.min(100, frequency / 3); // 300Hzを100とする
  const tremorFactor = tremor;
  
  return Math.min(100, (cycleFactor + frequencyFactor + tremorFactor) / 3);
}

/**
 * 信頼度の計算
 */
function calculateConfidence(volumeLevel: number, durationMs: number): number {
  // 音量が適切で、サンプリング時間が十分→信頼度高い
  const volumeConfidence = volumeLevel > 20 && volumeLevel < 90 ? 100 : 50;
  const durationConfidence = Math.min(100, durationMs / 30); // 3秒で100%
  
  return Math.min(100, (volumeConfidence + durationConfidence) / 2);
}

/**
 * 呼吸リズムの変化を追跡
 */
export class BreathRhythmTracker {
  private history: BreathAnalysisResult[] = [];
  private maxHistorySize = 10;

  /**
   * 新しい呼吸データを追加
   */
  addBreathData(result: BreathAnalysisResult): void {
    this.history.push(result);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 呼吸リズムの変化傾向を取得
   */
  getTrend(): {
    tensionTrend: "rising" | "falling" | "stable";
    calmTrend: "rising" | "falling" | "stable";
    excitementTrend: "rising" | "falling" | "stable";
  } {
    if (this.history.length < 2) {
      return {
        tensionTrend: "stable",
        calmTrend: "stable",
        excitementTrend: "stable",
      };
    }

    const recent = this.history.slice(-3);
    const tensionTrend = this.calculateTrend(recent.map(r => r.tensionLevel));
    const calmTrend = this.calculateTrend(recent.map(r => r.calmLevel));
    const excitementTrend = this.calculateTrend(recent.map(r => r.excitementLevel));

    return { tensionTrend, calmTrend, excitementTrend };
  }

  /**
   * 数値の変化傾向を計算
   */
  private calculateTrend(values: number[]): "rising" | "falling" | "stable" {
    if (values.length < 2) return "stable";
    
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    
    if (diff > 10) return "rising";
    if (diff < -10) return "falling";
    return "stable";
  }

  /**
   * 平均呼吸リズムを取得
   */
  getAverageRhythm(): BreathRhythm | null {
    if (this.history.length === 0) return null;

    const sum = this.history.reduce(
      (acc, r) => ({
        cycleMs: acc.cycleMs + r.rhythm.cycleMs,
        inhaleMs: acc.inhaleMs + r.rhythm.inhaleMs,
        exhaleMs: acc.exhaleMs + r.rhythm.exhaleMs,
        depth: acc.depth + r.rhythm.depth,
        regularity: acc.regularity + r.rhythm.regularity,
      }),
      { cycleMs: 0, inhaleMs: 0, exhaleMs: 0, depth: 0, regularity: 0 }
    );

    const count = this.history.length;
    const avgCycleMs = sum.cycleMs / count;
    const avgDepth = sum.depth / count;
    const avgRegularity = sum.regularity / count;

    // 最も頻繁な状態を取得
    const states = this.history.map(r => r.rhythm.state);
    const stateCount = states.reduce((acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostFrequentState = Object.keys(stateCount).reduce((a, b) =>
      stateCount[a] > stateCount[b] ? a : b
    ) as "tension" | "calm" | "excitement" | "neutral";

    return {
      cycleMs: avgCycleMs,
      inhaleMs: sum.inhaleMs / count,
      exhaleMs: sum.exhaleMs / count,
      depth: avgDepth,
      regularity: avgRegularity,
      state: mostFrequentState,
    };
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.history = [];
  }
}
