/**
 * 🔱 Task Progress Panel UI
 * MegaScheduler のタスク進行状況を可視化するパネル
 */

import { useEffect, useState } from "react";
import { megaSchedulerClient, type SchedulerTask } from "@/lib/scheduler/megaSchedulerClient";

export function TaskProgressPanel() {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [autoStartRunning, setAutoStartRunning] = useState(false);

  useEffect(() => {
    // 初期タスク取得
    megaSchedulerClient.fetchTasks();
    
    // Auto-Start 状態を取得
    megaSchedulerClient.getAutoStartStatus().then((status) => {
      if (status) {
        setAutoStartRunning(status.running);
      }
    });
    
    const unsubscribe = megaSchedulerClient.onChange(() => {
      setTasks([...megaSchedulerClient.getTasks()]);
    });
    
    // ポーリングを開始（5秒間隔）
    megaSchedulerClient.startPolling(5000);
    
    // Auto-Start 状態を定期的にチェック
    const autoStartCheckInterval = setInterval(async () => {
      const status = await megaSchedulerClient.getAutoStartStatus();
      if (status) {
        setAutoStartRunning(status.running);
      }
    }, 2000); // 2秒間隔
    
    // クリーンアップ
    return () => {
      unsubscribe();
      megaSchedulerClient.stopPolling();
      clearInterval(autoStartCheckInterval);
    };
  }, []);

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">🌀 MegaScheduler – Task Progress</h3>
        {autoStartRunning && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/40 border border-blue-700 rounded-md animate-pulse">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-300 font-semibold">AutoStart Running...</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-slate-400 text-sm">タスクがありません</div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-md flex justify-between items-center transition-all ${
                t.completed
                  ? "bg-green-900/40 border border-green-700"
                  : t.current
                  ? "bg-blue-900/40 border border-blue-700 animate-pulse"
                  : "bg-slate-800/40 border border-slate-700"
              }`}
            >
              <div>
                <div className="text-white font-semibold">{t.description}</div>
                <div className="text-xs text-slate-400">{t.phase} / {t.id}</div>
              </div>
              <div className="text-sm text-slate-300">
                {t.completed ? "✓ Completed"
                  : t.current ? "● Running..."
                  : "… Pending"}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => megaSchedulerClient.next()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        ▶ 次のタスク（MEGA_SCHEDULER.NEXT）
      </button>
    </div>
  );
}

