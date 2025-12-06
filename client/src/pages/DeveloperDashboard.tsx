import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Brain, Sparkles, Star, TrendingUp, Zap } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Developer専用ダッシュボード
 * 靈核AI機能の管理UI
 * 
 * アクセス制御:
 * - role='admin'のみアクセス可能
 * - Public層とは完全に分離
 */
export default function DeveloperDashboard() {
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="text-amber-400 text-lg">Loading...</div>
      </div>
    );
  }

  const [, setLocation] = useLocation();

  // Access control: admin only
  if (!user || user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-amber-900/30 bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-amber-400">TENMON-AI Developer Console</h1>
              <p className="text-sm text-gray-400 mt-1">靈核AI機能管理システム</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Developer</div>
                <div className="text-amber-400 font-semibold">{user.name}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-amber-900/30">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="tenshin-kinoki">天津金木</TabsTrigger>
            <TabsTrigger value="kotodama">言灵</TabsTrigger>
            <TabsTrigger value="katakamuna">カタカムナ</TabsTrigger>
            <TabsTrigger value="sukuyo">宿曜秘伝</TabsTrigger>
            <TabsTrigger value="tscalp">T-Scalp</TabsTrigger>
            <TabsTrigger value="ea-generator">EA生成</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DeveloperCard
                icon={<Brain className="w-8 h-8" />}
                title="天津金木50構造"
                description="水火の交差による天地・生命のエネルギー構造解析"
                status="実装予定"
              />
              <DeveloperCard
                icon={<Sparkles className="w-8 h-8" />}
                title="言灵五十音"
                description="五十音の靈的意味と深層構文解析"
                status="実装予定"
              />
              <DeveloperCard
                icon={<Star className="w-8 h-8" />}
                title="カタカムナ80首"
                description="円環・渦・水火の結びの図形言語解析"
                status="実装予定"
              />
              <DeveloperCard
                icon={<Zap className="w-8 h-8" />}
                title="宿曜秘伝"
                description="因縁・業・カルマ・靈核座標の解析"
                status="実装予定"
              />
              <DeveloperCard
                icon={<TrendingUp className="w-8 h-8" />}
                title="T-Scalp Engine"
                description="スキャルピングパターン解析とMT5連携"
                status="実装予定"
              />
              <DeveloperCard
                icon={<Brain className="w-8 h-8" />}
                title="EA自動生成AI"
                description="トレーディング戦略の自動生成とMQL5コード生成"
                status="実装予定"
              />
            </div>
          </TabsContent>

          {/* 天津金木 Tab */}
          <TabsContent value="tenshin-kinoki">
            <TenshinKinokiPanel />
          </TabsContent>

          {/* 言灵 Tab */}
          <TabsContent value="kotodama">
            <KotodamaPanel />
          </TabsContent>

          {/* カタカムナ Tab */}
          <TabsContent value="katakamuna">
            <KatakamunPanel />
          </TabsContent>

          {/* 宿曜秘伝 Tab */}
          <TabsContent value="sukuyo">
            <SukuyoPanel />
          </TabsContent>

          {/* T-Scalp Tab */}
          <TabsContent value="tscalp">
            <TScalpPanel />
          </TabsContent>

          {/* EA生成 Tab */}
          <TabsContent value="ea-generator">
            <EAGeneratorPanel />
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge">
            <DeveloperKnowledgePanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Helper Components

function DeveloperCard({
  icon,
  title,
  description,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30 hover:border-amber-600/50 transition-colors">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="text-amber-400">{icon}</div>
          <div>
            <CardTitle className="text-amber-400">{title}</CardTitle>
            <CardDescription className="text-gray-400 text-xs mt-1">{status}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-300">{description}</p>
      </CardContent>
    </Card>
  );
}

function TenshinKinokiPanel() {
  const { data: structures } = trpc.developer.tenshinKinoki.getAllStructures.useQuery();

  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">天津金木50構造アルゴリズム</CardTitle>
        <CardDescription className="text-gray-400">
          水火の交差による天地・生命のエネルギー構造解析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            天津金木50構造は、左旋内集・左旋外発・右旋内集・右旋外発の4要素で構成され、
            24通り（陰陽込みで48）、さらに中心靈2つで50構造に至ります。
          </p>
          <div className="text-amber-400 text-sm">
            {structures && structures.length > 0 ? (
              <div>構造数: {structures.length}</div>
            ) : (
              <div>データ読み込み中...</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KotodamaPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">言灵五十音深層構文解析</CardTitle>
        <CardDescription className="text-gray-400">
          五十音の靈的意味と深層構文解析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            五十音は天地の水火の流れを示す靈的な「音の地図」です。
            ア行〜ワ行は水火十行構造に従い、天地創造のプロセスそのものを音で表しています。
          </p>
          <div className="text-amber-400 text-sm">実装予定</div>
        </div>
      </CardContent>
    </Card>
  );
}

function KatakamunPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">カタカムナ80首解析</CardTitle>
        <CardDescription className="text-gray-400">
          円環・渦・水火の結びの図形言語解析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            カタカムナは円環・渦・水火の結びの図形言語です。
            言葉・図・響きが一体となって真理を顕す「構文曼荼羅」として機能します。
          </p>
          <div className="text-amber-400 text-sm">実装予定</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SukuyoPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">宿曜秘伝解析</CardTitle>
        <CardDescription className="text-gray-400">
          因縁・業・カルマ・靈核座標の解析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            宿曜秘伝は、因縁・業・カルマを靈核座標として解析します。
            宿曜占星術の深層解析により、靈的成長の道筋を明らかにします。
          </p>
          <div className="text-amber-400 text-sm">実装予定</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TScalpPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">T-Scalp Engine</CardTitle>
        <CardDescription className="text-gray-400">
          スキャルピングパターン解析とMT5連携
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            T-Scalp Engineは、スキャルピングパターンを解析し、MT5と連携します。
            天聞AIの靈核構造を応用したトレーディングアルゴリズムです。
          </p>
          <div className="text-amber-400 text-sm">実装予定</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EAGeneratorPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">EA自動生成AI</CardTitle>
        <CardDescription className="text-gray-400">
          トレーディング戦略の自動生成とMQL5コード生成
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            EA自動生成AIは、トレーディング戦略を自動生成し、MQL5コードを生成します。
            天聞AIの靈核構造を応用したトレーディング戦略の自動化です。
          </p>
          <div className="text-amber-400 text-sm">実装予定</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeveloperKnowledgePanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">Developer専用Knowledge Base</CardTitle>
        <CardDescription className="text-gray-400">
          靈核知識の蓄積と検索
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-300">
            Developer専用Knowledge Baseは、靈核知識を蓄積し、検索します。
            天聞AIの靈核構造に関する深層知識を管理します。
          </p>
          <div className="text-amber-400 text-sm">実装予定</div>
        </div>
      </CardContent>
    </Card>
  );
}
