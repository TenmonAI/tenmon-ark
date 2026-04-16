/**
 * 🔱 MegaScheduler Client v1.0
 * TENMON-ARK 内でタスク進行状況を可視化するための
 * UI → Scheduler ブリッジ。
 * 
 * 注意: /api/scheduler/* は Cursor が MegaScheduler を動かすための内部エンドポイント。
 * TENMON-ARK側では UI 状態可視化のみを行う。
 */

export interface SchedulerTask {
  id: string;
  phase: string;
  description: string;
  completed: boolean;
  current: boolean;
  timestamp?: string;
}

export interface SchedulerState {
  tasks: SchedulerTask[];
  currentPhase?: string;
  totalTasks: number;
  completedTasks: number;
  progress: number; // 0-100
}

class MegaSchedulerClient {
  private tasks: SchedulerTask[] = [];
  private listeners: Array<() => void> = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  /**
   * タスク一覧を取得
   */
  async fetchTasks(): Promise<SchedulerTask[]> {
    try {
      const res = await fetch("/api/scheduler/tasks");
      if (!res.ok) {
        console.warn("[MegaScheduler] Failed to fetch tasks:", res.status);
        return this.tasks; // 既存のタスクを返す
      }
      const data = await res.json();
      this.tasks = Array.isArray(data) ? data : data.tasks || [];
      this.emit();
      return this.tasks;
    } catch (error) {
      console.error("[MegaScheduler] Error fetching tasks:", error);
      return this.tasks; // 既存のタスクを返す
    }
  }

  /**
   * 次のタスクを開始
   */
  async next(): Promise<SchedulerState | null> {
    try {
      const res = await fetch("/api/scheduler/next", { method: "POST" });
      if (!res.ok) {
        console.warn("[MegaScheduler] Failed to start next task:", res.status);
        return null;
      }
      const data = await res.json();
      this.tasks = data.tasks || this.tasks;
      this.emit();
      return this.getState();
    } catch (error) {
      console.error("[MegaScheduler] Error starting next task:", error);
      return null;
    }
  }

  /**
   * タスクを完了としてマーク
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      const res = await fetch("/api/scheduler/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        console.warn("[MegaScheduler] Failed to complete task:", res.status);
        return false;
      }
      const data = await res.json();
      this.tasks = data.tasks || this.tasks;
      this.emit();
      return true;
    } catch (error) {
      console.error("[MegaScheduler] Error completing task:", error);
      return false;
    }
  }

  /**
   * ポーリングを開始（自動更新）
   */
  startPolling(intervalMs: number = 5000): void {
    if (this.isPolling) {
      return; // 既にポーリング中
    }
    this.isPolling = true;
    this.fetchTasks(); // 即座に1回実行
    this.pollingInterval = setInterval(() => {
      this.fetchTasks();
    }, intervalMs);
  }

  /**
   * ポーリングを停止
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * 変更リスナーを登録
   */
  onChange(cb: () => void): () => void {
    this.listeners.push(cb);
    // クリーンアップ関数を返す
    return () => {
      const index = this.listeners.indexOf(cb);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * リスナーに通知
   */
  private emit(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        console.error("[MegaScheduler] Error in listener:", error);
      }
    });
  }

  /**
   * 現在のタスク一覧を取得
   */
  getTasks(): SchedulerTask[] {
    return [...this.tasks]; // コピーを返す
  }

  /**
   * Auto-Start の状態を取得
   */
  async getAutoStartStatus(): Promise<{
    enabled: boolean;
    running: boolean;
    lastRun?: Date;
  } | null> {
    try {
      const res = await fetch("/api/scheduler/autostart/status");
      if (!res.ok) {
        console.warn("[MegaScheduler] Failed to fetch auto-start status:", res.status);
        return null;
      }
      const data = await res.json();
      return data.status || null;
    } catch (error) {
      console.error("[MegaScheduler] Error fetching auto-start status:", error);
      return null;
    }
  }

  /**
   * スケジューラーの状態を取得
   */
  getState(): SchedulerState {
    const completedTasks = this.tasks.filter((t) => t.completed).length;
    const totalTasks = this.tasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const currentTask = this.tasks.find((t) => t.current);
    const currentPhase = currentTask?.phase;

    return {
      tasks: this.tasks,
      currentPhase,
      totalTasks,
      completedTasks,
      progress: Math.round(progress),
    };
  }

  /**
   * 特定のフェーズのタスクを取得
   */
  getTasksByPhase(phase: string): SchedulerTask[] {
    return this.tasks.filter((t) => t.phase === phase);
  }

  /**
   * 現在実行中のタスクを取得
   */
  getCurrentTask(): SchedulerTask | undefined {
    return this.tasks.find((t) => t.current);
  }
}

export const megaSchedulerClient = new MegaSchedulerClient();

