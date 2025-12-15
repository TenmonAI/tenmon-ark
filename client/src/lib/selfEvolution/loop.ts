/**
 * Self-Evolution Loop Client
 * 自己進化ループ関連のクライアント関数
 */

export interface CycleLog {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  reviewReport?: any;
  tasks?: any[];
  autoFixSummary?: any;
  autoApplyResult?: any;
  error?: string;
  summary: {
    totalTasks: number;
    autoFixableCount: number;
    appliedCount: number;
    pendingCount: number;
  };
}

export interface CycleHistoryResponse {
  cycles: CycleLog[];
  latest: CycleLog | null;
}

export interface RunCycleRequest {
  autoApply?: boolean;
}

/**
 * 進化サイクルを手動で実行
 * 
 * @param request - 実行リクエスト
 * @returns サイクルログ
 */
export async function runCycle(request: RunCycleRequest = {}): Promise<CycleLog> {
  try {
    const response = await fetch('/api/self-evolution/runCycle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json() as CycleLog;
    return result;

  } catch (error) {
    console.error('[Self-Evolution Loop] Error:', error);
    throw error;
  }
}

/**
 * 過去のループ履歴を取得
 * 
 * @param limit - 返すログの最大数（デフォルト: 10）
 * @returns サイクル履歴
 */
export async function fetchCycleHistory(limit: number = 10): Promise<CycleHistoryResponse> {
  try {
    const response = await fetch(`/api/self-evolution/cycleHistory?limit=${limit}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json() as CycleHistoryResponse;
    return result;

  } catch (error) {
    console.error('[Self-Evolution Loop History] Error:', error);
    throw error;
  }
}

