/**
 * ============================================================
 *  KOKUZO MEMORY PANEL — Kokūzō Memory Viewer
 * ============================================================
 * 
 * 最近ブロックされた構文を表示（閲覧のみ）
 * ============================================================
 */

import { trpc } from "@/lib/trpc";

export function KokuzoMemoryPanel() {
  const { data: prohibitedPatterns } = trpc.adminTrade.getProhibitedPatterns.useQuery(undefined, {
    refetchInterval: 5000, // 5秒ごとに更新
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ja-JP");
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 h-64 flex flex-col">
      <h2 className="text-white font-semibold mb-4">Kokūzō Memory Viewer</h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {prohibitedPatterns && prohibitedPatterns.length > 0 ? (
          prohibitedPatterns.map((pattern) => (
            <div
              key={pattern.timestamp}
              className="text-xs bg-gray-800 p-2 rounded border border-red-500/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                  BLOCK
                </span>
                <span className="text-gray-400">{formatTime(pattern.timestamp)}</span>
              </div>
              <div className="text-white">
                {pattern.symbol} @ {pattern.price} ({pattern.direction || "N/A"})
              </div>
              <div className="text-gray-400 mt-1">
                Reason: {pattern.reason}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-center py-8">禁止構文がありません</div>
        )}
      </div>
    </div>
  );
}

