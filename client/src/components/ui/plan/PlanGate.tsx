/**
 * ============================================================
 *  PLAN GATE — プラン制御コンポーネント
 * ============================================================
 */

import { ReactNode } from "react";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, ArrowUp } from "lucide-react";
import { useLocation } from "wouter";

type FeatureName = 
  | "fileUpload"
  | "memorySave"
  | "knowledgeEngine"
  | "ulce"
  | "arkBrowser"
  | "mt5Trading"
  | "founderFeatures";

interface PlanGateProps {
  feature: FeatureName;
  children: ReactNode;
  requiredPlan?: "free" | "basic" | "pro" | "founder";
  upgradeMessage?: string;
  className?: string;
}

export function PlanGate({
  feature,
  children,
  requiredPlan = "pro",
  upgradeMessage,
  className = "",
}: PlanGateProps) {
  const { allows, planName, isPlanOrHigher } = usePlan();
  const [, setLocation] = useLocation();

  const hasAccess = allows(feature) || isPlanOrHigher(requiredPlan);

  if (hasAccess) {
    return <>{children}</>;
  }

  const planLabel = requiredPlan === "founder" ? "Founder" : requiredPlan === "pro" ? "Pro" : requiredPlan === "basic" ? "Basic" : "Free";
  const defaultMessage = `${planLabel} プラン以上`;
  const message = upgradeMessage || defaultMessage;

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded">
        <div className="flex flex-col items-center gap-2 p-3">
          <Lock className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground text-center">
            {message}
          </p>
          <Button
            size="sm"
            onClick={() => setLocation("/subscription")}
            className="mt-1"
            variant="outline"
          >
            <ArrowUp className="w-3 h-3 mr-1" aria-hidden="true" />
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}

