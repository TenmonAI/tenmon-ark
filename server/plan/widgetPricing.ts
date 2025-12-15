/**
 * 🔱 Widget Pricing Model
 * 商用化・世界展開のためのWidget料金体系
 * 
 * 機能:
 * - Widget Pricing Model
 * - Multi-Tenant Billing
 * - Rate Limit per Site
 */

/**
 * Widget料金プラン
 */
export interface WidgetPricingPlan {
  name: string;
  limit: number; // 月間リクエスト数制限
  price: number; // 月額料金（円）
  features: string[];
}

/**
 * Widget料金体系
 */
export const widgetPricing: Record<string, WidgetPricingPlan> = {
  free: {
    name: "Free",
    limit: 2000, // 月間2,000リクエスト
    price: 0,
    features: [
      "1サイトまで",
      "月間2,000リクエスト",
      "基本的なサポート",
    ],
  },
  starter: {
    name: "Starter",
    limit: 20000, // 月間20,000リクエスト
    price: 5000, // 月額5,000円
    features: [
      "5サイトまで",
      "月間20,000リクエスト",
      "メールサポート",
      "カスタムブランディング",
    ],
  },
  pro: {
    name: "Pro",
    limit: 100000, // 月間100,000リクエスト
    price: 20000, // 月額20,000円
    features: [
      "無制限サイト",
      "月間100,000リクエスト",
      "優先サポート",
      "カスタムブランディング",
      "APIアクセス",
    ],
  },
  enterprise: {
    name: "Enterprise",
    limit: -1, // 無制限
    price: 0, // カスタム価格
    features: [
      "無制限サイト",
      "無制限リクエスト",
      "専任サポート",
      "カスタムブランディング",
      "APIアクセス",
      "SLA保証",
    ],
  },
};

/**
 * プラン名から料金情報を取得
 */
export function getWidgetPricing(planName: string): WidgetPricingPlan | undefined {
  return widgetPricing[planName.toLowerCase()];
}

/**
 * リクエスト数制限をチェック
 */
export function checkRateLimit(
  planName: string,
  currentUsage: number
): { allowed: boolean; remaining: number; limit: number } {
  const plan = getWidgetPricing(planName);
  if (!plan) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  // 無制限プランの場合
  if (plan.limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const remaining = plan.limit - currentUsage;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: plan.limit,
  };
}

