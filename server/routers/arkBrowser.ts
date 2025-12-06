import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { deepParseParagraphs } from "../lib/deepParse";

/**
 * Ark-Browser Router
 * 
 * TENMON-ARK Ark-BrowserのChrome互換ブラウザ機能を提供するtRPCルーター
 * 世界検索（Google/Reddit/Bing）、意図翻訳検索、HTML段落解析、翻訳×解読エンジンを実装
 */

// ブックマークテーブル（仮定義 - 後でschema.tsに追加）
// export const bookmarks = mysqlTable("bookmarks", {
//   id: int("id").autoincrement().primaryKey(),
//   userId: int("userId").notNull(),
//   title: varchar("title", { length: 500 }).notNull(),
//   url: varchar("url", { length: 2000 }).notNull(),
//   createdAt: timestamp("createdAt").defaultNow().notNull(),
// });

/**
 * 意図翻訳検索
 * ユーザーの意図を理解し、最適な検索クエリに翻訳
 */
async function translateSearchIntent(query: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `あなたは検索クエリ最適化エキスパートです。
ユーザーの検索意図を理解し、最も効果的な検索クエリに翻訳してください。

例：
- 「最近の AI ニュース」→ "AI news 2025"
- 「日本の伝統文化について」→ "Japanese traditional culture history"
- 「プログラミング 初心者 おすすめ」→ "programming beginner tutorial"

検索クエリのみを返してください。説明は不要です。`,
      },
      {
        role: "user",
        content: query,
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  let translatedQuery: string;

  if (typeof rawContent === "string") {
    translatedQuery = rawContent.trim();
  } else if (Array.isArray(rawContent)) {
    translatedQuery = rawContent
      .filter(item => item.type === "text")
      .map(item => (item as any).text)
      .join("")
      .trim();
  } else {
    translatedQuery = query;
  }

  return translatedQuery;
}

/**
 * HTML段落解析
 * HTMLページを段落単位で解析し、重要な段落を抽出
 */
async function analyzeHTMLPage(html: string): Promise<{
  paragraphs: string[];
  summary: string;
}> {
  // 簡易的なHTML解析（本来はcheerioなどを使用）
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const paragraphs = textContent
    .split(/[。.！!？?]/)
    .filter(p => p.trim().length > 20)
    .slice(0, 10);

  // LLMで要約生成
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "以下のテキストを簡潔に要約してください。",
      },
      {
        role: "user",
        content: paragraphs.join(" "),
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  let summary: string;

  if (typeof rawContent === "string") {
    summary = rawContent.trim();
  } else if (Array.isArray(rawContent)) {
    summary = rawContent
      .filter(item => item.type === "text")
      .map(item => (item as any).text)
      .join("")
      .trim();
  } else {
    summary = "要約を生成できませんでした。";
  }

  return { paragraphs, summary };
}

/**
 * ページ翻訳
 * HTMLページを指定言語に翻訳
 */
async function translatePage(text: string, targetLanguage: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `以下のテキストを${targetLanguage}に翻訳してください。`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  let translatedText: string;

  if (typeof rawContent === "string") {
    translatedText = rawContent.trim();
  } else if (Array.isArray(rawContent)) {
    translatedText = rawContent
      .filter(item => item.type === "text")
      .map(item => (item as any).text)
      .join("")
      .trim();
  } else {
    translatedText = "翻訳を生成できませんでした。";
  }

  return translatedText;
}

export const arkBrowserRouter = router({
  /**
   * 検索（意図翻訳検索）
   */
  search: protectedProcedure
    .input(z.object({
      query: z.string(),
      sources: z.array(z.enum(["google", "reddit", "bing"])).default(["google"]),
    }))
    .mutation(async ({ input, ctx }) => {
      // 意図翻訳検索
      const translatedQuery = await translateSearchIntent(input.query);

      // 検索結果（モックデータ - 実際のAPI統合は後で実装）
      const results = [
        {
          id: 1,
          source: "google" as const,
          title: `${translatedQuery} - Google 検索結果`,
          url: `https://www.google.com/search?q=${encodeURIComponent(translatedQuery)}`,
          snippet: `${translatedQuery}に関する検索結果です。`,
        },
      ];

      return {
        originalQuery: input.query,
        translatedQuery,
        results,
      };
    }),

  /**
   * ページ解析
   */
  analyzePage: protectedProcedure
    .input(z.object({
      url: z.string(),
      html: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // HTMLページ解析（実際のフェッチは後で実装）
      const html = input.html || "<html><body>サンプルページ</body></html>";
      const analysis = await analyzeHTMLPage(html);

      return {
        url: input.url,
        paragraphs: analysis.paragraphs,
        summary: analysis.summary,
      };
    }),

  /**
   * ページ翻訳
   */
  translatePage: protectedProcedure
    .input(z.object({
      url: z.string(),
      html: z.string().optional(),
      targetLanguage: z.string().default("日本語"),
    }))
    .mutation(async ({ input, ctx }) => {
      // HTMLページ翻訳（実際のフェッチは後で実装）
      const html = input.html || "<html><body>Sample page</body></html>";
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const translatedText = await translatePage(textContent, input.targetLanguage);

      return {
        url: input.url,
        originalText: textContent,
        translatedText,
        targetLanguage: input.targetLanguage,
      };
    }),

  /**
   * DeepParse段落抽出
   */
  deepParse: publicProcedure
    .input(z.object({
      content: z.string(),
      maxParagraphs: z.number().default(10),
    }))
    .mutation(async ({ input }) => {
      const result = await deepParseParagraphs(input.content, input.maxParagraphs);
      return result;
    }),

  /**
   * 意図翻訳（Intent Translation）
   */
  translateIntent: publicProcedure
    .input(z.object({
      query: z.string(),
      targetLanguage: z.string().default("ja"),
    }))
    .mutation(async ({ input }) => {
      const translatedQuery = await translateSearchIntent(input.query);
      
      return {
        originalQuery: input.query,
        translatedIntent: `「${input.query}」の検索意図: ${input.targetLanguage === "ja" ? "日本語で" : "英語で"}情報を探している`,
        suggestedQueries: [translatedQuery, input.query],
        targetLanguage: input.targetLanguage,
        confidence: 0.85,
      };
    }),

  /**
   * ブックマーク追加（モックデータ - 実際のDB統合は後で実装）
   */
  addBookmark: protectedProcedure
    .input(z.object({
      title: z.string(),
      url: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: データベースに保存
      return {
        success: true,
        bookmark: {
          id: Date.now(),
          userId: ctx.user.id,
          title: input.title,
          url: input.url,
          createdAt: new Date(),
        },
      };
    }),

  /**
   * ブックマーク一覧取得（モックデータ - 実際のDB統合は後で実装）
   */
  getBookmarks: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: データベースから取得
      return [];
    }),

  /**
   * ブックマーク削除（モックデータ - 実際のDB統合は後で実装）
   */
  deleteBookmark: protectedProcedure
    .input(z.object({
      bookmarkId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: データベースから削除
      return { success: true };
    }),

  /**
   * タブ管理（モックデータ - 実際のDB統合は後で実装）
   */
  getTabs: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: セッションストレージから取得
      return [];
    }),

  /**
   * タブ作成（モックデータ - 実際のDB統合は後で実装）
   */
  createTab: protectedProcedure
    .input(z.object({
      url: z.string(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: セッションストレージに保存
      return {
        success: true,
        tab: {
          id: Date.now(),
          url: input.url,
          title: input.title || "新しいタブ",
          isActive: true,
        },
      };
    }),

  /**
   * タブ削除（モックデータ - 実際のDB統合は後で実装）
   */
  deleteTab: protectedProcedure
    .input(z.object({
      tabId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TODO: セッションストレージから削除
      return { success: true };
    }),
});
