/**
 * ============================================================
 *  FOUNDER ONBOARDING WIZARD — Founder オンボーディングウィザード
 * ============================================================
 * 
 * Founder 向けのオンボーディングウィザード
 * 
 * ステップ:
 * 1. アカウント設定
 * 2. Universe OS 初期化
 * 3. プラン選択
 * 4. 初期設定
 * ============================================================
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function FounderOnboardingWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    osName: "",
    initialSeeds: [] as string[],
    plan: "founder" as "free" | "basic" | "pro" | "founder",
  });
  
  const steps = [
    { id: 1, title: "アカウント設定", description: "基本情報を入力" },
    { id: 2, title: "Universe OS 初期化", description: "OS の初期設定" },
    { id: 3, title: "プラン選択", description: "プランを選択" },
    { id: 4, title: "初期設定", description: "初期設定を完了" },
  ];
  
  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const handleComplete = async () => {
    // オンボーディング完了処理
    // 実際の実装では API を呼び出す
    console.log("Onboarding completed:", formData);
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Founder Onboarding Wizard
          </CardTitle>
          <CardDescription>
            Founder 向けのオンボーディングウィザード
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ステップインジケーター */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step >= s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s.id ? <Check className="h-5 w-5" /> : s.id}
                  </div>
                  <div className="mt-2 text-xs text-center">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-muted-foreground">{s.description}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* ステップコンテンツ */}
          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="osName">OS 名</Label>
                  <Input
                    id="osName"
                    value={formData.osName}
                    onChange={(e) => setFormData({ ...formData, osName: e.target.value })}
                    placeholder="例: My Universe OS"
                  />
                </div>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Universe OS 初期化</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    Universe OS を初期化します。初期シードを設定できます。
                  </p>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>プラン選択</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    Founder's Edition が選択されています。
                  </p>
                </div>
              </div>
            )}
            
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>初期設定完了</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    すべての設定が完了しました。Universe OS を開始できます。
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* ナビゲーションボタン */}
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}>
              戻る
            </Button>
            {step < steps.length ? (
              <Button onClick={handleNext}>
                次へ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                完了
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

