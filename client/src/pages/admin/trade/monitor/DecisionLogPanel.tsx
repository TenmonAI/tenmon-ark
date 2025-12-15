/**
 * ============================================================
 *  DECISION LOG PANEL — 判断ログ（思考の履歴）
 * ============================================================
 * 
 * 表示:
 * - time | direction | decision | reason
 * 
 * API: tenmonTrade.getDecisionLogs()
 * 
 * 仕様:
 * - 削除不可
 * - 書き換え不可
 * ============================================================
 */

import { trpc } from "@/lib/trpc";

export function DecisionLogPanel() {
  const { data: decisionLog } = trpc.adminTrade.getDecisionLogs.useQuery(undefined, {
    refetchInterval: 1000, // 1秒ごとに更新
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getDecisionColor = (decision: string) => {
    if (decision === "STOP" || decision === "LOCK") {
      return "text-red-400";
    }
    if (decision === "WAIT") {
      return "text-yellow-400";
    }
    if (decision.includes("PROPOSE")) {
      return "text-blue-400";
    }
    if (decision.includes("EXECUTE")) {
      return "text-green-400";
    }
    return "text-white";
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 h-64 flex flex-col">
      <h2 className="text-white font-semibold mb-4">判断ログ</h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {decisionLog && decisionLog.length > 0 ? (
          decisionLog.map((log, index) => (
            <div
              key={index}
              className="text-xs bg-gray-800 p-2 rounded border border-gray-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{formatTime(log.time)}</span>
                <span className="text-white">|</span>
                <span className="text-white font-semibold">{log.direction}</span>
                <span className="text-white">|</span>
                <span className={`font-semibold ${getDecisionColor(log.decision)}`}>
                  {log.decision}
                </span>
              </div>
              <div className="text-gray-400 mt-1">{log.reason}</div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-center py-8">ログがありません</div>
        )}
      </div>
    </div>
  );
}

