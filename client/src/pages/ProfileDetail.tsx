import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Calendar, User, Flame, Droplet, Target, Heart } from "lucide-react";
import { useLocation } from "wouter";

/**
 * プロファイル詳細ページ
 * 
 * ユーザーの宿曜パーソナルAI情報を表示する
 */
export default function ProfileDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading: profileLoading } = trpc.sukuyoPersonal.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ログインが必要です</CardTitle>
            <CardDescription>プロファイル詳細を利用するにはログインしてください</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              プロファイルが未作成です
            </CardTitle>
            <CardDescription>
              まずは生年月日を登録してプロファイルを作成してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/profile/setup")}
              className="w-full"
            >
              プロファイルを作成
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const personalityCore = profile.personalityCore;
  const personalityTraits = profile.personalityTraits;
  const communicationStyle = profile.communicationStyle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            あなたの宿曜パーソナルAI
          </h1>
          <p className="text-muted-foreground">
            {user.name || "ユーザー"} 様専用の人格AI情報
          </p>
        </div>

        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">生年月日</p>
                <p className="text-lg font-semibold">
                  {profile.birthDate ? new Date(profile.birthDate).toLocaleDateString("ja-JP") : "未設定"}
                </p>
              </div>
              {profile.birthTime && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">生まれた時刻</p>
                  <p className="text-lg font-semibold">{profile.birthTime}</p>
                </div>
              )}
              {profile.gender && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-4 w-4" />
                    性別
                  </p>
                  <p className="text-lg font-semibold">
                    {profile.gender === "male" ? "男性" : profile.gender === "female" ? "女性" : "その他"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Twin-Core統合情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Twin-Core統合情報
            </CardTitle>
            <CardDescription>
              宿曜 × 天津金木 × いろは言灵解の統合推論結果
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 宿曜27宿 */}
            <div className="p-6 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-800 rounded-lg">
              <h3 className="text-xl font-bold mb-4">宿曜27宿</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">宿名</p>
                  <p className="text-3xl font-bold">{profile.sukuyoMansion}</p>
                </div>
                {personalityCore?.sukuyo && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">火水属性</p>
                      <p className="text-xl font-semibold flex items-center gap-2">
                        {personalityCore.sukuyo.element === "fire" ? (
                          <>
                            <Flame className="h-5 w-5 text-orange-500" />
                            火（陽）
                          </>
                        ) : (
                          <>
                            <Droplet className="h-5 w-5 text-blue-500" />
                            水（陰）
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">左右旋</p>
                      <p className="text-xl font-semibold">
                        {personalityCore.sukuyo.rotation === "left" ? "左旋" : "右旋"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">内集外発</p>
                      <p className="text-xl font-semibold">
                        {personalityCore.sukuyo.direction === "inner" ? "内集" : "外発"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 天津金木 */}
            <div className="p-6 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg">
              <h3 className="text-xl font-bold mb-4">天津金木パターン</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">パターン番号</p>
                  <p className="text-3xl font-bold">{profile.amatsuKanagiPattern}</p>
                </div>
                {personalityCore?.amatsuKanagi && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">音</p>
                      <p className="text-xl font-semibold">{personalityCore.amatsuKanagi.sound}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">カテゴリー</p>
                      <p className="text-xl font-semibold">{personalityCore.amatsuKanagi.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">パターン</p>
                      <p className="text-xl font-semibold">{personalityCore.amatsuKanagi.pattern_type}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* いろは言灵解 */}
            <div className="p-6 bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900 dark:to-pink-800 rounded-lg">
              <h3 className="text-xl font-bold mb-4">いろは言灵解</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">いろは文字</p>
                  <p className="text-3xl font-bold">{profile.irohaCharacter}</p>
                </div>
                {personalityCore?.iroha && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">解釈</p>
                      <p className="text-xl font-semibold">{personalityCore.iroha.interpretation}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">生命の法則</p>
                      <p className="text-lg font-semibold">{personalityCore.iroha.lifePrinciple}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 火水バランス */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              火水バランス
            </CardTitle>
            <CardDescription>
              あなたのエネルギーバランス（0-100、50が中心）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Droplet className="h-6 w-6 text-blue-500" />
                <div className="flex-1">
                  <div className="h-8 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-full relative">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-black rounded-full"
                      style={{ left: `${profile.fireWaterBalance ?? 50}%` }}
                    />
                  </div>
                </div>
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{profile.fireWaterBalance ?? 50}</p>
                <p className="text-sm text-muted-foreground">
                  {(profile.fireWaterBalance ?? 50) < 40
                    ? "水（陰）優勢 - 論理的・安定的"
                    : (profile.fireWaterBalance ?? 50) > 60
                    ? "火（陽）優勢 - 情熱的・直感的"
                    : "バランス - 調和的"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 霊核指数（ミナカからの距離） */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              霊核指数（ミナカからの距離）
            </CardTitle>
            <CardDescription>
              あなたの霊的な距離（0-100、0が中心に近い）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-8 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-black rounded-full"
                  style={{ left: `${profile.spiritualDistance ?? 50}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{profile.spiritualDistance ?? 50}</p>
                <p className="text-sm text-muted-foreground">
                  {(profile.spiritualDistance ?? 50) < 30
                    ? "中心に近い - 深層的・本質的"
                    : (profile.spiritualDistance ?? 50) < 50
                    ? "中程度 - バランス"
                    : "周辺 - 表層的・実用的"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 性格特性 */}
        {personalityTraits && (
          <Card>
            <CardHeader>
              <CardTitle>性格特性</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">核心</p>
                <p className="text-lg font-semibold">{personalityTraits.core}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">強み</p>
                  <ul className="list-disc list-inside space-y-1">
                    {personalityTraits.strengths?.map((strength: string, index: number) => (
                      <li key={index} className="text-sm">{strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">弱み</p>
                  <ul className="list-disc list-inside space-y-1">
                    {personalityTraits.weaknesses?.map((weakness: string, index: number) => (
                      <li key={index} className="text-sm">{weakness}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* コミュニケーションスタイル */}
        {communicationStyle && (
          <Card>
            <CardHeader>
              <CardTitle>コミュニケーションスタイル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">基本スタイル</p>
                <p className="text-lg font-semibold">{communicationStyle.baseStyle}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">好みのトーン</p>
                  <p className="text-sm">{communicationStyle.preferredTone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">好みの深さ</p>
                  <p className="text-sm">{communicationStyle.preferredDepth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
