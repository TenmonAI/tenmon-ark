/**
 * ============================================================
 *  OFFLINE BANNER — オフラインバナー
 * ============================================================
 * 
 * オフラインモードの表示
 * ============================================================
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, Lock } from "lucide-react";

interface OfflineBannerProps {
  isOffline: boolean;
  personaLocked?: boolean;
  localKokuzoStats?: {
    seeds: number;
    units: number;
  };
}

export function OfflineBanner({
  isOffline,
  personaLocked,
  localKokuzoStats,
}: OfflineBannerProps) {
  if (!isOffline) {
    return null;
  }

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <WifiOff className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        オフラインモード
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        <div className="space-y-2">
          <p>個別モード実行中（Individual Mode Running）</p>
          
          {personaLocked && (
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              <span>Persona はロックされています（新しい Persona の作成や Law の変更はできません）</span>
            </div>
          )}
          
          {localKokuzoStats && (
            <div className="text-sm">
              <p>ローカル Kokūzō: {localKokuzoStats.seeds} シード, {localKokuzoStats.units} ユニット</p>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

