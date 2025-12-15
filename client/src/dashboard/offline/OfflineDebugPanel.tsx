/**
 * ============================================================
 *  OFFLINE DEBUG PANEL — オフラインデバッグパネル
 * ============================================================
 * 
 * Founder ダッシュボード用のオフラインデバッグパネル
 * ============================================================
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Database, Network, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function OfflineDebugPanel() {
  const { data: offlineStatus } = trpc.offlineSync.getOfflineStatus.useQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Offline Debug Panel
        </CardTitle>
        <CardDescription>
          Founder専用: オフラインモードの診断とデバッグ
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Connection Status</p>
                <Badge variant={offlineStatus?.isOffline ? "destructive" : "default"}>
                  {offlineStatus?.isOffline ? "Offline" : "Online"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-sm font-mono">
                  {offlineStatus?.lastSyncTimestamp
                    ? new Date(offlineStatus.lastSyncTimestamp).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="storage" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">Local Storage</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>IndexedDB / SQLite の状態を表示</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span className="text-sm font-medium">Sync Queue</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>同期待ちのイベント数を表示</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Inner Reflection Log</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>オフライン時の内部反省ログを表示</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

