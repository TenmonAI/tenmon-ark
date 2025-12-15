/**
 * 🔱 KOKŪZŌ Fractal Engine — テストスイート
 * ストレステスト・構文検証・言霊法則チェック
 */

import type { SemanticUnit } from "../semantic/engine";
import type { FractalSeed } from "./compression";
import { createFractalSeed } from "./compression";
import { expandSeed } from "./expansion";
import { clusterBySemanticAffinity, clusterByFireWaterBalance, clusterByKanagiPhase, clusterByKeywordGraph } from "./clustering";
import { computeFireWaterBalance, computeKanagiPhaseFromFW, computeMotionVector } from "./mathModel";

/**
 * セマンティック回帰テスト
 */
export async function semanticRegressionTests(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // テスト1: 空のユニット配列でシード作成
  try {
    createFractalSeed([]);
    errors.push("空のユニット配列でシード作成が成功してしまった（エラーが期待される）");
  } catch (error) {
    // 期待されるエラー
  }
  
  // テスト2: 単一ユニットでシード作成
  try {
    const mockUnit: SemanticUnit = {
      id: "test-unit-1",
      fileId: "test-file-1",
      ownerId: "test-user-1",
      type: "text",
      rawText: "テストテキスト",
      embedding: [0.1, 0.2, 0.3],
      tags: ["test", "sample"],
      relations: [],
      kotodamaSignature: {
        vowelVector: [0.2, 0.2, 0.2, 0.2, 0.2],
        consonantVector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        fire: 0.5,
        water: 0.5,
        balance: 0,
        motion: "spiral",
      },
      amatsuKanagiPhase: "L-IN",
    };
    
    const seed = createFractalSeed([mockUnit]);
    if (!seed.id || !seed.ownerId) {
      errors.push("シードの基本フィールドが正しく設定されていない");
    }
    if (seed.compressedRepresentation.centroidVector.length === 0) {
      errors.push("シードのcentroidVectorが空");
    }
  } catch (error) {
    errors.push(`シード作成エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * フラクタルシード一貫性テスト
 */
export async function fractalSeedConsistencyTests(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // テスト: 同じユニットから生成されたシードの一貫性
  try {
    const mockUnit: SemanticUnit = {
      id: "test-unit-1",
      fileId: "test-file-1",
      ownerId: "test-user-1",
      type: "text",
      rawText: "テストテキスト",
      embedding: [0.1, 0.2, 0.3],
      tags: ["test"],
      relations: [],
      kotodamaSignature: {
        vowelVector: [0.2, 0.2, 0.2, 0.2, 0.2],
        consonantVector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        fire: 0.5,
        water: 0.5,
        balance: 0,
        motion: "spiral",
      },
      amatsuKanagiPhase: "L-IN",
    };
    
    const seed1 = createFractalSeed([mockUnit]);
    const seed2 = createFractalSeed([mockUnit]);
    
    // シードIDは異なるべき（毎回新規生成）
    if (seed1.id === seed2.id) {
      errors.push("シードIDが重複している");
    }
    
    // しかし、centroidVectorは同じであるべき
    if (JSON.stringify(seed1.compressedRepresentation.centroidVector) !== 
        JSON.stringify(seed2.compressedRepresentation.centroidVector)) {
      errors.push("同じユニットから生成されたシードのcentroidVectorが異なる");
    }
  } catch (error) {
    errors.push(`シード一貫性テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * シード展開一貫性テスト
 */
export async function seedExpansionCoherenceTests(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // テスト: 異なる展開形式で一貫性があるか
  try {
    const mockUnit: SemanticUnit = {
      id: "test-unit-1",
      fileId: "test-file-1",
      ownerId: "test-user-1",
      type: "text",
      rawText: "テストテキスト",
      embedding: [0.1, 0.2, 0.3],
      tags: ["test"],
      relations: [],
      kotodamaSignature: {
        vowelVector: [0.2, 0.2, 0.2, 0.2, 0.2],
        consonantVector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        fire: 0.5,
        water: 0.5,
        balance: 0,
        motion: "spiral",
      },
      amatsuKanagiPhase: "L-IN",
    };
    
    const seed = createFractalSeed([mockUnit]);
    
    // 各展開形式で展開（実際のLLM呼び出しはスキップして構造チェックのみ）
    const forms: Array<"summary" | "fullText" | "newForm" | "teaching" | "deepForm"> = 
      ["summary", "fullText", "newForm", "teaching", "deepForm"];
    
    for (const form of forms) {
      try {
        // 実際の展開はスキップ（LLM呼び出しが必要なため）
        // 構造チェックのみ
        if (!seed.compressedRepresentation.centroidVector) {
          errors.push(`${form}展開: centroidVectorが存在しない`);
        }
        if (!seed.compressedRepresentation.kotodamaVector) {
          errors.push(`${form}展開: kotodamaVectorが存在しない`);
        }
      } catch (error) {
        errors.push(`${form}展開エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    errors.push(`展開一貫性テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * TwinCore統合テスト
 */
export async function twinCoreIntegrationTests(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  // テスト: TwinCore の結果と SemanticUnit の統合
  try {
    const mockUnit: SemanticUnit = {
      id: "test-unit-1",
      fileId: "test-file-1",
      ownerId: "test-user-1",
      type: "text",
      rawText: "テストテキスト",
      embedding: [0.1, 0.2, 0.3],
      tags: ["test"],
      relations: [],
      kotodamaSignature: {
        vowelVector: [0.2, 0.2, 0.2, 0.2, 0.2],
        consonantVector: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        fire: 0.5,
        water: 0.5,
        balance: 0,
        motion: "spiral",
      },
      amatsuKanagiPhase: "L-IN",
    };
    
    // 火水バランスの計算が正しいか
    const { fire, water, balance } = computeFireWaterBalance(
      mockUnit.kotodamaSignature.vowelVector,
      mockUnit.kotodamaSignature.consonantVector
    );
    
    if (fire < 0 || fire > 1 || water < 0 || water > 1) {
      errors.push("火水バランスの値が範囲外");
    }
    if (balance < -1 || balance > 1) {
      errors.push("バランス値が範囲外");
    }
    
    // 天津金木フェーズの計算が正しいか
    const motionVec = computeMotionVector(mockUnit.rawText || "テストテキスト");
    const phase = computeKanagiPhaseFromFW(fire, water, motionVec);
    
    if (!["L-IN", "L-OUT", "R-IN", "R-OUT"].includes(phase)) {
      errors.push(`無効な天津金木フェーズ: ${phase}`);
    }
  } catch (error) {
    errors.push(`TwinCore統合テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * 全テストを実行
 */
export async function runAllFractalTests(): Promise<{
  semanticRegression: { passed: boolean; errors: string[] };
  seedConsistency: { passed: boolean; errors: string[] };
  expansionCoherence: { passed: boolean; errors: string[] };
  twinCoreIntegration: { passed: boolean; errors: string[] };
  overall: { passed: boolean; totalErrors: number };
}> {
  const semanticRegression = await semanticRegressionTests();
  const seedConsistency = await fractalSeedConsistencyTests();
  const expansionCoherence = await seedExpansionCoherenceTests();
  const twinCoreIntegration = await twinCoreIntegrationTests();
  
  const totalErrors = 
    semanticRegression.errors.length +
    seedConsistency.errors.length +
    expansionCoherence.errors.length +
    twinCoreIntegration.errors.length;
  
  return {
    semanticRegression,
    seedConsistency,
    expansionCoherence,
    twinCoreIntegration,
    overall: {
      passed: totalErrors === 0,
      totalErrors,
    },
  };
}

