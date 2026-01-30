import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import { composeResponse } from "../kanagi/engine/responseComposer.js";
import { getSessionId } from "../memory/sessionId.js";
import { naturalRouter } from "../persona/naturalRouter.js";
import { emptyCorePlan } from "../kanagi/core/corePlan.js";
import { applyTruthCore } from "../kanagi/core/truthCore.js";
import { applyVerifier } from "../kanagi/core/verifier.js";
import { kokuzoRecall, kokuzoRemember } from "../kokuzo/recall.js";
import { getPageText } from "../kokuzo/pages.js";
import { searchPagesForHybrid } from "../kokuzo/search.js";

const router: IRouter = Router();

/**
 * PHASE 1: 天津金木思考回路をチャットAPIに接続
 * 
 * 固定応答を廃止し、天津金木思考回路を通して観測を返す
 */
router.post("/chat", async (req: Request, res: Response<ChatResponseBody>) => {
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;
  const body = (req.body ?? {}) as any;
  const message = String(messageRaw ?? "").trim();
  const threadId = String(body.threadId ?? "default").trim();
  const timestamp = new Date().toISOString();

  if (!message) return res.status(400).json({ response: "message required", error: "message required", timestamp, decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} } });

  // Phase19 NATURAL lock: hello/date/help（および日本語挨拶）だけは必ずNATURALで返す
  const t = message.trim().toLowerCase();
  if (t === "hello" || t === "date" || t === "help" || message.includes("おはよう")) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    return res.json({
      response: nat.responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }

  // UX guard: 日本語の通常会話は一旦NATURAL(other)で受ける（#詳細や資料指定時だけHYBRIDへ）
  const isJapanese = /[ぁ-んァ-ン一-龯]/.test(message);
  const wantsDetail = /#詳細/.test(message);
  const hasDocPage = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\b/i.test(message);

  if (isJapanese && !wantsDetail && !hasDocPage) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    return res.json({
      response: nat.responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }

  // GROUNDED分岐: doc + pdfPage 指定時は必ず GROUNDED を返す
  const mPage = message.match(/pdfPage\s*=\s*(\d+)/i);
  const mDoc = message.match(/([^\s]+\.pdf)/i);
  if (mPage && mDoc) {
    const pdfPage = parseInt(mPage[1], 10);
    const doc = mDoc[1];
    
    // Phase24: Kokuzo pages ingestion - ページ本文を取得
    const pageText = getPageText(doc, pdfPage);
    const evidenceId = `KZPAGE:${doc}:P${pdfPage}`;
    
    let responseText = `（資料準拠）${doc} P${pdfPage} を指定として受け取りました。`;
    if (pageText) {
      const excerpt = pageText.slice(0, 400).trim();
      responseText += `\n\n【引用（先頭400文字）】\n${excerpt}${pageText.length > 400 ? "..." : ""}`;
    } else {
      responseText += "\n\n※注意: このページは未投入です（ingest_pdf_pages.sh で投入してください）。";
    }
    
    const result: any = {
      response: responseText,
      evidence: { doc, pdfPage },
      provisional: false,
      detailPlan: (() => {
        const p = emptyCorePlan(`GROUNDED ${doc} P${pdfPage}`);
        p.chainOrder = ["GROUNDED_SPECIFIED", "TRUTH_CORE", "VERIFIER"];
        p.warnings = p.warnings ?? [];
        if (pageText) {
          p.evidenceIds = [evidenceId];
        } else {
          p.warnings.push("KOKUZO_PAGE_MISSING");
        }
        applyTruthCore(p, { responseText: `GROUNDED ${doc} P${pdfPage}`, trace: undefined });
        applyVerifier(p);
        // Phase23: Kokuzo recall（構文記憶）
        const prev = kokuzoRecall(threadId);
        if (prev) {
          if (!p.chainOrder.includes("KOKUZO_RECALL")) p.chainOrder.push("KOKUZO_RECALL");
          p.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
        }
        kokuzoRemember(threadId, p);
        return p;
      })(),
      timestamp,
      threadId,
      decisionFrame: { mode: "GROUNDED", intent: "chat", llm: null, ku: {} },
    };
    if (wantsDetail) {
      result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: ${pageText ? "本文取得済み" : "未投入（ingest_pdf_pages.sh で投入してください）"}`;
    }
    return res.json(result);
  }

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");
  
  if (!sanitized.isValid) {
    return res.status(400).json({
      response: sanitized.error || "message is required",
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }

  try {
    // セッションID取得
    const sessionId = getSessionId(req) || `chat_${Date.now()}`;

    // PersonaState 取得
    const personaState = getCurrentPersonaState();

    // 天津金木思考回路を実行
    const trace = await runKanagiReasoner(sanitized.text, sessionId);

    // 観測円から応答文を生成
    const response = composeResponse(trace, personaState);

    // 工程3: CorePlan（器）を必ず経由（最小の決定論コンテナ）
    const detailPlan = emptyCorePlan(
      typeof response === "string" ? response.slice(0, 80) : ""
    );
    detailPlan.chainOrder = ["KANAGI_TRACE", "COMPOSE_RESPONSE"];
    if (trace && Array.isArray((trace as any).violations) && (trace as any).violations.length) {
      detailPlan.warnings = (trace as any).violations.map((v: any) => String(v));
    }

    // 工程4: Truth-Core（判定器）を通す（決定論・LLM禁止）
    applyTruthCore(detailPlan, { responseText: String(response ?? ""), trace });
    applyVerifier(detailPlan);

    // Phase23: Kokuzo recall（構文記憶）
    const prev = kokuzoRecall(threadId);
    if (prev) {
      if (!detailPlan.chainOrder.includes("KOKUZO_RECALL")) detailPlan.chainOrder.push("KOKUZO_RECALL");
      detailPlan.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
    }
    kokuzoRemember(threadId, detailPlan);

    // Phase25: candidates（deterministic; if LIKE misses, fallback range is returned）
    const candidates = searchPagesForHybrid("言霊秘書.pdf", sanitized.text, 10);

    // レスポンス形式（厳守）
    return res.json({
      response,
      trace,
      provisional: true,
      detailPlan,
      candidates,
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
    });
  } catch (error) {
    console.error("[CHAT-KANAGI] Error:", error);
    // エラー時も観測を返す（停止しない）
    const detailPlan = emptyCorePlan("ERROR_FALLBACK");
    detailPlan.chainOrder = ["ERROR_FALLBACK"];
    return res.json({
      response: "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
      provisional: true,
      detailPlan,
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
    });
  }
});

export default router;
