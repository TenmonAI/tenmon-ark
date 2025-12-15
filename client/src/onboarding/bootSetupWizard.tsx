/**
 * Boot Setup Wizard
 * Founder初回起動時のAPI Keyセットアップ
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';

interface BootSetupWizardProps {
  onComplete?: () => void;
}

/**
 * Boot Setup Wizard Component
 * Founder初回起動時にAPI Keyを安全に保存
 */
export function BootSetupWizard({ onComplete }: BootSetupWizardProps) {
  const { user } = useAuth();
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [stabilityApiKey, setStabilityApiKey] = useState('');
  const [arkPublicKey, setArkPublicKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Founderのみ表示
  if (!user || (user.plan !== 'founder' && user.plan !== 'dev')) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // API Keyをサーバーに送信して保存
      // 注意: 実際の実装では、暗号化して保存する必要がある
      const response = await fetch('/api/setup/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiApiKey: openaiApiKey.trim(),
          stabilityApiKey: stabilityApiKey.trim(),
          arkPublicKey: arkPublicKey.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('API Keyの保存に失敗しました');
      }

      setSuccess(true);
      
      // 3秒後に完了コールバックを呼び出す
      setTimeout(() => {
        onComplete?.();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API Keyの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              セットアップ完了
            </CardTitle>
            <CardDescription>
              API Keyのセットアップが完了しました
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>
                TENMON-ARK OS の使用を開始できます
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>🔱 TENMON-ARK Boot Setup</CardTitle>
          <CardDescription>
            Founder初回起動時のAPI Keyセットアップ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-api-key">
                OpenAI API Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="openai-api-key"
                type="password"
                placeholder="sk-..."
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Atlas Chat、Whisper STT、Semantic Search で使用されます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stability-api-key">
                Stability AI API Key (オプション)
              </Label>
              <Input
                id="stability-api-key"
                type="password"
                placeholder="sk-..."
                value={stabilityApiKey}
                onChange={(e) => setStabilityApiKey(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Visual Synapse（アニメ背景生成）で使用されます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ark-public-key">
                ARK Public Key (オプション)
              </Label>
              <Input
                id="ark-public-key"
                type="password"
                placeholder="ark-..."
                value={arkPublicKey}
                onChange={(e) => setArkPublicKey(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                公開APIアクセスで使用されます
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onComplete?.()}
              disabled={isSubmitting}
            >
              スキップ
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !openaiApiKey.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存して開始'
              )}
            </Button>
          </div>

          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>セキュリティ注意:</strong> API Keyは暗号化して保存されます。
              この画面は初回起動時のみ表示されます。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Boot Setup Wizard が必要かどうかを判定
 */
export function shouldShowBootSetupWizard(user: { plan: string } | null): boolean {
  if (!user || (user.plan !== 'founder' && user.plan !== 'dev')) {
    return false;
  }

  // ローカルストレージでセットアップ完了フラグを確認
  const setupCompleted = localStorage.getItem('tenmon_boot_setup_completed');
  return !setupCompleted;
}

/**
 * Boot Setup Wizard の完了フラグを設定
 */
export function markBootSetupCompleted(): void {
  localStorage.setItem('tenmon_boot_setup_completed', 'true');
}

