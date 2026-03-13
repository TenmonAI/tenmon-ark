import { Router } from "express";
import { frontConversationRenderer } from "../orchestrator/frontConversationRenderer.js";
import { sacredClassifier } from "../orchestrator/sacredClassifier.js";
import { sacredContextBuilder } from "../orchestrator/sacredContextBuilder.js";
import { upsertThreadCenter } from "../core/threadCenterMemory.js";

const router = Router();

router.post("/chat_front", async (req, res) => {
  try {
    const body = (req.body || {}) as any;
    const message = String(body.message || "").trim();
    const threadId = String(body.threadId || "").trim() || "front_default";
    const timestamp = new Date().toISOString();

    const sacredDecision = sacredClassifier({ message, threadId });
    const sacredContext = sacredContextBuilder({
      message,
      threadId,
      decision: sacredDecision,
    });

    const rendered = await frontConversationRenderer({
      message,
      threadId,
      sacredContext,
    });

    const ku: any = {
      routeReason: String(sacredContext.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
      centerMeaning: String(sacredContext.centerKey || "front_conversation"),
      centerLabel: String(sacredContext.centerLabel || "前面会話"),
      centerKey: String(sacredContext.centerKey || "front_conversation"),
      scriptureKey: sacredContext.scriptureKey || null,
      responseProfile: "standard",
      providerPlan: rendered.provider,
      surfaceStyle: "plain_clean",
      closingType: "one_question",
      threadCenter: sacredContext.threadCenter || null,
      thoughtCoreSummary: {
        centerKey: String(sacredContext.centerKey || "front_conversation"),
        centerMeaning: String(sacredContext.centerKey || "front_conversation"),
        routeReason: String(sacredContext.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
        modeHint: sacredContext.isSacred ? "sacred_front" : "front",
        continuityHint: threadId,
      },
      responsePlan: {
        routeReason: String(sacredContext.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
        centerKey: String(sacredContext.centerKey || "front_conversation"),
        centerLabel: String(sacredContext.centerLabel || "前面会話"),
        scriptureKey: sacredContext.scriptureKey || null,
        mode: sacredContext.isSacred ? "sacred_front" : "front",
        responseKind: "statement_plus_question",
        semanticBody: String(rendered.response || ""),
      },
      sacredDecision,
      sacredContext,
    };

    try {
      const tc = sacredContext.threadCenter || null;
      if (tc && String(tc.centerKey || "").trim()) {
        upsertThreadCenter({
          threadId,
          centerType: String(tc.centerType || "concept"),
          centerKey: String(tc.centerKey || ""),
          sourceRouteReason: String(tc.sourceRouteReason || ku.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
          sourceScriptureKey: sacredContext.scriptureKey || null,
          sourceTopicClass: sacredContext.isSacred ? "sacred_front" : "front",
        } as any);
      }
    } catch (e) {
      try { console.error("[FINALIZE_FRONT_CHAT_V1][THREAD_CENTER]", e); } catch {}
    }

    try {
      console.log("[FRONT_CHAT_AUDIT]", {
        routeReason: ku.routeReason,
        centerKey: ku.centerKey,
        centerLabel: ku.centerLabel,
        scriptureKey: ku.scriptureKey,
        responseHead: String(rendered.response || "").slice(0, 240),
        threadCenter: ku.threadCenter,
      });
    } catch {}

    return res.json({
      response: rendered.response,
      evidence: sacredContext.evidence || null,
      candidates: [],
      timestamp,
      threadId,
      decisionFrame: {
        mode: "NATURAL",
        intent: "chat",
        llm: null,
        ku,
      },
    });
  } catch (e: any) {
    try { console.error("[FRONT_CHAT_GPT_ROUTE_V1]", e); } catch {}
    return res.status(500).json({
      ok: false,
      error: "front_chat_failed",
      detail: String(e?.message || e || "unknown_error"),
    });
  }
});

export default router;
