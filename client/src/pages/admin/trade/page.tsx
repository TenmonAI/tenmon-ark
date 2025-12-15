/**
 * ============================================================
 *  ADMIN TRADE PAGE — 管理者トレード画面のルート
 * ============================================================
 * 
 * 責務:
 * - レイアウト定義
 * - Admin 判定
 * - 各パネルの配置のみ（ロジック禁止）
 * ============================================================
 */

import { AdminGuard } from "./_guard/AdminGuard";
import { AdminTradeHeader } from "./header/AdminTradeHeader";
import { PhaseController } from "./control/PhaseController";
import { EmergencyStopPanel } from "./control/EmergencyStopPanel";
import { LotControlPanel } from "./control/LotControlPanel";
import { MarketStatePanel } from "./monitor/MarketStatePanel";
import { DecisionLogPanel } from "./monitor/DecisionLogPanel";
import { KokuzoMemoryPanel } from "./monitor/KokuzoMemoryPanel";
import { SystemStatusFooter } from "./footer/SystemStatusFooter";

export default function AdminTradePage() {
  return (
    <AdminGuard>
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
    </AdminGuard>
  );
}

