import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * TENMON-ARK 言灵エンジン「言霊秘書」準拠データベーススキーマ vΩ-K
 * 
 * 本スキーマは言霊秘書を唯一の正典として、五十音・水火法則・旧字体表記の
 * すべての定義を格納する。外部インターネット由来の解釈は採用しない。
 */

/**
 * 五十音マスターテーブル
 * 五十音それぞれの音義・水火・鉢/用を格納
 */
export const gojuonMaster = mysqlTable("gojuon_master", {
  id: int("id").autoincrement().primaryKey(),
  
  // 音の基本情報
  kana: varchar("kana", { length: 10 }).notNull().unique(), // 「ア」「イ」「ウ」等
  romaji: varchar("romaji", { length: 10 }).notNull(), // "a", "i", "u" 等
  position: varchar("position", { length: 20 }).notNull(), // "ア行ア段" 等
  gyou: varchar("gyou", { length: 10 }).notNull(), // "ア行", "カ行" 等
  dan: varchar("dan", { length: 10 }).notNull(), // "ア段", "イ段" 等
  
  // 水火分類
  suikaType: mysqlEnum("suika_type", ["水", "火", "空", "中", "正", "影", "昇", "濁"]).notNull(),
  suikaDetail: text("suika_detail"), // 「水の冥」「火の冥」等の詳細
  
  // 音義 (言霊秘書からの引用)
  ongi: text("ongi").notNull(), // 音の意味・働き
  hatsuYou: text("hatsu_you"), // 鉢 (発生) と用 (用途)
  
  // 仮名形・義訓
  kanaForm: text("kana_form"), // 仮名の形状的意味
  gikunExamples: text("gikun_examples"), // 義訓の例
  
  // 言霊秘書の参照ページ
  sourcePages: text("source_pages"), // "水穂伝重解誌 p.386-389" 等
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type GojuonMaster = typeof gojuonMaster.$inferSelect;
export type InsertGojuonMaster = typeof gojuonMaster.$inferInsert;

/**
 * 水火法則テーブル
 * 水火の運動原理・法則を格納
 */
export const suikaLaw = mysqlTable("suika_law", {
  id: int("id").autoincrement().primaryKey(),
  
  lawName: varchar("law_name", { length: 100 }).notNull(), // 「水火の運動」「正冥の法則」等
  lawType: mysqlEnum("law_type", ["運動", "配置", "変化", "相互作用"]).notNull(),
  
  description: text("description").notNull(), // 法則の説明
  diagram: text("diagram"), // 図形の説明 (稲荷古伝図等)
  
  relatedKana: text("related_kana"), // 関連する五十音 (JSON配列)
  sourceSection: varchar("source_section", { length: 200 }), // "水穂伝 火之巻二" 等
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SuikaLaw = typeof suikaLaw.$inferSelect;
export type InsertSuikaLaw = typeof suikaLaw.$inferInsert;

/**
 * 旧字体マッピングテーブル
 * 新字体→旧字体の変換規則を格納
 */
export const kyujiMapping = mysqlTable("kyuji_mapping", {
  id: int("id").autoincrement().primaryKey(),
  
  shinjiTai: varchar("shinji_tai", { length: 10 }).notNull().unique(), // 新字体 「霊」「気」等
  kyujiTai: varchar("kyuji_tai", { length: 10 }).notNull(), // 旧字体 「靈」「氣」等
  
  category: varchar("category", { length: 50 }), // 「霊性関連」「気関連」等
  priority: int("priority").default(0), // 変換優先度 (高いほど優先)
  
  notes: text("notes"), // 言霊秘書での重要性の説明
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KyujiMapping = typeof kyujiMapping.$inferSelect;
export type InsertKyujiMapping = typeof kyujiMapping.$inferInsert;

/**
 * 言霊解釈テーブル
 * 特定の言葉・概念の言霊的解釈を格納
 */
export const kotodamaInterpretation = mysqlTable("kotodama_interpretation", {
  id: int("id").autoincrement().primaryKey(),
  
  word: varchar("word", { length: 100 }).notNull(), // 「言霊」「布斗麻邇」等
  wordKyuji: varchar("word_kyuji", { length: 100 }), // 旧字体表記 「言灵」等
  
  interpretation: text("interpretation").notNull(), // 言霊秘書に基づく解釈
  relatedKana: text("related_kana"), // 関連する五十音 (JSON配列)
  
  sourceSection: varchar("source_section", { length: 200 }), // 出典
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KotodamaInterpretation = typeof kotodamaInterpretation.$inferSelect;
export type InsertKotodamaInterpretation = typeof kotodamaInterpretation.$inferInsert;
