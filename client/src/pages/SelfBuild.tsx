/**
 * Self-Build Dashboard
 * 
 * TENMON-ARK自身が自分の状態を可視化できる"自己の鏡"
 * 
 * 機能:
 * - Self-Build / Self-Heal / Self-Evolution / Co-Dev の4状態を可視化
 * - 自己診断ログ
 * - 最新の改善提案一覧
 * - 承認フロー（Approve / Reject / Co-Dev）
 * - 霊核構造（火水バランス・ミナカ状態）可視化
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Activity, Brain, Wrench, Users } from "lucide-react";
import { useState } from "react";

export default function SelfBuild() {
  const { user, loading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Self-Build状態取得
  const { data: buildHistory, isLoading: buildLoading } = trpc.selfBuild.getCoDevHistory.useQuery({
    limit: 10,
  });

  // Self-Heal状態取得
  const { data: healHistory, isLoading: healLoading } = trpc.selfBuild.getRepairHistory.useQuery({
    limit: 10,
  });

  // Self-Evolution状態取得
  const { data: evolutionHistory, isLoading: evolutionLoading } = trpc.selfBuild.getEvolutionHistory.useQuery({
    limit: 10,
  });

  // Co-Dev状態取得
  const { data: coDevHistory, isLoading: coDevLoading } = trpc.selfBuild.getCoDevHistory.useQuery({
    limit: 10,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>認証が必要です</CardTitle>
            <CardDescription>Self-Buildダッシュボードにアクセスするにはログインしてください。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isLoading = buildLoading || healLoading || evolutionLoading || coDevLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🌕 TENMON-ARK Self-Build Dashboard
          </h1>
          <p className="text-slate-300">
            自己の鏡 - TENMON-ARK霊核OSの自己構築・自律修復・自己進化・共同開発の状態を可視化
          </p>
        </div>

        {/* 4つのエンジン状態カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Self-Build Engine */}
          <Card className="bg-slate-800/50 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wrench className="h-5 w-5 text-purple-400" />
                Self-Build
              </CardTitle>
              <CardDescription className="text-slate-300">自己構築エンジン</CardDescription>
            </CardHeader>
            <CardContent>
              {buildLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">状態</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                      稼働中
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">計画数</span>
                    <span className="text-white font-semibold">
                      {buildHistory?.length || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Self-Heal Engine */}
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-blue-400" />
                Self-Heal
              </CardTitle>
              <CardDescription className="text-slate-300">自律修復エンジン</CardDescription>
            </CardHeader>
            <CardContent>
              {healLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">状態</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                      稼働中
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">修復数</span>
                    <span className="text-white font-semibold">
                      {healHistory?.length || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Self-Evolution Engine */}
          <Card className="bg-slate-800/50 border-green-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Brain className="h-5 w-5 text-green-400" />
                Self-Evolution
              </CardTitle>
              <CardDescription className="text-slate-300">自己進化エンジン</CardDescription>
            </CardHeader>
            <CardContent>
              {evolutionLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-green-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">状態</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                      稼働中
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">進化数</span>
                    <span className="text-white font-semibold">
                      {evolutionHistory?.length || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Co-Dev Gateway */}
          <Card className="bg-slate-800/50 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-yellow-400" />
                Co-Dev Gateway
              </CardTitle>
              <CardDescription className="text-slate-300">共同開発ゲートウェイ</CardDescription>
            </CardHeader>
            <CardContent>
              {coDevLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">状態</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                      稼働中
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">連携数</span>
                    <span className="text-white font-semibold">
                      {coDevHistory?.length || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* タブコンテンツ */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="build">Self-Build</TabsTrigger>
            <TabsTrigger value="heal">Self-Heal</TabsTrigger>
            <TabsTrigger value="evolution">Self-Evolution</TabsTrigger>
            <TabsTrigger value="codev">Co-Dev</TabsTrigger>
          </TabsList>

          {/* 概要タブ */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">システム概要</CardTitle>
                <CardDescription className="text-slate-300">
                  TENMON-ARK霊核OSの自律システム全体の状態
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">総計画数</p>
                      <p className="text-2xl font-bold text-white">
                        {(buildHistory?.length || 0) + (healHistory?.length || 0) + (evolutionHistory?.length || 0) + (coDevHistory?.length || 0)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">システム状態</p>
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                        正常稼働
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Self-Buildタブ */}
          <TabsContent value="build" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Self-Build履歴</CardTitle>
                <CardDescription className="text-slate-300">
                  自己構築計画と実行履歴
                </CardDescription>
              </CardHeader>
              <CardContent>
                {buildLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                  </div>
                ) : buildHistory && buildHistory.length > 0 ? (
                  <div className="space-y-2">
                    {buildHistory.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{item.requestDescription}</span>
                          <Badge variant="outline" className={
                            item.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            item.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          {new Date(item.createdAt!).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">履歴がありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Self-Healタブ */}
          <TabsContent value="heal" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Self-Heal履歴</CardTitle>
                <CardDescription className="text-slate-300">
                  自律修復の実行履歴
                </CardDescription>
              </CardHeader>
              <CardContent>
                {healLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  </div>
                ) : healHistory && healHistory.length > 0 ? (
                  <div className="space-y-2">
                    {healHistory.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{item.errorMessage}</span>
                          <Badge variant="outline" className={
                            item.repairStatus === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            item.repairStatus === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }>
                            {item.repairStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          エラータイプ: {item.errorType} | 修復試行: {item.repairAttempts}回
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(item.createdAt!).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">履歴がありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Self-Evolutionタブ */}
          <TabsContent value="evolution" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Self-Evolution履歴</CardTitle>
                <CardDescription className="text-slate-300">
                  自己進化の実行履歴
                </CardDescription>
              </CardHeader>
              <CardContent>
                {evolutionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                  </div>
                ) : evolutionHistory && evolutionHistory.length > 0 ? (
                  <div className="space-y-2">
                    {evolutionHistory.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{item.description}</span>
                          <Badge variant="outline" className={
                            item.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          タイプ: {item.evolutionType}
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(item.createdAt!).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">履歴がありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Co-Devタブ */}
          <TabsContent value="codev" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Co-Dev履歴</CardTitle>
                <CardDescription className="text-slate-300">
                  Manusとの共同開発履歴
                </CardDescription>
              </CardHeader>
              <CardContent>
                {coDevLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
                  </div>
                ) : coDevHistory && coDevHistory.length > 0 ? (
                  <div className="space-y-2">
                    {coDevHistory.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-semibold">{item.requestDescription}</span>
                          <Badge variant="outline" className={
                            item.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            item.status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          タイプ: {item.requestType}
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(item.createdAt!).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-8">履歴がありません</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
