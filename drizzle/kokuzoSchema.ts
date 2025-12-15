/**
 * ============================================================
 *  KOKŪZŌ SERVER DATABASE SCHEMA
 * ============================================================
 * 
 * Kokūzō Server のデータベーススキーマ
 * ============================================================
 */

import { int, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * KzFile テーブル
 */
export const kzFiles = mysqlTable("kzFiles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  path: varchar("path", { length: 1000 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  size: int("size").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  hash: varchar("hash", { length: 64 }).notNull(),
  semanticUnitIds: json("semanticUnitIds").$type<string[]>().default([]),
  fractalSeedIds: json("fractalSeedIds").$type<string[]>().default([]),
  reishoSignature: json("reishoSignature"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * SemanticUnit テーブル
 */
export const semanticUnits = mysqlTable("semanticUnits", {
  id: varchar("id", { length: 255 }).primaryKey(),
  text: text("text").notNull(),
  embedding: json("embedding").$type<number[]>(),
  metadata: json("metadata").$type<{
    source?: string;
    sourceId?: string;
    position?: { start: number; end: number };
    tags?: string[];
  }>().default({}),
  reishoSignature: json("reishoSignature"),
  importance: int("importance").default(50),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * FractalSeed テーブル
 */
export const fractalSeeds = mysqlTable("fractalSeeds", {
  id: varchar("id", { length: 255 }).primaryKey(),
  semanticUnitIds: json("semanticUnitIds").$type<string[]>().default([]),
  compressedRepresentation: json("compressedRepresentation").$type<{
    centroidVector?: number[];
    kotodamaVector?: number[];
    fireWaterBalance?: number;
    kanagiPhaseMode?: string;
    mainTags?: string[];
    lawIds?: string[];
    semanticEdges?: Array<{ targetId: string; weight: number }>;
    seedWeight?: number;
  }>().notNull(),
  reishoSignature: json("reishoSignature"),
  structuralParams: json("structuralParams").$type<{
    recursionPotential?: number;
    contractionPotential?: number;
    reishoCurve?: number;
    kanagiDominance?: number;
    deviceAffinityProfile?: Record<string, number>;
  }>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KzFile = typeof kzFiles.$inferSelect;
export type SemanticUnit = typeof semanticUnits.$inferSelect;
export type FractalSeed = typeof fractalSeeds.$inferSelect;

