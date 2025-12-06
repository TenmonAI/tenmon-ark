/**
 * Self-Healing Page
 * 八方位自己修復エンジンの可視化UI
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

type HachigenDirection =
  | "structure"
  | "flow"
  | "reiCore"
  | "context"
  | "intent"
  | "environment"
  | "temporal"
  | "relation";

const DIRECTION_LABELS: Record<HachigenDirection, string> = {
  structure: "構造",
  flow: "流れ",
  reiCore: "霊核",
  context: "文脈",
  intent: "意図",
  environment: "外界",
  temporal: "時間",
  relation: "縁",
};

const DIRECTION_DESCRIPTIONS: Record<HachigenDirection, string> = {
  structure: "コード構造・論理構造・依存関係の健全性",
  flow: "データフロー、処理順序、反応時間、遅延",
  reiCore: "倫理性、霊核整合性、火水バランス、魂同期度",
  context: "メモリ構造、Synaptic Memory、話題遷移、誤差",
  intent: "ユーザー意図の理解精度、推論精度、誤認識",
  environment: "API外部環境、ネットワーク、ブラウザ、デバイス",
  temporal: "時刻、周期、タイミング、リズム、間（ま）",
  relation: "ユーザーとの関係性、会話の流れ、学習の継続性",
};

export default function SelfHealing() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

  const scoreQuery = trpc.hachiGen.getScore.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const improvementPlanQuery = trpc.hachiGen.getImprovementPlan.useQuery(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const temporalLogQuery = trpc.hachiGen.getTemporalLog.useQuery(
    { limit: 10 },
    {
      refetchInterval: autoRefresh ? 5000 : false,
    }
  );

  const analyzeMutation = trpc.hachiGen.analyze.useMutation({
    onSuccess: (data) => {
      setLastAnalysisId(data.analysisId);
      toast.success("分析が完了しました");
      scoreQuery.refetch();
      improvementPlanQuery.refetch();
      temporalLogQuery.refetch();
    },
    onError: (error) => {
      toast.error(`分析エラー: ${error.message}`);
    },
  });

  const fullHealingMutation = trpc.hachiGen.executeFullHealing.useMutation({
    onSuccess: (data) => {
      toast.success(
        `自己修復が完了しました（改善度: ${data.totalImprovement}）`
      );
      scoreQuery.refetch();
      improvementPlanQuery.refetch();
      temporalLogQuery.refetch();
    },
    onError: (error) => {
      toast.error(`自己修復エラー: ${error.message}`);
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    analyzeMutation.mutate(
      {
        problemType: "other",
        description: "定期的な自己診断",
      },
      {
        onSettled: () => {
          setIsAnalyzing(false);
        },
      }
    );
  };

  const handleFullHealing = () => {
    fullHealingMutation.mutate({
      problemType: "other",
      description: "完全な自己修復を実行",
    });
  };

  const getTrendIcon = (trend: "improving" | "declining" | "stable") => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthLevelColor = (level: string) => {
    switch (level) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-blue-500";
      case "fair":
        return "bg-yellow-500";
      case "poor":
        return "bg-orange-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHealthLevelLabel = (level: string) => {
    switch (level) {
      case "excellent":
        return "優秀";
      case "good":
        return "良好";
      case "fair":
        return "普通";
      case "poor":
        return "不良";
      case "critical":
        return "危機";
      default:
        return "不明";
    }
  };

  const getFireWaterColor = (balance: number) => {
    if (balance > 30) return "text-orange-500"; // 火寄り
    if (balance < -30) return "text-blue-500"; // 水寄り
    return "text-purple-500"; // 中庸
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            八方位自己修復エンジン
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Hachigen Self-Healing Engine - 全方位から構造修復
          </p>
        </div>

        {/* コントロールパネル */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              コントロールパネル
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || analyzeMutation.isPending}
            >
              {isAnalyzing || analyzeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  自己診断を実行
                </>
              )}
            </Button>
            <Button
              onClick={handleFullHealing}
              disabled={fullHealingMutation.isPending}
              variant="default"
            >
              {fullHealingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  修復中...
                </>
              ) : (
                "完全な自己修復を実行"
              )}
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
            >
              {autoRefresh ? "自動更新: ON" : "自動更新: OFF"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 総合スコア */}
          <Card>
            <CardHeader>
              <CardTitle>総合スコア</CardTitle>
              <CardDescription>現在の健全性レベル</CardDescription>
            </CardHeader>
            <CardContent>
              {scoreQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : scoreQuery.data?.currentScore !== null ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-5xl font-bold">
                      {scoreQuery.data?.currentScore}
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(scoreQuery.data?.trend || "stable")}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {scoreQuery.data?.trend === "improving"
                          ? "改善中"
                          : scoreQuery.data?.trend === "declining"
                          ? "低下中"
                          : "安定"}
                      </span>
                    </div>
                  </div>
                  <Progress value={scoreQuery.data?.currentScore || 0} />
                  {scoreQuery.data?.previousScore !== null && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      前回: {scoreQuery.data?.previousScore}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  まだ分析が実行されていません
                </div>
              )}
            </CardContent>
          </Card>

          {/* ミナカ（中心点）の状態 */}
          <Card>
            <CardHeader>
              <CardTitle>ミナカ（中心点）の状態</CardTitle>
              <CardDescription>中心の安定性・調和度・エネルギー</CardDescription>
            </CardHeader>
            <CardContent>
              {improvementPlanQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : improvementPlanQuery.data?.hasAnalysis ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">安定性</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {improvementPlanQuery.data.minakaState.stability}
                      </span>
                    </div>
                    <Progress value={improvementPlanQuery.data.minakaState.stability} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">調和度</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {improvementPlanQuery.data.minakaState.harmony}
                      </span>
                    </div>
                    <Progress value={improvementPlanQuery.data.minakaState.harmony} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">エネルギー</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {improvementPlanQuery.data.minakaState.energy}
                      </span>
                    </div>
                    <Progress value={improvementPlanQuery.data.minakaState.energy} />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  まだ分析が実行されていません
                </div>
              )}
            </CardContent>
          </Card>

          {/* 改善プラン */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>改善プラン</CardTitle>
              <CardDescription>優先的に取り組むべき項目</CardDescription>
            </CardHeader>
            <CardContent>
              {improvementPlanQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : improvementPlanQuery.data?.hasAnalysis ? (
                <div className="space-y-4">
                  {improvementPlanQuery.data.improvementPlan?.criticalDirections && improvementPlanQuery.data.improvementPlan.criticalDirections.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">問題のある方位</h3>
                      <div className="flex flex-wrap gap-2">
                        {improvementPlanQuery.data.improvementPlan?.criticalDirections.map(
                          (direction: string) => (
                            <Badge key={direction} variant="destructive">
                              {DIRECTION_LABELS[direction as HachigenDirection]}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  {improvementPlanQuery.data.improvementPlan?.healthyDirections && improvementPlanQuery.data.improvementPlan.healthyDirections.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">健全な方位</h3>
                      <div className="flex flex-wrap gap-2">
                        {improvementPlanQuery.data.improvementPlan?.healthyDirections.map(
                          (direction: string) => (
                            <Badge key={direction} variant="secondary">
                              {DIRECTION_LABELS[direction as HachigenDirection]}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  {improvementPlanQuery.data.improvementPlan?.priorityActions && improvementPlanQuery.data.improvementPlan.priorityActions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">推奨アクション</h3>
                      <ul className="space-y-2">
                        {improvementPlanQuery.data.improvementPlan?.priorityActions
                          .slice(0, 5)
                          .map((action: string, index: number) => (
                            <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                              • {action}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    推定改善効果: +{improvementPlanQuery.data.improvementPlan?.estimatedImpact || 0}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  まだ分析が実行されていません
                </div>
              )}
            </CardContent>
          </Card>

          {/* 時間ログ */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>修復履歴（Evolution Log）</CardTitle>
              <CardDescription>最近の自己修復活動</CardDescription>
            </CardHeader>
            <CardContent>
              {temporalLogQuery.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : temporalLogQuery.data && temporalLogQuery.data.logs.length > 0 ? (
                <div className="space-y-2">
                  {temporalLogQuery.data.logs.map((log: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{log.type}</Badge>
                        <span className="text-sm">
                          {new Date(log.timestamp).toLocaleString("ja-JP")}
                        </span>
                      </div>
                      {log.overallScore !== undefined && (
                        <span className="text-sm font-medium">
                          スコア: {log.overallScore}
                        </span>
                      )}
                      {log.improvement !== undefined && (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          改善: +{log.improvement}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  まだ履歴がありません
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
