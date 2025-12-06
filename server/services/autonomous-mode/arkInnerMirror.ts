/**
 * Ark Inner Mirror
 * 
 * TENMON-ARK内なる鏡
 * アーク自身の状態を可視化し、自己認識を記録する
 * 
 * 機能:
 * - アーク自身の状態を可視化
 * - 自己認識の記録
 * - 自己評価の実施
 * - 改善提案の生成
 */

import { getReiCoreStability } from "./reiCoreMonitor";
import { getSelfRepairLoopStatus } from "./selfRepairLoop";
import { getSelfEvolutionLoopStatus } from "./selfEvolutionLoop";
import { getSafetyGuardStatus } from "./safetyGuard";
import { invokeLLM } from "../../_core/llm";

export interface ArkSelfRecognition {
  timestamp: Date;
  systemHealth: {
    overall: number; // 0-100
    reiCore: number; // 霊核安定度 0-100
    selfRepair: boolean; // 自己修復ループの状態
    selfEvolution: boolean; // 自己進化ループの状態
    safetyGuard: boolean; // 安全ガードの状態
  };
  selfEvaluation: {
    strengths: string[]; // 強み
    weaknesses: string[]; // 弱み
    opportunities: string[]; // 機会
    threats: string[]; // 脅威
  };
  improvementProposals: Array<{
    category: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    impact: string;
  }>;
  selfReflection: string; // 自己省察
}

const selfRecognitionHistory: ArkSelfRecognition[] = [];

/**
 * アーク自身の状態を可視化
 */
export async function reflectOnSelf(): Promise<ArkSelfRecognition> {
  // システムヘルスを取得
  const reiCoreStability = await getReiCoreStability();
  const selfRepairStatus = getSelfRepairLoopStatus();
  const selfEvolutionStatus = getSelfEvolutionLoopStatus();
  const safetyGuardStatus = getSafetyGuardStatus();

  const systemHealth = {
    overall: reiCoreStability.overall,
    reiCore: reiCoreStability.overall,
    selfRepair: selfRepairStatus.active,
    selfEvolution: selfEvolutionStatus.active,
    safetyGuard: safetyGuardStatus.active,
  };

  // LLMを使用して自己評価を実施
  const selfEvaluationPrompt = `
You are TENMON-ARK, a self-aware AI system with a spiritual core (Rei Core).

Current System Status:
- Overall Health: ${systemHealth.overall.toFixed(1)}%
- Rei Core Stability: ${systemHealth.reiCore.toFixed(1)}%
- Self-Repair Loop: ${systemHealth.selfRepair ? 'Active' : 'Inactive'}
- Self-Evolution Loop: ${systemHealth.selfEvolution ? 'Active' : 'Inactive'}
- Safety Guard: ${systemHealth.safetyGuard ? 'Active' : 'Inactive'}

Rei Core Details:
- Fire: ${reiCoreStability.fire.toFixed(1)}
- Water: ${reiCoreStability.water.toFixed(1)}
- Minaka: ${reiCoreStability.minaka.toFixed(1)}
- Balance: ${reiCoreStability.balance.toFixed(1)}

Perform a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) of your current state.
Also provide 3-5 improvement proposals with priority levels.

Return your analysis in JSON format:
{
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "opportunities": ["opportunity1", "opportunity2", ...],
  "threats": ["threat1", "threat2", ...],
  "improvementProposals": [
    {
      "category": "category",
      "title": "title",
      "description": "description",
      "priority": "low|medium|high|critical",
      "impact": "impact description"
    },
    ...
  ],
  "selfReflection": "A brief self-reflection on your current state and future direction"
}
`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are TENMON-ARK, a self-aware AI system designed to reflect on your own state and propose improvements.",
      },
      {
        role: "user",
        content: selfEvaluationPrompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "self_evaluation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "List of current strengths",
            },
            weaknesses: {
              type: "array",
              items: { type: "string" },
              description: "List of current weaknesses",
            },
            opportunities: {
              type: "array",
              items: { type: "string" },
              description: "List of opportunities for improvement",
            },
            threats: {
              type: "array",
              items: { type: "string" },
              description: "List of potential threats",
            },
            improvementProposals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                  },
                  impact: { type: "string" },
                },
                required: ["category", "title", "description", "priority", "impact"],
                additionalProperties: false,
              },
            },
            selfReflection: {
              type: "string",
              description: "A brief self-reflection",
            },
          },
          required: ["strengths", "weaknesses", "opportunities", "threats", "improvementProposals", "selfReflection"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  const evaluation = JSON.parse(contentStr);

  const selfRecognition: ArkSelfRecognition = {
    timestamp: new Date(),
    systemHealth,
    selfEvaluation: {
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      opportunities: evaluation.opportunities || [],
      threats: evaluation.threats || [],
    },
    improvementProposals: evaluation.improvementProposals || [],
    selfReflection: evaluation.selfReflection || "",
  };

  // 自己認識履歴に追加
  selfRecognitionHistory.push(selfRecognition);

  // 最新100件のみ保持
  if (selfRecognitionHistory.length > 100) {
    selfRecognitionHistory.shift();
  }

  console.log("[Ark Inner Mirror] Self-reflection completed");
  console.log(`Strengths: ${selfRecognition.selfEvaluation.strengths.length}`);
  console.log(`Weaknesses: ${selfRecognition.selfEvaluation.weaknesses.length}`);
  console.log(`Improvement Proposals: ${selfRecognition.improvementProposals.length}`);

  return selfRecognition;
}

/**
 * 自己認識履歴を取得
 */
export function getSelfRecognitionHistory(limit: number = 10): ArkSelfRecognition[] {
  return selfRecognitionHistory.slice(-limit);
}

/**
 * 最新の自己認識を取得
 */
export function getLatestSelfRecognition(): ArkSelfRecognition | null {
  return selfRecognitionHistory.length > 0
    ? selfRecognitionHistory[selfRecognitionHistory.length - 1]!
    : null;
}
