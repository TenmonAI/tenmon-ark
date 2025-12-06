/**
 * Conversation OS v3 Engine (3-tier dynamic mode switching)
 * 
 * TENMON-ARK SPEC準拠
 * - Twin-Core統合
 * - Activation-Centering coherence維持
 * - 3階層モードの動的切替
 */

import { getDb } from "../db";
import { messages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export type ConversationMode = "general" | "intermediate" | "expert";

export interface ConversationModeConfig {
  mode: ConversationMode;
  cognitiveLevel: number; // 1-3
  responseLength: {
    min: number;
    max: number;
    average: number;
  };
  technicalDepth: number; // 0-100
  explanationLevel: "simple" | "balanced" | "detailed";
  twinCoreIntegration: boolean;
}

/**
 * Calculate average sentence length
 */
function calculateAverageSentenceLength(
  recentMessages: Array<{ role: string; content: string }>
): number {
  const userMessages = recentMessages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 0;
  
  const totalLength = userMessages.reduce(
    (sum, m) => sum + m.content.length,
    0
  );
  return Math.round(totalLength / userMessages.length);
}

/**
 * Calculate vocabulary complexity
 */
function calculateVocabularyComplexity(
  recentMessages: Array<{ role: string; content: string }>
): number {
  const specialTerms = [
    "火水", "言灵", "靈", "氣", "天津金木", "いろは", "フトマニ",
    "カタカムナ", "ミナカ", "左右旋", "内集外発", "陰陽", "宿曜",
    "宇宙", "法則", "構造", "解析", "推論", "統合", "最適化",
  ];
  
  const userMessages = recentMessages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 0;
  
  let specialTermCount = 0;
  userMessages.forEach((m) => {
    specialTerms.forEach((term) => {
      if (m.content.includes(term)) {
        specialTermCount++;
      }
    });
  });
  
  return Math.min(100, Math.round((specialTermCount / userMessages.length) * 20));
}

/**
 * Calculate technical term frequency
 */
function calculateTechnicalTermFrequency(
  recentMessages: Array<{ role: string; content: string }>
): number {
  const technicalTerms = [
    "アルゴリズム", "データ構造", "API", "フレームワーク", "アーキテクチャ",
    "パフォーマンス", "最適化", "スケーラビリティ", "セキュリティ",
  ];
  
  const userMessages = recentMessages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 0;
  
  let technicalTermCount = 0;
  userMessages.forEach((m) => {
    technicalTerms.forEach((term) => {
      if (m.content.includes(term)) {
        technicalTermCount++;
      }
    });
  });
  
  return Math.min(100, Math.round((technicalTermCount / userMessages.length) * 30));
}

/**
 * Calculate question depth
 */
function calculateQuestionDepth(
  recentMessages: Array<{ role: string; content: string }>
): number {
  const userMessages = recentMessages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return 0;
  
  let depthScore = 0;
  userMessages.forEach((m) => {
    const content = m.content;
    
    // Deep question indicators
    if (content.includes("なぜ") || content.includes("どうして")) {
      depthScore += 2;
    }
    if (content.includes("本質") || content.includes("原理")) {
      depthScore += 3;
    }
    if (content.includes("構造") || content.includes("仕組み")) {
      depthScore += 2;
    }
    if (content.length > 200) {
      depthScore += 1;
    }
  });
  
  return Math.min(100, Math.round((depthScore / userMessages.length) * 10));
}

/**
 * Calculate cognitive level (1-3)
 */
function calculateCognitiveLevel(
  averageSentenceLength: number,
  vocabularyComplexity: number,
  technicalTermFrequency: number,
  questionDepth: number
): number {
  // Normalize scores (0-100 scale)
  const lengthScore = Math.min(100, averageSentenceLength / 5);
  const vocabScore = vocabularyComplexity;
  const techScore = technicalTermFrequency;
  const depthScore = questionDepth;
  
  // Weighted average
  const totalScore = (
    lengthScore * 0.2 +
    vocabScore * 0.3 +
    techScore * 0.3 +
    depthScore * 0.2
  );
  
  // Map to cognitive level (1-3)
  if (totalScore >= 70) {
    return 3; // Expert
  } else if (totalScore >= 40) {
    return 2; // Intermediate
  } else {
    return 1; // General
  }
}

/**
 * Detect user's cognitive level dynamically
 */
export async function detectCognitiveLevel(
  userId: number,
  recentMessages: Array<{ role: string; content: string }>
): Promise<number> {
  // 1. 文の長さを計算
  const averageSentenceLength = calculateAverageSentenceLength(recentMessages);
  
  // 2. 語彙複雑度を計算
  const vocabularyComplexity = calculateVocabularyComplexity(recentMessages);
  
  // 3. 専門用語の出現頻度
  const technicalTermFrequency = calculateTechnicalTermFrequency(recentMessages);
  
  // 4. 質問の深さ
  const questionDepth = calculateQuestionDepth(recentMessages);
  
  // 5. 認知レベルを計算（1-3）
  const cognitiveLevel = calculateCognitiveLevel(
    averageSentenceLength,
    vocabularyComplexity,
    technicalTermFrequency,
    questionDepth
  );
  
  return cognitiveLevel;
}

/**
 * Switch conversation mode dynamically
 */
export async function switchConversationMode(
  userId: number,
  currentMode: ConversationMode,
  recentMessages: Array<{ role: string; content: string }>
): Promise<ConversationMode> {
  const cognitiveLevel = await detectCognitiveLevel(userId, recentMessages);
  
  // 認知レベルに応じてモードを決定
  if (cognitiveLevel >= 2.5) {
    return "expert";
  } else if (cognitiveLevel >= 1.5) {
    return "intermediate";
  } else {
    return "general";
  }
}

/**
 * Get conversation mode config
 */
export function getConversationModeConfig(
  mode: ConversationMode,
  cognitiveLevel: number
): ConversationModeConfig {
  const configs: Record<ConversationMode, ConversationModeConfig> = {
    general: {
      mode: "general",
      cognitiveLevel: 1,
      responseLength: {
        min: 200,
        max: 500,
        average: 350,
      },
      technicalDepth: 20,
      explanationLevel: "simple",
      twinCoreIntegration: true,
    },
    intermediate: {
      mode: "intermediate",
      cognitiveLevel: 2,
      responseLength: {
        min: 300,
        max: 800,
        average: 550,
      },
      technicalDepth: 50,
      explanationLevel: "balanced",
      twinCoreIntegration: true,
    },
    expert: {
      mode: "expert",
      cognitiveLevel: 3,
      responseLength: {
        min: 500,
        max: 1500,
        average: 1000,
      },
      technicalDepth: 80,
      explanationLevel: "detailed",
      twinCoreIntegration: true,
    },
  };
  
  return configs[mode];
}

/**
 * Generate system prompt for conversation mode
 */
export function generateConversationModePrompt(
  mode: ConversationMode,
  config: ConversationModeConfig
): string {
  const modePrompts = {
    general: `
【一般人モード】
- 簡潔で分かりやすい応答
- 専門用語を避け、日常的な言葉を使用
- 例え話や具体例を多用
- 応答長: ${config.responseLength.min}-${config.responseLength.max}文字
- 説明レベル: シンプル（専門用語を避ける）
`,
    intermediate: `
【中級モード】
- バランスの取れた応答
- 専門用語を適度に使用し、必要に応じて説明
- 論理的な構成と具体例の組み合わせ
- 応答長: ${config.responseLength.min}-${config.responseLength.max}文字
- 説明レベル: バランス（専門用語を適度に使用）
`,
    expert: `
【専門モード】
- 深い・専門的な応答
- 専門用語を積極的に使用
- 理論的・構造的な説明
- 応答長: ${config.responseLength.min}-${config.responseLength.max}文字
- 説明レベル: 詳細（専門用語を積極的に使用）
`,
  };
  
  return modePrompts[mode];
}

