import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Zap, Gauge, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Persona Mode Selector Component
 * 
 * TENMON-ARK Persona Engine vΩ+ モード切替UI
 * TURBO / NORMAL / QUALITY の3モードを提供
 */

type ModeType = "turbo" | "normal" | "quality";

interface ModeSelectorProps {
  onModeChange?: (mode: ModeType) => void;
  className?: string;
}

export function PersonaModeSelector({ onModeChange, className = "" }: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<ModeType>("turbo");
  const [isChanging, setIsChanging] = useState(false);

  // モード設定取得
  const { data: currentMode, isLoading } = trpc.personaMode.getMode.useQuery();
  
  // モード切替mutation
  const setModeMutation = trpc.personaMode.setMode.useMutation({
    onSuccess: (data) => {
      setSelectedMode(data.mode);
      toast.success(`モードを ${data.mode.toUpperCase()} に切り替えました`);
      if (onModeChange) {
        onModeChange(data.mode);
      }
      
      // SessionStorageに保存（ページリロード後も維持）
      if (typeof window !== "undefined") {
        sessionStorage.setItem("personaMode", data.mode);
      }
      
      setIsChanging(false);
    },
    onError: (error) => {
      toast.error(`モード切替に失敗しました: ${error.message}`);
      setIsChanging(false);
    },
  });

  // 初期モード設定
  useEffect(() => {
    if (currentMode) {
      setSelectedMode(currentMode.mode);
      
      // SessionStorageに保存
      if (typeof window !== "undefined") {
        sessionStorage.setItem("personaMode", currentMode.mode);
      }
    } else {
      // SessionStorageから復元
      if (typeof window !== "undefined") {
        const savedMode = sessionStorage.getItem("personaMode") as ModeType | null;
        if (savedMode && ["turbo", "normal", "quality"].includes(savedMode)) {
          setSelectedMode(savedMode);
        }
      }
    }
  }, [currentMode]);

  const handleModeChange = (mode: ModeType) => {
    if (mode === selectedMode || isChanging) return;
    
    setIsChanging(true);
    setModeMutation.mutate({ mode });
  };

  const modes = [
    {
      id: "turbo" as const,
      name: "TURBO",
      icon: Zap,
      description: "応答初速 0.2s 未満",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      hoverBg: "hover:bg-yellow-500/20",
      activeBg: "bg-yellow-500/30",
    },
    {
      id: "normal" as const,
      name: "NORMAL",
      icon: Gauge,
      description: "バランス型",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      hoverBg: "hover:bg-blue-500/20",
      activeBg: "bg-blue-500/30",
    },
    {
      id: "quality" as const,
      name: "QUALITY",
      icon: Sparkles,
      description: "深い思考",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
      hoverBg: "hover:bg-purple-500/20",
      activeBg: "bg-purple-500/30",
    },
  ];

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {modes.map((mode) => (
          <div
            key={mode.id}
            className="h-10 w-24 bg-gray-800/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.id;
        
        return (
          <Button
            key={mode.id}
            variant="outline"
            size="sm"
            onClick={() => handleModeChange(mode.id)}
            disabled={isChanging}
            className={`
              relative flex items-center gap-2 px-3 py-2
              border transition-all duration-200
              ${isActive 
                ? `${mode.activeBg} ${mode.borderColor} ${mode.color}` 
                : `${mode.bgColor} ${mode.borderColor} text-gray-400 ${mode.hoverBg}`
              }
              ${isChanging ? "opacity-50 cursor-not-allowed" : ""}
            `}
            title={mode.description}
          >
            <Icon className={`w-4 h-4 ${isActive ? mode.color : "text-gray-500"}`} />
            <span className="text-xs font-medium">{mode.name}</span>
            {isActive && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
