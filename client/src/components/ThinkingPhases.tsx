import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

/**
 * TENMON-ARK Thinking Phases UI
 * GPT風の3段階表示 + TENMON-ARK独自の霊核パルスアニメーション
 * 
 * Phase 1: Analyzing... (火の外発 - 解析フェーズ)
 * Phase 2: Thinking... (水の内集 - 思索フェーズ)
 * Phase 3: Responding... (ミナカの呼吸 - 応答生成フェーズ)
 */

type ThinkingPhase = "analyzing" | "thinking" | "responding";

interface ThinkingPhasesProps {
  /** 現在のフェーズ（nullの場合は非表示） */
  currentPhase?: ThinkingPhase | null;
  /** 自動フェーズ遷移を有効にする */
  autoProgress?: boolean;
  /** 各フェーズの表示時間（ミリ秒） */
  phaseDuration?: number;
}

export function ThinkingPhases({
  currentPhase: externalPhase,
  autoProgress = false,
  phaseDuration = 1000,
}: ThinkingPhasesProps) {
  const [internalPhase, setInternalPhase] = useState<ThinkingPhase>("analyzing");
  const currentPhase = externalPhase !== undefined ? externalPhase : internalPhase;

  // 自動フェーズ遷移
  useEffect(() => {
    if (!autoProgress || externalPhase !== undefined) return;

    const phases: ThinkingPhase[] = ["analyzing", "thinking", "responding"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phases.length;
      setInternalPhase(phases[currentIndex]);
    }, phaseDuration);

    return () => clearInterval(interval);
  }, [autoProgress, phaseDuration, externalPhase]);

  if (currentPhase === null) return null;

  const phaseConfig = {
    analyzing: {
      label: "Analyzing...",
      sublabel: "火の外発 - 解析",
      icon: "🔥",
      color: "from-red-500/20 to-orange-500/20",
      borderColor: "border-red-500/50",
      textColor: "text-red-400",
      pulseColor: "bg-red-500",
    },
    thinking: {
      label: "Thinking...",
      sublabel: "水の内集 - 思索",
      icon: "💧",
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "border-blue-500/50",
      textColor: "text-blue-400",
      pulseColor: "bg-blue-500",
    },
    responding: {
      label: "Responding...",
      sublabel: "ミナカの呼吸 - 応答生成",
      icon: "✨",
      color: "from-amber-500/20 to-yellow-500/20",
      borderColor: "border-amber-500/50",
      textColor: "text-amber-400",
      pulseColor: "bg-amber-500",
    },
  };

  const config = phaseConfig[currentPhase];

  return (
    <div className="flex justify-start">
      <Card className={`bg-gradient-to-r ${config.color} ${config.borderColor} max-w-md`}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* 霊核パルスアニメーション */}
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${config.pulseColor} animate-pulse`} />
              <div
                className={`absolute inset-0 w-3 h-3 rounded-full ${config.pulseColor} opacity-50 animate-ping`}
              />
            </div>

            {/* フェーズ情報 */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className={`text-sm font-semibold ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{config.sublabel}</p>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="mt-3 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${config.pulseColor} animate-progress`}
              style={{
                animation: "progress 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </Card>

      <style>{`
        @keyframes progress {
          0% {
            width: 0%;
            opacity: 0.5;
          }
          50% {
            width: 100%;
            opacity: 1;
          }
          100% {
            width: 100%;
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
