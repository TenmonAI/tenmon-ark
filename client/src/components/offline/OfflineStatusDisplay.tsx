/**
 * ============================================================
 *  OFFLINE STATUS DISPLAY — オフラインステータス表示
 * ============================================================
 * 
 * 個別モード実行中のステータス表示
 * ============================================================
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Clock, CheckCircle } from "lucide-react";

interface OfflineStatusDisplayProps {
  status: "ONLINE" | "OFFLINE_CLEAN" | "OFFLINE_DIRTY" | "SYNCING";
  eventBacklogCount?: number;
  latestSnapshotLamport?: number;
  syncState?: {
    lastAck?: number;
    isSyncing?: boolean;
  };
}

export function OfflineStatusDisplay({
  status,
  eventBacklogCount = 0,
  latestSnapshotLamport,
  syncState,
}: OfflineStatusDisplayProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-500";
      case "OFFLINE_CLEAN":
        return "bg-yellow-500";
      case "OFFLINE_DIRTY":
        return "bg-orange-500";
      case "SYNCING":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "オンライン";
      case "OFFLINE_CLEAN":
        return "オフライン（クリーン）";
      case "OFFLINE_DIRTY":
        return "オフライン（変更あり）";
      case "SYNCING":
        return "同期中";
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Individual Mode Status
        </CardTitle>
        <CardDescription>
          個別モード実行中のステータス
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* ステータス */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Connection Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
              <Badge variant="outline">{getStatusLabel(status)}</Badge>
            </div>
          </div>

          {/* イベントバックログ */}
          {eventBacklogCount > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Event Backlog</p>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">{eventBacklogCount} events</span>
              </div>
            </div>
          )}

          {/* 最新スナップショット Lamport */}
          {latestSnapshotLamport !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Latest Snapshot</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-mono">Lamport: {latestSnapshotLamport}</span>
              </div>
            </div>
          )}

          {/* 同期ステート */}
          {syncState && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Sync State</p>
              <div className="space-y-1">
                {syncState.isSyncing && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 animate-spin" />
                    <span className="text-sm">同期中...</span>
                  </div>
                )}
                {syncState.lastAck && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      Last ACK: {new Date(syncState.lastAck).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

