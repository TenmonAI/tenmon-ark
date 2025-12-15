/**
 * 🔱 KOKŪZŌ Fractal Engine — テストスイート vΩ
 * 5レベルの宇宙構文検証を実装
 */

import type { SemanticUnit } from "../semantic/engine";
import type { FractalSeed } from "./compression";
import { createFractalSeed } from "./compression";
import { unifiedKotodamaVector, kanagiTensor } from "./mathModelV2";
import { upgradeToUniversalStructuralSeed } from "./seedV2";
import { applyFractalSeedBias, adjustReasoningPhaseBySeed } from "./twinCoreIntegration";
import { routeTaskUsingFireWaterAffinity, routeTaskUsingKanagiTensor } from "./deviceClusterIntegration";
import type { ReasoningChainResult } from "../../server/twinCoreEngine";

/**
 * テスト1: 言霊ベクトル一貫性テスト
 */
export async function test_kotodama_vector_consistency(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    const text1 = "テストテキスト";
    const text2 = "テストテキスト"; // 同じテキスト
    
    const vector1 = unifiedKotodamaVector(text1);
    const vector2 = unifiedKotodamaVector(text2);
    
    // 同じテキストから生成されたベクトルは同じであるべき
    if (vector1.length !== vector2.length) {
      errors.push("統合言霊ベクトルの次元数が一致しない");
    }
    
    // ベクトルの各要素を比較（浮動小数点誤差を考慮）
    for (let i = 0; i < vector1.length; i++) {
      if (Math.abs(vector1[i] - vector2[i]) > 0.0001) {
        errors.push(`統合言霊ベクトルの要素 ${i} が一致しない: ${vector1[i]} vs ${vector2[i]}`);
      }
    }
    
    // 次元数の確認（17次元であるべき）
    if (vector1.length !== 17) {
      errors.push(`統合言霊ベクトルの次元数が期待値と異なる: ${vector1.length} (期待: 17)`);
    }
  } catch (error) {
    errors.push(`言霊ベクトル一貫性テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * テスト2: 天津金木テンソル決定性テスト
 */
export async function test_kanagi_tensor_determinism(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    const text = "テストテキスト";
    
    const tensor1 = kanagiTensor(text);
    const tensor2 = kanagiTensor(text);
    
    // 同じテキストから生成されたテンソルは同じであるべき
    // 4D tensor: [L/R][IN/OUT][fire/water][motion]
    if (tensor1.length !== 2 || tensor1[0].length !== 2 || tensor1[0][0].length !== 2 || tensor1[0][0][0].length !== 5) {
      errors.push("天津金木テンソルの次元構造が正しくない");
    }
    
    // テンソルの各要素を比較
    for (let lr = 0; lr < 2; lr++) {
      for (let io = 0; io < 2; io++) {
        for (let fw = 0; fw < 2; fw++) {
          for (let m = 0; m < 5; m++) {
            if (Math.abs(tensor1[lr][io][fw][m] - tensor2[lr][io][fw][m]) > 0.0001) {
              errors.push(`天津金木テンソルの要素 [${lr}][${io}][${fw}][${m}] が一致しない`);
            }
          }
        }
      }
    }
  } catch (error) {
    errors.push(`天津金木テンソル決定性テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * テスト3: シード展開一貫性テスト
 */
export async function test_seed_expansion_coherence(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
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
    const usSeed = upgradeToUniversalStructuralSeed(seed, [mockUnit]);
    
    // 宇宙構文核への拡張が正しく行われているか
    if (usSeed.recursionPotential < 0 || usSeed.recursionPotential > 1) {
      errors.push(`再帰的生成力が範囲外: ${usSeed.recursionPotential}`);
    }
    
    if (usSeed.contractionPotential < 0 || usSeed.contractionPotential > 1) {
      errors.push(`収縮力が範囲外: ${usSeed.contractionPotential}`);
    }
    
    if (!usSeed.deviceAffinityProfile) {
      errors.push("デバイス親和性プロファイルが存在しない");
    } else {
      const { cpuAffinity, storageAffinity, networkAffinity, gpuAffinity } = usSeed.deviceAffinityProfile;
      if (cpuAffinity < 0 || cpuAffinity > 1) {
        errors.push(`CPU親和性が範囲外: ${cpuAffinity}`);
      }
      if (storageAffinity < 0 || storageAffinity > 1) {
        errors.push(`ストレージ親和性が範囲外: ${storageAffinity}`);
      }
      if (networkAffinity < 0 || networkAffinity > 1) {
        errors.push(`ネットワーク親和性が範囲外: ${networkAffinity}`);
      }
      if (gpuAffinity < 0 || gpuAffinity > 1) {
        errors.push(`GPU親和性が範囲外: ${gpuAffinity}`);
      }
    }
  } catch (error) {
    errors.push(`シード展開一貫性テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * テスト4: シードから推論への整合性テスト
 */
export async function test_seed_to_reasoning_alignment(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
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
    
    // モック TwinCore 結果
    const mockTcResult: ReasoningChainResult = {
      inputText: "テスト",
      extractedSounds: ["テ", "ス", "ト"],
      kotodama: { sounds: ["テ", "ス", "ト"], meanings: [] },
      fireWater: { fire: 0.3, water: 0.3, balance: 0, dominantElement: "中庸" },
      rotation: { leftRotation: 1, rightRotation: 0, dominantRotation: "左旋" },
      convergenceDivergence: { innerConvergence: 1, outerDivergence: 0, dominantMovement: "内集" },
      yinYang: { yin: 0.5, yang: 0.5, balance: 0, dominantPolarity: "中庸" },
      amatsuKanagi: { patterns: [], centerCores: [] },
      futomani: { position: "中央", direction: "均衡", cosmicStructure: "ミナカ", row: 5, column: 5 },
      katakamuna: { relatedUtai: [] },
      irohaWisdom: { characters: [], interpretations: [], lifePrinciplesSummary: "", dharmaTimeStructure: "" },
      minaka: { distanceFromCenter: 0.5, spiritualLevel: 50, cosmicAlignment: 50, centerCoreResonance: { yai: 0.5, yae: 0.5 } },
      finalInterpretation: { cosmicMeaning: "", wisdomMeaning: "", unifiedInterpretation: "", recommendations: [] },
    };
    
    // シードバイアスを適用
    const biasedResult = applyFractalSeedBias(seed, mockTcResult);
    
    // バイアスが正しく適用されているか
    if (biasedResult.fireWater.balance !== (mockTcResult.fireWater.balance + seed.compressedRepresentation.fireWaterBalance) / 2) {
      errors.push("シードバイアスが正しく適用されていない");
    }
    
    // フェーズ調整を適用
    const adjustedResult = adjustReasoningPhaseBySeed(seed, biasedResult);
    
    // フェーズ情報が追加されているか
    const hasSeedPattern = adjustedResult.amatsuKanagi.patterns.some(
      p => p.category === "fractal-seed" && p.type === "structural-memory"
    );
    if (!hasSeedPattern) {
      errors.push("シードのフェーズ情報が推論結果に追加されていない");
    }
  } catch (error) {
    errors.push(`シードから推論への整合性テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * テスト5: シードデバイス親和性分布テスト
 */
export async function test_seed_device_affinity_distribution(): Promise<{
  passed: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
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
    const usSeed = upgradeToUniversalStructuralSeed(seed, [mockUnit]);
    
    // モックデバイス
    const mockDevices: DeviceNode[] = [
      { id: "device-1", name: "Device 1", type: "mac", capabilities: { cpu: 2, storage: 1, memory: 1 } },
      { id: "device-2", name: "Device 2", type: "windows", capabilities: { cpu: 1, storage: 2, memory: 1 } },
    ];
    
    // 火水親和性によるルーティング
    const fireWaterRoute = routeTaskUsingFireWaterAffinity(usSeed, mockDevices);
    if (!mockDevices.some(d => d.id === fireWaterRoute)) {
      errors.push(`火水親和性ルーティングが無効なデバイスIDを返した: ${fireWaterRoute}`);
    }
    
    // 天津金木テンソルによるルーティング
    const kanagiRoute = routeTaskUsingKanagiTensor(usSeed, mockDevices);
    if (!mockDevices.some(d => d.id === kanagiRoute)) {
      errors.push(`天津金木テンソルルーティングが無効なデバイスIDを返した: ${kanagiRoute}`);
    }
  } catch (error) {
    errors.push(`シードデバイス親和性分布テストエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * 全テストを実行
 */
export async function runAllFractalTestsV2(): Promise<{
  kotodamaVector: { passed: boolean; errors: string[] };
  kanagiTensor: { passed: boolean; errors: string[] };
  seedExpansion: { passed: boolean; errors: string[] };
  seedReasoning: { passed: boolean; errors: string[] };
  deviceAffinity: { passed: boolean; errors: string[] };
  overall: { passed: boolean; totalErrors: number };
}> {
  const kotodamaVector = await test_kotodama_vector_consistency();
  const kanagiTensor = await test_kanagi_tensor_determinism();
  const seedExpansion = await test_seed_expansion_coherence();
  const seedReasoning = await test_seed_to_reasoning_alignment();
  const deviceAffinity = await test_seed_device_affinity_distribution();
  
  const totalErrors = 
    kotodamaVector.errors.length +
    kanagiTensor.errors.length +
    seedExpansion.errors.length +
    seedReasoning.errors.length +
    deviceAffinity.errors.length;
  
  return {
    kotodamaVector,
    kanagiTensor,
    seedExpansion,
    seedReasoning,
    deviceAffinity,
    overall: {
      passed: totalErrors === 0,
      totalErrors,
    },
  };
}

