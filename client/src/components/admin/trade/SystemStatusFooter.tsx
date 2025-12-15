/**
 * ============================================================
 *  SYSTEM STATUS FOOTER — システム状態フッター
 * ============================================================
 */

import { trpc } from "@/lib/trpc";

export function SystemStatusFooter() {
  const { data: systemStatus } = trpc.adminTrade.getSystemStatus.useQuery(undefined, {
    refetchInterval: 2000, // 2秒ごとに更新
  });

  const getStatusColor = (status: string) => {
    if (status === "CONNECTED" || status === "OK" || status === "LIVE") {
      return "text-green-400";
    }
    return "text-red-400";
  };

  return (
    <footer className="bg-black text-white border-t border-gray-700 px-6 py-3 flex items-center justify-between text-sm">
      <div className="flex items-center gap-6">
        <div>
          <span className="text-gray-400">MT5:</span>{" "}
          <span className={getStatusColor(systemStatus?.mt5 || "")}>
            {systemStatus?.mt5 || "DISCONNECTED"}
          </span>
        </div>
        <div>
          <span className="text-gray-400">ZeroMQ:</span>{" "}
          <span className={getStatusColor(systemStatus?.zeromq || "")}>
            {systemStatus?.zeromq || "ERROR"}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Data Feed:</span>{" "}
          <span className={getStatusColor(systemStatus?.dataFeed || "")}>
            {systemStatus?.dataFeed || "MANUAL"}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Latency:</span>{" "}
          <span className="text-white">{systemStatus?.latency || 0} ms</span>
        </div>
      </div>
    </footer>
  );
}

