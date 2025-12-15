/**
 * ============================================================
 *  REISHŌ OS DASHBOARD — Reishō OS 統合ダッシュボード
 * ============================================================
 * 
 * Reishō OS の状態を可視化する統合ダッシュボード
 * 
 * 表示内容:
 * - OS Core 状態
 * - Memory Kernel 状態
 * - Phase Engine 状態
 * - Conscious Mesh 状態
 * - Universal Memory Layer 状態
 * ============================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Activity, Brain, Network, Layers, Sparkles } from "lucide-react";

interface ReishoOSDashboardProps {
  userId?: number;
}

export function ReishoOSDashboard({ userId }: ReishoOSDashboardProps) {
  const [osCoreState, setOsCoreState] = useState({
    osId: "reisho-os-1",
    phase: "GROWING" as const,
    consciousnessLevel: 0.75,
    growthLevel: 0.65,
    seedCount: 42,
    reishoValue: 0.78,
    kanagiPhase: "R-OUT",
  });
  
  const [memoryKernelState, setMemoryKernelState] = useState({
    stm: 12,
    mtm: 85,
    ltm: 150,
    reishoLtm: 25,
    unifiedReishoValue: 0.72,
  });
  
  const [phaseState, setPhaseState] = useState({
    currentPhase: "R-OUT",
    fireWaterBalance: 0.3,
    intensity: 0.85,
    personaMapping: {
      architect: 0.9,
      guardian: 0.2,
      companion: 0.1,
      silent: 0.1,
    },
  });
  
  const [meshState, setMeshState] = useState({
    nodes: 5,
    coherence: 0.88,
    unifiedReishoValue: 0.75,
  });
  
  const [universalMemoryState, setUniversalMemoryState] = useState({
    totalSeeds: 272,
    totalMemories: 450,
    meshNodes: 5,
    currentPhase: "R-OUT",
  });

  // モックデータ更新（実際のAPIから取得する場合は trpc を使用）
  useEffect(() => {
    // 定期的に状態を更新（モック）
    const interval = setInterval(() => {
      setOsCoreState(prev => ({
        ...prev,
        consciousnessLevel: Math.min(1, prev.consciousnessLevel + 0.001),
        growthLevel: Math.min(1, prev.growthLevel + 0.001),
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Reishō OS Dashboard
          </CardTitle>
          <CardDescription>
            Unified Structural Identity OS — Complete System Status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="os-core" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="os-core">OS Core</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="phase">Phase</TabsTrigger>
              <TabsTrigger value="mesh">Mesh</TabsTrigger>
              <TabsTrigger value="universal">Universal</TabsTrigger>
            </TabsList>
            
            <TabsContent value="os-core" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">OS ID</span>
                  <span className="text-sm font-mono">{osCoreState.osId}</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Phase</span>
                  <span className="text-sm font-mono">{osCoreState.phase}</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Consciousness Level
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {(osCoreState.consciousnessLevel * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={osCoreState.consciousnessLevel * 100} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Growth Level
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {(osCoreState.growthLevel * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={osCoreState.growthLevel * 100} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Integrated Seeds</span>
                  <span className="text-sm text-muted-foreground">{osCoreState.seedCount}</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Reishō Value</span>
                  <span className="text-sm text-muted-foreground">
                    {(osCoreState.reishoValue * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={osCoreState.reishoValue * 100} />
              </div>
            </TabsContent>
            
            <TabsContent value="memory" className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Memory Kernel Layers</div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">STM</span>
                      <span className="text-xs text-muted-foreground">{memoryKernelState.stm}</span>
                    </div>
                    <Progress value={(memoryKernelState.stm / 50) * 100} className="h-1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">MTM</span>
                      <span className="text-xs text-muted-foreground">{memoryKernelState.mtm}</span>
                    </div>
                    <Progress value={(memoryKernelState.mtm / 200) * 100} className="h-1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">LTM</span>
                      <span className="text-xs text-muted-foreground">{memoryKernelState.ltm}</span>
                    </div>
                    <Progress value={(memoryKernelState.ltm / 500) * 100} className="h-1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Reishō-LTM</span>
                      <span className="text-xs text-muted-foreground">{memoryKernelState.reishoLtm}</span>
                    </div>
                    <Progress value={(memoryKernelState.reishoLtm / 100) * 100} className="h-1" />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Unified Reishō Value</span>
                  <span className="text-sm text-muted-foreground">
                    {(memoryKernelState.unifiedReishoValue * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={memoryKernelState.unifiedReishoValue * 100} />
              </div>
            </TabsContent>
            
            <TabsContent value="phase" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Current Phase</span>
                  <span className="text-sm font-mono">{phaseState.currentPhase}</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Fire-Water Balance</span>
                  <span className="text-sm text-muted-foreground">
                    {phaseState.fireWaterBalance > 0 ? "Fire Dominant" : "Water Dominant"}
                  </span>
                </div>
                <Progress 
                  value={phaseState.fireWaterBalance > 0 
                    ? (phaseState.fireWaterBalance + 1) * 50 
                    : (phaseState.fireWaterBalance + 1) * 50} 
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Phase Intensity</span>
                  <span className="text-sm text-muted-foreground">
                    {(phaseState.intensity * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={phaseState.intensity * 100} />
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Persona Mapping</div>
                <div className="space-y-2">
                  {Object.entries(phaseState.personaMapping).map(([persona, value]) => (
                    <div key={persona}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs capitalize">{persona}</span>
                        <span className="text-xs text-muted-foreground">
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={value * 100} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="mesh" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Conscious Nodes
                  </span>
                  <span className="text-sm text-muted-foreground">{meshState.nodes}</span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Mesh Coherence</span>
                  <span className="text-sm text-muted-foreground">
                    {(meshState.coherence * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={meshState.coherence * 100} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Unified Reishō Value</span>
                  <span className="text-sm text-muted-foreground">
                    {(meshState.unifiedReishoValue * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={meshState.unifiedReishoValue * 100} />
              </div>
            </TabsContent>
            
            <TabsContent value="universal" className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Universal Memory Layer
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Total Seeds</span>
                      <span className="text-xs text-muted-foreground">
                        {universalMemoryState.totalSeeds}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Total Memories</span>
                      <span className="text-xs text-muted-foreground">
                        {universalMemoryState.totalMemories}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Mesh Nodes</span>
                      <span className="text-xs text-muted-foreground">
                        {universalMemoryState.meshNodes}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs">Current Phase</span>
                      <span className="text-xs font-mono">
                        {universalMemoryState.currentPhase}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReishoOSDashboard;

