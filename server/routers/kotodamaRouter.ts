import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gojuonMaster, suikaLaw, kotodamaInterpretation, kyujiMapping } from "../../drizzle/schema";
import { eq, like, or } from "drizzle-orm";
import { convertToKyuji, applyKyujiToObject } from "../kotodama/kyujiFilter";

/**
 * TENMON-ARK 言灵エンジン Router vΩ-K
 * 
 * 言霊秘書を唯一の正典として、五十音・水火法則・旧字体表記に関する
 * すべてのAPIを提供する。
 */

export const kotodamaRouter = router({
  /**
   * 五十音検索API
   * 仮名・ローマ字・水火タイプで五十音を検索
   */
  searchGojuon: publicProcedure
    .input(z.object({
      kana: z.string().optional(),
      romaji: z.string().optional(),
      suikaType: z.enum(["水", "火", "空", "中", "正", "影", "昇", "濁"]).optional(),
      gyou: z.string().optional(), // "ア行", "カ行" 等
      dan: z.string().optional(), // "ア段", "イ段" 等
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      let query = db.select().from(gojuonMaster);

      // フィルター条件を構築
      const conditions = [];
      if (input.kana) {
        conditions.push(eq(gojuonMaster.kana, input.kana));
      }
      if (input.romaji) {
        conditions.push(eq(gojuonMaster.romaji, input.romaji));
      }
      if (input.suikaType) {
        conditions.push(eq(gojuonMaster.suikaType, input.suikaType));
      }
      if (input.gyou) {
        conditions.push(eq(gojuonMaster.gyou, input.gyou));
      }
      if (input.dan) {
        conditions.push(eq(gojuonMaster.dan, input.dan));
      }

      if (conditions.length > 0) {
        query = query.where(or(...conditions)) as any;
      }

      const results = await query;
      return results;
    }),

  /**
   * 五十音全件取得API
   */
  getAllGojuon: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const results = await db.select().from(gojuonMaster);
      return results;
    }),

  /**
   * 水火法則検索API
   */
  searchSuikaLaw: publicProcedure
    .input(z.object({
      lawType: z.enum(["運動", "配置", "変化", "相互作用"]).optional(),
      keyword: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      let query = db.select().from(suikaLaw);

      const conditions = [];
      if (input.lawType) {
        conditions.push(eq(suikaLaw.lawType, input.lawType));
      }
      if (input.keyword) {
        conditions.push(
          or(
            like(suikaLaw.lawName, `%${input.keyword}%`),
            like(suikaLaw.description, `%${input.keyword}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(or(...conditions)) as any;
      }

      const results = await query;
      return results;
    }),

  /**
   * 水火法則全件取得API
   */
  getAllSuikaLaw: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const results = await db.select().from(suikaLaw);
      return results;
    }),

  /**
   * 言霊解釈検索API
   */
  searchInterpretation: publicProcedure
    .input(z.object({
      word: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const results = await db
        .select()
        .from(kotodamaInterpretation)
        .where(
          or(
            eq(kotodamaInterpretation.word, input.word),
            eq(kotodamaInterpretation.wordKyuji, input.word),
            like(kotodamaInterpretation.word, `%${input.word}%`)
          )
        );

      return results;
    }),

  /**
   * 言霊解釈全件取得API
   */
  getAllInterpretation: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const results = await db.select().from(kotodamaInterpretation);
      return results;
    }),

  /**
   * 旧字体マッピング検索API
   */
  searchKyujiMapping: publicProcedure
    .input(z.object({
      shinjiTai: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      let query = db.select().from(kyujiMapping);

      const conditions = [];
      if (input.shinjiTai) {
        conditions.push(eq(kyujiMapping.shinjiTai, input.shinjiTai));
      }
      if (input.category) {
        conditions.push(eq(kyujiMapping.category, input.category));
      }

      if (conditions.length > 0) {
        query = query.where(or(...conditions)) as any;
      }

      const results = await query;
      return results;
    }),

  /**
   * 旧字体マッピング全件取得API
   */
  getAllKyujiMapping: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const results = await db.select().from(kyujiMapping).orderBy(kyujiMapping.priority);
      return results;
    }),

  /**
   * テキスト水火解析API
   * テキスト中の五十音を解析し、水火バランスを算出
   */
  analyzeSuika: publicProcedure
    .input(z.object({
      text: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 五十音マスターデータを取得
      const gojuonData = await db.select().from(gojuonMaster);

      // テキストを1文字ずつ解析
      const analysis = {
        水: 0,
        火: 0,
        空: 0,
        中: 0,
        正: 0,
        影: 0,
        昇: 0,
        濁: 0,
        total: 0,
        details: [] as any[],
      };

      for (const char of input.text) {
        const found = gojuonData.find(g => g.kana === char);
        if (found) {
          analysis[found.suikaType]++;
          analysis.total++;
          analysis.details.push({
            kana: char,
            suikaType: found.suikaType,
            ongi: found.ongi,
          });
        }
      }

      // 水火バランスを計算
      const suikaBalance = {
        水: analysis.total > 0 ? (analysis.水 / analysis.total) * 100 : 0,
        火: analysis.total > 0 ? (analysis.火 / analysis.total) * 100 : 0,
        空: analysis.total > 0 ? (analysis.空 / analysis.total) * 100 : 0,
        中: analysis.total > 0 ? (analysis.中 / analysis.total) * 100 : 0,
      };

      return {
        analysis,
        balance: suikaBalance,
        dominantType: Object.entries(analysis)
          .filter(([key]) => ["水", "火", "空", "中"].includes(key))
          .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "不明",
      };
    }),

  /**
   * 旧字体変換API
   * テキストを言霊秘書準拠の旧字体に変換
   */
  convertToKyuji: publicProcedure
    .input(z.object({
      text: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        original: input.text,
        converted: convertToKyuji(input.text),
        mapping: Object.entries(input.text.split(""))
          .filter(([_, char]) => convertToKyuji(char) !== char)
          .map(([_, char]) => ({
            shinji: char,
            kyuji: convertToKyuji(char),
          })),
      };
    }),
});
