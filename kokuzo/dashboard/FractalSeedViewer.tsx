/**
 * 🔱 KOKŪZŌ Fractal Engine — FractalSeed Viewer
 * 火水バランス / 天津金木フェーズ / 意味中心 / 構文核 を可視化
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Droplet, Zap, Layers, Network, Target } from "lucide-react";
import type { FractalSeed } from "../fractal/compression";
import type { UniversalStructuralSeed } from "../fractal/seedV2";

interface FractalSeedViewerProps {
  seed: FractalSeed | UniversalStructuralSeed;
}

export function FractalSeedViewer({ seed }: FractalSeedViewerProps) {
  const isUniversal = 'recursionPotential' in seed;
  const usSeed = isUniversal ? seed as UniversalStructuralSeed : null;
  
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Layers className="w-5 h-5" />
          構文核ビューア
        </CardTitle>
        <CardDescription className="text-slate-400">
          FractalSeed ID: {seed.id}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 火水バランス */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-white text-sm font-medium">火（外発）</span>
            </div>
            <span className="text-slate-300 text-sm">
              {seed.compressedRepresentation.kotodamaVector.fire.toFixed(3)}
            </span>
          </div>
          <Progress 
            value={seed.compressedRepresentation.kotodamaVector.fire * 100} 
            className="h-2"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-500" />
              <span className="text-white text-sm font-medium">水（内集）</span>
            </div>
            <span className="text-slate-300 text-sm">
              {seed.compressedRepresentation.kotodamaVector.water.toFixed(3)}
            </span>
          </div>
          <Progress 
            value={seed.compressedRepresentation.kotodamaVector.water * 100} 
            className="h-2"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">バランス</span>
            <Badge 
              variant={seed.compressedRepresentation.fireWaterBalance > 0 ? "default" : "secondary"}
              className={
                seed.compressedRepresentation.fireWaterBalance > 0.2 
                  ? "bg-orange-500" 
                  : seed.compressedRepresentation.fireWaterBalance < -0.2 
                  ? "bg-blue-500" 
                  : "bg-slate-600"
              }
            >
              {seed.compressedRepresentation.fireWaterBalance > 0.2 
                ? "火優勢" 
                : seed.compressedRepresentation.fireWaterBalance < -0.2 
                ? "水優勢" 
                : "均衡"}
            </Badge>
          </div>
          <Progress 
            value={(seed.compressedRepresentation.fireWaterBalance + 1) * 50} 
            className="h-2"
          />
        </div>
        
        {/* 天津金木フェーズ */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-white text-sm font-medium">天津金木フェーズ</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Badge 
              variant={seed.compressedRepresentation.kanagiPhaseMode === "L-IN" ? "default" : "outline"}
              className={seed.compressedRepresentation.kanagiPhaseMode === "L-IN" ? "bg-purple-500" : ""}
            >
              L-IN
            </Badge>
            <Badge 
              variant={seed.compressedRepresentation.kanagiPhaseMode === "L-OUT" ? "default" : "outline"}
              className={seed.compressedRepresentation.kanagiPhaseMode === "L-OUT" ? "bg-purple-500" : ""}
            >
              L-OUT
            </Badge>
            <Badge 
              variant={seed.compressedRepresentation.kanagiPhaseMode === "R-IN" ? "default" : "outline"}
              className={seed.compressedRepresentation.kanagiPhaseMode === "R-IN" ? "bg-purple-500" : ""}
            >
              R-IN
            </Badge>
            <Badge 
              variant={seed.compressedRepresentation.kanagiPhaseMode === "R-OUT" ? "default" : "outline"}
              className={seed.compressedRepresentation.kanagiPhaseMode === "R-OUT" ? "bg-purple-500" : ""}
            >
              R-OUT
            </Badge>
          </div>
        </div>
        
        {/* 意味中心（Centroid） */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-white text-sm font-medium">意味中心（Centroid）</span>
          </div>
          <div className="text-slate-400 text-xs">
            次元数: {seed.compressedRepresentation.centroidVector.length}
          </div>
          <div className="text-slate-300 text-xs font-mono truncate">
            {seed.compressedRepresentation.centroidVector.slice(0, 5).map(v => v.toFixed(3)).join(", ")}...
          </div>
        </div>
        
        {/* 構文核情報 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-green-500" />
            <span className="text-white text-sm font-medium">構文核情報</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-slate-400">ユニット数</div>
            <div className="text-white">{seed.semanticUnitIds.length}</div>
            <div className="text-slate-400">エッジ数</div>
            <div className="text-white">{seed.compressedRepresentation.semanticEdges.length}</div>
            <div className="text-slate-400">生成力</div>
            <div className="text-white">{seed.compressedRepresentation.seedWeight.toFixed(3)}</div>
            <div className="text-slate-400">主タグ</div>
            <div className="text-white">{seed.compressedRepresentation.mainTags.length}</div>
          </div>
        </div>
        
        {/* 宇宙構文核拡張情報（UniversalStructuralSeed の場合） */}
        {usSeed && (
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <div className="text-white text-sm font-medium">宇宙構文核拡張</div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">再帰的生成力</span>
                <span className="text-white text-sm">{usSeed.recursionPotential.toFixed(3)}</span>
              </div>
              <Progress value={usSeed.recursionPotential * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">収縮力</span>
                <span className="text-white text-sm">{usSeed.contractionPotential.toFixed(3)}</span>
              </div>
              <Progress value={usSeed.contractionPotential * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="text-slate-400 text-sm">デバイス親和性</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-400">CPU</div>
                <div className="text-white">{usSeed.deviceAffinityProfile.cpuAffinity.toFixed(3)}</div>
                <div className="text-slate-400">ストレージ</div>
                <div className="text-white">{usSeed.deviceAffinityProfile.storageAffinity.toFixed(3)}</div>
                <div className="text-slate-400">ネットワーク</div>
                <div className="text-white">{usSeed.deviceAffinityProfile.networkAffinity.toFixed(3)}</div>
                <div className="text-slate-400">GPU</div>
                <div className="text-white">{usSeed.deviceAffinityProfile.gpuAffinity.toFixed(3)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

