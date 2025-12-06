import { Crown } from "lucide-react";

interface FounderBadgeProps {
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Founder Edition専用バッジ
 * 皇金（#D4AF37）のバッジで特別感を演出
 */
export function FounderBadge({ variant = "default", className = "" }: FounderBadgeProps) {
  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
        style={{
          backgroundColor: "#D4AF37",
          color: "#000000",
        }}
      >
        <Crown className="w-3 h-3" />
        <span>Founder</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${className}`}
      style={{
        backgroundColor: "#D4AF37",
        color: "#000000",
      }}
    >
      <Crown className="w-4 h-4" />
      <span>Founder's Edition</span>
    </div>
  );
}
