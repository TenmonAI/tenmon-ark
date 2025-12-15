/**
 * ============================================================
 *  USE PLAN — プラン管理フック
 * ============================================================
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type FeatureName = 
  | "fileUpload"
  | "memorySave"
  | "knowledgeEngine"
  | "ulce"
  | "arkBrowser"
  | "mt5Trading"
  | "founderFeatures";

export function usePlan() {
  const { user, isAuthenticated } = useAuth();

  // 現在のプラン情報を取得
  const { data: planData, isLoading, error } = trpc.planManagement.getCurrentPlan.useQuery(
    undefined,
    { enabled: !!user && isAuthenticated }
  );

  // プラン名を取得
  const planName = useMemo(() => {
    return planData?.plan?.name || "free";
  }, [planData]);

  // 機能が利用可能かチェック
  const allows = (feature: FeatureName): boolean => {
    if (!planData?.plan) return false;

    const featureMap: Record<FeatureName, boolean> = {
      fileUpload: planData.plan.canUseFileUpload === 1,
      memorySave: planData.plan.canUseMemorySave === 1,
      knowledgeEngine: planData.plan.canUseKnowledgeEngine === 1,
      ulce: planData.plan.canUseULCE === 1,
      arkBrowser: planData.plan.canUseArkBrowser === 1,
      mt5Trading: planData.plan.canUseMT5Trading === 1,
      founderFeatures: planData.plan.canUseFounderFeatures === 1,
    };

    return featureMap[feature] || false;
  };

  // プランが特定のプラン以上かチェック
  const isPlanOrHigher = (targetPlan: "free" | "basic" | "pro" | "founder"): boolean => {
    const planOrder = { free: 0, basic: 1, pro: 2, founder: 3 };
    return planOrder[planName as keyof typeof planOrder] >= planOrder[targetPlan];
  };

  return {
    planName,
    planData,
    isLoading,
    error,
    allows,
    isPlanOrHigher,
    isFounder: planName === "founder",
    isPro: planName === "pro" || planName === "founder",
    isBasic: planName === "basic" || planName === "pro" || planName === "founder",
  };
}

