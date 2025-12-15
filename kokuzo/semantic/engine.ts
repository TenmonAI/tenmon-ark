/**
 * SemanticUnit / KotodamaSignature / KanagiPhase 定義
 */

import type { KZFileId, KZUserId } from "../storage/osCore";
import { embedText } from "../../server/concierge/embedder";
import { computeReishoSignature, type ReishoSignature } from "../../server/reisho/reishoKernel";

export type SemanticUnitId = string;

export type KanagiPhase = "L-IN" | "L-OUT" | "R-IN" | "R-OUT";

export interface KotodamaSignature {
  vowelVector: number[];     // [ア, イ, ウ, エ, オ]
  consonantVector: number[]; // [K,S,T,N,H,M,Y,R,W...]
  water: number;
  fire: number;
  balance: number; // -1 (水優勢) ～ +1 (火優勢)
  motion: "rise" | "fall" | "spiral" | "expand" | "contract";
}

export interface SemanticUnit {
  id: SemanticUnitId;
  fileId: KZFileId;
  ownerId: KZUserId;
  type: "text" | "image" | "audio" | "video" | "mixed";
  language?: string;
  rawText?: string;
  embedding?: number[];
  tags: string[];
  relations: {
    type: "refers_to" | "part_of" | "explains" | "derived_from";
    targetId: SemanticUnitId;
  }[];
  kotodamaSignature?: KotodamaSignature;
  amatsuKanagiPhase?: KanagiPhase;
  enhancedSignature?: {
    unifiedVector: number[];
    kanagiTensor: number[][][][];
    spiralTensor: {
      coordinates: Array<{ phoneme: string; row: number; col: number; spiralIndex: number }>;
      spiralCentroid: { row: number; col: number; spiralIndex: number };
    };
  };
  /** Reishō シグネチャ（全OSの共通シグネチャ） */
  reishoSignature?: ReishoSignature;
}

/**
 * テキストをセマンティックユニットに分割
 */
export async function splitIntoSemanticUnits(
  text: string,
  fileId: KZFileId,
  ownerId: KZUserId
): Promise<SemanticUnit[]> {
  const paragraphs = text.split(/\n\s*\n/);
  const units: SemanticUnit[] = [];

  for (const p of paragraphs) {
    if (!p.trim()) continue;
    
    const embeddingResult = await embedText(p);
    const embedding = typeof embeddingResult === 'object' && 'error' in embeddingResult 
      ? undefined 
      : Array.isArray(embeddingResult) ? embeddingResult as number[] : undefined;
    
    const tags = extractKeywords(p);
    const sig = computeKotodamaSignature(p);
    const phase = computeKanagiPhase(p, sig);
    const enhanced = computeEnhancedSignature(p);
    
    // Reishō シグネチャを計算
    const reishoSignature = computeReishoSignature(p);
    
    units.push({
      id: crypto.randomUUID(),
      fileId,
      ownerId,
      type: "text",
      rawText: p,
      embedding,
      tags,
      relations: [],
      kotodamaSignature: sig,
      amatsuKanagiPhase: phase,
      enhancedSignature: {
        unifiedVector: enhanced.unifiedVector,
        kanagiTensor: enhanced.kanagiTensor,
        spiralTensor: enhanced.spiralTensor,
      },
      reishoSignature,
    });
  }
  return units;
}

/**
 * キーワードを抽出（簡易版）
 */
function extractKeywords(text: string): string[] {
  // 簡易的なキーワード抽出（実際の実装ではより高度な処理が必要）
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['の', 'に', 'は', 'を', 'が', 'で', 'と', 'も', 'など', 'the', 'a', 'an', 'is', 'are']);
  const keywords = words
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 10);
  return keywords;
}

/**
 * 言霊シグネチャを計算（数理モデルベース）
 */
function computeKotodamaSignature(text: string): KotodamaSignature {
  const vVec = vowelVector(text);
  const cVec = consonantVector(text);
  const { fire, water, balance } = computeFireWaterBalance(vVec, cVec);
  const motionVec = computeMotionVector(text);
  
  // モーションを決定（最大値のモーションを選択）
  const motionEntries = Object.entries(motionVec) as [string, number][];
  const maxMotion = motionEntries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const motion = maxMotion[0] as KotodamaSignature['motion'];
  
  return {
    vowelVector: vVec,
    consonantVector: cVec,
    fire,
    water,
    balance,
    motion,
  };
}

/**
 * 天津金木フェーズを計算（数理モデルベース）
 */
function computeKanagiPhase(text: string, kotodamaSig?: KotodamaSignature): KanagiPhase {
  if (kotodamaSig) {
    // 既に計算済みの KotodamaSignature を使用
    const motionVec = computeMotionVector(text);
    return computeKanagiPhaseFromFW(kotodamaSig.fire, kotodamaSig.water, motionVec);
  }
  
  // KotodamaSignature がない場合は再計算
  const vVec = vowelVector(text);
  const cVec = consonantVector(text);
  const { fire, water } = computeFireWaterBalance(vVec, cVec);
  const motionVec = computeMotionVector(text);
  
  return computeKanagiPhaseFromFW(fire, water, motionVec);
}

/**
 * エンベディングの平均を計算
 */
export function averageEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  
  const dimension = embeddings[0].length;
  const result: number[] = new Array(dimension).fill(0);
  
  for (const emb of embeddings) {
    if (emb.length === dimension) {
      for (let i = 0; i < dimension; i++) {
        result[i] += emb[i];
      }
    }
  }
  
  for (let i = 0; i < dimension; i++) {
    result[i] /= embeddings.length;
  }
  
  return result;
}

