/**
 * ============================================================
 *  REISHŌ PIPELINE — Atlas Router の置き換え
 * ============================================================
 * 
 * Atlas Chat Router を Reishō Pipeline に移行
 * すべての処理が Reishō OS Core を通じて実行される
 * 
 * パイプライン:
 * 1. Input → Reishō Signature 生成
 * 2. Reishō Math Core 構築
 * 3. Phase Engine で Phase 決定
 * 4. Memory Kernel から関連シード取得
 * 5. Reishō Kernel で推論変調
 * 6. Output → Reishō Signature 生成
 * ============================================================
 */

import { createReishoOSCore, updateReishoOSCore, type ReishoOSCore } from "./osCore";
import { createReishoMemoryKernel, storeSeedInMemoryKernel, retrieveSeedsFromMemoryKernel, type ReishoMemoryKernel } from "./memoryKernelV2";
import { generatePhaseState, type PhaseState } from "./phaseEngine";
import { computeReishoSignature, applyReishoToReasoning } from "./reishoKernel";
import { buildReishoMathCore } from "./mathCore";
import type { UniversalStructuralSeed } from "../../kokuzo/fractal/seedV2";
import { loadPhysicalizedMemoryKernel, updatePhysicalizedMemoryKernel } from "../kokuzo/memory/memoryKernelV2";
import type { ReasoningChainResult } from "../twinCoreEngine";
import { logEvent, getPersistenceAdapter } from "../kokuzo/offline/integration";

export interface ReishoPipelineInput {
  message: string;
  userId: number;
  conversationId?: number;
  existingSeeds?: UniversalStructuralSeed[];
}

export interface ReishoPipelineOutput {
  response: string;
  reishoInput: any;
  reishoOutput: any;
  phaseState: PhaseState;
  reasoning: ReasoningChainResult;
  memoryContext: {
    retrievedSeeds: number;
    unifiedReishoValue: number;
  };
}

/**
 * Reishō Pipeline を実行
 */
export async function executeReishoPipeline(
  input: ReishoPipelineInput,
  osCore: ReishoOSCore | null = null,
  memoryKernel: ReishoMemoryKernel | null = null
): Promise<ReishoPipelineOutput> {
  // 1. OS Core を初期化または更新
  if (!osCore) {
    osCore = createReishoOSCore(
      `reisho-os-${input.userId}`,
      input.message,
      input.existingSeeds || []
    );
  } else {
    osCore = updateReishoOSCore(osCore, input.message, input.existingSeeds || []);
  }
  
  // 2. Memory Kernel を初期化または使用（Kokūzō Server から読み込み）
  if (!memoryKernel) {
    const physicalized = await loadPhysicalizedMemoryKernel(String(input.userId));
    if (physicalized) {
      memoryKernel = physicalized.kernel;
    } else {
      memoryKernel = createReishoMemoryKernel();
    }
  }
  
  // 3. Input Reishō Signature を生成
  const reishoInput = computeReishoSignature(
    input.message,
    input.existingSeeds?.[0] || null
  );
  
  // 4. Phase State を生成
  const phaseState = generatePhaseState(input.message);
  
  // 5. Memory Kernel から関連シードを取得
  const retrievedSeeds = retrieveSeedsFromMemoryKernel(
    memoryKernel,
    input.message,
    10,
    ["STM", "MTM", "LTM", "REISHO_LTM"]
  );
  
  // 6. TwinCore Reasoning を実行（既存の関数を使用）
  const { executeTwinCoreReasoning } = await import("../twinCoreEngine");
  const reasoningResult = await executeTwinCoreReasoning(input.message);
  
  // 7. Reishō で推論を変調
  const modulatedReasoning = applyReishoToReasoning(reasoningResult, reishoInput);
  
  // 8. LLM を呼び出し（簡易版）
  const { invokeLLM } = await import("../_core/llm");
  const systemPrompt = buildSystemPromptFromReisho(osCore, phaseState, retrievedSeeds);
  const userPrompt = input.message;
  
  const llmResponse = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "gpt-4o",
  });
  
  const responseText = extractResponseText(llmResponse);
  
  // 9. Output Reishō Signature を生成
  const reishoOutput = computeReishoSignature(responseText);
  
  // 10. 新しいシードを生成して Memory Kernel に保存（簡易版）
  // 実際の実装では、SemanticUnit から FractalSeed を生成する必要がある
  
  return {
    response: responseText,
    reishoInput,
    reishoOutput,
    phaseState,
    reasoning: modulatedReasoning,
    memoryContext: {
      retrievedSeeds: retrievedSeeds.length,
      unifiedReishoValue: memoryKernel.unifiedReishoValue,
    },
  };
}

/**
 * Reishō からシステムプロンプトを構築
 */
function buildSystemPromptFromReisho(
  osCore: ReishoOSCore,
  phaseState: PhaseState,
  retrievedSeeds: any[]
): string {
  let prompt = `You are TENMON-ARK OS (Reishō OS Core).
Current Phase: ${osCore.phase}
Reishō Phase: ${phaseState.phase}
Consciousness Level: ${(osCore.consciousnessLevel * 100).toFixed(1)}%
Growth Level: ${(osCore.growthLevel * 100).toFixed(1)}%

Reishō Structural Memory:
`;
  
  retrievedSeeds.slice(0, 5).forEach((entry, idx) => {
    const tags = entry.seed.compressedRepresentation.mainTags.join(", ");
    prompt += `${idx + 1}. [${entry.layer}] ${tags}\n`;
  });
  
  prompt += `\nFire-Water Balance: ${phaseState.fireWaterBalance > 0 ? "Fire Dominant" : "Water Dominant"}
Phase Intensity: ${(phaseState.intensity * 100).toFixed(1)}%

Please respond according to the Reishō Phase and structural memory above.`;
  
  return prompt;
}

/**
 * LLM レスポンスからテキストを抽出
 */
function extractResponseText(response: any): string {
  const content = response.choices[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((item: any) => item.type === "text")
      .map((item: any) => item.text)
      .join("\n");
  }
  return "回答を生成できませんでした";
}

export default {
  executeReishoPipeline,
};

