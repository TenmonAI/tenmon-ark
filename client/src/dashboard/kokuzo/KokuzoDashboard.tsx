/**
 * ============================================================
 *  KOKŪZŌ DASHBOARD — Kokūzō Server Dashboard
 * ============================================================
 * 
 * Kokūzō Server のダッシュボード
 * 
 * 機能:
 * - 3D Seed Map 可視化
 * - Memory River 可視化
 * - Kanagi Flow 可視化
 * ============================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeedTree3D } from "./SeedTree3D";
import { MemoryRiver } from "./MemoryRiver";
import { KanagiFlow } from "./KanagiFlow";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { LoadingState } from "@/components/ui/state/LoadingState";
import { ErrorState } from "@/components/ui/state/ErrorState";
import { EmptyState } from "@/components/ui/state/EmptyState";

export function KokuzoDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("seed-tree");
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5秒ごとに更新
  
  // データベースから統計を取得
  const { data: stats, isLoading, error, refetch } = trpc.kokuzo.getStats.useQuery(
    undefined,
    {
      enabled: !!user && isAuthenticated,
      refetchInterval: refreshInterval,
    }
  );
  
  useEffect(() => {
    // リアルタイム更新を有効化
    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, refetch]);

  if (isLoading) {
    return <LoadingState message="Kokūzō 構造を読み込んでいます" />;
  }

  if (error) {
    return <ErrorState message="Kokūzō データの取得に失敗しました" onRetry={() => refetch()} />;
  }

  if (!stats) {
    return <EmptyState title="Kokūzō データがありません" description="最初の対話・保存を行ってください" />;
  }
  
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Kokūzō Server Dashboard</CardTitle>
          <CardDescription>
            Eternal Structural Memory OS — 永続構造メモリ OS
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 統計情報 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.semanticUnitCount}</div>
                <div className="text-sm text-muted-foreground">Semantic Units</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.fractalSeedCount}</div>
                <div className="text-sm text-muted-foreground">Fractal Seeds</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.kzFileCount}</div>
                <div className="text-sm text-muted-foreground">Files</div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="seed-tree">Seed Tree 3D</TabsTrigger>
              <TabsTrigger value="memory-river">Memory River</TabsTrigger>
              <TabsTrigger value="kanagi-flow">Kanagi Flow</TabsTrigger>
            </TabsList>
            
            <TabsContent value="seed-tree">
              <SeedTree3D />
            </TabsContent>
            
            <TabsContent value="memory-river">
              <MemoryRiver />
            </TabsContent>
            
            <TabsContent value="kanagi-flow">
              <KanagiFlow />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

