/**
 * Self-Evolution Client
 * 改善タスクを取得するクライアント関数
 */

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

export interface SelfEvolutionTasksResponse {
  tasks: ImprovementTask[];
  classified: Record<TaskCategory, ImprovementTask[]>;
  reportGeneratedAt: string;
}

/**
 * 改善タスク一覧を取得
 * 
 * @returns 改善タスク一覧
 */
export async function fetchImprovementTasks(): Promise<SelfEvolutionTasksResponse> {
  try {
    const response = await fetch('/api/self-evolution/tasks');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as SelfEvolutionTasksResponse;
    return data;

  } catch (error) {
    console.error('[Self-Evolution] Error:', error);
    throw error;
  }
}

