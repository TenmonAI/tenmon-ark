/**
 * Self-Evolution Loop
 * 自己進化ループ - SelfReview → IssueGenesis → AutoFix → (optionally AutoApply)
 */

import type { SemanticIndex } from '../concierge/semantic';
import { summarizeFindings, type SelfReviewReport } from '../selfReview/core';
import { generateImprovementTasks, sortTasksByPriority, type ImprovementTask } from './genesis';
import { identifyAutoFixableTasks, summarizeAutoFix, type AutoFixSummary } from './autoFix';
import { runAutoApplyPipeline, type AutoApplyResult } from './autoApply';
import type { AutoFixPatch } from './autoFix';

export interface CycleLog {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  reviewReport?: SelfReviewReport;
  tasks?: ImprovementTask[];
  autoFixSummary?: AutoFixSummary;
  autoApplyResult?: AutoApplyResult;
  error?: string;
  summary: {
    totalTasks: number;
    autoFixableCount: number;
    appliedCount: number;
    pendingCount: number;
  };
}

// サイクルログをメモリに保持（本番環境ではデータベースに保存）
const cycleLogs: CycleLog[] = [];

/**
 * 進化サイクルを実行
 * SelfReview → IssueGenesis → AutoFix → (optionally AutoApply)
 * 
 * @param index - Semantic Index
 * @param totalMessages - 総メッセージ数
 * @param errorCount - エラー数
 * @param autoApply - 自動適用を実行するか（Founder承認ありの場合のみ）
 * @returns サイクルログ
 */
export async function runEvolutionCycle(
  index: SemanticIndex,
  totalMessages: number,
  errorCount: number,
  autoApply: boolean = false
): Promise<CycleLog> {
  const cycleId = `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startedAt = new Date().toISOString();

  const cycleLog: CycleLog = {
    id: cycleId,
    startedAt,
    status: 'running',
    summary: {
      totalTasks: 0,
      autoFixableCount: 0,
      appliedCount: 0,
      pendingCount: 0,
    },
  };

  try {
    // 1. Self-Review Reportを生成
    const reviewReport = await summarizeFindings(index, totalMessages, errorCount);
    cycleLog.reviewReport = reviewReport;

    // 2. Issue Genesis: 改善タスクを生成
    const tasks = generateImprovementTasks(reviewReport);
    const sortedTasks = sortTasksByPriority(tasks);
    cycleLog.tasks = sortedTasks;
    cycleLog.summary.totalTasks = sortedTasks.length;

    // 3. AutoFix: 自動修正可能なタスクを抽出
    const autoFixableTasks = identifyAutoFixableTasks(sortedTasks);
    const autoFixSummary = summarizeAutoFix(autoFixableTasks);
    cycleLog.autoFixSummary = autoFixSummary;
    cycleLog.summary.autoFixableCount = autoFixSummary.autoFixableCount;

    // 4. AutoApply: 自動適用（Founder承認ありの場合のみ）
    if (autoApply && autoFixSummary.patches.length > 0) {
      try {
        // すべてのパッチを自動適用
        const commitMessage = `[Self-Evolution] Auto-apply ${autoFixSummary.patches.length} patches from cycle ${cycleId}`;
        const autoApplyResult = await runAutoApplyPipeline(
          autoFixSummary.patches,
          commitMessage
        );
        cycleLog.autoApplyResult = autoApplyResult;
        
        if (autoApplyResult.success) {
          cycleLog.summary.appliedCount = autoApplyResult.applied.filter(a => a.success).length;
        } else {
          cycleLog.summary.pendingCount = autoFixSummary.patches.length;
        }
      } catch (error) {
        console.error('[Self-Evolution Loop] AutoApply failed:', error);
        cycleLog.summary.pendingCount = autoFixSummary.patches.length;
        // AutoApplyの失敗はサイクル全体の失敗とはしない
      }
    } else {
      // 自動適用しない場合は保留
      cycleLog.summary.pendingCount = autoFixSummary.patches.length;
    }

    cycleLog.status = 'completed';
    cycleLog.completedAt = new Date().toISOString();

  } catch (error) {
    cycleLog.status = 'failed';
    cycleLog.error = error instanceof Error ? error.message : 'Unknown error';
    cycleLog.completedAt = new Date().toISOString();
  }

  // ログを保存
  saveCycleLog(cycleLog);

  return cycleLog;
}

/**
 * 次のループを予約（内部cron）
 * 注意: 本番環境では外部のcronサービス（node-cron等）を使用することを推奨
 * 
 * @param intervalMinutes - 次のサイクルまでの間隔（分）
 * @param callback - 実行するコールバック関数
 */
export function scheduleNextCycle(
  intervalMinutes: number,
  callback: () => Promise<void>
): NodeJS.Timeout {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  return setTimeout(async () => {
    try {
      await callback();
    } catch (error) {
      console.error('[Self-Evolution Loop] Scheduled cycle failed:', error);
    }
  }, intervalMs);
}

/**
 * サイクルログを保存
 * 
 * @param log - サイクルログ
 */
export function saveCycleLog(log: CycleLog): void {
  // 既存のログを更新
  const existingIndex = cycleLogs.findIndex(l => l.id === log.id);
  if (existingIndex >= 0) {
    cycleLogs[existingIndex] = log;
  } else {
    cycleLogs.push(log);
  }

  // 最新100件のみ保持
  if (cycleLogs.length > 100) {
    cycleLogs.shift();
  }
}

/**
 * 過去のループ履歴を返す
 * 
 * @param limit - 返すログの最大数（デフォルト: 10）
 * @returns サイクルログの配列（新しい順）
 */
export function getCycleHistory(limit: number = 10): CycleLog[] {
  return [...cycleLogs]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);
}

/**
 * 最新のサイクルログを取得
 * 
 * @returns 最新のサイクルログ、またはnull
 */
export function getLatestCycle(): CycleLog | null {
  if (cycleLogs.length === 0) {
    return null;
  }

  return [...cycleLogs]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
}

