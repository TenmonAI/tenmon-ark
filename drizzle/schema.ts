import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "basic", "pro", "founder", "dev"]).default("free").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Uploaded Files - File storage and metadata
 */
export const uploadedFiles = mysqlTable("uploadedFiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  conversationId: int("conversationId"), // Optional: link to conversation
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileKey: varchar("fileKey", { length: 1000 }).notNull(), // S3 key
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(), // S3 URL
  fileType: mysqlEnum("fileType", ["pdf", "word", "excel", "zip", "image", "video", "audio", "other"]).notNull(),
  extractedText: text("extractedText"), // Extracted text content
  metadata: text("metadata"), // JSON string for additional metadata
  isProcessed: int("isProcessed").notNull().default(0), // boolean as tinyint
  isIntegratedToMemory: int("isIntegratedToMemory").notNull().default(0), // boolean as tinyint
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = typeof uploadedFiles.$inferInsert;

/**
 * TENMON-ARK 言灵エンジン「言霊秘書」準拠テーブル vΩ-K
 * 言霊秘書を唯一の正典として、五十音・水火法則・旧字体表記を格納
 */

/**
 * 五十音マスターテーブル
 */
export const gojuonMaster = mysqlTable("gojuon_master", {
  id: int("id").autoincrement().primaryKey(),
  kana: varchar("kana", { length: 10 }).notNull().unique(),
  romaji: varchar("romaji", { length: 10 }).notNull(),
  position: varchar("position", { length: 20 }).notNull(),
  gyou: varchar("gyou", { length: 10 }).notNull(),
  dan: varchar("dan", { length: 10 }).notNull(),
  suikaType: mysqlEnum("suika_type", ["水", "火", "空", "中", "正", "影", "昇", "濁"]).notNull(),
  suikaDetail: text("suika_detail"),
  ongi: text("ongi").notNull(),
  hatsuYou: text("hatsu_you"),
  kanaForm: text("kana_form"),
  gikunExamples: text("gikun_examples"),
  sourcePages: text("source_pages"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type GojuonMaster = typeof gojuonMaster.$inferSelect;
export type InsertGojuonMaster = typeof gojuonMaster.$inferInsert;

/**
 * 水火法則テーブル
 */
export const suikaLaw = mysqlTable("suika_law", {
  id: int("id").autoincrement().primaryKey(),
  lawName: varchar("law_name", { length: 100 }).notNull(),
  lawType: mysqlEnum("law_type", ["運動", "配置", "変化", "相互作用"]).notNull(),
  description: text("description").notNull(),
  diagram: text("diagram"),
  relatedKana: text("related_kana"),
  sourceSection: varchar("source_section", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SuikaLaw = typeof suikaLaw.$inferSelect;
export type InsertSuikaLaw = typeof suikaLaw.$inferInsert;

/**
 * 旧字体マッピングテーブル
 */
export const kyujiMapping = mysqlTable("kyuji_mapping", {
  id: int("id").autoincrement().primaryKey(),
  shinjiTai: varchar("shinji_tai", { length: 10 }).notNull().unique(),
  kyujiTai: varchar("kyuji_tai", { length: 10 }).notNull(),
  category: varchar("category", { length: 50 }),
  priority: int("priority").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KyujiMapping = typeof kyujiMapping.$inferSelect;
export type InsertKyujiMapping = typeof kyujiMapping.$inferInsert;

/**
 * 言霊解釈テーブル
 */
export const kotodamaInterpretation = mysqlTable("kotodama_interpretation", {
  id: int("id").autoincrement().primaryKey(),
  word: varchar("word", { length: 100 }).notNull(),
  wordKyuji: varchar("word_kyuji", { length: 100 }),
  interpretation: text("interpretation").notNull(),
  relatedKana: text("related_kana"),
  sourceSection: varchar("source_section", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type KotodamaInterpretation = typeof kotodamaInterpretation.$inferSelect;
export type InsertKotodamaInterpretation = typeof kotodamaInterpretation.$inferInsert;

/**
 * Embeds - Embed URL management for external site integration
 */
export const embeds = mysqlTable("embeds", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  uniqueId: varchar("uniqueId", { length: 64 }).notNull().unique(),
  type: mysqlEnum("type", ["chat", "qa"]).notNull().default("chat"),
  config: text("config"), // JSON string for embed configuration
  theme: mysqlEnum("theme", ["dark", "light"]).notNull().default("dark"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Embed = typeof embeds.$inferSelect;
export type InsertEmbed = typeof embeds.$inferInsert;

// ========================================
// PUBLIC LAYER TABLES
// ========================================

/**
 * Subscription plans for TENMON-ARK OS
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: mysqlEnum("name", ["free", "basic", "pro", "founder"]).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  price: int("price").notNull(), // in yen (0 for Free)
  billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly", "lifetime"]).notNull().default("monthly"),
  stripeProductId: varchar("stripeProductId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  
  // Feature limits
  maxFileUploads: int("maxFileUploads").notNull().default(-1), // -1 = unlimited
  maxFileStorageBytes: bigint("maxFileStorageBytes", { mode: "number" }).notNull().default(-1), // -1 = unlimited
  maxConversations: int("maxConversations").notNull().default(-1), // -1 = unlimited
  maxMemoryItems: int("maxMemoryItems").notNull().default(-1), // -1 = unlimited
  
  // Feature flags
  canUseFileUpload: int("canUseFileUpload").notNull().default(0),
  canUseMemorySave: int("canUseMemorySave").notNull().default(0),
  canUseKnowledgeEngine: int("canUseKnowledgeEngine").notNull().default(0),
  canUseULCE: int("canUseULCE").notNull().default(0),
  canUseArkBrowser: int("canUseArkBrowser").notNull().default(0),
  canUseMT5Trading: int("canUseMT5Trading").notNull().default(0),
  canUseFounderFeatures: int("canUseFounderFeatures").notNull().default(0),
  
  // Performance settings
  responseSpeedMultiplier: int("responseSpeedMultiplier").notNull().default(100), // 100 = 1.0x
  thinkingDepthLevel: int("thinkingDepthLevel").notNull().default(1), // 1-5
  twinCoreAnalysisDepth: int("twinCoreAnalysisDepth").notNull().default(1), // 1-5
  
  dailyMessageLimit: int("dailyMessageLimit"), // null = unlimited (legacy)
  features: text("features"), // JSON string (legacy)
  
  isActive: int("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Site Info Memory - LP状態管理テーブル
 * LPの回答を動的に制御するためのサイト情報を保存
 */
export const siteInfo = mysqlTable("siteInfo", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // 例: "release_status", "founder_release_date"
  value: text("value").notNull(), // JSONまたはプレーンテキスト
  description: text("description"), // 説明
  updatedBy: int("updatedBy"), // 更新者のuser ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteInfo = typeof siteInfo.$inferSelect;
export type InsertSiteInfo = typeof siteInfo.$inferInsert;

/**
 * LP Sessions - LP用セッションメモリテーブル
 * LPチャットの会話履歴を保存し、複数ターン会話を可能にする
 */
export const lpSessions = mysqlTable("lpSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(), // UUID
  messages: text("messages").notNull(), // JSON配列: [{role: "user"|"assistant", content: string}]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LpSession = typeof lpSessions.$inferSelect;
export type InsertLpSession = typeof lpSessions.$inferInsert;

/**
 * User subscriptions for TENMON-ARK OS
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planId: int("planId").notNull(),
  planName: mysqlEnum("planName", ["free", "basic", "pro", "founder"]).notNull().default("free"),
  
  // Stripe integration
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "expired"]).notNull().default("active"),
  
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: int("cancelAtPeriodEnd").notNull().default(0), // boolean as tinyint
  canceledAt: timestamp("canceledAt"),
  
  // Usage tracking
  currentFileUploads: int("currentFileUploads").notNull().default(0),
  currentFileStorageBytes: bigint("currentFileStorageBytes", { mode: "number" }).notNull().default(0),
  currentConversations: int("currentConversations").notNull().default(0),
  currentMemoryItems: int("currentMemoryItems").notNull().default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Billing History - Payment records
 */
export const billingHistory = mysqlTable("billingHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  subscriptionId: int("subscriptionId"),
  
  amount: int("amount").notNull(), // in yen
  currency: varchar("currency", { length: 3 }).notNull().default("JPY"),
  
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
  
  status: mysqlEnum("status", ["pending", "succeeded", "failed", "refunded"]).notNull(),
  description: text("description"),
  
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillingHistory = typeof billingHistory.$inferSelect;
export type InsertBillingHistory = typeof billingHistory.$inferInsert;

/**
 * Synaptic Memory - Long-term memory (LTM)
 */
export const longTermMemories = mysqlTable("longTermMemories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  memoryType: mysqlEnum("memoryType", ["lingua_structure", "tenshin_kinoki", "worldview", "user_profile"]).notNull(),
  category: mysqlEnum("category", ["worldview", "lingua_structure", "tenshin_kinoki", "project_state", "user_profile", "task_flow", "conversation_recent"]).default("worldview").notNull(),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LongTermMemory = typeof longTermMemories.$inferSelect;
export type InsertLongTermMemory = typeof longTermMemories.$inferInsert;

/**
 * Synaptic Memory - Medium-term memory (MTM)
 */
export const mediumTermMemories = mysqlTable("mediumTermMemories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  conversationId: int("conversationId"),
  content: text("content").notNull(),
  context: text("context"), // JSON string
  importance: mysqlEnum("importance", ["super_fire", "fire", "warm", "neutral", "cool", "water"]).default("neutral").notNull(),
  category: mysqlEnum("category", ["worldview", "lingua_structure", "tenshin_kinoki", "project_state", "user_profile", "task_flow", "conversation_recent"]).default("conversation_recent").notNull(),
  expiresAt: timestamp("expiresAt").notNull(), // 記憶寿命
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), // 重複記憶更新用
});

export type MediumTermMemory = typeof mediumTermMemories.$inferSelect;
export type InsertMediumTermMemory = typeof mediumTermMemories.$inferInsert;

/**
 * Conversations for chat history
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }),
  shukuyo: varchar("shukuyo", { length: 50 }), // 宿曜27宿
  conversationMode: mysqlEnum("conversationMode", ["general", "intermediate", "expert"]).default("general").notNull(), // 会話モード
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Persona Mode Settings - User's preferred chat mode (TURBO / NORMAL / QUALITY)
 */
export const personaModeSettings = mysqlTable("personaModeSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  mode: mysqlEnum("mode", ["turbo", "normal", "quality"]).notNull().default("turbo"),
  // Mode parameters
  momentum: int("momentum").notNull().default(15), // Turbo: 15, Normal: 8, Quality: 6
  chunkInterval: int("chunkInterval").notNull().default(5), // ms - Turbo: 5, Normal: 20, Quality: 35
  depth: mysqlEnum("depth", ["surface-wide", "middle", "deep"]).notNull().default("surface-wide"),
  guidanceEnabled: int("guidanceEnabled").notNull().default(0), // boolean as tinyint - always 0 (OFF)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PersonaModeSetting = typeof personaModeSettings.$inferSelect;
export type InsertPersonaModeSetting = typeof personaModeSettings.$inferInsert;

/**
 * Messages in conversations (STM - Short-term memory)
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON for fire/water attributes, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Knowledge Base entries for Public layer
 */
export const knowledgeEntries = mysqlTable("knowledgeEntries", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  embedding: text("embedding"), // JSON array for vector search
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type InsertKnowledgeEntry = typeof knowledgeEntries.$inferInsert;

// ========================================
// DEVELOPER LAYER TABLES (完全分離)
// ========================================

/**
 * Developer-only users (天聞専用)
 */
export const developerUsers = mysqlTable("developerUsers", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  apiKey: varchar("apiKey", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("TENMON"),
  permissions: text("permissions"), // JSON array
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastAccessAt: timestamp("lastAccessAt"),
});

export type DeveloperUser = typeof developerUsers.$inferSelect;
export type InsertDeveloperUser = typeof developerUsers.$inferInsert;

/**
 * Developer core data - 天津金木構造
 */
export const tenshinKinokiData = mysqlTable("tenshinKinokiData", {
  id: int("id").autoincrement().primaryKey(),
  structureId: int("structureId").notNull().unique(), // 1-50
  name: varchar("name", { length: 100 }).notNull(),
  rotation: mysqlEnum("rotation", ["left", "right"]).notNull(),
  direction: mysqlEnum("direction", ["inner", "outer"]).notNull(),
  phase: mysqlEnum("phase", ["yin", "yang"]).notNull(),
  gojiuonMapping: text("gojiuonMapping"), // JSON
  attributes: text("attributes"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TenshinKinokiData = typeof tenshinKinokiData.$inferSelect;
export type InsertTenshinKinokiData = typeof tenshinKinokiData.$inferInsert;

/**
 * Developer core data - カタカムナ80首
 */
export const katakamuna = mysqlTable("katakamuna", {
  id: int("id").autoincrement().primaryKey(),
  utaNumber: int("utaNumber").notNull().unique(), // 1-80
  content: text("content").notNull(),
  interpretation: text("interpretation"),
  deepStructure: text("deepStructure"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Katakamuna = typeof katakamuna.$inferSelect;
export type InsertKatakamuna = typeof katakamuna.$inferInsert;

/**
 * Developer core data - 宿曜秘伝
 */
export const sukuyoSecrets = mysqlTable("sukuyoSecrets", {
  id: int("id").autoincrement().primaryKey(),
  nakshatra: varchar("nakshatra", { length: 100 }).notNull().unique(),
  karma: text("karma"), // JSON
  destiny: text("destiny"), // JSON
  spiritualCoordinates: text("spiritualCoordinates"), // JSON
  relationships: text("relationships"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SukuyoSecret = typeof sukuyoSecrets.$inferSelect;
export type InsertSukuyoSecret = typeof sukuyoSecrets.$inferInsert;

/**
 * T-Scalp patterns for MT5 integration
 */
export const tscalpPatterns = mysqlTable("tscalpPatterns", {
  id: int("id").autoincrement().primaryKey(),
  patternName: varchar("patternName", { length: 200 }).notNull(),
  patternType: varchar("patternType", { length: 100 }).notNull(),
  parameters: text("parameters"), // JSON
  performance: text("performance"), // JSON
  pdcaHistory: text("pdcaHistory"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TscalpPattern = typeof tscalpPatterns.$inferSelect;
export type InsertTscalpPattern = typeof tscalpPatterns.$inferInsert;

/**
 * Developer Knowledge Base (Public層とは完全分離)
 */
export const developerKnowledge = mysqlTable("developerKnowledge", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }),
  accessLevel: varchar("accessLevel", { length: 50 }).notNull().default("TENMON_ONLY"),
  embedding: text("embedding"), // JSON array
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DeveloperKnowledge = typeof developerKnowledge.$inferSelect;
export type InsertDeveloperKnowledge = typeof developerKnowledge.$inferInsert;

// ========================================
// TENMON-ARK VIDEO PRODUCTION OS TABLES
// ========================================

/**
 * Video projects for TENMON-ARK
 */
export const videoProjects = mysqlTable("videoProjects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull().default("pending"),
  sourceType: mysqlEnum("sourceType", ["upload", "youtube", "vimeo"]).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  metadata: text("metadata"), // JSON: duration, resolution, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoProject = typeof videoProjects.$inferSelect;
export type InsertVideoProject = typeof videoProjects.$inferInsert;

/**
 * Video files (original and processed)
 */
export const videoFiles = mysqlTable("videoFiles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  fileType: mysqlEnum("fileType", ["original", "audio", "processed"]).notNull(),
  s3Key: varchar("s3Key", { length: 500 }).notNull(),
  s3Url: varchar("s3Url", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // in bytes
  duration: int("duration"), // in seconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VideoFile = typeof videoFiles.$inferSelect;
export type InsertVideoFile = typeof videoFiles.$inferInsert;

/**
 * Transcriptions (Whisper output)
 */
export const transcriptions = mysqlTable("transcriptions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  language: varchar("language", { length: 10 }),
  rawText: text("rawText").notNull(),
  segments: text("segments").notNull(), // JSON: [{start, end, text}]
  refinedText: text("refinedText"), // 言灵整形後のテキスト
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

/**
 * Kotodama analysis results (言灵構文解析)
 */
export const kotodamaAnalysis = mysqlTable("kotodamaAnalysis", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  transcriptionId: int("transcriptionId").notNull(),
  center: text("center"), // ミナカ（中心）
  fire: text("fire"), // JSON: 火（外発）要素
  water: text("water"), // JSON: 水（内集）要素
  spiral: text("spiral"), // JSON: 螺旋構造
  rhythm: text("rhythm"), // JSON: リズム解析
  kotodama: text("kotodama"), // JSON: 五十音解析
  sequence: text("sequence"), // JSON: 構文シーケンス
  breathPoints: text("breathPoints"), // JSON: 呼吸点 [{time, type}]
  storyStructure: text("storyStructure"), // JSON: 起承転結
  energyBalance: text("energyBalance"), // JSON: 火水バランス
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KotodamaAnalysis = typeof kotodamaAnalysis.$inferSelect;
export type InsertKotodamaAnalysis = typeof kotodamaAnalysis.$inferInsert;

/**
 * Edit tasks (編集タスク)
 */
export const editTasks = mysqlTable("editTasks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  analysisId: int("analysisId").notNull(),
  taskType: mysqlEnum("taskType", ["auto_cut", "auto_subtitle", "auto_bgm", "auto_narration"]).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull().default("pending"),
  parameters: text("parameters"), // JSON: 編集パラメータ
  result: text("result"), // JSON: 編集結果
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditTask = typeof editTasks.$inferSelect;
export type InsertEditTask = typeof editTasks.$inferInsert;

/**
 * Edit results (編集結果)
 */
export const editResults = mysqlTable("editResults", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  taskId: int("taskId").notNull(),
  resultType: mysqlEnum("resultType", ["cut_points", "subtitles", "bgm", "narration"]).notNull(),
  data: text("data").notNull(), // JSON: 編集データ
  s3Key: varchar("s3Key", { length: 500 }),
  s3Url: varchar("s3Url", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditResult = typeof editResults.$inferSelect;
export type InsertEditResult = typeof editResults.$inferInsert;

/**
 * Processing queue (処理キュー)
 */
export const processingQueue = mysqlTable("processingQueue", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  queueType: mysqlEnum("queueType", ["transcription", "analysis", "edit", "render"]).notNull(),
  priority: int("priority").notNull().default(5), // 1-10 (10 = highest)
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).notNull().default("pending"),
  retryCount: int("retryCount").notNull().default(0),
  maxRetries: int("maxRetries").notNull().default(3),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProcessingQueue = typeof processingQueue.$inferSelect;
export type InsertProcessingQueue = typeof processingQueue.$inferInsert;

// ========================================
// CHAT SYSTEM TABLES (Phase B)
// ========================================

/**
 * Chat rooms for TENMON-ARK Chat AI
 */
export const chatRooms = mysqlTable("chatRooms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = typeof chatRooms.$inferInsert;

/**
 * Chat messages for TENMON-ARK Chat AI
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Presence Threshold Changes - 閾値変更履歴
 * Presence OS v1.0の閾値変更を記録し、天聞の承認なしに変更されることを防ぐ
 */
export const presenceThresholdChanges = mysqlTable("presenceThresholdChanges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  thresholdPath: varchar("thresholdPath", { length: 255 }).notNull(),  // 例: "naturalPresence.CLEAR_DIRECTION_THRESHOLD"
  currentValue: text("currentValue").notNull(),  // JSON文字列
  proposedValue: text("proposedValue").notNull(),  // JSON文字列
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PresenceThresholdChange = typeof presenceThresholdChanges.$inferSelect;
export type InsertPresenceThresholdChange = typeof presenceThresholdChanges.$inferInsert;

/**
 * Self-Build Plans - 自己構築計画
 * TENMON-ARK霊核OSの自己構築計画を記録
 */
export const selfBuildPlans = mysqlTable("selfBuildPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  goal: text("goal").notNull(),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "rejected", "in_progress", "completed", "failed"]).notNull().default("draft"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: int("rejectedBy"),
  rejectedAt: timestamp("rejectedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SelfBuildPlan = typeof selfBuildPlans.$inferSelect;
export type InsertSelfBuildPlan = typeof selfBuildPlans.$inferInsert;

/**
 * Self-Build Tasks - 自己構築タスク
 * 自己構築計画の個別タスクを記録
 */
export const selfBuildTasks = mysqlTable("selfBuildTasks", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  taskType: mysqlEnum("taskType", ["code_generation", "file_creation", "module_integration", "dependency_resolution"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  inputData: text("inputData").notNull(),  // JSON文字列
  outputData: text("outputData"),  // JSON文字列
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).notNull().default("pending"),
  errorMessage: text("errorMessage"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SelfBuildTask = typeof selfBuildTasks.$inferSelect;
export type InsertSelfBuildTask = typeof selfBuildTasks.$inferInsert;

/**
 * Self-Heal Records - 自律修復記録
 * エラー検知と自動修復の履歴を記録
 */
export const selfHealRecords = mysqlTable("selfHealRecords", {
  id: int("id").autoincrement().primaryKey(),
  errorType: mysqlEnum("errorType", ["runtime", "logic", "data", "integration", "performance"]).notNull(),
  errorMessage: text("errorMessage").notNull(),
  errorStack: text("errorStack"),
  context: text("context").notNull(),  // JSON文字列
  repairAttempts: int("repairAttempts").notNull().default(0),
  repairStatus: mysqlEnum("repairStatus", ["pending", "in_progress", "success", "failed", "manus_requested"]).notNull().default("pending"),
  repairActions: text("repairActions"),  // JSON文字列
  manusHelpRequested: int("manusHelpRequested").notNull().default(0),  // boolean as tinyint
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SelfHealRecord = typeof selfHealRecords.$inferSelect;
export type InsertSelfHealRecord = typeof selfHealRecords.$inferInsert;

/**
 * Self-Evolution Records - 自律進化記録
 * ユーザー学習と応答品質改善の履歴を記録
 */
export const selfEvolutionRecords = mysqlTable("selfEvolutionRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  evolutionType: mysqlEnum("evolutionType", ["behavior_learning", "response_improvement", "soul_sync", "preference_adaptation"]).notNull(),
  description: text("description").notNull(),
  beforeState: text("beforeState").notNull(),  // JSON文字列
  afterState: text("afterState").notNull(),  // JSON文字列
  improvementMetrics: text("improvementMetrics"),  // JSON文字列
  status: mysqlEnum("status", ["active", "rolled_back"]).notNull().default("active"),
  rolledBackAt: timestamp("rolledBackAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SelfEvolutionRecord = typeof selfEvolutionRecords.$inferSelect;
export type InsertSelfEvolutionRecord = typeof selfEvolutionRecords.$inferInsert;

/**
 * Co-Dev History - 共同開発履歴
 * ManusとTENMON-ARK霊核OSの共同開発履歴を記録
 */
export const coDevHistory = mysqlTable("coDevHistory", {
  id: int("id").autoincrement().primaryKey(),
  requestType: mysqlEnum("requestType", ["improvement", "bug_fix", "feature_request", "emergency"]).notNull(),
  requestDescription: text("requestDescription").notNull(),
  requestContext: text("requestContext").notNull(),  // JSON文字列
  manusResponse: text("manusResponse"),  // JSON文字列
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).notNull().default("pending"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CoDevHistory = typeof coDevHistory.$inferSelect;
export type InsertCoDevHistory = typeof coDevHistory.$inferInsert;

// ========================================
// IROHA KOTODAMA TABLES (いろは言霊解)
// ========================================

/**
 * Iroha interpretations (いろは言霊解)
 * いろは47文字それぞれの解釈と意味を格納
 */
export const irohaInterpretations = mysqlTable("irohaInterpretations", {
  id: int("id").autoincrement().primaryKey(),
  /** いろは文字（い、ろ、は、に、ほ、へ、と...） */
  character: varchar("character", { length: 10 }).notNull().unique(),
  /** 順序番号 (1-47) */
  order: int("order").notNull().unique(),
  /** 読み方 */
  reading: varchar("reading", { length: 100 }),
  /** 解釈・意味 */
  interpretation: text("interpretation"),
  /** 生命の法則との関連 */
  lifePrinciple: text("lifePrinciple"),
  /** 天津金木パターンとの関連（JSON形式で複数のパターンIDを格納可能） */
  relatedPatterns: text("relatedPatterns"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IrohaInterpretation = typeof irohaInterpretations.$inferSelect;
export type InsertIrohaInterpretation = typeof irohaInterpretations.$inferInsert;

/**
 * Basic movements (基本動作マスターテーブル)
 * 左旋内集、右旋内集、左旋外発、右旋外発の4つの基本動作を格納
 */
export const basicMovements = mysqlTable("basicMovements", {
  id: int("id").autoincrement().primaryKey(),
  /** 動作名（左旋内集、右旋内集、左旋外発、右旋外発） */
  name: varchar("name", { length: 50 }).notNull().unique(),
  /** 読み方（させんないしゅう、うせんないしゅう、させんがいはつ、うせんがいはつ） */
  reading: varchar("reading", { length: 100 }).notNull(),
  /** 回転方向（左回転、右回転） */
  direction: varchar("direction", { length: 50 }).notNull(),
  /** エネルギーの流れ（内側に集まる、外側に発散する） */
  energy: varchar("energy", { length: 100 }).notNull(),
  /** 対応する元素（水（ミズ）、陽の収縮、陰→陽への転換、火（ヒ）） */
  element: varchar("element", { length: 100 }).notNull(),
  /** 特性の説明 */
  properties: text("properties").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BasicMovement = typeof basicMovements.$inferSelect;
export type InsertBasicMovement = typeof basicMovements.$inferInsert;

/**
 * Amatsu Kanagi 50 patterns (天津金木50パターン)
 * 天津金木の50パターンと言霊の完全対応を格納
 */
export const amatsuKanagiPatterns = mysqlTable("amatsuKanagiPatterns", {
  id: int("id").autoincrement().primaryKey(),
  /** パターン番号 (1-50) */
  number: int("number").notNull().unique(),
  /** 言霊の音（ホ、オ、ヨ、ヘ、エ、ユ、フ、ウ、ヒ、ミ、イ、井、ハ、ア、ワ、ヤ、ノ、ネ、ヌ、二、ナ、ラ、リ、ル、レ、ロ、ゴ、ソ、ケ、セ、ク、ス、キ、カ、シ、サ、タ、チ、ツ、テ、ト、モ、メ、ム、マ） */
  sound: varchar("sound", { length: 10 }).notNull(),
  /** カテゴリ（天津金木24相、中心霊、陰陽反転相） */
  category: varchar("category", { length: 50 }).notNull(),
  /** パターンの種類（ヤイ：完全内集、ヤエ：完全外発など） */
  type: varchar("type", { length: 100 }),
  /** パターンの文字列表現（例: 左旋内集-左旋外発-右旋内集-右旋外発） */
  pattern: varchar("pattern", { length: 255 }).notNull(),
  /** 4つの動作の配列 JSON形式 */
  movements: text("movements").notNull(),
  /** パターンの意味・解説 */
  meaning: text("meaning"),
  /** 特殊パターンフラグ（中心霊の場合true） */
  special: int("special").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AmatsuKanagiPattern = typeof amatsuKanagiPatterns.$inferSelect;
export type InsertAmatsuKanagiPattern = typeof amatsuKanagiPatterns.$inferInsert;

/**
 * Conversation Modes - 会話モード設定（一般人/中級/専門）
 */
export const conversationModes = mysqlTable("conversationModes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  currentMode: mysqlEnum("currentMode", ["general", "intermediate", "expert"]).notNull().default("general"),
  autoDetect: int("autoDetect").notNull().default(1), // boolean as tinyint
  cognitiveLevel: int("cognitiveLevel").notNull().default(1), // 1-3 (一般人→中級→天聞レベル)
  // ユーザーの発話特性
  averageSentenceLength: int("averageSentenceLength").default(0), // 平均文長
  vocabularyComplexity: int("vocabularyComplexity").default(0), // 語彙複雑度 (0-100)
  thinkingSpeed: int("thinkingSpeed").default(50), // 思考速度 (0-100)
  emotionalStability: int("emotionalStability").default(50), // 情緒安定度 (0-100)
  interestDepth: int("interestDepth").default(0), // 興味深度 (0-100)
  japaneseProficiency: int("japaneseProficiency").default(50), // 日本語習熟度 (0-100)
  complexTopicTolerance: int("complexTopicTolerance").default(0), // 難しい話の耐性 (0-100)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConversationMode = typeof conversationModes.$inferSelect;
export type InsertConversationMode = typeof conversationModes.$inferInsert;

/**
 * User Profiles - ユーザープロファイル（生年月日・宿曜解析結果）
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  birthDate: timestamp("birthDate"), // 生年月日
  birthTime: varchar("birthTime", { length: 10 }), // 生まれた時刻（HH:MM形式、任意）
  gender: mysqlEnum("gender", ["male", "female", "other"]), // 性別（任意）
  // 宿曜解析結果
  sukuyoMansion: varchar("sukuyoMansion", { length: 50 }), // 宿曜27宿（例: 井宿、心宿）
  sukuyoDay: int("sukuyoDay"), // 日運（1-27）
  sukuyoMonth: int("sukuyoMonth"), // 月運（1-12）
  sukuyoYear: int("sukuyoYear"), // 年運（1-12）
  kuyoElement: varchar("kuyoElement", { length: 50 }), // 九曜（日・月・火・水・木・金・土・羅・計）
  fireWaterBalance: int("fireWaterBalance"), // 火水バランス（0-100、50が中心）
  spiritualDistance: int("spiritualDistance"), // ミナカからの距離（霊核指数、0-100）
  // 宿曜 × 天津金木
  amatsuKanagiPattern: int("amatsuKanagiPattern"), // 天津金木パターン（1-50）
  // 宿曜 × いろは言灵解
  irohaCharacter: varchar("irohaCharacter", { length: 10 }), // いろは文字（例: い、ろ、は）
  // パーソナル人格
  personalityCore: text("personalityCore"), // JSON: ユーザー専用人格の核心
  personalityTraits: text("personalityTraits"), // JSON: 性格特性
  communicationStyle: text("communicationStyle"), // JSON: コミュニケーションスタイル
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Conversation Tests - 会話テスト結果
 */
export const conversationTests = mysqlTable("conversationTests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  testId: varchar("testId", { length: 64 }).notNull(),
  conversationMode: mysqlEnum("conversationMode", ["general", "intermediate", "expert"]).notNull(),
  sukuyoMansionId: int("sukuyoMansionId"),
  sukuyoMansionName: varchar("sukuyoMansionName", { length: 64 }),
  userMessage: text("userMessage").notNull(),
  aiResponse: text("aiResponse").notNull(),
  // 7項目テスト結果
  understandabilityScore: int("understandabilityScore").notNull(), // 1. 一般人が理解できるか（0-100）
  terminologyScore: int("terminologyScore").notNull(), // 2. 専門用語が暴発していないか（0-100）
  sukuyoAlignmentScore: int("sukuyoAlignmentScore").notNull(), // 3. その人の宿曜に合った人格になっているか（0-100）
  twinCoreStabilityScore: int("twinCoreStabilityScore").notNull(), // 4. Twin-Core推論がブレていないか（0-100）
  fireWaterBalanceScore: int("fireWaterBalanceScore").notNull(), // 5. 返答温度（火水）が適切か（0-100）
  emotionalSupportScore: int("emotionalSupportScore").notNull(), // 6. 感情寄り添いが過剰になっていないか（0-100）
  spiritualStabilityScore: int("spiritualStabilityScore").notNull(), // 7. 霊核の安定を崩していないか（0-100）
  overallScore: int("overallScore").notNull(), // 総合スコア（0-100）
  result: mysqlEnum("result", ["PASS", "WARN", "FAIL"]).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConversationTest = typeof conversationTests.$inferSelect;
export type InsertConversationTest = typeof conversationTests.$inferInsert;

// ========================================
// LP-QA LOGS (Phase 8: Memory Unity vΦ)
// ========================================

/**
 * LP-QA logs for field testing
 * futomani88.com からの呼び出しログを保存
 */
export const lpQaLogs = mysqlTable("lpQaLogs", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  response: text("response").notNull(),
  depth: varchar("depth", { length: 50 }),
  fireWaterBalance: varchar("fireWaterBalance", { length: 50 }),
  userId: int("userId"), // 0 = 匿名
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LpQaLog = typeof lpQaLogs.$inferSelect;
export type InsertLpQaLog = typeof lpQaLogs.$inferInsert;

// ========================================
// SITE CRAWLER ENGINE v1 TABLES
// ========================================

/**
 * Crawled Sites - サイト全体のメタデータ
 */
export const crawledSites = mysqlTable("crawledSites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // サイトの所有者
  siteId: varchar("siteId", { length: 100 }).notNull().unique(), // 公開用ID（例: "tenmon-ai"）
  
  // サイト基本情報
  siteUrl: varchar("siteUrl", { length: 1000 }).notNull(),
  siteName: varchar("siteName", { length: 500 }),
  siteDescription: text("siteDescription"),
  
  // クロール設定
  crawlDepth: int("crawlDepth").notNull().default(3), // クロールの深さ
  maxPages: int("maxPages").notNull().default(100), // 最大ページ数
  
  // クロール状態
  status: mysqlEnum("status", ["pending", "crawling", "completed", "failed"]).notNull().default("pending"),
  lastCrawledAt: timestamp("lastCrawledAt"),
  totalPages: int("totalPages").notNull().default(0),
  totalErrors: int("totalErrors").notNull().default(0),
  
  // メタデータ
  metadata: text("metadata"), // JSON: OGP, favicon, etc.
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrawledSite = typeof crawledSites.$inferSelect;
export type InsertCrawledSite = typeof crawledSites.$inferInsert;

/**
 * Site Pages - クロールされた個別ページ
 */
export const sitePages = mysqlTable("sitePages", {
  id: int("id").autoincrement().primaryKey(),
  siteId: varchar("siteId", { length: 100 }).notNull(), // crawledSites.siteId への参照
  
  // ページ基本情報
  url: varchar("url", { length: 1000 }).notNull(),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  
  // ページ内容
  htmlContent: text("htmlContent"), // 元のHTML
  textContent: text("textContent"), // 抽出されたテキスト
  
  // ページ構造
  headings: text("headings"), // JSON: [{level: "h1", text: "..."}]
  links: text("links"), // JSON: [{url: "...", text: "..."}]
  images: text("images"), // JSON: [{url: "...", alt: "..."}]
  
  // メタデータ
  metadata: text("metadata"), // JSON: meta tags, OGP, etc.
  
  // クロール情報
  statusCode: int("statusCode").notNull().default(200),
  crawledAt: timestamp("crawledAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SitePage = typeof sitePages.$inferSelect;
export type InsertSitePage = typeof sitePages.$inferInsert;

/**
 * Site Memory - Semantic Structuring（意味解析）結果
 */
export const siteMemories = mysqlTable("siteMemories", {
  id: int("id").autoincrement().primaryKey(),
  siteId: varchar("siteId", { length: 100 }).notNull(), // crawledSites.siteId への参照
  
  // 意味カテゴリ
  category: mysqlEnum("category", [
    "serviceSummary",
    "priceList",
    "features",
    "worldview",
    "faq",
    "flow",
    "caution",
    "metadata",
    "other"
  ]).notNull(),
  
  // 構造化データ
  title: varchar("title", { length: 500 }),
  content: text("content").notNull(), // 意味解析後のテキスト
  structuredData: text("structuredData"), // JSON: カテゴリ別の構造化データ
  
  // 元ページへの参照
  sourcePageId: int("sourcePageId"), // sitePages.id への参照
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  
  // 検索・優先度
  priority: int("priority").notNull().default(5), // 1-10（高いほど優先）
  keywords: text("keywords"), // JSON: 検索用キーワード
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteMemory = typeof siteMemories.$inferSelect;
export type InsertSiteMemory = typeof siteMemories.$inferInsert;

/**
 * Site Q&A History - サイト固有のQ&A履歴
 */
export const siteQAHistory = mysqlTable("siteQAHistory", {
  id: int("id").autoincrement().primaryKey(),
  siteId: varchar("siteId", { length: 100 }).notNull(),
  
  // Q&A内容
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  
  // 参照されたSiteMemory
  referencedMemoryIds: text("referencedMemoryIds"), // JSON: [1, 2, 3]
  
  // 品質評価
  rating: int("rating"), // 1-5
  feedback: text("feedback"),
  
  // セッション情報
  sessionId: varchar("sessionId", { length: 100 }),
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: varchar("userAgent", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SiteQAHistory = typeof siteQAHistory.$inferSelect;
export type InsertSiteQAHistory = typeof siteQAHistory.$inferInsert;

/**
 * Custom TENMON-ARK (CustomGPT互換)
 * Pro以上のユーザーがカスタムArkを作成・共有できる機能
 */
export const customArks = mysqlTable("customArks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  systemPrompt: text("systemPrompt").notNull(),
  knowledgeBase: text("knowledgeBase"), // JSON: 知識ベースデータ
  isPublic: int("isPublic").notNull().default(0), // boolean as tinyint
  shareUrl: varchar("shareUrl", { length: 500 }),
  usageCount: int("usageCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomArk = typeof customArks.$inferSelect;
export type InsertCustomArk = typeof customArks.$inferInsert;

/**
 * Founder Feedback Center
 * Founderプランユーザーが機能要望・バグ報告を送信できる
 */
export const founderFeedback = mysqlTable("founderFeedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["feature_request", "bug_report", "improvement"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "implemented", "rejected"]).notNull().default("pending"),
  adminResponse: text("adminResponse"),
  priority: int("priority").notNull().default(3), // 1-5
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FounderFeedback = typeof founderFeedback.$inferSelect;
export type InsertFounderFeedback = typeof founderFeedback.$inferInsert;
