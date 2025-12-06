import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface MessageProgressBarProps {
  /** プログレスバーを表示するかどうか */
  isVisible: boolean;
  /** 推定完了時間（ミリ秒） */
  estimatedDuration?: number;
}

/**
 * Message Progress Bar Component
 * メッセージ送信中のプログレスバー（0-100%）
 */
export function MessageProgressBar({
  isVisible,
  estimatedDuration = 5000, // デフォルト5秒
}: MessageProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // プログレスバーのアニメーション
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / estimatedDuration) * 100, 95); // 最大95%まで
      setProgress(newProgress);

      if (newProgress >= 95) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, estimatedDuration]);

  // 完了時に100%にする
  useEffect(() => {
    if (!isVisible && progress > 0) {
      setProgress(100);
      setTimeout(() => setProgress(0), 300);
    }
  }, [isVisible, progress]);

  if (!isVisible && progress === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      <div className="space-y-2">
        <Progress value={progress} className="h-1 bg-slate-800" />
        <p className="text-xs text-slate-400 text-center">
          {progress < 95
            ? "応答を生成しています..."
            : progress === 100
              ? "完了しました"
              : "もうすぐ応答します"}
        </p>
      </div>
    </div>
  );
}
