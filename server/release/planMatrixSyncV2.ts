/**
 * ============================================================
 *  PLAN MATRIX SYNC V2 — プランマトリックスをダッシュボードに同期
 * ============================================================
 * 
 * 公開用プランマトリックスをダッシュボードに同期
 * 
 * 同期先:
 * - Plans.tsx
 * - DashboardV3.tsx
 * - Subscription.tsx
 * ============================================================
 */

import planMatrixPublic from "../../release/PLAN_MATRIX_PUBLIC.json";

/**
 * プランマトリックスをダッシュボード用に変換
 */
export function syncPlanMatrixToDashboard(): {
  plans: Array<{
    id: string;
    name: string;
    displayName: string;
    price: number;
    features: string[];
    limits: any;
    highlights: string[];
    popular?: boolean;
    isFounder?: boolean;
  }>;
  comparison: any;
} {
  const matrix = planMatrixPublic as any;
  
  return {
    plans: Object.values(matrix.plans).map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      price: plan.price,
      features: plan.features,
      limits: plan.limits,
      highlights: plan.highlights,
      popular: plan.popular,
      isFounder: plan.isFounder,
    })),
    comparison: matrix.comparison,
  };
}

/**
 * プラン機能をJSON形式でエクスポート（ダッシュボード用）
 */
export function exportPlanMatrixForDashboard(): string {
  const dashboardData = syncPlanMatrixToDashboard();
  return JSON.stringify(dashboardData, null, 2);
}

export default {
  syncPlanMatrixToDashboard,
  exportPlanMatrixForDashboard,
};

