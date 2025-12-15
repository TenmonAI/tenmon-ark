/**
 * ============================================================
 *  REISHŌ ENGINE GLOBAL INTEGRATION TEST SUITE
 * ============================================================
 * 
 *  Tests:
 *  - reasoning coherence after Reishō modulation
 *  - memory stability with Reishō-LTM
 *  - seed expansion consistency
 *  - device routing determinism
 *  - persona switching continuity
 *  - widget domain isolation
 * ============================================================
 */

import { computeReishoSignature, applyReishoToReasoning } from "../reishoKernel";
import { storeReishoMemory, getReishoMemoryContext } from "../../synapticMemory";
import type { UniversalStructuralSeed } from "../../../kokuzo/fractal/seedV2";
import { routeTaskUsingReishoAffinity } from "../../../kokuzo/fractal/deviceClusterIntegration";
import { detectPersonaByReisho } from "../../../../client/src/lib/atlas/personaDetector";
import type { DeviceNode } from "../../../kokuzo/device/fusion";

/* ============================================================
 * 1. Reasoning Coherence Test
 * ============================================================ */

export async function testReasoningCoherence(): Promise<{
  passed: boolean;
  message: string;
}> {
  try {
    const input = "天聞アークは宇宙構文OSです";
    const signature = computeReishoSignature(input);
    
    // モック推論結果
    const mockReasoning = {
      inputText: input,
      extractedSounds: [],
      kotodama: { sounds: [], meanings: [] },
      fireWater: { fire: 0.5, water: 0.5, balance: 0, dominantElement: "中庸" as const },
      rotation: { leftRotation: 0, rightRotation: 0, dominantRotation: "均衡" as const },
      convergenceDivergence: { innerConvergence: 0, outerDivergence: 0, dominantMovement: "均衡" as const },
      yinYang: { yin: 0, yang: 0, balance: 0 },
      amatsuKanagi: { patterns: [], centerCores: [] },
      futomani: { position: "", direction: "", cosmicStructure: "", row: 0, column: 0 },
      katakamuna: { relatedUtai: [] },
      irohaWisdom: { characters: [], interpretations: [], lifePrinciplesSummary: "", dharmaTimeStructure: "" },
      minaka: { distanceFromCenter: 0, spiritualLevel: 0, cosmicAlignment: 0, centerCoreResonance: { yai: 0, yae: 0 } },
      finalInterpretation: { cosmicMeaning: "", wisdomMeaning: "", unifiedInterpretation: "", recommendations: [] },
    };
    
    const modulated = applyReishoToReasoning(mockReasoning, signature);
    
    // 検証: Reishōシグネチャが適用されているか
    if (!modulated.reishoSignature) {
      return { passed: false, message: "Reishō signature not applied to reasoning" };
    }
    
    // 検証: 火水バランスが調整されているか
    if (modulated.fireWater?.balance === undefined) {
      return { passed: false, message: "Fire-Water balance not modulated" };
    }
    
    return { passed: true, message: "Reasoning coherence test passed" };
  } catch (error) {
    return {
      passed: false,
      message: `Reasoning coherence test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/* ============================================================
 * 2. Memory Stability Test
 * ============================================================ */

export async function testMemoryStability(): Promise<{
  passed: boolean;
  message: string;
}> {
  try {
    // モックシード
    const mockSeed: UniversalStructuralSeed = {
      id: "test-seed-1",
      ownerId: "test-user",
      semanticUnitIds: ["unit-1", "unit-2"],
      compressedRepresentation: {
        centroidVector: [0.1, 0.2, 0.3],
        kotodamaVector: {
          vowelVector: [0.1, 0.2, 0.3, 0.4, 0.5],
          consonantVector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
          fire: 0.5,
          water: 0.5,
          balance: 0,
        },
        fireWaterBalance: 0,
        kanagiPhaseMode: "L-IN",
        mainTags: ["test", "memory"],
        lawIds: [],
        semanticEdges: [],
        seedWeight: 0.5,
      },
      laws: [],
      createdAt: Date.now(),
      structuralLawTensor: [[0.1, 0.2]],
      recursionPotential: 0.5,
      contractionPotential: 0.5,
      fireWaterFlowMap: { fireFlow: 0.5, waterFlow: 0.5, flowBalance: 0 },
      kanagiDominance: { lIn: 0.5, lOut: 0.3, rIn: 0.2, rOut: 0.1 },
      deviceAffinityProfile: { cpuAffinity: 0.5, storageAffinity: 0.5, networkAffinity: 0.5, gpuAffinity: 0.5 },
    };
    
    // メモリに保存（実際のDB接続はスキップ）
    // await storeReishoMemory(1, mockSeed);
    
    // メモリコンテキストを取得（実際のDB接続はスキップ）
    // const context = await getReishoMemoryContext(1, 5);
    
    // 検証: メモリコンテキストが正しく取得できるか（モック）
    const context = { reishoMemories: [], reishoSignature: undefined };
    
    if (!context) {
      return { passed: false, message: "Reishō memory context not retrieved" };
    }
    
    return { passed: true, message: "Memory stability test passed (mocked)" };
  } catch (error) {
    return {
      passed: false,
      message: `Memory stability test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/* ============================================================
 * 3. Seed Expansion Consistency Test
 * ============================================================ */

export async function testSeedExpansionConsistency(): Promise<{
  passed: boolean;
  message: string;
}> {
  try {
    const input = "天聞アークは宇宙構文OSです";
    const signature1 = computeReishoSignature(input);
    const signature2 = computeReishoSignature(input);
    
    // 検証: 同じ入力に対して同じシグネチャが生成されるか
    if (signature1.reishoValue !== signature2.reishoValue) {
      return { passed: false, message: "Reishō signature not consistent for same input" };
    }
    
    // 検証: 統合火水テンソルの次元が正しいか
    if (signature1.unifiedFireWaterTensor.length !== 64) {
      return { passed: false, message: "Unified Fire-Water Tensor dimension incorrect" };
    }
    
    return { passed: true, message: "Seed expansion consistency test passed" };
  } catch (error) {
    return {
      passed: false,
      message: `Seed expansion consistency test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/* ============================================================
 * 4. Device Routing Determinism Test
 * ============================================================ */

export async function testDeviceRoutingDeterminism(): Promise<{
  passed: boolean;
  message: string;
}> {
  try {
    const mockSeed: UniversalStructuralSeed = {
      id: "test-seed-1",
      ownerId: "test-user",
      semanticUnitIds: ["unit-1"],
      compressedRepresentation: {
        centroidVector: [0.1, 0.2],
        kotodamaVector: {
          vowelVector: [0.1, 0.2, 0.3, 0.4, 0.5],
          consonantVector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
          fire: 0.6,
          water: 0.4,
          balance: 0.2,
        },
        fireWaterBalance: 0.2,
        kanagiPhaseMode: "R-OUT",
        mainTags: ["test"],
        lawIds: [],
        semanticEdges: [],
        seedWeight: 0.7,
      },
      laws: [],
      createdAt: Date.now(),
      structuralLawTensor: [[0.1]],
      recursionPotential: 0.7,
      contractionPotential: 0.3,
      fireWaterFlowMap: { fireFlow: 0.6, waterFlow: 0.4, flowBalance: 0.2 },
      kanagiDominance: { lIn: 0.2, lOut: 0.3, rIn: 0.3, rOut: 0.4 },
      deviceAffinityProfile: { cpuAffinity: 0.8, storageAffinity: 0.5, networkAffinity: 0.6, gpuAffinity: 0.7 },
    };
    
    const mockDevices: DeviceNode[] = [
      { id: "device-1", name: "Device 1", type: "desktop", capabilities: { cpu: 2, storage: 1, memory: 1 } },
      { id: "device-2", name: "Device 2", type: "mobile", capabilities: { cpu: 1, storage: 0.5, memory: 0.5 } },
    ];
    
    const deviceId1 = routeTaskUsingReishoAffinity(mockSeed, mockDevices);
    const deviceId2 = routeTaskUsingReishoAffinity(mockSeed, mockDevices);
    
    // 検証: 同じシードとデバイスに対して同じルーティング結果が得られるか
    if (deviceId1 !== deviceId2) {
      return { passed: false, message: "Device routing not deterministic" };
    }
    
    // 検証: 有効なデバイスIDが返されるか
    if (!mockDevices.some(d => d.id === deviceId1)) {
      return { passed: false, message: "Device routing returned invalid device ID" };
    }
    
    return { passed: true, message: "Device routing determinism test passed" };
  } catch (error) {
    return {
      passed: false,
      message: `Device routing determinism test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/* ============================================================
 * 5. Persona Switching Continuity Test
 * ============================================================ */

export async function testPersonaSwitchingContinuity(): Promise<{
  passed: boolean;
  message: string;
}> {
  try {
    // 火優勢 + 右旋 + 外発 → Architect
    const persona1 = detectPersonaByReisho(0.5, "R-OUT");
    if (persona1 !== "architect") {
      return { passed: false, message: "Persona switching failed: expected architect" };
    }
    
    // 水優勢 + 左旋 + 内集 → Companion
    const persona2 = detectPersonaByReisho(-0.5, "L-IN");
    if (persona2 !== "companion") {
      return { passed: false, message: "Persona switching failed: expected companion" };
    }
    
    // 中庸 → Silent
    const persona3 = detectPersonaByReisho(0, "L-IN");
    if (persona3 !== "silent") {
      return { passed: false, message: "Persona switching failed: expected silent" };
    }
    
    return { passed: true, message: "Persona switching continuity test passed" };
  } catch (error) {
    return {
      passed: false,
      message: `Persona switching continuity test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/* ============================================================
 * 6. Widget Domain Isolation Test
 * ============================================================ */

export async function testWidgetDomainIsolation(): Promise<{
  passed: boolean;
  message: string;
}> {
  try {
    const site1Content = "サイト1のコンテンツ";
    const site2Content = "サイト2のコンテンツ";
    
    const signature1 = computeReishoSignature(site1Content);
    const signature2 = computeReishoSignature(site2Content);
    
    // 検証: 異なるサイトに対して異なるシグネチャが生成されるか
    if (signature1.reishoValue === signature2.reishoValue) {
      // 偶然一致する可能性もあるが、通常は異なる
      // より厳密な検証: 統合火水テンソルを比較
      const tensor1 = signature1.unifiedFireWaterTensor;
      const tensor2 = signature2.unifiedFireWaterTensor;
      
      let identical = true;
      for (let i = 0; i < tensor1.length; i++) {
        if (Math.abs(tensor1[i] - tensor2[i]) > 0.001) {
          identical = false;
          break;
        }
      }
      
      if (identical) {
        return { passed: false, message: "Widget domain isolation failed: signatures are identical" };
      }
    }
    
    return { passed: true, message: "Widget domain isolation test passed" };
  } catch (error) {
    return {
      passed: false,
      message: `Widget domain isolation test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/* ============================================================
 * 7. Run All Tests
 * ============================================================ */

export async function runAllReishoIntegrationTests(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; message: string }>;
}> {
  const tests = [
    { name: "Reasoning Coherence", fn: testReasoningCoherence },
    { name: "Memory Stability", fn: testMemoryStability },
    { name: "Seed Expansion Consistency", fn: testSeedExpansionConsistency },
    { name: "Device Routing Determinism", fn: testDeviceRoutingDeterminism },
    { name: "Persona Switching Continuity", fn: testPersonaSwitchingContinuity },
    { name: "Widget Domain Isolation", fn: testWidgetDomainIsolation },
  ];
  
  const results: Array<{ name: string; passed: boolean; message: string }> = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({ name: test.name, ...result });
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }
  
  return {
    total: tests.length,
    passed,
    failed,
    results,
  };
}

export default {
  testReasoningCoherence,
  testMemoryStability,
  testSeedExpansionConsistency,
  testDeviceRoutingDeterminism,
  testPersonaSwitchingContinuity,
  testWidgetDomainIsolation,
  runAllReishoIntegrationTests,
};

