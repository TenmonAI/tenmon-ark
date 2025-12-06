import { drizzle } from "drizzle-orm/mysql2";
import { plans } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const planData = [
  {
    name: "free" as const,
    displayName: "Free",
    price: 0,
    features: JSON.stringify([
      "宿曜ライト（基本性質）",
      "名前の言灵ライト（表層分析）",
      "五十音ライト（属性分類）",
      "月運・日運の吉凶マーク",
      "AI相談：1日3メッセージ",
    ]),
    dailyMessageLimit: 3,
  },
  {
    name: "basic" as const,
    displayName: "Basic",
    price: 6000,
    stripeProductId: "prod_basic_tenmon",
    stripePriceId: "price_basic_monthly",
    features: JSON.stringify([
      "Free機能すべて",
      "宿曜フル解析（相性・行動指針）",
      "言灵深層（火水構文）",
      "五十音 × 天津金木（中層構文）",
      "月運・日運の詳細",
      "AI相談無制限",
    ]),
    dailyMessageLimit: null,
  },
  {
    name: "pro" as const,
    displayName: "Pro",
    price: 29800,
    stripeProductId: "prod_pro_tenmon",
    stripePriceId: "price_pro_monthly",
    features: JSON.stringify([
      "Basic機能すべて",
      "宿曜秘伝（因縁・業・カルマ）",
      "言灵 × 天津金木 × カタカムナの統合構文",
      "霊核座標分析",
      "自動運勢レポート（毎日/毎月）",
      "商用利用",
      "プロ専用相談",
    ]),
    dailyMessageLimit: null,
  },
];

async function seed() {
  console.log("Seeding plans...");

  for (const plan of planData) {
    try {
      await db.insert(plans).values(plan).onDuplicateKeyUpdate({
        set: {
          displayName: plan.displayName,
          price: plan.price,
          features: plan.features,
          dailyMessageLimit: plan.dailyMessageLimit,
        },
      });
      console.log(`✓ Seeded plan: ${plan.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed plan ${plan.name}:`, error);
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed();
