/**
 * 🔱 KOKŪZŌ Fractal Engine — 数理モデル vΩ
 * 次元を増やし、言霊・火水・天津金木ベクトルを統合座標に昇華
 */

import {
  vowelVector,
  consonantVector,
  computeFireWaterBalance,
  computeMotionVector,
  computeKanagiPhaseFromFW,
  gojuonSpiralMap,
} from "./mathModel";

/**
 * 統合言霊ベクトル
 * vowelVec + consonantVec + fire + water + balance を結合
 */
export function unifiedKotodamaVector(text: string): number[] {
  const vVec = vowelVector(text);
  const cVec = consonantVector(text);
  const { fire, water, balance } = computeFireWaterBalance(vVec, cVec);
  
  // 統合ベクトル: [vowel(5) + consonant(9) + fire(1) + water(1) + balance(1)] = 17次元
  return [...vVec, ...cVec, fire, water, balance];
}

/**
 * 天津金木テンソル（4D tensor）
 * (L/R × IN/OUT × fire/water × motion) を表現
 */
export function kanagiTensor(text: string): number[][][][] {
  const vVec = vowelVector(text);
  const cVec = consonantVector(text);
  const { fire, water } = computeFireWaterBalance(vVec, cVec);
  const motionVec = computeMotionVector(text);
  const phase = computeKanagiPhaseFromFW(fire, water, motionVec);
  
  // 4D tensor: [L/R][IN/OUT][fire/water][motion]
  // L/R: 0=L, 1=R
  // IN/OUT: 0=IN, 1=OUT
  // fire/water: 0=fire, 1=water
  // motion: 0=rise, 1=fall, 2=spiral, 3=expand, 4=contract
  
  const tensor: number[][][][] = [];
  
  for (let lr = 0; lr < 2; lr++) {
    tensor[lr] = [];
    for (let io = 0; io < 2; io++) {
      tensor[lr][io] = [];
      for (let fw = 0; fw < 2; fw++) {
        tensor[lr][io][fw] = [];
        for (let m = 0; m < 5; m++) {
          // フェーズとモーションに基づいて値を設定
          const isLeft = phase.startsWith("L");
          const isInner = phase.endsWith("IN");
          const isFire = fw === 0;
          
          let value = 0;
          if ((lr === 0 && isLeft) || (lr === 1 && !isLeft)) {
            value += 0.3;
          }
          if ((io === 0 && isInner) || (io === 1 && !isInner)) {
            value += 0.3;
          }
          if ((fw === 0 && fire > water) || (fw === 1 && water > fire)) {
            value += 0.2;
          }
          if (motionVec[m as keyof typeof motionVec] > 0.1) {
            value += motionVec[m as keyof typeof motionVec] * 0.2;
          }
          
          tensor[lr][io][fw][m] = value;
        }
      }
    }
  }
  
  return tensor;
}

/**
 * 五十音螺旋テンソル
 * 音素の螺旋座標を計算
 */
export function gojuonSpiralTensor(text: string): {
  coordinates: Array<{ phoneme: string; row: number; col: number; spiralIndex: number }>;
  spiralCentroid: { row: number; col: number; spiralIndex: number };
} {
  const phonemes = text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || [];
  const coordinates: Array<{ phoneme: string; row: number; col: number; spiralIndex: number }> = [];
  
  for (const phoneme of phonemes) {
    const coord = gojuonSpiralMap(phoneme);
    coordinates.push({
      phoneme,
      ...coord,
    });
  }
  
  // 螺旋中心（centroid）を計算
  if (coordinates.length === 0) {
    return {
      coordinates: [],
      spiralCentroid: { row: 5, col: 2, spiralIndex: 25 },
    };
  }
  
  const avgRow = coordinates.reduce((sum, c) => sum + c.row, 0) / coordinates.length;
  const avgCol = coordinates.reduce((sum, c) => sum + c.col, 0) / coordinates.length;
  const avgSpiralIndex = coordinates.reduce((sum, c) => sum + c.spiralIndex, 0) / coordinates.length;
  
  return {
    coordinates,
    spiralCentroid: {
      row: Math.round(avgRow),
      col: Math.round(avgCol),
      spiralIndex: Math.round(avgSpiralIndex),
    },
  };
}

/**
 * 拡張シグネチャ（Enhanced Signature）
 */
export interface EnhancedKotodamaSignature {
  unifiedVector: number[]; // 17次元統合ベクトル
  kanagiTensor: number[][][][]; // 4D tensor
  spiralTensor: {
    coordinates: Array<{ phoneme: string; row: number; col: number; spiralIndex: number }>;
    spiralCentroid: { row: number; col: number; spiralIndex: number };
  };
  original: {
    vowelVector: number[];
    consonantVector: number[];
    fire: number;
    water: number;
    balance: number;
    motion: "rise" | "fall" | "spiral" | "expand" | "contract";
  };
}

/**
 * 拡張シグネチャを計算
 */
export function computeEnhancedSignature(text: string): EnhancedKotodamaSignature {
  const vVec = vowelVector(text);
  const cVec = consonantVector(text);
  const { fire, water, balance } = computeFireWaterBalance(vVec, cVec);
  const motionVec = computeMotionVector(text);
  
  // モーションを決定
  const motionEntries = Object.entries(motionVec) as [string, number][];
  const maxMotion = motionEntries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const motion = maxMotion[0] as "rise" | "fall" | "spiral" | "expand" | "contract";
  
  return {
    unifiedVector: unifiedKotodamaVector(text),
    kanagiTensor: kanagiTensor(text),
    spiralTensor: gojuonSpiralTensor(text),
    original: {
      vowelVector: vVec,
      consonantVector: cVec,
      fire,
      water,
      balance,
      motion,
    },
  };
}

