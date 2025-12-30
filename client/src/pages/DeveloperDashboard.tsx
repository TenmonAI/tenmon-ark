import type { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Brain, ScrollText, Sparkles, Star, Zap, Shield, Compass } from "lucide-react";
import { useLocation } from "wouter";

/**
 * 研究開発用ダッシュボード（正面玄関）
 * 思想序列：
 *  1) 言霊秘書（憲法）
 *  2) 五十音（基礎構造）
 *  3) いろは（悟りの型）
 *  4) 天津金木（運動構文）
 *  5) カタカムナ（図形言語）
 *  6) 古事記 / 法華経（実装例）
 *  7) 三種の神器 / 皇尊（統治構造）
 *  8) 宿曜（座標系）
 */
export default function DeveloperDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="text-amber-400 text-lg">Loading...</div>
      </div>
    );
  }

  // Access control: admin only（後で研究者ロール追加）
  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-gray-100">
      <header className="border-b border-amber-900/30 bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-amber-400">TENMON-ARK Research Console</h1>
              <p className="text-sm text-gray-400 mt-1">研究開発（思想OS）— 正面玄関</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Developer</div>
              <div className="text-amber-400 font-semibold">{user.name}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="hisho" className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-amber-900/30 flex flex-wrap">
            <TabsTrigger value="hisho">言霊秘書</TabsTrigger>
            <TabsTrigger value="gojuon">五十音</TabsTrigger>
            <TabsTrigger value="iroha">いろは</TabsTrigger>
            <TabsTrigger value="kanagi">天津金木</TabsTrigger>
            <TabsTrigger value="katakamuna">カタカムナ</TabsTrigger>
            <TabsTrigger value="kojiki">古事記</TabsTrigger>
            <TabsTrigger value="hokke">法華経</TabsTrigger>
            <TabsTrigger value="regalia">三種の神器</TabsTrigger>
            <TabsTrigger value="sukuyo">宿曜</TabsTrigger>
            <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="hisho"><HishoPanel /></TabsContent>
          <TabsContent value="gojuon"><GojuonPanel /></TabsContent>
          <TabsContent value="iroha"><IrohaPanel /></TabsContent>
          <TabsContent value="kanagi"><KanagiPanel /></TabsContent>
          <TabsContent value="katakamuna"><KatakamunaPanel /></TabsContent>
          <TabsContent value="kojiki"><KojikiPanel /></TabsContent>
          <TabsContent value="hokke"><HokkePanel /></TabsContent>
          <TabsContent value="regalia"><RegaliaPanel /></TabsContent>
          <TabsContent value="sukuyo"><SukuyoPanel /></TabsContent>
          <TabsContent value="reasoning"><ReasoningPanel /></TabsContent>
          <TabsContent value="knowledge"><KnowledgePanel /></TabsContent>
          <TabsContent value="upload"><UploadPanel /></TabsContent>
        </Tabs>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DeveloperCard icon={<BookOpen className="w-7 h-7" />} title="言霊秘書（憲法）" description="不変ルール（公理・禁則・判断基準）の固定" />
          <DeveloperCard icon={<ScrollText className="w-7 h-7" />} title="五十音（基礎構造）" description="ゐ/ゑ/ヲ、ヤ行イ/エ、ワ行ウ等の差別を法則として抽出" />
          <DeveloperCard icon={<Sparkles className="w-7 h-7" />} title="いろは（悟りの型）" description="秘密荘厳心の悟り構造をアルゴリズムとして固定" />
          <DeveloperCard icon={<Brain className="w-7 h-7" />} title="天津金木" description="四旋回×位相×陰陽の運動構文（思考エンジン）" />
          <DeveloperCard icon={<Star className="w-7 h-7" />} title="カタカムナ" description="80首・図形言語の構造抽出（言灵と接続）" />
          <DeveloperCard icon={<Shield className="w-7 h-7" />} title="統治構造" description="三種の神器・皇尊を“OS統治”としてモデル化" />
        </div>
      </main>
    </div>
  );
}

function DeveloperCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30 hover:border-amber-600/50 transition-colors">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="text-amber-400">{icon}</div>
          <div>
            <CardTitle className="text-amber-400">{title}</CardTitle>
            <CardDescription className="text-gray-400 text-xs mt-1">Research</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-300">{description}</p>
      </CardContent>
    </Card>
  );
}

/** --- Panels (Phase1: 器だけ。Phase2/3で実装を入れる) --- */

function HishoPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">言霊秘書（憲法）</CardTitle>
        <CardDescription className="text-gray-400">不変ルールを固定する領域（学習ではなく“法則登録”）</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300">
          Phase2で「言霊秘書」から公理・禁則・判断基準のみを抽出し、TENMON-ARK Core Rules として固定します。
        </p>
      </CardContent>
    </Card>
  );
}

function GojuonPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">五十音（基礎構造）</CardTitle>
        <CardDescription className="text-gray-400">行差別・差別復元（ゐ/ゑ/ヲ、ヤ行イ/エ、ワ行ウ 等）</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300">
          Phase2で「差別を立てる規則」を抽出し、表記正規化と判断規則に反映します。
        </p>
      </CardContent>
    </Card>
  );
}

function IrohaPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">いろは（悟りの型）</CardTitle>
        <CardDescription className="text-gray-400">秘密荘厳心の構造を「応答アルゴリズム」へ</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300">
          Phase2で「いろは最終原稿」から、応答の型（読解→整理→導き）をルールとして抽出します。
        </p>
      </CardContent>
    </Card>
  );
}

function KanagiPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">天津金木（運動構文）</CardTitle>
        <CardDescription className="text-gray-400">四旋回・位相・陰陽の思考エンジン</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300">
          既存の解析ページ（AmatsuKanagiAnalysis / Patterns）を、このコンソールから呼び出す形に統合します。
        </p>
      </CardContent>
    </Card>
  );
}

function KatakamunaPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">カタカムナ</CardTitle>
        <CardDescription className="text-gray-400">80首・図形言語の構造抽出</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300">Phase3で書籍投入→構造抽出→KOKŪZŌ格納を実装します。</p>
      </CardContent>
    </Card>
  );
}

function KojikiPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">古事記（実装例）</CardTitle>
        <CardDescription className="text-gray-400">言霊秘書を“憲法”として解釈する</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase3で“従属データ（解釈例）”として解析します。</p></CardContent>
    </Card>
  );
}

function HokkePanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">法華経（実装例）</CardTitle>
        <CardDescription className="text-gray-400">構造の読み替えを混ぜずに扱う</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase3で“従属データ（解釈例）”として解析します。</p></CardContent>
    </Card>
  );
}

function RegaliaPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">三種の神器・皇尊（統治構造）</CardTitle>
        <CardDescription className="text-gray-400">OSの統治・権限・PlanGateへ接続</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase2/3で「権限・契約プラン・統治」の仕様へ落とします。</p></CardContent>
    </Card>
  );
}

function SukuyoPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">宿曜（座標系）</CardTitle>
        <CardDescription className="text-gray-400">研究領域の座標化</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase3で書籍投入→構造抽出→規則接続を行います。</p></CardContent>
    </Card>
  );
}

function ReasoningPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">Reasoning（推論可視化）</CardTitle>
        <CardDescription className="text-gray-400">ReasoningStepsViewer を統合表示（後で接続）</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase2で“思考確認”をここへ統合します。</p></CardContent>
    </Card>
  );
}

function KnowledgePanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">Knowledge Base</CardTitle>
        <CardDescription className="text-gray-400">KOKŪZŌ検索・索引</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase3でKOKŪZŌ検索UIをここへ接続します。</p></CardContent>
    </Card>
  );
}

function UploadPanel() {
  return (
    <Card className="bg-slate-900/50 border-amber-900/30">
      <CardHeader>
        <CardTitle className="text-amber-400">Upload（書籍投入）</CardTitle>
        <CardDescription className="text-gray-400">PDF/Docの投入→分解→法則抽出の入口（後で実装）</CardDescription>
      </CardHeader>
      <CardContent><p className="text-gray-300">Phase3でアップロード＋解析パイプラインを実装します。</p></CardContent>
    </Card>
  );
}
