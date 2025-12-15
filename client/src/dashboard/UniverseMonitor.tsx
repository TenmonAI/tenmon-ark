/**
 * ============================================================
 *  UNIVERSE MONITOR — Universe OS モニター
 * ============================================================
 * 
 * Universe OS の状態をリアルタイムで監視
 * ============================================================
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { LoadingState } from "@/components/ui/state/LoadingState";
import { ErrorState } from "@/components/ui/state/ErrorState";
import { EmptyState } from "@/components/ui/state/EmptyState";
import { PlanGate } from "@/components/ui/plan/PlanGate";

export function UniverseMonitor() {
  return (
    <PlanGate feature="founderFeatures" requiredPlan="founder" upgradeMessage="Founder プラン以上">
      <UniverseMonitorContent />
    </PlanGate>
  );
}

function UniverseMonitorContent() {
  const { user, isAuthenticated } = useAuth();

  // TODO: UniverseOS API エンドポイントが実装されたら有効化
  // const { data: osState, isLoading, error, refetch } = trpc.universeOS.getStatus.useQuery(
  //   undefined,
  //   { enabled: !!user && isAuthenticated }
  // );

  // 暫定: データが取得できない場合は空状態を表示
  const isLoading = false;
  const error = null;
  const osState = null;

  if (isLoading) {
    return <LoadingState message="Universe OS 構造を読み込んでいます" />;
  }

  if (error) {
    return <ErrorState message="Universe OS データの取得に失敗しました" onRetry={() => {/* refetch() */}} />;
  }

  if (!osState) {
    return <EmptyState title="Universe OS データがありません" description="最初の対話・保存を行ってください" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Universe OS Monitor
        </CardTitle>
        <CardDescription>Universe OS のリアルタイム状態</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Phase</p>
            <p className="text-2xl font-bold">{osState.phase || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completeness</p>
            <p className="text-2xl font-bold">{((osState.completeness || 0) * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Consciousness</p>
            <p className="text-2xl font-bold">{((osState.consciousnessLevel || 0) * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Growth</p>
            <p className="text-2xl font-bold">{((osState.growthLevel || 0) * 100).toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

