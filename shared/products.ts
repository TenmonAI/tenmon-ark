/**
 * TENMON-AI Stripe Products Configuration
 * 
 * product_id と price_id は環境変数から取得可能にし、
 * 後から管理画面で設定できるようにする
 */

export interface Product {
  id: string;
  name: string;
  displayName: string;
  price: number; // in yen
  priceId?: string; // Stripe Price ID
  productId?: string; // Stripe Product ID
  features: string[];
  dailyMessageLimit: number | null;
}

export const PRODUCTS: Record<string, Product> = {
  free: {
    id: "free",
    name: "free",
    displayName: "Free",
    price: 0,
    features: [
      "宿曜ライト（基本性質）",
      "名前の言灵ライト（表層分析）",
      "五十音ライト（属性分類）",
      "月運・日運の吉凶マーク",
      "AI相談：1日3メッセージ",
    ],
    dailyMessageLimit: 3,
  },
  basic: {
    id: "basic",
    name: "basic",
    displayName: "Basic",
    price: 6000,
    productId: process.env.STRIPE_PRODUCT_ID_BASIC || "prod_basic_tenmon",
    priceId: process.env.STRIPE_PRICE_ID_BASIC || "price_basic_monthly",
    features: [
      "Free機能すべて",
      "宿曜フル解析（相性・行動指針）",
      "言灵深層（火水構文）",
      "五十音 × 天津金木（中層構文）",
      "月運・日運の詳細",
      "AI相談無制限",
    ],
    dailyMessageLimit: null,
  },
  pro: {
    id: "pro",
    name: "pro",
    displayName: "Pro",
    price: 29800,
    productId: process.env.STRIPE_PRODUCT_ID_PRO || "prod_pro_tenmon",
    priceId: process.env.STRIPE_PRICE_ID_PRO || "price_pro_monthly",
    features: [
      "Basic機能すべて",
      "宿曜秘伝（因縁・業・カルマ）",
      "言灵 × 天津金木 × カタカムナの統合構文",
      "靈核座標分析",
      "自動運勢レポート（毎日/毎月）",
      "商用利用",
      "プロ専用相談",
    ],
    dailyMessageLimit: null,
  },
};

export function getProductByName(name: string): Product | undefined {
  return PRODUCTS[name];
}

export function getProductByPriceId(priceId: string): Product | undefined {
  return Object.values(PRODUCTS).find((p) => p.priceId === priceId);
}
