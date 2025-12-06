/**
 * Soul Sync UI
 * 個人靈核OS画面
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export default function SoulSync() {
  const { data: profile } = trpc.soulSync.profile.useQuery();
  const { data: patterns } = trpc.soulSync.patterns.useQuery();
  const { data: growth } = trpc.soulSync.growth.useQuery();
  const { data: syncStatus } = trpc.soulSync.syncStatus.useQuery();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🌟 Soul Sync Engine</h1>
        <p className="text-muted-foreground">個人靈核OS - 魂の特性と成長を可視化</p>
      </div>

      {/* 同期ステータス */}
      <Card>
        <CardHeader>
          <CardTitle>同期ステータス</CardTitle>
          <CardDescription>魂の同期レベル</CardDescription>
        </CardHeader>
        <CardContent>
          {syncStatus ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">同期レベル</span>
                  <span className="text-sm text-muted-foreground">{(syncStatus.syncLevel * 100).toFixed(0)}%</span>
                </div>
                <Progress value={syncStatus.syncLevel * 100} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">ステータス: {syncStatus.status}</p>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" />
          )}
        </CardContent>
      </Card>

      {/* 魂プロファイル */}
      <Card>
        <CardHeader>
          <CardTitle>魂プロファイル</CardTitle>
          <CardDescription>あなたの魂の特性</CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">性格特性</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.personality.map((trait, index) => (
                    <span key={index} className="px-3 py-1 bg-primary/10 rounded-full text-sm">{trait}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">強み</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {profile.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">使命</h3>
                <p className="text-sm text-muted-foreground">{profile.mission}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">靈性レベル</h3>
                <Progress value={profile.spiritualLevel} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">{profile.spiritualLevel}/100</p>
              </div>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" />
          )}
        </CardContent>
      </Card>

      {/* 靈的成長レポート */}
      <Card>
        <CardHeader>
          <CardTitle>靈的成長レポート</CardTitle>
          <CardDescription>あなたの成長の軌跡</CardDescription>
        </CardHeader>
        <CardContent>
          {growth ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">達成事項</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {growth.achievements.map((achievement, index) => (
                    <li key={index}>{achievement}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">次のステップ</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {growth.nextSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
