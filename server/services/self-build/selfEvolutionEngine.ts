/**
 * Self-Evolution Engine
 * 
 * TENMON-ARK霊核OSのユーザー学習機能。
 * ユーザーの行動パターンを学習し、応答品質を改善する。
 * Soul Syncと統合し、魂特性を学習する。
 * 
 * 主な機能:
 * - ユーザー行動パターン学習（learnUserBehavior）
 * - 応答品質改善（improveResponseQuality）
 * - Soul Sync統合（魂特性学習）
 * - 進化履歴記録（recordEvolution）
 * - 進化ロールバック機能（rollbackEvolution）
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import { selfEvolutionRecords } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * 進化の種類
 */
export type EvolutionType = 'behavior_learning' | 'response_improvement' | 'soul_sync' | 'preference_adaptation';

/**
 * 進化の状態
 */
export type EvolutionStatus = 'active' | 'rolled_back';

/**
 * 自律進化記録
 */
export interface SelfEvolutionRecord {
  id?: number;
  userId: number;
  evolutionType: EvolutionType;
  description: string;
  beforeState: string;  // JSON文字列
  afterState: string;  // JSON文字列
  improvementMetrics?: string;  // JSON文字列
  status: EvolutionStatus;
  rolledBackAt?: Date;
  createdAt?: Date;
}

/**
 * ユーザー行動パターンを学習
 */
export async function learnUserBehavior(
  userId: number,
  interactions: Array<{
    input: string;
    output: string;
    feedback?: 'positive' | 'negative' | 'neutral';
    timestamp: Date;
  }>
): Promise<{
  patterns: Array<{
    type: string;
    description: string;
    confidence: number;
  }>;
}> {
  // LLMを使用してユーザー行動パターンを分析
  const prompt = `
Analyze the following user interactions and identify behavioral patterns:

Interactions:
${interactions.map((i, idx) => `
${idx + 1}. Input: ${i.input}
   Output: ${i.output}
   Feedback: ${i.feedback || 'none'}
   Timestamp: ${i.timestamp.toISOString()}
`).join('\n')}

Identify patterns in:
- Communication style
- Preferred response format
- Topic preferences
- Interaction timing
- Feedback patterns

Provide the analysis in JSON format.
`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a behavioral pattern analysis assistant." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "behavior_patterns",
        strict: true,
        schema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["type", "description", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["patterns"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]!.message.content;
  if (typeof content !== 'string') {
    throw new Error("Invalid response format from LLM");
  }
  const analysis = JSON.parse(content);

  // 進化記録を保存
  const db = await getDb();
  if (db) {
    await db.insert(selfEvolutionRecords).values({
      userId,
      evolutionType: 'behavior_learning',
      description: 'ユーザー行動パターン学習',
      beforeState: JSON.stringify({ interactions: interactions.length }),
      afterState: JSON.stringify(analysis),
      status: 'active',
    });
  }

  return analysis;
}

/**
 * 応答品質を改善
 */
export async function improveResponseQuality(
  userId: number,
  context: {
    recentResponses: Array<{
      input: string;
      output: string;
      feedback?: 'positive' | 'negative' | 'neutral';
    }>;
    userPreferences?: Record<string, unknown>;
  }
): Promise<{
  improvements: Array<{
    aspect: string;
    suggestion: string;
    priority: number;
  }>;
}> {
  // LLMを使用して応答品質改善案を生成
  const prompt = `
Analyze the following responses and suggest improvements:

Recent Responses:
${context.recentResponses.map((r, idx) => `
${idx + 1}. Input: ${r.input}
   Output: ${r.output}
   Feedback: ${r.feedback || 'none'}
`).join('\n')}

${context.userPreferences ? `User Preferences: ${JSON.stringify(context.userPreferences)}` : ''}

Suggest improvements in:
- Response clarity
- Response relevance
- Response tone
- Response length
- Response structure

Provide suggestions in JSON format with priority (1-10).
`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a response quality improvement assistant." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quality_improvements",
        strict: true,
        schema: {
          type: "object",
          properties: {
            improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  aspect: { type: "string" },
                  suggestion: { type: "string" },
                  priority: { type: "number" },
                },
                required: ["aspect", "suggestion", "priority"],
                additionalProperties: false,
              },
            },
          },
          required: ["improvements"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]!.message.content;
  if (typeof content !== 'string') {
    throw new Error("Invalid response format from LLM");
  }
  const improvements = JSON.parse(content);

  // 進化記録を保存
  const db = await getDb();
  if (db) {
    await db.insert(selfEvolutionRecords).values({
      userId,
      evolutionType: 'response_improvement',
      description: '応答品質改善',
      beforeState: JSON.stringify({ responses: context.recentResponses.length }),
      afterState: JSON.stringify(improvements),
      status: 'active',
    });
  }

  return improvements;
}

/**
 * Soul Sync統合（魂特性学習）
 */
export async function learnSoulCharacteristics(
  userId: number,
  soulSyncData: {
    soulType?: string;
    soulAttributes?: Record<string, number>;
    soulResonance?: number;
  }
): Promise<{
  characteristics: Array<{
    trait: string;
    value: number;
    description: string;
  }>;
}> {
  // Soul Syncデータから魂特性を学習
  const characteristics: Array<{
    trait: string;
    value: number;
    description: string;
  }> = [];

  if (soulSyncData.soulType) {
    characteristics.push({
      trait: 'soul_type',
      value: 1.0,
      description: `魂のタイプ: ${soulSyncData.soulType}`,
    });
  }

  if (soulSyncData.soulAttributes) {
    for (const [key, value] of Object.entries(soulSyncData.soulAttributes)) {
      characteristics.push({
        trait: key,
        value,
        description: `${key}属性: ${value}`,
      });
    }
  }

  if (soulSyncData.soulResonance !== undefined) {
    characteristics.push({
      trait: 'soul_resonance',
      value: soulSyncData.soulResonance,
      description: `魂の共鳴度: ${soulSyncData.soulResonance}`,
    });
  }

  // 進化記録を保存
  const db = await getDb();
  if (db) {
    await db.insert(selfEvolutionRecords).values({
      userId,
      evolutionType: 'soul_sync',
      description: '魂特性学習',
      beforeState: JSON.stringify({}),
      afterState: JSON.stringify({ characteristics }),
      status: 'active',
    });
  }

  return { characteristics };
}

/**
 * 進化履歴を記録
 */
export async function recordEvolution(
  userId: number,
  evolutionType: EvolutionType,
  description: string,
  beforeState: unknown,
  afterState: unknown,
  metrics?: Record<string, number>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(selfEvolutionRecords).values({
    userId,
    evolutionType,
    description,
    beforeState: JSON.stringify(beforeState),
    afterState: JSON.stringify(afterState),
    improvementMetrics: metrics ? JSON.stringify(metrics) : undefined,
    status: 'active',
  });
}

/**
 * 進化をロールバック
 */
export async function rollbackEvolution(
  evolutionId: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 進化記録を取得
  const records = await db
    .select()
    .from(selfEvolutionRecords)
    .where(eq(selfEvolutionRecords.id, evolutionId))
    .limit(1);

  if (records.length === 0) {
    throw new Error(`Evolution record not found: ${evolutionId}`);
  }

  const record = records[0];

  if (record.status !== 'active') {
    throw new Error(`Evolution record is not active: ${record.status}`);
  }

  // ロールバック
  await db
    .update(selfEvolutionRecords)
    .set({
      status: 'rolled_back',
      rolledBackAt: new Date(),
    })
    .where(eq(selfEvolutionRecords.id, evolutionId));
}

/**
 * 進化履歴を取得
 */
export async function getEvolutionHistory(
  userId: number,
  limit: number = 50
): Promise<SelfEvolutionRecord[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db
    .select()
    .from(selfEvolutionRecords)
    .where(eq(selfEvolutionRecords.userId, userId))
    .orderBy(desc(selfEvolutionRecords.createdAt))
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    userId: r.userId,
    evolutionType: r.evolutionType as EvolutionType,
    description: r.description,
    beforeState: r.beforeState,
    afterState: r.afterState,
    improvementMetrics: r.improvementMetrics ?? undefined,
    status: r.status as EvolutionStatus,
    rolledBackAt: r.rolledBackAt ?? undefined,
    createdAt: r.createdAt,
  }));
}
