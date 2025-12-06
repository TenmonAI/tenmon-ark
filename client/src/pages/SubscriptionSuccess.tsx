import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-primary/30">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <CheckCircle className="w-20 h-20 text-primary" />
              <Sparkles className="w-8 h-8 text-secondary absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">サブスクリプション完了</h1>
            <p className="text-muted-foreground">
              TENMON-AIへようこそ！プランのアップグレードが完了しました。
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/chat">
              <Button className="w-full" size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                AIチャットを開始
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                ホームに戻る
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
