import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { embeds } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "node:crypto";

/**
 * Generate unique ID for embed URL
 */
function generateUniqueId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Generate iframe code for different embed types
 */
function generateIframeCode(
  uniqueId: string,
  type: "standard" | "floating" | "mobile",
  theme?: "dark" | "light"
): string {
  const baseUrl = process.env.VITE_PUBLIC_URL || "https://tenmon-ai.com";
  const embedUrl = `${baseUrl}/embed/ark-chat-${uniqueId}`;

  switch (type) {
    case "standard":
      return `<iframe
  src="${embedUrl}"
  style="width:100%;height:700px;border:0;border-radius:12px;"
></iframe>`;

    case "floating":
      return `<script src="${baseUrl}/embed/ark-floating.js"
        data-chat-url="${embedUrl}">
</script>`;

    case "mobile":
      return `<iframe
  src="${embedUrl}"
  style="width:100%;height:85vh;border:0;"
></iframe>`;

    default:
      return "";
  }
}

export const embedRouter = router({
  /**
   * Create new embed
   */
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["chat", "qa"]).default("chat"),
        theme: z.enum(["dark", "light"]).default("dark"),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const uniqueId = generateUniqueId();
      const baseUrl = process.env.VITE_PUBLIC_URL || "https://tenmon-ai.com";

      await db.insert(embeds).values({
        userId: ctx.user.id,
        uniqueId,
        type: input.type,
        theme: input.theme,
        config: input.config ? JSON.stringify(input.config) : null,
        isActive: 1,
      });

      const embedUrl = `${baseUrl}/embed/ark-chat-${uniqueId}`;

      return {
        embedUrl,
        uniqueId,
        iframeCode: {
          standard: generateIframeCode(uniqueId, "standard", input.theme),
          floating: generateIframeCode(uniqueId, "floating", input.theme),
          mobile: generateIframeCode(uniqueId, "mobile", input.theme),
        },
      };
    }),

  /**
   * List user's embeds
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const userEmbeds = await db
      .select()
      .from(embeds)
      .where(and(eq(embeds.userId, ctx.user.id), eq(embeds.isActive, 1)))
      .orderBy(embeds.createdAt);

    return userEmbeds.map((embed) => ({
      ...embed,
      config: embed.config ? JSON.parse(embed.config) : null,
    }));
  }),

  /**
   * Get embed by uniqueId (public access)
   */
  getByUniqueId: protectedProcedure
    .input(z.object({ uniqueId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }

      const result = await db
        .select()
        .from(embeds)
        .where(and(eq(embeds.uniqueId, input.uniqueId), eq(embeds.isActive, 1)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const embed = result[0];
      return {
        ...embed,
        config: embed.config ? JSON.parse(embed.config) : null,
      };
    }),

  /**
   * Delete embed
   */
  delete: protectedProcedure
    .input(z.object({ uniqueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(embeds)
        .set({ isActive: 0 })
        .where(and(eq(embeds.uniqueId, input.uniqueId), eq(embeds.userId, ctx.user.id)));

      return { success: true };
    }),

  /**
   * Update embed theme
   */
  updateTheme: protectedProcedure
    .input(
      z.object({
        uniqueId: z.string(),
        theme: z.enum(["dark", "light"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db
        .update(embeds)
        .set({ theme: input.theme })
        .where(and(eq(embeds.uniqueId, input.uniqueId), eq(embeds.userId, ctx.user.id)));

      return { success: true };
    }),

  /**
   * Generate iframe codes for existing embed
   */
  generateCodes: protectedProcedure
    .input(z.object({ uniqueId: z.string() }))
    .query(async ({ input }) => {
      return {
        standard: generateIframeCode(input.uniqueId, "standard"),
        floating: generateIframeCode(input.uniqueId, "floating"),
        mobile: generateIframeCode(input.uniqueId, "mobile"),
      };
    }),
});
