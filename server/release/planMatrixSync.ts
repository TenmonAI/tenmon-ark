/**
 * ============================================================
 *  PLAN MATRIX SYNC — プラン機能をダッシュボードに同期
 * ============================================================
 * 
 * プランマトリックスをダッシュボードに同期
 * 
 * 同期先:
 * - Plans.tsx
 * - DashboardV3.tsx
 * - Subscription.tsx
 * ============================================================
 */

import { generatePlanMatrix, type PlanMatrix } from "./planMatrix";

/**
 * プラン機能をダッシュボード用に変換
 */
export function syncPlanFeaturesToDashboard(): {
  plans: Array<{
    id: string;
    name: string;
    displayName: string;
    price: number;
    features: string[];
    limits: PlanMatrix["limits"];
    flags: PlanMatrix["flags"];
    performance: PlanMatrix["performance"];
  }>;
} {
  const matrix = generatePlanMatrix();
  
  return {
    plans: Object.values(matrix).map(plan => ({
      id: plan.planId,
      name: plan.planName.toLowerCase(),
      displayName: plan.planName,
      price: plan.price,
      features: plan.features.map(f => f.name),
      limits: plan.limits,
      flags: plan.flags,
      performance: plan.performance,
    })),
  };
}

/**
 * プラン機能をJSON形式でエクスポート（ダッシュボード用）
 */
export function exportPlanFeaturesForDashboard(): string {
  const dashboardData = syncPlanFeaturesToDashboard();
  return JSON.stringify(dashboardData, null, 2);
}

export default {
  syncPlanFeaturesToDashboard,
  exportPlanFeaturesForDashboard,
};

