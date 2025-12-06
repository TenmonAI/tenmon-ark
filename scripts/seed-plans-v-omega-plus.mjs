import { drizzle } from "drizzle-orm/mysql2";
import { plans } from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

/**
 * TENMON-ARK Persona Engine vΩ+ 料金体系
 * 要件: 料金体系を Persona Memory に常駐データとして追加
 */
const planData = [
  {
    name: "free",
    displayName: "Free",
    description: "基本チャット機能を無料で利用可能",
    price: 0,
    billingCycle: "monthly",
    
    // Feature limits
    maxFileUploads: 0,
    maxFileStorageBytes: 0,
    maxConversations: -1, // unlimited
    maxMemoryItems: 0,
    
    // Feature flags
    canUseFileUpload: 0,
    canUseMemorySave: 0,
    canUseKnowledgeEngine: 0,
    canUseULCE: 0,
    canUseArkBrowser: 0,
    canUseMT5Trading: 0,
    canUseFounderFeatures: 0,
    
    // Performance settings
    responseSpeedMultiplier: 100, // 1.0x
    thinkingDepthLevel: 1,
    twinCoreAnalysisDepth: 1,
    
    dailyMessageLimit: 30,
    features: JSON.stringify([
      "基本チャット",
      "1日30メッセージ",
    ]),
    isActive: 1,
    sortOrder: 1,
  },
  {
    name: "basic",
    displayName: "Basic",
    description: "言霊・宿曜の完全解析と自動化タスク",
    price: 6000,
    billingCycle: "monthly",
    stripeProductId: "prod_basic_tenmon",
    stripePriceId: "price_basic_monthly",
    
    // Feature limits
    maxFileUploads: 50,
    maxFileStorageBytes: 1024 * 1024 * 1024, // 1GB
    maxConversations: -1, // unlimited
    maxMemoryItems: 50,
    
    // Feature flags
    canUseFileUpload: 1,
    canUseMemorySave: 1,
    canUseKnowledgeEngine: 1,
    canUseULCE: 0,
    canUseArkBrowser: 0,
    canUseMT5Trading: 0,
    canUseFounderFeatures: 0,
    
    // Performance settings
    responseSpeedMultiplier: 120, // 1.2x
    thinkingDepthLevel: 2,
    twinCoreAnalysisDepth: 2,
    
    dailyMessageLimit: null, // unlimited
    features: JSON.stringify([
      "言霊・宿曜の完全解析",
      "自動化タスク",
      "Memory 50件",
      "ファイル保存 1GB",
    ]),
    isActive: 1,
    sortOrder: 2,
  },
  {
    name: "pro",
    displayName: "Pro",
    description: "AI国家OSフル機能、自動WEB構築、SNS自動発信",
    price: 29800,
    billingCycle: "monthly",
    stripeProductId: "prod_pro_tenmon",
    stripePriceId: "price_pro_monthly",
    
    // Feature limits
    maxFileUploads: -1, // unlimited
    maxFileStorageBytes: -1, // unlimited
    maxConversations: -1, // unlimited
    maxMemoryItems: -1, // unlimited
    
    // Feature flags
    canUseFileUpload: 1,
    canUseMemorySave: 1,
    canUseKnowledgeEngine: 1,
    canUseULCE: 1,
    canUseArkBrowser: 1,
    canUseMT5Trading: 1,
    canUseFounderFeatures: 0,
    
    // Performance settings
    responseSpeedMultiplier: 150, // 1.5x
    thinkingDepthLevel: 4,
    twinCoreAnalysisDepth: 4,
    
    dailyMessageLimit: null, // unlimited
    features: JSON.stringify([
      "AI国家OSフル機能",
      "自動WEB構築",
      "SNS自動発信",
      "Memory無制限",
      "ファイル保存無制限",
      "MT5 Trading OS連携",
    ]),
    isActive: 1,
    sortOrder: 3,
  },
  {
    name: "founder",
    displayName: "Founder's Edition",
    description: "Pro の全機能が永久無料、専用コミュニティ、α版先行利用、人格進化に参加する権利",
    price: 198000,
    billingCycle: "lifetime",
    stripeProductId: "prod_founder_tenmon",
    stripePriceId: "price_founder_lifetime",
    
    // Feature limits
    maxFileUploads: -1, // unlimited
    maxFileStorageBytes: -1, // unlimited
    maxConversations: -1, // unlimited
    maxMemoryItems: -1, // unlimited
    
    // Feature flags
    canUseFileUpload: 1,
    canUseMemorySave: 1,
    canUseKnowledgeEngine: 1,
    canUseULCE: 1,
    canUseArkBrowser: 1,
    canUseMT5Trading: 1,
    canUseFounderFeatures: 1,
    
    // Performance settings
    responseSpeedMultiplier: 200, // 2.0x
    thinkingDepthLevel: 5,
    twinCoreAnalysisDepth: 5,
    
    dailyMessageLimit: null, // unlimited
    features: JSON.stringify([
      "Pro の全機能が永久無料",
      "専用コミュニティ",
      "α版先行利用",
      "人格進化に参加する権利",
      "天聞アークコアアクセス",
      "永久アップデート",
    ]),
    isActive: 1,
    sortOrder: 4,
  },
];

async function seed() {
  console.log("Seeding TENMON-ARK vΩ+ plans...");

  for (const plan of planData) {
    try {
      await db.insert(plans).values(plan).onDuplicateKeyUpdate({
        set: {
          displayName: plan.displayName,
          description: plan.description,
          price: plan.price,
          billingCycle: plan.billingCycle,
          stripeProductId: plan.stripeProductId,
          stripePriceId: plan.stripePriceId,
          maxFileUploads: plan.maxFileUploads,
          maxFileStorageBytes: plan.maxFileStorageBytes,
          maxConversations: plan.maxConversations,
          maxMemoryItems: plan.maxMemoryItems,
          canUseFileUpload: plan.canUseFileUpload,
          canUseMemorySave: plan.canUseMemorySave,
          canUseKnowledgeEngine: plan.canUseKnowledgeEngine,
          canUseULCE: plan.canUseULCE,
          canUseArkBrowser: plan.canUseArkBrowser,
          canUseMT5Trading: plan.canUseMT5Trading,
          canUseFounderFeatures: plan.canUseFounderFeatures,
          responseSpeedMultiplier: plan.responseSpeedMultiplier,
          thinkingDepthLevel: plan.thinkingDepthLevel,
          twinCoreAnalysisDepth: plan.twinCoreAnalysisDepth,
          dailyMessageLimit: plan.dailyMessageLimit,
          features: plan.features,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        },
      });
      console.log(`✓ Seeded plan: ${plan.name} (${plan.displayName}) - ¥${plan.price.toLocaleString()}`);
    } catch (error) {
      console.error(`✗ Failed to seed plan ${plan.name}:`, error);
    }
  }

  console.log("\n=== TENMON-ARK vΩ+ 料金体系 ===");
  console.log("◆ Free：0円 - 基本チャット、1日30メッセージ");
  console.log("◆ Basic：6,000円／月 - 言霊・宿曜の完全解析、自動化タスク、Memory 50件");
  console.log("◆ Pro：29,800円／月 - AI国家OSフル機能、自動WEB構築、SNS自動発信、Memory無制限");
  console.log("◆ Founder's Edition：198,000円（永久）- Pro の全機能が永久無料、専用コミュニティ、α版先行利用、人格進化に参加する権利");
  console.log("\nSeeding complete!");
  process.exit(0);
}

seed();
