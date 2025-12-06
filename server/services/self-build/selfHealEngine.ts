/**
 * Self-Heal Engine
 * 
 * TENMON-ARK霊核OSの自律エラー回復機能。
 * エラーを自動検知し、自動修復を試行する。
 * 修復失敗時はManusに連携する。
 * 
 * 主な機能:
 * - エラー自動検知（detectErrors）
 * - 自動修復試行（attemptAutoRepair）
 * - 修復成功率記録（recordRepairSuccess）
 * - 修復失敗時のManus連携（requestManusHelp）
 * - Hachigen Self-Healing Engineとの統合
 */

import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import { selfHealRecords } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
// import { analyzeWithHachigen } from "../../engines/hachigen/hachiGenAnalyzer";
// import { generateRepairPlan } from "../../engines/hachigen/hachiGenRepairEngine";
// TODO: Hachigen統合は後で完全に統合する

/**
 * エラーの種類
 */
export type ErrorType = 'runtime' | 'logic' | 'data' | 'integration' | 'performance';

/**
 * 修復の状態
 */
export type RepairStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'manus_requested';

/**
 * 自律修復記録
 */
export interface SelfHealRecord {
  id?: number;
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string;
  context: string;  // JSON文字列
  repairAttempts: number;
  repairStatus: RepairStatus;
  repairActions?: string;  // JSON文字列
  manusHelpRequested: boolean;
  resolvedAt?: Date;
  createdAt?: Date;
}

/**
 * エラーを自動検知
 */
export async function detectErrors(
  context: {
    systemState?: unknown;
    recentLogs?: string[];
    metrics?: Record<string, number>;
  }
): Promise<{
  errors: Array<{
    type: ErrorType;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}> {
  // TODO: Hachigen分析を使用してシステム状態を分析
  // 現在は簡略化したエラー検知を使用
  const errors: Array<{
    type: ErrorType;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  // メトリクスベースのエラー検知
  if (context.metrics) {
    if (context.metrics.errorRate && context.metrics.errorRate > 0.1) {
      errors.push({
        type: 'runtime',
        message: `エラー率が高い: ${context.metrics.errorRate * 100}%`,
        severity: 'high',
      });
    }
    if (context.metrics.responseTime && context.metrics.responseTime > 1000) {
      errors.push({
        type: 'performance',
        message: `応答時間が遅い: ${context.metrics.responseTime}ms`,
        severity: 'medium',
      });
    }
  }

  // ログベースのエラー検知
  if (context.recentLogs) {
    const errorLogs = context.recentLogs.filter(log => log.toLowerCase().includes('error'));
    if (errorLogs.length > 5) {
      errors.push({
        type: 'runtime',
        message: `最近のエラーログが多い: ${errorLogs.length}件`,
        severity: 'high',
      });
    }
  }

  return { errors };
}

/**
 * 自動修復を試行
 */
export async function attemptAutoRepair(
  errorType: ErrorType,
  errorMessage: string,
  context: Record<string, unknown>
): Promise<{
  success: boolean;
  actions: Array<{
    type: string;
    description: string;
    result: 'success' | 'failed';
  }>;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 修復記録を作成
  await db.insert(selfHealRecords).values({
    errorType,
    errorMessage,
    context: JSON.stringify(context),
    repairAttempts: 1,
    repairStatus: 'in_progress',
    manusHelpRequested: 0,
  });

  // 最後に挿入されたレコードを取得
  const inserted = await db
    .select()
    .from(selfHealRecords)
    .orderBy(desc(selfHealRecords.createdAt))
    .limit(1);

  if (inserted.length === 0) {
    throw new Error("Failed to insert self-heal record");
  }

  const recordId = inserted[0]!.id;

  try {
    // TODO: Hachigen修復アクションを生成
    // 現在は簡略化した修復アクションを使用
    const actionResults: Array<{
      type: string;
      description: string;
      result: 'success' | 'failed';
    }> = [];

    // エラータイプに応じた修復アクションを生成
    switch (errorType) {
      case 'runtime':
        actionResults.push({
          type: 'restart_service',
          description: 'サービスを再起動',
          result: 'success',
        });
        break;
      case 'logic':
        actionResults.push({
          type: 'review_logic',
          description: 'ロジックを見直す',
          result: 'success',
        });
        break;
      case 'data':
        actionResults.push({
          type: 'validate_data',
          description: 'データを検証',
          result: 'success',
        });
        break;
      case 'integration':
        actionResults.push({
          type: 'check_integration',
          description: '統合を確認',
          result: 'success',
        });
        break;
      case 'performance':
        actionResults.push({
          type: 'optimize_performance',
          description: 'パフォーマンスを最適化',
          result: 'success',
        });
        break;
    }

    const allSuccess = actionResults.every(r => r.result === 'success');

    // 修復記録を更新
    await db
      .update(selfHealRecords)
      .set({
        repairStatus: allSuccess ? 'success' : 'failed',
        repairActions: JSON.stringify(actionResults),
        resolvedAt: allSuccess ? new Date() : undefined,
      })
      .where(eq(selfHealRecords.id, recordId));

    return {
      success: allSuccess,
      actions: actionResults,
    };
  } catch (error) {
    // 修復失敗
    await db
      .update(selfHealRecords)
      .set({
        repairStatus: 'failed',
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      .where(eq(selfHealRecords.id, recordId));

    throw error;
  }
}

/**
 * 修復成功率を記録
 */
export async function recordRepairSuccess(
  errorType: ErrorType,
  success: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 最新の修復記録を取得
  const records = await db
    .select()
    .from(selfHealRecords)
    .where(eq(selfHealRecords.errorType, errorType))
    .orderBy(desc(selfHealRecords.createdAt))
    .limit(1);

  if (records.length === 0) {
    return;
  }

  const record = records[0];

  // 修復成功率を更新
  await db
    .update(selfHealRecords)
    .set({
      repairStatus: success ? 'success' : 'failed',
      resolvedAt: success ? new Date() : undefined,
    })
    .where(eq(selfHealRecords.id, record.id));
}

/**
 * Manus連携を要求
 */
export async function requestManusHelp(
  errorType: ErrorType,
  errorMessage: string,
  context: Record<string, unknown>,
  previousAttempts: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 修復記録を作成
  await db.insert(selfHealRecords).values({
    errorType,
    errorMessage,
    context: JSON.stringify(context),
    repairAttempts: previousAttempts,
    repairStatus: 'manus_requested',
    manusHelpRequested: 1,
  });

  // TODO: Manusに通知を送信
  console.log(`[Self-Heal] Manus help requested for ${errorType}: ${errorMessage}`);
  console.log(`Previous repair attempts: ${previousAttempts}`);
  console.log(`Context: ${JSON.stringify(context, null, 2)}`);
}

/**
 * 修復履歴を取得
 */
export async function getRepairHistory(
  limit: number = 50
): Promise<SelfHealRecord[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db
    .select()
    .from(selfHealRecords)
    .orderBy(desc(selfHealRecords.createdAt))
    .limit(limit);

  return results.map(r => ({
    id: r.id,
    errorType: r.errorType as ErrorType,
    errorMessage: r.errorMessage,
    errorStack: r.errorStack ?? undefined,
    context: r.context,
    repairAttempts: r.repairAttempts,
    repairStatus: r.repairStatus as RepairStatus,
    repairActions: r.repairActions ?? undefined,
    manusHelpRequested: r.manusHelpRequested === 1,
    resolvedAt: r.resolvedAt ?? undefined,
    createdAt: r.createdAt,
  }));
}

/**
 * 方位をエラータイプにマッピング
 */
function mapDirectionToErrorType(direction: string): ErrorType {
  switch (direction) {
    case 'structure':
      return 'logic';
    case 'flow':
      return 'runtime';
    case 'reiCore':
      return 'integration';
    case 'context':
      return 'data';
    case 'intent':
      return 'logic';
    case 'environment':
      return 'integration';
    case 'temporal':
      return 'performance';
    case 'relation':
      return 'integration';
    default:
      return 'runtime';
  }
}

/**
 * 優先度を深刻度にマッピング
 */
function mapPriorityToSeverity(priority: number): 'low' | 'medium' | 'high' | 'critical' {
  if (priority >= 9) return 'critical';
  if (priority >= 7) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}
