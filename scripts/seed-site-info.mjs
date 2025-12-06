import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar, text, timestamp } from "drizzle-orm/mysql-core";

// siteInfoテーブル定義（schema.tsから複製）
const siteInfo = mysqlTable("siteInfo", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const db = drizzle(process.env.DATABASE_URL);

const siteInfoData = [
  {
    key: "release_status",
    value: "development",
    description: "現在のリリース状態（development / beta / production）",
  },
  {
    key: "founder_release_date",
    value: "2025-02-28",
    description: "Founders Edition先行リリース日",
  },
  {
    key: "public_release_date",
    value: "2026-03-21",
    description: "一般公開リリース日（春分の日）",
  },
  {
    key: "free_plan_available",
    value: "false",
    description: "Freeプランが現在利用可能かどうか",
  },
  {
    key: "basic_plan_available",
    value: "false",
    description: "Basicプランが現在利用可能かどうか",
  },
  {
    key: "pro_plan_available",
    value: "false",
    description: "Proプランが現在利用可能かどうか",
  },
  {
    key: "founder_plan_available",
    value: "true",
    description: "Founderプランが現在利用可能かどうか",
  },
];

async function seedSiteInfo() {
  console.log("🌱 Seeding siteInfo table...");

  for (const info of siteInfoData) {
    try {
      await db.insert(siteInfo).values(info).onDuplicateKeyUpdate({
        set: {
          value: info.value,
          description: info.description,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Inserted/Updated: ${info.key}`);
    } catch (error) {
      console.error(`❌ Failed to insert ${info.key}:`, error);
    }
  }

  console.log("✨ Site info seeding completed!");
  process.exit(0);
}

seedSiteInfo().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
