/**
 * ============================================================
 *  ADMIN TRADE PAGE — 管理者トレードダッシュボード
 * ============================================================
 * 
 * 天聞専用（TENMON_ADMIN のみ）
 * ============================================================
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { AdminTradeHeader } from "../../../components/admin/trade/AdminTradeHeader";
import { PhaseController } from "../../../components/admin/trade/PhaseController";
import { EmergencyStopPanel } from "../../../components/admin/trade/EmergencyStopPanel";
import { LotControlPanel } from "../../../components/admin/trade/LotControlPanel";
import { MarketStatePanel } from "../../../components/admin/trade/MarketStatePanel";
import { DecisionLogPanel } from "../../../components/admin/trade/DecisionLogPanel";
import { KokuzoMemoryPanel } from "../../../components/admin/trade/KokuzoMemoryPanel";
import { SystemStatusFooter } from "../../../components/admin/trade/SystemStatusFooter";

export default function AdminTradePage() {
  const { user, isAuthenticated } = useAuth();

  // 権限制御：admin のみアクセス可能
  if (!isAuthenticated || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">アクセス拒否</h1>
          <p className="text-gray-400">このページは管理者専用です。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <AdminTradeHeader />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel (Control) */}
        <div className="w-80 border-r border-gray-700 p-4 space-y-4 overflow-y-auto">
          <PhaseController />
          <EmergencyStopPanel />
          <LotControlPanel />
        </div>

        {/* Main Panel (State / Monitor) */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <MarketStatePanel />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DecisionLogPanel />
            <KokuzoMemoryPanel />
          </div>
        </div>
      </div>

      {/* Footer */}
      <SystemStatusFooter />
    </div>
  );
}

