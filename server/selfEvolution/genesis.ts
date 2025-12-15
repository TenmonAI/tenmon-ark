/**
 * Issue Genesis Engine
 * 改善点生成エンジン - Self-Review Reportから改善タスクを生成
 */

import type { SelfReviewReport, CommonIssue, FeedbackAnalysis } from '../selfReview/core';

export type TaskCategory = 'ui-ux' | 'reasoning' | 'voice' | 'device' | 'security' | 'other';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface ImprovementTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  source: {
    type: 'feedback' | 'chat-log' | 'issue';
    reference: string;
  };
  estimatedEffort?: string;
  createdAt: string;
}

/**
 * 問題点をタスク形式に変換
 * 
 * @param report - Self-Review Report
 * @returns 改善タスクの配列
 */
export function generateImprovementTasks(report: SelfReviewReport): ImprovementTask[] {
  const tasks: ImprovementTask[] = [];

  // Common Issuesからタスクを生成
  for (const issue of report.commonIssues) {
    const task = createTaskFromIssue(issue);
    tasks.push(task);
  }

  // Feedback Analysisからタスクを生成
  for (const analysis of report.feedbackAnalysis) {
    if (analysis.sentiment === 'negative' && analysis.count >= 2) {
      const task = createTaskFromFeedback(analysis);
      tasks.push(task);
    }
  }

  // Chat Log Evaluationからタスクを生成
  if (report.chatLogEvaluation.errorRate > 5) {
    tasks.push({
      id: `task_chat_error_${Date.now()}`,
      title: 'チャットエラー率の改善',
      description: `エラー率が${report.chatLogEvaluation.errorRate.toFixed(1)}%と高めです。安定性の向上が必要です。`,
      category: 'reasoning',
      priority: 'high',
      source: {
        type: 'chat-log',
        reference: `Error rate: ${report.chatLogEvaluation.errorRate.toFixed(1)}%`,
      },
      estimatedEffort: 'medium',
      createdAt: new Date().toISOString(),
    });
  }

  if (report.chatLogEvaluation.ambiguousResponses > 0) {
    tasks.push({
      id: `task_chat_ambiguous_${Date.now()}`,
      title: '曖昧回答の改善',
      description: `曖昧な回答が${report.chatLogEvaluation.ambiguousResponses}件検出されました。回答精度の向上が必要です。`,
      category: 'reasoning',
      priority: 'medium',
      source: {
        type: 'chat-log',
        reference: `Ambiguous responses: ${report.chatLogEvaluation.ambiguousResponses}`,
      },
      estimatedEffort: 'high',
      createdAt: new Date().toISOString(),
    });
  }

  return tasks;
}

/**
 * Common Issueからタスクを生成
 */
function createTaskFromIssue(issue: CommonIssue): ImprovementTask {
  const category = classifyIssue(issue.keyword);
  const priority = scorePriority(issue);

  return {
    id: `task_issue_${issue.keyword}_${Date.now()}`,
    title: `「${issue.keyword}」に関する改善`,
    description: `「${issue.keyword}」に関する問題が${issue.frequency}回報告されています。${issue.relatedFeedbacks[0] || ''}`,
    category,
    priority,
    source: {
      type: 'issue',
      reference: `Frequency: ${issue.frequency}, Severity: ${issue.severity}`,
    },
    estimatedEffort: priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Feedback Analysisからタスクを生成
 */
function createTaskFromFeedback(analysis: FeedbackAnalysis): ImprovementTask {
  const category = classifyCategory(analysis.category);
  const priority = analysis.count >= 5 ? 'high' : analysis.count >= 2 ? 'medium' : 'low';

  return {
    id: `task_feedback_${analysis.category}_${Date.now()}`,
    title: `${analysis.category}カテゴリの改善`,
    description: `${analysis.category}カテゴリのフィードバックが${analysis.count}件あります。改善を検討してください。`,
    category,
    priority,
    source: {
      type: 'feedback',
      reference: `Category: ${analysis.category}, Count: ${analysis.count}`,
    },
    estimatedEffort: priority === 'high' ? 'high' : 'medium',
    createdAt: new Date().toISOString(),
  };
}

/**
 * タスクをカテゴリに分類
 * 
 * @param tasks - 改善タスクの配列
 * @returns カテゴリ別に分類されたタスク
 */
export function classifyTasks(tasks: ImprovementTask[]): Record<TaskCategory, ImprovementTask[]> {
  const classified: Record<TaskCategory, ImprovementTask[]> = {
    'ui-ux': [],
    'reasoning': [],
    'voice': [],
    'device': [],
    'security': [],
    'other': [],
  };

  for (const task of tasks) {
    classified[task.category].push(task);
  }

  return classified;
}

/**
 * 問題キーワードからカテゴリを判定
 */
function classifyIssue(keyword: string): TaskCategory {
  const lowerKeyword = keyword.toLowerCase();

  // UI/UX関連
  if (lowerKeyword.includes('ui') || lowerKeyword.includes('ux') || 
      lowerKeyword.includes('デザイン') || lowerKeyword.includes('見た目') ||
      lowerKeyword.includes('使いにくい') || lowerKeyword.includes('わかりにくい') ||
      lowerKeyword.includes('design') || lowerKeyword.includes('interface')) {
    return 'ui-ux';
  }

  // 音声関連
  if (lowerKeyword.includes('音声') || lowerKeyword.includes('voice') ||
      lowerKeyword.includes('whisper') || lowerKeyword.includes('stt') ||
      lowerKeyword.includes('マイク') || lowerKeyword.includes('録音')) {
    return 'voice';
  }

  // デバイス関連
  if (lowerKeyword.includes('デバイス') || lowerKeyword.includes('device') ||
      lowerKeyword.includes('mobile') || lowerKeyword.includes('スマホ') ||
      lowerKeyword.includes('gps') || lowerKeyword.includes('バッテリー')) {
    return 'device';
  }

  // セキュリティ関連
  if (lowerKeyword.includes('セキュリティ') || lowerKeyword.includes('security') ||
      lowerKeyword.includes('安全') || lowerKeyword.includes('保護') ||
      lowerKeyword.includes('脆弱性') || lowerKeyword.includes('vulnerability')) {
    return 'security';
  }

  // 推論精度関連
  if (lowerKeyword.includes('エラー') || lowerKeyword.includes('error') ||
      lowerKeyword.includes('バグ') || lowerKeyword.includes('bug') ||
      lowerKeyword.includes('不具合') || lowerKeyword.includes('問題') ||
      lowerKeyword.includes('遅い') || lowerKeyword.includes('slow') ||
      lowerKeyword.includes('精度') || lowerKeyword.includes('accuracy')) {
    return 'reasoning';
  }

  return 'other';
}

/**
 * フィードバックカテゴリからタスクカテゴリを判定
 */
function classifyCategory(category: string): TaskCategory {
  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('ui') || lowerCategory.includes('ux') ||
      lowerCategory.includes('デザイン') || lowerCategory.includes('見た目')) {
    return 'ui-ux';
  }

  if (lowerCategory.includes('音声') || lowerCategory.includes('voice')) {
    return 'voice';
  }

  if (lowerCategory.includes('デバイス') || lowerCategory.includes('device')) {
    return 'device';
  }

  if (lowerCategory.includes('セキュリティ') || lowerCategory.includes('security')) {
    return 'security';
  }

  if (lowerCategory.includes('バグ') || lowerCategory.includes('bug') ||
      lowerCategory.includes('エラー') || lowerCategory.includes('error')) {
    return 'reasoning';
  }

  return 'other';
}

/**
 * タスクの優先度をスコアリング
 * 
 * @param issue - Common Issue
 * @returns 優先度
 */
export function scorePriority(issue: CommonIssue): TaskPriority {
  // 頻度と重要度から優先度を決定
  if (issue.severity === 'high' || issue.frequency >= 5) {
    return 'high';
  } else if (issue.severity === 'medium' || issue.frequency >= 2) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * タスクを優先度順にソート
 * 
 * @param tasks - 改善タスクの配列
 * @returns 優先度順にソートされたタスク
 */
export function sortTasksByPriority(tasks: ImprovementTask[]): ImprovementTask[] {
  const priorityOrder: Record<TaskPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...tasks].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    // 優先度が同じ場合は作成日時でソート（新しい順）
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

