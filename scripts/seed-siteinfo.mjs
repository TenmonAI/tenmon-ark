import { drizzle } from "drizzle-orm/mysql2";
import { siteInfo } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const initialData = [
  {
    key: "release_status",
    value: "pre-release",
    description: "現在のリリース状態（pre-release / public-release / development）",
  },
  {
    key: "founder_release_date",
    value: "2025-02-28",
    description: "Founderプラン先行リリース日",
  },
  {
    key: "official_release_date",
    value: "2026-03-21",
    description: "正式リリース日（春分の日）",
  },
  {
    key: "free_plan_available",
    value: "false",
    description: "無料プランの利用可否",
  },
  {
    key: "basic_plan_available",
    value: "false",
    description: "Basicプランの利用可否",
  },
  {
    key: "pro_plan_available",
    value: "false",
    description: "Proプランの利用可否",
  },
  {
    key: "founder_plan_available",
    value: "true",
    description: "Founderプランの利用可否",
  },
];

async function seedSiteInfo() {
  console.log("🌱 Seeding siteInfo table...");

  for (const item of initialData) {
    try {
      await db
        .insert(siteInfo)
        .values(item)
        .onDuplicateKeyUpdate({
          set: {
            value: item.value,
            description: item.description,
            updatedAt: new Date(),
          },
        });
      console.log(`✅ Inserted/Updated: ${item.key} = ${item.value}`);
    } catch (error) {
      console.error(`❌ Failed to insert ${item.key}:`, error);
    }
  }

  console.log("✨ Seed completed!");
  process.exit(0);
}

seedSiteInfo().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
