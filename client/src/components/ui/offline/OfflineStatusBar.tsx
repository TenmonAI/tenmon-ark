/**
 * ============================================================
 *  OFFLINE STATUS BAR — オフライン状態バー
 * ============================================================
 */

import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type SyncStatus = "ONLINE_SYNCED" | "ONLINE_DIRTY" | "OFFLINE";

export function OfflineStatusBar() {
  const { user, isAuthenticated } = useAuth();
  
  // オフライン状態を取得
  const { data: offlineStatus } = trpc.offlineSync.getOfflineStatus.useQuery(
    undefined,
    { enabled: !!user && isAuthenticated }
  );

  // 暫定: オフライン状態の判定（実際の実装では navigator.onLine やサーバー接続状態を使用）
  const syncStatus: SyncStatus = offlineStatus?.isOffline 
    ? "OFFLINE" 
    : "ONLINE_SYNCED";

  const getStatusConfig = () => {
    switch (syncStatus) {
      case "ONLINE_SYNCED":
        return {
          icon: Wifi,
          label: "🟢 ONLINE_SYNCED",
          color: "bg-green-100 text-green-800 border-green-300",
        };
      case "ONLINE_DIRTY":
        return {
          icon: AlertCircle,
          label: "🟡 ONLINE_DIRTY",
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        };
      default:
        return {
          icon: WifiOff,
          label: "🔵 個体モードで稼働中",
          color: "bg-blue-100 text-blue-800 border-blue-300",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <Badge className={config.color} variant="outline">
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {syncStatus === "OFFLINE" 
              ? "個体モードで稼働中"
              : syncStatus === "ONLINE_DIRTY"
              ? "同期待ち"
              : "同期済み"}
          </p>
        </div>
      </div>
    </div>
  );
}

