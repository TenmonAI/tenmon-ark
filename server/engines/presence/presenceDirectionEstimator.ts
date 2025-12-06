/**
 * Presence Direction Estimator
 * 気配の方向性推定エンジン
 * 
 * 火：意志の方向性（前向き、強さ）
 * 水：受容の方向性（柔らかさ、深さ）
 * 中庸：静けさ、無
 */

export interface PresenceDirection {
  /** 火の方向性（0-100） */
  fireDirection: number;
  /** 水の方向性（0-100） */
  waterDirection: number;
  /** 中庸の度合い（0-100） */
  neutrality: number;
  /** 主要な方向性 */
  primaryDirection: "fire" | "water" | "neutral";
  /** 意志の強さ（0-100） */
  willStrength: number;
  /** 受容の深さ（0-100） */
  receptivityDepth: number;
}

export interface DirectionVector {
  /** X軸（火-水） */
  x: number;
  /** Y軸（強-弱） */
  y: number;
  /** Z軸（表-深） */
  z: number;
  /** ベクトルの大きさ */
  magnitude: number;
  /** ベクトルの角度（度） */
  angle: number;
}

export interface DirectionEstimationResult {
  direction: PresenceDirection;
  vector: DirectionVector;
  /** 方向性の明確さ（0-100） */
  clarity: number;
  /** 推定信頼度（0-100） */
  confidence: number;
}

/**
 * 音声データから気配の方向性を推定
 */
export function estimatePresenceDirection(audioData: {
  /** 音声の速度（words per minute） */
  speed: number;
  /** 音量レベル（0-100） */
  volumeLevel: number;
  /** 音声周波数（Hz） */
  frequency: number;
  /** 音声の揺れ（0-100） */
  tremor: number;
  /** ピッチの変動（0-100） */
  pitchVariation: number;
  /** 音声の震え（0-100） */
  vibration: number;
}): DirectionEstimationResult {
  const { speed, volumeLevel, frequency, tremor, pitchVariation, vibration } = audioData;

  // 火の方向性を計算（速い、高音、強い、明確）
  const fireDirection = calculateFireDirection(speed, frequency, volumeLevel, pitchVariation);
  
  // 水の方向性を計算（遅い、低音、柔らかい、揺らぎ）
  const waterDirection = calculateWaterDirection(speed, frequency, tremor, vibration);
  
  // 中庸の度合いを計算
  const neutrality = calculateNeutrality(fireDirection, waterDirection);
  
  // 主要な方向性を判定
  const primaryDirection = determinePrimaryDirection(fireDirection, waterDirection, neutrality);
  
  // 意志の強さを計算（火の特性）
  const willStrength = calculateWillStrength(fireDirection, volumeLevel, speed);
  
  // 受容の深さを計算（水の特性）
  const receptivityDepth = calculateReceptivityDepth(waterDirection, tremor, frequency);
  
  // 方向ベクトルを計算
  const vector = calculateDirectionVector(fireDirection, waterDirection, willStrength, receptivityDepth);
  
  // 方向性の明確さを計算
  const clarity = calculateClarity(fireDirection, waterDirection, neutrality);
  
  // 信頼度を計算
  const confidence = calculateConfidence(volumeLevel, clarity);

  return {
    direction: {
      fireDirection,
      waterDirection,
      neutrality,
      primaryDirection,
      willStrength,
      receptivityDepth,
    },
    vector,
    clarity,
    confidence,
  };
}

/**
 * 火の方向性を計算
 */
function calculateFireDirection(
  speed: number,
  frequency: number,
  volumeLevel: number,
  pitchVariation: number
): number {
  // 速い、高音、大きい、変動が大きい→火の方向性が強い
  const speedFactor = Math.min(100, speed / 2); // 200wpm = 100
  const frequencyFactor = Math.min(100, frequency / 3); // 300Hz = 100
  const volumeFactor = volumeLevel;
  const variationFactor = pitchVariation;
  
  return Math.min(100, (speedFactor + frequencyFactor + volumeFactor + variationFactor) / 4);
}

/**
 * 水の方向性を計算
 */
function calculateWaterDirection(
  speed: number,
  frequency: number,
  tremor: number,
  vibration: number
): number {
  // 遅い、低音、揺らぎが大きい→水の方向性が強い
  const speedFactor = Math.max(0, 100 - speed / 2); // 遅いほど高い
  const frequencyFactor = Math.max(0, 100 - frequency / 3); // 低音ほど高い
  const tremorFactor = tremor;
  const vibrationFactor = vibration;
  
  return Math.min(100, (speedFactor + frequencyFactor + tremorFactor + vibrationFactor) / 4);
}

/**
 * 中庸の度合いを計算
 */
function calculateNeutrality(fireDirection: number, waterDirection: number): number {
  // 火と水のバランスが取れているほど中庸
  const balance = 100 - Math.abs(fireDirection - waterDirection);
  const average = (fireDirection + waterDirection) / 2;
  
  // バランスが良く、かつ両方が中程度の時に中庸度が高い
  if (average > 40 && average < 60 && balance > 90) {
    return 100;
  }
  
  // バランスが良い場合のみ中庸度を返す
  if (balance > 80) {
    return balance;
  } else if (balance > 70) {
    return 70;
  } else {
    return Math.min(65, balance);
  }
}

/**
 * 主要な方向性を判定
 */
function determinePrimaryDirection(
  fireDirection: number,
  waterDirection: number,
  neutrality: number
): "fire" | "water" | "neutral" {
  const diff = Math.abs(fireDirection - waterDirection);
  
  // 中庸度が非常に高い場合は中庸
  if (neutrality > 90) {
    return "neutral";
  }
  
  // 火と水の差が明確に大きい場合
  if (diff > 20) {
    return fireDirection > waterDirection ? "fire" : "water";
  }
  
  // 中程度の差があり、中庸度が低い場合
  if (diff > 10 && neutrality < 82) {
    return fireDirection > waterDirection ? "fire" : "water";
  }
  
  // それ以外は中庸
  return "neutral";
}

/**
 * 意志の強さを計算（火の特性）
 */
function calculateWillStrength(fireDirection: number, volumeLevel: number, speed: number): number {
  // 火の方向性、音量、速度から意志の強さを計算
  return Math.min(100, (fireDirection + volumeLevel + Math.min(100, speed / 2)) / 3);
}

/**
 * 受容の深さを計算（水の特性）
 */
function calculateReceptivityDepth(waterDirection: number, tremor: number, frequency: number): number {
  // 水の方向性、揺らぎ、低音から受容の深さを計算
  const lowFrequencyFactor = Math.max(0, 100 - frequency / 3);
  return Math.min(100, (waterDirection + tremor + lowFrequencyFactor) / 3);
}

/**
 * 方向ベクトルを計算
 */
function calculateDirectionVector(
  fireDirection: number,
  waterDirection: number,
  willStrength: number,
  receptivityDepth: number
): DirectionVector {
  // X軸：火-水（-100〜100）
  const x = fireDirection - waterDirection;
  
  // Y軸：強-弱（-100〜100）
  const y = willStrength - receptivityDepth;
  
  // Z軸：表-深（-100〜100）
  const z = (fireDirection + waterDirection) / 2 - 50;
  
  // ベクトルの大きさ
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  
  // ベクトルの角度（度）
  const angle = Math.atan2(y, x) * (180 / Math.PI);
  
  return { x, y, z, magnitude, angle };
}

/**
 * 方向性の明確さを計算
 */
function calculateClarity(fireDirection: number, waterDirection: number, neutrality: number): number {
  // 火か水のどちらかが明確に強い、または中庸が明確→明確さが高い
  const directionDiff = Math.abs(fireDirection - waterDirection);
  
  if (neutrality > 80) {
    return 100; // 中庸が明確
  }
  
  if (directionDiff > 50) {
    return 100; // 方向性が明確
  }
  
  return Math.min(100, directionDiff * 2);
}

/**
 * 信頼度を計算
 */
function calculateConfidence(volumeLevel: number, clarity: number): number {
  // 音量が適切で、方向性が明確なほど信頼度が高い
  const volumeConfidence = volumeLevel > 20 && volumeLevel < 90 ? 100 : 50;
  return Math.min(100, (volumeConfidence + clarity) / 2);
}

/**
 * 気配の方向性追跡クラス
 */
export class PresenceDirectionTracker {
  private history: DirectionEstimationResult[] = [];
  private maxHistorySize = 15;

  /**
   * 新しい方向性データを追加
   */
  addDirectionData(result: DirectionEstimationResult): void {
    this.history.push(result);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 方向性の変化傾向を取得
   */
  getDirectionTrend(): {
    fireTrend: "rising" | "falling" | "stable";
    waterTrend: "rising" | "falling" | "stable";
    primaryDirection: "fire" | "water" | "neutral";
    directionShift: boolean;
  } {
    if (this.history.length < 2) {
      return {
        fireTrend: "stable",
        waterTrend: "stable",
        primaryDirection: "neutral",
        directionShift: false,
      };
    }

    const recent = this.history.slice(-3);
    const fireTrend = this.calculateTrend(recent.map(r => r.direction.fireDirection));
    const waterTrend = this.calculateTrend(recent.map(r => r.direction.waterDirection));
    
    // 最も頻繁な主要方向性
    const primaryDirections = recent.map(r => r.direction.primaryDirection);
    const primaryDirection = this.getMostFrequent(primaryDirections);
    
    // 方向性の変化があったか（火水の値が大きく変化したかを判定）
    const firstFire = recent[0].direction.fireDirection;
    const lastFire = recent[recent.length - 1].direction.fireDirection;
    const firstWater = recent[0].direction.waterDirection;
    const lastWater = recent[recent.length - 1].direction.waterDirection;
    const fireChange = Math.abs(lastFire - firstFire);
    const waterChange = Math.abs(lastWater - firstWater);
    const directionShift = (fireChange > 20 || waterChange > 20) && 
                          primaryDirections[0] !== primaryDirections[primaryDirections.length - 1];

    return { fireTrend, waterTrend, primaryDirection, directionShift };
  }

  /**
   * 数値の変化傾向を計算
   */
  private calculateTrend(values: number[]): "rising" | "falling" | "stable" {
    if (values.length < 2) return "stable";
    
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    
    if (diff > 15) return "rising";
    if (diff < -15) return "falling";
    return "stable";
  }

  /**
   * 最も頻繁な値を取得
   */
  private getMostFrequent<T>(values: T[]): T {
    const count = values.reduce((acc, v) => {
      acc.set(v, (acc.get(v) || 0) + 1);
      return acc;
    }, new Map<T, number>());
    
    let maxCount = 0;
    let mostFrequent = values[0];
    
    count.forEach((c, v) => {
      if (c > maxCount) {
        maxCount = c;
        mostFrequent = v;
      }
    });
    
    return mostFrequent;
  }

  /**
   * 平均方向ベクトルを取得
   */
  getAverageVector(): DirectionVector | null {
    if (this.history.length === 0) return null;

    const sum = this.history.reduce(
      (acc, r) => ({
        x: acc.x + r.vector.x,
        y: acc.y + r.vector.y,
        z: acc.z + r.vector.z,
      }),
      { x: 0, y: 0, z: 0 }
    );

    const count = this.history.length;
    const avgX = sum.x / count;
    const avgY = sum.y / count;
    const avgZ = sum.z / count;
    
    const magnitude = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);
    const angle = Math.atan2(avgY, avgX) * (180 / Math.PI);

    return {
      x: avgX,
      y: avgY,
      z: avgZ,
      magnitude,
      angle,
    };
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.history = [];
  }
}
