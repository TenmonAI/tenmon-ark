/**
 * AutoFix Client Types
 * 自動修復関連の型定義
 */

import type { ImprovementTask, TaskCategory } from './client';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface AutoFixPatch {
  id: string;
  taskId: string;
  filePath: string;
  patch: string; // 差分形式の文字列（Cursor用）
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface AutoFixableTask {
  task: ImprovementTask;
  patches: AutoFixPatch[];
  autoFixable: boolean;
  reason?: string;
}

export interface AutoFixSummary {
  totalTasks: number;
  autoFixableCount: number;
  patches: AutoFixPatch[];
  tasks: AutoFixableTask[];
  generatedAt: string;
}

/**
 * 自動修復候補を取得
 * 
 * @returns 自動修復サマリー
 */
export async function fetchAutoFixSummary(): Promise<AutoFixSummary> {
  try {
    const response = await fetch('/api/self-evolution/autoFix');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as AutoFixSummary;
    return data;

  } catch (error) {
    console.error('[AutoFix] Error:', error);
    throw error;
  }
}

