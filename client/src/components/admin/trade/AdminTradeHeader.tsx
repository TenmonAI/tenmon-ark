/**
 * ============================================================
 *  ADMIN TRADE HEADER — 管理者トレードダッシュボード ヘッダー
 * ============================================================
 * 
 * 天聞専用
 * ============================================================
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function AdminTradeHeader() {
  const { user } = useAuth();
  const { data: phaseData } = trpc.adminTrade.getPhase.useQuery();

  return (
    <header className="bg-black text-white border-b border-red-500 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">TENMON-ARK</h1>
        <span className="text-red-500 font-semibold">ADMIN TRADE CONTROL — TENMON ONLY</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm">
          <span className="text-gray-400">Admin:</span>{" "}
          <span className="font-semibold">{user?.name || "Unknown"}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-400">Phase:</span>{" "}
          <span className="font-semibold text-red-500">
            {phaseData?.phase || "T-1"}
          </span>
        </div>
      </div>
    </header>
  );
}

