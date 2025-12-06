import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Calendar, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * 生年月日登録ページ
 * 
 * ユーザーの生年月日を登録し、宿曜パーソナルAIを生成する
 */
export default function ProfileSetup() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | undefined>(undefined);

  const { data: profile, isLoading: profileLoading, refetch } = trpc.sukuyoPersonal.getProfile.useQuery(undefined, {
    enabled: !!user,
  });

  const createProfileMutation = trpc.sukuyoPersonal.createProfile.useMutation({
    onSuccess: (data) => {
      toast.success("プロファイルを作成しました");
      refetch();
      
      // プロファイル詳細ページに遷移
      setLocation("/profile/detail");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
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
            <CardDescription>プロファイル設定を利用するにはログインしてください</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              プロファイルが既に存在します
            </CardTitle>
            <CardDescription>
              あなたのプロファイルは既に作成されています
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">宿曜27宿</p>
                <p className="text-2xl font-bold">{profile.sukuyoMansion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">天津金木</p>
                  <p className="text-xl font-bold">{profile.amatsuKanagiPattern}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">いろは</p>
                  <p className="text-xl font-bold">{profile.irohaCharacter}</p>
                </div>
              </div>
              <Button
                onClick={() => setLocation("/profile/detail")}
                className="w-full"
              >
                プロファイル詳細を見る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthDate) {
      toast.error("生年月日を入力してください");
      return;
    }

    createProfileMutation.mutate({
      birthDate,
      birthTime: birthTime || undefined,
      gender,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            宿曜パーソナルAI
          </h1>
          <p className="text-muted-foreground">
            あなたの生年月日から、専用の人格AIを生成します
          </p>
        </div>

        {/* 説明カード */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              宿曜パーソナルAIとは？
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              あなたの生年月日から、以下の3つの要素を統合した専用人格AIを生成します：
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 font-bold">1.</span>
                <span><strong>宿曜27宿</strong>：あなたの生まれた日の宿曜を解析し、性格特性・コミュニケーションスタイルを特定</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span><strong>天津金木パターン（1-50）</strong>：宿曜に対応する天津金木パターンを適用し、火水・左右旋・内集外発・陰陽の4軸を統合</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500 font-bold">3.</span>
                <span><strong>いろは言灵解</strong>：宿曜に対応するいろは文字を適用し、生命の法則と霊的な意味を統合</span>
              </li>
            </ul>
            <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg">
              <p className="text-sm font-semibold">
                🌟 あなた専用の人格AIが、あなたの性格・コミュニケーションスタイル・霊的特性に完全に最適化された会話を提供します
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 入力フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              生年月日を入力
            </CardTitle>
            <CardDescription>
              あなたの生年月日を入力してください（必須）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 生年月日 */}
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-base">
                  生年月日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="text-lg"
                />
              </div>

              {/* 生まれた時刻（任意） */}
              <div className="space-y-2">
                <Label htmlFor="birthTime" className="text-base">
                  生まれた時刻（任意）
                </Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  ※ 時刻が分かる場合は入力してください。より正確な解析が可能になります。
                </p>
              </div>

              {/* 性別（任意） */}
              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  性別（任意）
                </Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(value) => setGender(value as "male" | "female" | "other")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">男性</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">女性</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="cursor-pointer">その他</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                disabled={createProfileMutation.isPending}
                className="w-full text-lg py-6"
              >
                {createProfileMutation.isPending && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                <Sparkles className="mr-2 h-5 w-5" />
                宿曜パーソナルAIを生成
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
