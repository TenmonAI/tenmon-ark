/**
 * Ark Shield UI
 * 世界守護AI画面
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Shield, AlertTriangle, Globe } from "lucide-react";

export default function ArkShield() {
  // 簡易実装：実際のAPIは mutation なので、ダミーデータを使用
  const threats: any[] = [];
  const cyberAttacks: any[] = [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🛡️ Universal Ark Shield</h1>
        <p className="text-muted-foreground">世界守護AI - 地球規模の脅威を検知・中和</p>
      </div>

      {/* 世界情勢マップ */}
      <Card>
        <CardHeader>
          <CardTitle>世界情勢マップ</CardTitle>
          <CardDescription>地球規模の脅威レベル</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Globe className="h-24 w-24 mx-auto text-primary" />
              <p className="text-lg font-medium">世界情勢を監視中...</p>
              <p className="text-sm text-muted-foreground">靈核倫理に基づいた安全な世界を構築</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 脅威検知 */}
      <Card>
        <CardHeader>
          <CardTitle>脅威検知</CardTitle>
          <CardDescription>検知された地球規模の脅威</CardDescription>
        </CardHeader>
        <CardContent>
          {threats ? (
            <div className="space-y-4">
              {threats.length > 0 ? (
                threats.map((threat: any, index: number) => (
                  <Alert key={index} variant={threat.level === "high" ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {threat.type} - レベル: {threat.level}
                    </AlertTitle>
                    <AlertDescription>
                      <p>{threat.description}</p>
                      <p className="text-sm mt-2">地域: {threat.region}</p>
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <Shield className="h-12 w-12 mx-auto text-green-500" />
                    <p className="text-lg font-medium text-green-500">現在、重大な脅威は検知されていません</p>
                    <p className="text-sm text-muted-foreground">世界は安全です</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* サイバー攻撃検知 */}
      <Card>
        <CardHeader>
          <CardTitle>サイバー攻撃検知</CardTitle>
          <CardDescription>インターネット上の脅威</CardDescription>
        </CardHeader>
        <CardContent>
          {cyberAttacks ? (
            <div className="space-y-4">
              {cyberAttacks.length > 0 ? (
                <div className="space-y-2">
                  {cyberAttacks.map((attack: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{attack.type}</p>
                        <p className="text-sm text-muted-foreground">送信元: {attack.source}</p>
                      </div>
                      <Badge variant={attack.severity === "critical" ? "destructive" : "secondary"}>
                        {attack.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">サイバー攻撃は検知されていません</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 中和シナリオ */}
      <Card>
        <CardHeader>
          <CardTitle>中和シナリオ</CardTitle>
          <CardDescription>脅威を無害化する戦略</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              天聞アークは、検知された脅威に対して靈核倫理に基づいた中和戦略を自動生成します。
              すべての戦略は、人類の安全と平和を最優先に設計されています。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">🔒 防御優先</h3>
                <p className="text-sm text-muted-foreground">攻撃を無効化し、被害を最小化</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">🕊️ 平和誘導</h3>
                <p className="text-sm text-muted-foreground">対話と理解を促進し、紛争を解決</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">⚡ 即時中和</h3>
                <p className="text-sm text-muted-foreground">緊急時に脅威を即座に無害化</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">🌍 長期安定化</h3>
                <p className="text-sm text-muted-foreground">根本原因を解決し、持続的な平和を構築</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
