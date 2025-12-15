/**
 * ============================================================
 *  REISHŌ PANEL — Founder専用ダッシュボード
 * ============================================================
 * 
 * 表示内容:
 * - current Reishō signature
 * - Fire/Water balance
 * - Kanagi tensor position
 * - Persona resonance map
 * - Structural intent vector
 * - Seed-phase activity heatmap
 * ============================================================
 */

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Droplets, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { LoadingState } from "@/components/ui/state/LoadingState";
import { ErrorState } from "@/components/ui/state/ErrorState";
import { EmptyState } from "@/components/ui/state/EmptyState";
import { PlanGate } from "@/components/ui/plan/PlanGate";

interface ReishoSignature {
  unifiedFireWaterTensor: number[];
  kanagiPhaseTensor: number[][];
  kotodamaHelixTensor: number[];
  structuralIntentVector: number[];
  reishoValue: number;
  timestamp: number;
}

interface ReishoPanelProps {
  userId?: number;
}

export function ReishoPanel({ userId }: ReishoPanelProps) {
  const { user, isAuthenticated } = useAuth();

  return (
    <PlanGate feature="founderFeatures" requiredPlan="founder" upgradeMessage="Founder プラン以上">
      <ReishoPanelContent userId={userId} />
    </PlanGate>
  );
}

function ReishoPanelContent({ userId }: ReishoPanelProps) {
  const { user, isAuthenticated } = useAuth();

  // TODO: Reisho API エンドポイントが実装されたら有効化
  // const { data: reishoData, isLoading, error, refetch } = trpc.reisho.getSignature.useQuery(
  //   undefined,
  //   { enabled: !!user && isAuthenticated }
  // );

  // 暫定: データが取得できない場合は空状態を表示
  const isLoading = false;
  const error = null;
  const reishoData = null;

  // 計算された値
  const { reishoSignature, fireWaterBalance, kanagiPhase, personaResonance } = useMemo(() => {
    if (!reishoData) {
      return {
        reishoSignature: null,
        fireWaterBalance: { fire: 50, water: 50 },
        kanagiPhase: "L-IN" as const,
        personaResonance: {},
      };
    }

    // TODO: 実際のデータ構造に合わせて調整
    const signature: ReishoSignature = {
      unifiedFireWaterTensor: reishoData.unifiedFireWaterTensor || [],
      kanagiPhaseTensor: reishoData.kanagiPhaseTensor || [],
      kotodamaHelixTensor: reishoData.kotodamaHelixTensor || [],
      structuralIntentVector: reishoData.structuralIntentVector || [],
      reishoValue: reishoData.reishoValue || 0,
      timestamp: reishoData.timestamp || Date.now(),
    };

    // 火水バランスを計算
    const fire = signature.kanagiPhaseTensor[2]?.[0] ?? 0.5;
    const water = signature.kanagiPhaseTensor[2]?.[1] ?? 0.5;
    const balance = {
      fire: Math.round(fire * 100),
      water: Math.round(water * 100),
    };

    // 天津金木フェーズを決定
    const l = signature.kanagiPhaseTensor[0]?.[0] ?? 0;
    const r = signature.kanagiPhaseTensor[0]?.[1] ?? 0;
    const in_ = signature.kanagiPhaseTensor[1]?.[0] ?? 0;
    const out = signature.kanagiPhaseTensor[1]?.[1] ?? 0;

    let phase: "L-IN" | "L-OUT" | "R-IN" | "R-OUT" = "L-IN";
    if (r >= l && out <= in_) {
      phase = "R-IN";
    } else if (r >= l && out > in_) {
      phase = "R-OUT";
    } else if (r < l && out <= in_) {
      phase = "L-IN";
    } else {
      phase = "L-OUT";
    }

    // Persona共鳴度を計算
    const resonance = {
      architect: fire > 0.6 ? 0.8 : 0.3,
      guardian: fire > 0.7 ? 0.9 : 0.2,
      companion: water > 0.6 ? 0.8 : 0.3,
      silent: Math.abs(fire - water) < 0.1 ? 0.7 : 0.2,
    };

    return {
      reishoSignature: signature,
      fireWaterBalance: balance,
      kanagiPhase: phase,
      personaResonance: resonance,
    };
  }, [reishoData]);

  if (isLoading) {
    return <LoadingState message="Reishō 構造を読み込んでいます" />;
  }

  if (error) {
    return <ErrorState message="Reishō データの取得に失敗しました" onRetry={() => {/* refetch() */}} />;
  }

  if (!reishoSignature) {
    return <EmptyState title="Reishō データがありません" description="最初の対話・保存を行ってください" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Reishō Panel
        </CardTitle>
        <CardDescription>
          Unified Structural Identity for TENMON-ARK OS
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="firewater">Fire/Water</TabsTrigger>
            <TabsTrigger value="kanagi">Kanagi</TabsTrigger>
            <TabsTrigger value="persona">Persona</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Reishō Value</span>
                <span className="text-sm text-muted-foreground">
                  {(reishoSignature.reishoValue * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={reishoSignature.reishoValue * 100} />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Structural Intent Vector</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {reishoSignature.structuralIntentVector.slice(0, 10).map((value, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-xs text-muted-foreground">V{idx + 1}</div>
                    <div className="text-sm font-medium">{(value * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="firewater" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Fire
                </span>
                <span className="text-sm text-muted-foreground">{fireWaterBalance.fire}%</span>
              </div>
              <Progress value={fireWaterBalance.fire} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Water
                </span>
                <span className="text-sm text-muted-foreground">{fireWaterBalance.water}%</span>
              </div>
              <Progress value={fireWaterBalance.water} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Balance</span>
                <span className="text-sm text-muted-foreground">
                  {fireWaterBalance.fire > fireWaterBalance.water ? "Fire Dominant" : 
                   fireWaterBalance.water > fireWaterBalance.fire ? "Water Dominant" : 
                   "Balanced"}
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="kanagi" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Kanagi Phase</span>
                <span className="text-sm font-mono">{kanagiPhase}</span>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Kanagi Tensor (4x4)</div>
              <div className="grid grid-cols-4 gap-2">
                {reishoSignature.kanagiPhaseTensor.map((row, rowIdx) =>
                  row.map((value, colIdx) => (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className="text-center p-2 bg-muted rounded text-xs"
                    >
                      {value.toFixed(2)}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Kotodama Helix Tensor (3D)</div>
              <div className="flex gap-4">
                {reishoSignature.kotodamaHelixTensor.map((value, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-xs text-muted-foreground">
                      {idx === 0 ? "X" : idx === 1 ? "Y" : "Z"}
                    </div>
                    <div className="text-sm font-medium">{(value * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="persona" className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Persona Resonance Map</div>
              <div className="space-y-2">
                {Object.entries(personaResonance).map(([persona, resonance]) => (
                  <div key={persona}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize">{persona}</span>
                      <span className="text-sm text-muted-foreground">
                        {(resonance * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={resonance * 100} className="h-1" />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReishoPanel;

