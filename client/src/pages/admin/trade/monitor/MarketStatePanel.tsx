/**
 * ============================================================
 *  MARKET STATE PANEL — 市場状態の可視化（READ ONLY）
 * ============================================================
 * 
 * 表示項目:
 * - Time Regime
 * - ATR / VolClass
 * - Market State
 * - Loss Quality
 * - Saturation Count
 * 
 * API: tenmonTrade.getCurrentMarketState()
 * ============================================================
 */

import { trpc } from "@/lib/trpc";

export function MarketStatePanel() {
  const { data: marketState } = trpc.adminTrade.getMarketState.useQuery(undefined, {
    refetchInterval: 1000, // 1秒ごとに更新
  });

  const getStatusColor = (status: string) => {
    if (status.includes("VALID") || status.includes("HEALTHY") || status.includes("IDEAL")) {
      return "text-green-400";
    }
    if (status.includes("WEAK") || status.includes("MID")) {
      return "text-yellow-400";
    }
    return "text-red-400";
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
      <h2 className="text-white font-semibold mb-4">市場状態モニター</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Time Regime:</span>
          <span className={`font-semibold ${getStatusColor(marketState?.timeRegime || "")}`}>
            {marketState?.timeRegime || "N/A"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">ATR:</span>
          <span className={`font-semibold ${getStatusColor(marketState?.volClass || "")}`}>
            {marketState?.atr?.toFixed(2) || "N/A"} ({marketState?.volClass || "N/A"})
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Market State:</span>
          <span className={`font-semibold ${getStatusColor(marketState?.marketState || "")}`}>
            {marketState?.marketState || "N/A"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Loss Quality:</span>
          <span className={`font-semibold ${getStatusColor(marketState?.lossQuality || "")}`}>
            {marketState?.lossQuality || "N/A"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Entry Saturation:</span>
          <span className="text-white font-semibold">
            {marketState?.saturationCount || 0} / {marketState?.saturationMax || 3}
          </span>
        </div>
      </div>
    </div>
  );
}

