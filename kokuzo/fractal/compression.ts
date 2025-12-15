/**
 * FractalSeed 定義と圧縮/展開エンジン
 */

import type { KZUserId } from "../storage/osCore";
import type { SemanticUnit, SemanticUnitId } from "../semantic/engine";
import { averageEmbedding } from "../semantic/engine";
import { callLLM } from "../../server/_core/llm";

// crypto.randomUUID() の型定義
declare const crypto: {
  randomUUID(): string;
};

export type SeedId = string;

export interface FractalSeed {
  id: SeedId;
  ownerId: KZUserId;
  semanticUnitIds: SemanticUnitId[];
  compressedRepresentation: {
    centroidVector: number[]; // semantic centroid
    kotodamaVector: {
      vowelVector: number[];
      consonantVector: number[];
      fire: number;
      water: number;
      balance: number;
    };
    fireWaterBalance: number; // -1 (水優勢) ～ +1 (火優勢)
    kanagiPhaseMode: "L-IN" | "L-OUT" | "R-IN" | "R-OUT";
    mainTags: string[];
    lawIds: string[]; // 言霊一言法則ID
    semanticEdges: Array<{
      targetId: SemanticUnitId;
      relation: "refers_to" | "part_of" | "explains" | "derived_from";
      weight: number;
    }>;
    seedWeight: number; // 生成力 (0-1)
  };
  laws: string[];
  createdAt: number;
}

/**
 * セマンティックユニットからフラクタルシードを作成（完全版）
 */
export function createFractalSeed(units: SemanticUnit[]): FractalSeed {
  if (units.length === 0) {
    throw new Error("Cannot create fractal seed from empty units");
  }

  // セマンティック centroid
  const embeddings = units
    .map(u => u.embedding)
    .filter((e): e is number[] => e !== undefined && e.length > 0);
  const centroidVector = embeddings.length > 0 ? averageEmbedding(embeddings) : [];

  // Kotodama centroid
  const kotodamaVector = {
    vowelVector: [0, 0, 0, 0, 0] as number[],
    consonantVector: [0, 0, 0, 0, 0, 0, 0, 0, 0] as number[],
    fire: 0,
    water: 0,
    balance: 0,
  };

  let kanagiPhaseCounts: Record<"L-IN" | "L-OUT" | "R-IN" | "R-OUT", number> = {
    "L-IN": 0,
    "L-OUT": 0,
    "R-IN": 0,
    "R-OUT": 0,
  };

  for (const unit of units) {
    if (unit.kotodamaSignature) {
      for (let i = 0; i < 5; i++) {
        kotodamaVector.vowelVector[i] += unit.kotodamaSignature.vowelVector[i];
      }
      for (let i = 0; i < 9; i++) {
        kotodamaVector.consonantVector[i] += unit.kotodamaSignature.consonantVector[i];
      }
      kotodamaVector.fire += unit.kotodamaSignature.fire;
      kotodamaVector.water += unit.kotodamaSignature.water;
      kotodamaVector.balance += unit.kotodamaSignature.balance;
    }
    if (unit.amatsuKanagiPhase) {
      kanagiPhaseCounts[unit.amatsuKanagiPhase]++;
    }
  }

  const count = units.length;
  if (count > 0) {
    for (let i = 0; i < 5; i++) {
      kotodamaVector.vowelVector[i] /= count;
    }
    for (let i = 0; i < 9; i++) {
      kotodamaVector.consonantVector[i] /= count;
    }
    kotodamaVector.fire /= count;
    kotodamaVector.water /= count;
    kotodamaVector.balance /= count;
  }

  // 天津金木フェーズモード（最多のフェーズ）
  const kanagiPhaseMode = Object.entries(kanagiPhaseCounts).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0] as "L-IN" | "L-OUT" | "R-IN" | "R-OUT";

  // タグと法則
  const mainTags = aggregateTags(units);
  const laws = matchLawsAndUnits(units);
  const lawIds = laws.map((law, index) => `law_${index}_${law.replace(/[^a-zA-Z0-9]/g, '_')}`);

  // セマンティックエッジ（関係性）
  const semanticEdges: FractalSeed["compressedRepresentation"]["semanticEdges"] = [];
  for (const unit of units) {
    for (const relation of unit.relations) {
      semanticEdges.push({
        targetId: relation.targetId,
        relation: relation.type,
        weight: 1.0, // デフォルト重み
      });
    }
  }

  // シード重み（生成力）を計算
  // ユニット数、タグ数、エッジ数に基づく
  const seedWeight = Math.min(1.0, (units.length * 0.1 + mainTags.length * 0.05 + semanticEdges.length * 0.02));

  const compressedRepresentation = {
    centroidVector,
    kotodamaVector,
    fireWaterBalance: kotodamaVector.balance,
    kanagiPhaseMode,
    mainTags,
    lawIds,
    semanticEdges,
    seedWeight,
  };

  return {
    id: crypto.randomUUID(),
    ownerId: units[0].ownerId,
    semanticUnitIds: units.map(u => u.id),
    compressedRepresentation,
    laws,
    createdAt: Date.now(),
  };
}

/**
 * タグを集約
 */
function aggregateTags(units: SemanticUnit[]): string[] {
  const tagCounts: Record<string, number> = {};
  
  for (const unit of units) {
    for (const tag of unit.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
}

/**
 * 法則とユニットをマッチング
 */
function matchLawsAndUnits(units: SemanticUnit[]): string[] {
  const laws: string[] = [];
  
  for (const unit of units) {
    if (unit.amatsuKanagiPhase) {
      laws.push(`kanagi:${unit.amatsuKanagiPhase}`);
    }
    if (unit.kotodamaSignature) {
      if (unit.kotodamaSignature.fire > unit.kotodamaSignature.water) {
        laws.push("fire-dominant");
      } else if (unit.kotodamaSignature.water > unit.kotodamaSignature.fire) {
        laws.push("water-dominant");
      }
      laws.push(`motion:${unit.kotodamaSignature.motion}`);
    }
  }
  
  return [...new Set(laws)];
}

/**
 * フラクタルシードを展開（後方互換性のため残す）
 */
export async function expandFractalSeed(
  seed: FractalSeed,
  targetForm: "summary" | "fullText" | "newForm"
): Promise<string> {
  // expansion.ts の expandSeed を使用
  const { expandSeed } = await import("./expansion");
  return await expandSeed(seed, targetForm);
}

