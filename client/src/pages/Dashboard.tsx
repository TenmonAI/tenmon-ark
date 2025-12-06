import DashboardV3 from "./DashboardV3";

/**
 * Dashboard - GPT-style main dashboard (v3)
 * ダッシュボード・設定・プロフィール・プラン管理への入口
 */
export default function Dashboard() {
  return <DashboardV3 />;
}
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    );
  }

  const planName = subscription?.planName || 'free';
  const isFounder = planName === 'founder';

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
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold">
                  <Crown className="w-4 h-4" />
                  Founder
                </div>
              )}
              <Button variant="outline" onClick={() => setLocation('/chat')}>
                <MessageSquare className="w-4 h-4 mr-2" />
                チャットへ
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">ようこそ、{user?.name || 'Guest'}さん</h2>
          <p className="text-muted-foreground">
            TENMON-ARK 霊核AI国家OSへようこそ。ダッシュボードから各機能にアクセスできます。
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Chat */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/chat')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                チャット
              </CardTitle>
              <CardDescription>Twin-Core × 言灵 × 天津金木エンジン搭載</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {roomsLoading ? '読み込み中...' : `${rooms?.length || 0} 件の会話`}
              </p>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/profile')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                プロフィール
              </CardTitle>
              <CardDescription>アカウント情報の確認・編集</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'メールアドレス未設定'}
              </p>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/settings')}>
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
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/subscription')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                プラン管理
              </CardTitle>
              <CardDescription>サブスクリプション・請求履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold capitalize">
                {planName === 'founder' ? 'Founder Edition' : 
                 planName === 'pro' ? 'Pro プラン' :
                 planName === 'basic' ? 'Basic プラン' : 'Free プラン'}
              </p>
            </CardContent>
          </Card>

          {/* Custom ARK */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/custom-arks')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                カスタム天聞アーク
              </CardTitle>
              <CardDescription>独自のPersona・知識ベース作成</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {planName === 'founder' ? '無制限' :
                 planName === 'pro' ? '最大10個' :
                 planName === 'basic' ? '最大1個' : '利用不可'}
              </p>
            </CardContent>
          </Card>

          {/* Founder Feedback (Founder only) */}
          {isFounder && (
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-amber-200" onClick={() => setLocation('/founder-feedback')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-600" />
                  Founder Feedback
                </CardTitle>
                <CardDescription>開発フィードバック・機能提案</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-700 font-semibold">
                  Founder限定機能
                </p>
              </CardContent>
            </Card>
          )}
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
                    onClick={() => setLocation('/chat')}
                  >
                    <div>
                      <p className="font-medium">{room.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(room.updatedAt).toLocaleString('ja-JP')}
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
    </div>
  );
}
