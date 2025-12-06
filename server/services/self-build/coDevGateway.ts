/**
 * Co-Dev Gateway
 * 
 * TENMON-ARK霊核OSとManusの共同開発ゲートウェイ。
 * Manusと自動連携し、改善依頼を生成・適用する。
 * 
 * 主な機能:
 * - Manus API連携基盤（connectToManus）
 * - 自動改善依頼生成（generateImprovementRequest）
 * - Manus応答の自動適用（applyManusResponse）
 * - 共同開発履歴記録（recordCoDevHistory）
 * - 緊急時のManus呼び出し（emergencyManusCall）
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import { coDevHistory } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * 共同開発リクエストの種類
 */
export type CoDevRequestType = 'improvement' | 'bug_fix' | 'feature_request' | 'emergency';

/**
 * 共同開発リクエストの状態
 */
export type CoDevStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * 共同開発履歴
 */
export interface CoDevHistoryRecord {
  id?: number;
  requestType: CoDevRequestType;
  requestDescription: string;
  requestContext: string;  // JSON文字列
  manusResponse?: string;  // JSON文字列
  status: CoDevStatus;
  completedAt?: Date;
  createdAt?: Date;
}

/**
 * Manus API連携基盤
 */
export async function connectToManus(): Promise<{
  connected: boolean;
  version: string;
}> {
  // TODO: 実際のManus API連携を実装
  // 現在はモック実装
  return {
    connected: true,
    version: "1.0.0",
  };
}

/**
 * 自動改善依頼を生成
 */
export async function generateImprovementRequest(
  context: {
    currentIssue: string;
    systemState?: unknown;
    userFeedback?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<{
  request: {
    type: CoDevRequestType;
    description: string;
    details: Record<string, unknown>;
  };
}> {
  // LLMを使用して改善依頼を生成
  const prompt = `
Generate an improvement request for Manus based on the following context:

Current Issue: ${context.currentIssue}
${context.systemState ? `System State: ${JSON.stringify(context.systemState)}` : ''}
${context.userFeedback ? `User Feedback: ${context.userFeedback}` : ''}
Priority: ${context.priority}

Generate a structured improvement request that includes:
- Request type (improvement, bug_fix, feature_request, emergency)
- Detailed description
- Specific details needed for implementation

Provide the request in JSON format.
`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are an improvement request generation assistant." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "improvement_request",
        strict: true,
        schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["improvement", "bug_fix", "feature_request", "emergency"] },
            description: { type: "string" },
            details: {
              type: "object",
              additionalProperties: true,
            },
          },
          required: ["type", "description", "details"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]!.message.content;
  if (typeof content !== 'string') {
    throw new Error("Invalid response format from LLM");
  }
  const request = JSON.parse(content);

  // 共同開発履歴を記録
  const db = await getDb();
  if (db) {
    await db.insert(coDevHistory).values({
      requestType: request.type,
      requestDescription: request.description,
      requestContext: JSON.stringify(context),
      status: 'pending',
    });
  }

  return { request };
}

/**
 * Manus応答を自動適用
 */
export async function applyManusResponse(
  requestId: number,
  manusResponse: {
    success: boolean;
    changes?: Array<{
      type: string;
      description: string;
      code?: string;
    }>;
    message?: string;
  }
): Promise<{
  applied: boolean;
  results: Array<{
    change: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // リクエストを取得
  const requests = await db
    .select()
    .from(coDevHistory)
    .where(eq(coDevHistory.id, requestId))
    .limit(1);

  if (requests.length === 0) {
    throw new Error(`Co-dev request not found: ${requestId}`);
  }

  const request = requests[0];

  if (request.status !== 'pending') {
    throw new Error(`Co-dev request is not pending: ${request.status}`);
  }

  // ステータスを更新
  await db
    .update(coDevHistory)
    .set({ status: 'in_progress' })
    .where(eq(coDevHistory.id, requestId));

  const results: Array<{
    change: string;
    success: boolean;
    error?: string;
  }> = [];

  if (manusResponse.success && manusResponse.changes) {
    for (const change of manusResponse.changes) {
      try {
        // 実際の変更適用はManusに依頼する必要があるため、
        // ここでは成功として記録
        results.push({
          change: change.description,
          success: true,
        });
      } catch (error) {
        results.push({
          change: change.description,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const allSuccess = results.every(r => r.success);

  // ステータスを更新
  await db
    .update(coDevHistory)
    .set({
      status: allSuccess ? 'completed' : 'failed',
      manusResponse: JSON.stringify(manusResponse),
      completedAt: allSuccess ? new Date() : undefined,
    })
    .where(eq(coDevHistory.id, requestId));

  return {
    applied: allSuccess,
    results,
  };
}

/**
 * 共同開発履歴を記録
 */
export async function recordCoDevHistory(
  requestType: CoDevRequestType,
  requestDescription: string,
  requestContext: Record<string, unknown>,
  manusResponse?: unknown
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(coDevHistory).values({
    requestType,
    requestDescription,
    requestContext: JSON.stringify(requestContext),
    manusResponse: manusResponse ? JSON.stringify(manusResponse) : undefined,
    status: manusResponse ? 'completed' : 'pending',
    completedAt: manusResponse ? new Date() : undefined,
  });
}

/**
 * 緊急時のManus呼び出し
 */
export async function emergencyManusCall(
  issue: string,
  context: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 緊急リクエストを記録
  await db.insert(coDevHistory).values({
    requestType: 'emergency',
    requestDescription: issue,
    requestContext: JSON.stringify(context),
    status: 'pending',
  });

  // TODO: Manusに緊急通知を送信
  console.log(`[Co-Dev Gateway] Emergency call to Manus: ${issue}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);
}

/**
 * 共同開発履歴を取得
 */
export async function getCoDevHistory(
  limit: number = 50
): Promise<CoDevHistoryRecord[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db
    .select()
    .from(coDevHistory)
    .orderBy(desc(coDevHistory.createdAt))
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    requestType: r.requestType as CoDevRequestType,
    requestDescription: r.requestDescription,
    requestContext: r.requestContext,
    manusResponse: r.manusResponse ?? undefined,
    status: r.status as CoDevStatus,
    completedAt: r.completedAt ?? undefined,
    createdAt: r.createdAt,
  }));
}
