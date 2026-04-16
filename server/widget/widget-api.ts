/**
 * 🔱 ArkWidget Backend API
 * Widget backend bridge（LP → TENMON-ARK本体）
 * 
 * 機能:
 * - Widget用チャットAPI
 * - siteMode=true で外部知識をシャットアウト
 * - サイト専用Semantic Indexのみ参照
 */

import express, { Request, Response } from "express";
import { z } from "zod";
import { errorHandler } from "../_core/errorHandler";
import { computeReishoSignature } from "../reisho/reishoKernel";

const router = express.Router();

/**
 * Widget Chat リクエストスキーマ
 */
const widgetChatSchema = z.object({
  message: z.string().min(1),
  siteId: z.string().min(1),
  siteMode: z.boolean().default(true), // デフォルトで外部知識シャットアウト
});

/**
 * POST /api/widget/chat
 * Widget用チャットAPI
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const input = widgetChatSchema.parse(req.body);
    const { message, siteId, siteMode } = input;

    // siteMode=true の場合、Concierge Personaを使用
    if (siteMode) {
      const { semanticSearch } = await import("../concierge/semantic/index");
      const { buildConciergePrompt } = await import("../chat/conciergePersona");

      // サイト専用Semantic Indexから検索
      const searchResults = await semanticSearch(message, 5, { siteId });
      
      // サイト固有のReishōシグネチャを生成（サイトマップからシード）
      const siteContent = searchResults.map(r => r.document.text).join(" ");
      const siteReishoSignature = computeReishoSignature(siteContent);

      // Concierge Personaでプロンプトを構築（Reishō統合）
      const prompt = buildConciergePrompt(message, searchResults, siteReishoSignature);

      // LLMを呼び出し
      const { callLLM } = await import("../_core/llm");
      const response = await callLLM({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text = response.choices[0]?.message?.content || "回答を生成できませんでした";
      
      // 出力にもReishōシグネチャを添付（サイト固有）
      const outputReishoSignature = computeReishoSignature(text);

      return res.json({
        success: true,
        role: "assistant",
        text,
        persona: {
          id: "concierge",
          name: "Concierge",
          tone: "polite",
        },
        memory: {
          retrieved: searchResults.length,
          stored: false, // siteModeではMemoryに保存しない（完全隔離）
        },
        reishoInput: siteReishoSignature,
        reishoOutput: outputReishoSignature,
        siteId, // ドメイン分離の確認用
      });
    }

    // siteMode=false の場合は通常のAtlas Chatを使用
    // TODO: 通常のAtlas Chat APIを呼び出す
    return res.json({
      success: true,
      role: "assistant",
      text: "通常モードは未実装です",
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
});

/**
 * GET /api/widget/status
 * Widget状態確認API
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId as string;

    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: "siteId is required",
      });
    }

    // サイト専用Semantic Indexの状態を確認
    const { getIndexStats } = await import("../concierge/semantic/index");
    const stats = await getIndexStats({ siteId });

    return res.json({
      success: true,
      siteId,
      indexStats: stats,
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
});

/**
 * GET /api/widget/tenant/:tenantId/widgets
 * テナントのWidget一覧を取得
 */
router.get("/tenant/:tenantId/widgets", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { tenantManager } = await import("../tenants/tenantModel");

    const widgets = tenantManager.getTenantWidgets(tenantId);

    return res.json({
      success: true,
      tenantId,
      widgets,
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
});

export default router;

