/**
 * Dashboard v3 (Founder-grade)
 * 
 * TENMON-ARK SPEC準拠
 * - Founder専用機能を含む完全リデザイン
 * - Advanced Analytics
 * - Custom ARK Management
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  User,
  CreditCard,
  Code,
  FileText,
  Loader2,
  Crown,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  Smartphone,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SpeechInputButton } from "@/components/voice/SpeechInputButton";
import { SemanticSearchBar } from "@/components/dashboard-v12/SemanticSearchBar";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { MessageSquarePlus } from "lucide-react";
import DeviceClusterDashboard from "@/deviceCluster-v3/ui/DeviceClusterDashboard";
import { StatusPanel } from "@/components/dashboard-v13/StatusPanel";
import { TaskProgressPanel } from "@/components/scheduler/TaskProgressPanel";

export default function DashboardV3() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Get user subscription
  const { data: subscription, isLoading: subLoading } = trpc.subscription.getMy.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Get recent chat rooms
  const { data: rooms, isLoading: roomsLoading } = trpc.chat.listRooms.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        <p className="text-muted-foreground text-sm">
          {authLoading ? 'セッションを復元中...' : 'プラン情報を読み込み中...'}
        </p>
      </div>
    );
  }

  const planName = subscription?.planName || "free";
  const isFounder = planName === "founder";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6" />
              <h1 className="text-2xl font-bold">TENMON-ARK Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              {isFounder && (
                <>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
                    <Crown className="w-4 h-4" />
                    Founder
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeedbackModalOpen(true)}
                    className="text-xs"
                  >
                    <MessageSquarePlus className="w-3 h-3 mr-1" />
                    改善を提案
                  </Button>
                </>
              )}
              <SpeechInputButton
                onTranscript={(text) => {
                  setVoiceTranscript(text);
                  // 音声入力後、チャットに遷移してテキストを入力
                  setTimeout(() => setLocation("/chat"), 100);
                }}
                language="ja"
                className="hidden sm:flex"
              />
              <Button variant="outline" onClick={() => setLocation("/chat")}>
                <MessageSquare className="w-4 h-4 mr-2" />
                天聞アークに話しかける
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            ようこそ、{user?.name || "Guest"}さん
          </h2>
          <p className="text-muted-foreground mb-4">
            TENMON-ARK 霊核AI国家OSへようこそ。ダッシュボードから各機能にアクセスできます。
          </p>
          
          {/* Semantic Search Bar */}
          <div className="max-w-2xl mb-6">
            <SemanticSearchBar />
          </div>

          {/* Status Panel (Dashboard v13) */}
          <div className="max-w-2xl">
            <StatusPanel />
          </div>

          {/* Task Progress Panel (Founder専用) */}
          {isFounder && (
            <div className="mt-6">
              <TaskProgressPanel />
            </div>
          )}
        </div>

        {/* Founder専用セクション */}
        {isFounder && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-600" />
              Founder Exclusive
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* API Documentation */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    API Documentation
                  </CardTitle>
                  <CardDescription>API仕様・エンドポイント一覧</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/docs")}
                  >
                    View API Docs
                  </Button>
                </CardContent>
              </Card>

              {/* Life Guardian */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    Life Guardian
                  </CardTitle>
                  <CardDescription>デバイス保護・脅威検知</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/lifeGuardian")}
                  >
                    Open Life Guardian
                  </Button>
                </CardContent>
              </Card>

              {/* Mobile OS */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-amber-600" />
                    Mobile OS
                  </CardTitle>
                  <CardDescription>デバイス接続・管理</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/mobileOS")}
                  >
                    Connect Device
                  </Button>
                </CardContent>
              </Card>

              {/* DeviceCluster v3 (β) */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-amber-600" />
                    DeviceCluster v3 (β)
                  </CardTitle>
                  <CardDescription>完全なデバイス一体化 OS</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/deviceCluster-v3")}
                  >
                    Open DeviceCluster
                  </Button>
                </CardContent>
              </Card>

              {/* Custom ARK Management */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-amber-600" />
                    Custom ARK
                  </CardTitle>
                  <CardDescription>無制限カスタムARK作成</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/custom-arks")}
                  >
                    Manage Custom ARKs
                  </Button>
                </CardContent>
              </Card>

              {/* Founder Feedback */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    Founder Feedback
                  </CardTitle>
                  <CardDescription>開発フィードバック</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/founder-feedback")}
                  >
                    Submit Feedback
                  </Button>
                </CardContent>
              </Card>

              {/* Advanced Analytics */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                    Advanced Analytics
                  </CardTitle>
                  <CardDescription>詳細な利用統計</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => setLocation("/analytics")}
                  >
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Chat */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-primary/20"
            onClick={() => setLocation("/chat")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                天聞アークに話しかける
              </CardTitle>
              <CardDescription>
                Atlas Chat × Twin-Core × 言灵 × 天津金木エンジン搭載
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {roomsLoading
                  ? "読み込み中..."
                  : `${rooms?.length || 0} 件の会話`}
              </p>
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/chat");
                }}
              >
                チャットを開始
              </Button>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/profile")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                プロフィール
              </CardTitle>
              <CardDescription>アカウント情報の確認・編集</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {user?.email || "メールアドレス未設定"}
              </p>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/settings")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                設定
              </CardTitle>
              <CardDescription>システム設定・テーマ・通知</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                入力方式: Ctrl+Enter = 送信
              </p>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/subscription")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                プラン管理
              </CardTitle>
              <CardDescription>サブスクリプション・請求履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold capitalize">
                {planName === "founder"
                  ? "Founder Edition"
                  : planName === "pro"
                  ? "Pro プラン"
                  : planName === "basic"
                  ? "Basic プラン"
                  : "Free プラン"}
              </p>
            </CardContent>
          </Card>

          {/* Custom ARK */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/custom-arks")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                カスタム天聞アーク
              </CardTitle>
              <CardDescription>独自のPersona・知識ベース作成</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {planName === "founder"
                  ? "無制限"
                  : planName === "pro"
                  ? "最大10個"
                  : planName === "basic"
                  ? "最大1個"
                  : "利用不可"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
            <CardDescription>直近の会話履歴</CardDescription>
          </CardHeader>
          <CardContent>
            {roomsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : rooms && rooms.length > 0 ? (
              <div className="space-y-3">
                {rooms.slice(0, 5).map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setLocation("/chat")}
                  >
                    <div>
                      <p className="font-medium">{room.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(room.updatedAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                まだ会話がありません。チャットを開始してください。
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        defaultPage="Dashboard"
      />
    </div>
  );
}

