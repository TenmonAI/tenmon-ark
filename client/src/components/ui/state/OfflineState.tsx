/**
 * ============================================================
 *  OFFLINE STATE — オフライン状態UI
 * ============================================================
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi } from "lucide-react";

interface OfflineStateProps {
  syncStatus?: "ONLINE_SYNCED" | "ONLINE_DIRTY" | "OFFLINE";
  className?: string;
}

export function OfflineState({ 
  syncStatus = "OFFLINE",
  className = "" 
}: OfflineStateProps) {
  const getStatusConfig = () => {
    switch (syncStatus) {
      case "ONLINE_SYNCED":
        return {
          icon: Wifi,
          label: "🟢 ONLINE_SYNCED",
          color: "bg-green-100 text-green-800",
        };
      case "ONLINE_DIRTY":
        return {
          icon: Wifi,
          label: "🟡 ONLINE_DIRTY",
          color: "bg-yellow-100 text-yellow-800",
        };
      default:
        return {
          icon: WifiOff,
          label: "🔵 個体モードで稼働中",
          color: "bg-blue-100 text-blue-800",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="w-12 h-12 text-muted-foreground mb-4" />
        <Badge className={config.color} variant="outline">
          {config.label}
        </Badge>
        <p className="text-xs text-muted-foreground mt-4">
          {syncStatus === "OFFLINE" 
            ? "オフライン時も会話・操作を継続できます"
            : syncStatus === "ONLINE_DIRTY"
            ? "同期待ちの変更があります"
            : "すべて同期済みです"}
        </p>
      </CardContent>
    </Card>
  );
}

