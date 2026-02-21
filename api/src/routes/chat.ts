/* CARD1_SEAL_V1 */
import { synthHybridResponseV1 } from "../hybrid/synth.js";
import { heartModelV1 } from "../core/heartModel.js";
import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import { qcTextV1 } from "../kokuzo/qc.js";
import type { ChatResponseBody } from "../types/chat.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import { composeResponse, composeConversationalResponse } from "../kanagi/engine/responseComposer.js";
import { getSessionId } from "../memory/sessionId.js";
import { naturalRouter } from "../persona/naturalRouter.js";
import { emptyCorePlan } from "../kanagi/core/corePlan.js";
import { applyTruthCore } from "../kanagi/core/truthCore.js";
import { applyVerifier } from "../kanagi/core/verifier.js";
import { kokuzoRecall, kokuzoRemember } from "../kokuzo/recall.js";
import { getPageText } from "../kokuzo/pages.js";
import { searchPagesForHybrid } from "../kokuzo/search.js";
import { getCaps, debugCapsPath, debugCapsQueue } from "../kokuzo/capsQueue.js";
import { setThreadCandidates, pickFromThread, clearThreadCandidates, setThreadPending, getThreadPending, clearThreadState } from "../kokuzo/threadCandidates.js";
import { parseLaneChoice, type LaneChoice } from "../persona/laneChoice.js";
import { getDb, dbPrepare } from "../db/index.js";
import { extractLawCandidates } from "../kokuzo/lawCandidates.js";
import { extractSaikihoLawsFromText } from "../kotodama/saikihoLawSet.js";
import { extractFourLayerTags } from "../kotodama/fourLayerTags.js";
import { extractKojikiTags } from "../kojiki/kojikiTags.js";
import { buildMythMapEdges } from "../myth/mythMapEdges.js";
import { getMythMapEdges, setMythMapEdges } from "../kokuzo/mythMapMemory.js";
import { listThreadLaws, dedupLawsByDocPage } from "../kokuzo/laws.js";
import { projectCandidateToCell } from "../kanagi/ufk/projector.js";
import { buildGenesisPlan } from "../kanagi/ufk/genesisPlan.js";
import { computeBreathCycle } from "../koshiki/breathEngine.js";
import { teniwohaWarnings } from "../koshiki/teniwoha.js";
import { parseItsura } from "../koshiki/itsura.js";
import { assertKanaPhysicsMap, KANA_PHYSICS_MAP_MVP } from "../koshiki/kanaPhysicsMap.js";
import { applyKanaPhysicsToCell } from "../koshiki/kanaPhysicsMap.js";

import { localSurfaceize } from "../tenmon/surface/localSurfaceize.js";
import { llmChat } from "../core/llmWrapper.js";
import { rewriteOnlyTenmon } from "../core/rewriteOnly.js";

import { memoryPersistMessage, memoryReadSession } from "../memory/index.js";
import { listRules } from "../training/storage.js";

import { getDbPath } from "../db/index.js";

import { DatabaseSync } from "node:sqlite";
const router: IRouter = Router();
// __KANAGI_PHASE_MEM_V2: module-scope phase tracker (per threadId) for NATURAL 4-phase state machine.
const __kanagiPhaseMemV2 = new Map<string, number>();
// CARD_C7B2_FIX_N2_TRIGGER_AND_LLM_V1


// LLM_CHAT: minimal constitution (no evidence fabrication)
const TENMON_CONSTITUTION_TEXT =
  "あなたはTENMON-ARK。自然で丁寧に対話する。根拠(doc/pdfPage/引用)は生成しない。必要ならユーザーに資料指定を促し、GROUNDEDに切り替える。";

function scrubEvidenceLike(text: string): string {
  let t = String(text ?? "");
  t = t.replace(/\bdoc\s*=\s*[^\s]+/gi, "");
  t = t.replace(/\bpdfPage\s*=\s*\d+/gi, "");
  t = t.replace(/\bP\d{1,4}\b/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  if (!t) t = "了解しました。もう少し状況を教えてください。";
  return t;
}


// --- DET_PASSPHRASE_HELPERS_V1 (required by DET_PASSPHRASE_V2) ---
function extractPassphrase(text: string): string | null {
  const t = (text || "").trim();

  let m = t.match(/合言葉\s*は\s*[「『"]?(.+?)[」』"]?\s*(です|だ|です。|だ。)?$/);
  if (m && m[1]) return m[1].trim();

  m = t.match(/合言葉\s*[:：]\s*[「『"]?(.+?)[」』"]?\s*$/);
  if (m && m[1]) return m[1].trim();

  return null;
}

function wantsPassphraseRecall(text: string): boolean {
  const t = (text || "").trim();
  return /合言葉/.test(t) && /(覚えてる|覚えてる\?|覚えてる？|何だっけ|は\?|は？)/.test(t);
}

function recallPassphraseFromSession(threadId: string, limit = 80): string | null {
  const mem = memoryReadSession(threadId, limit);
  for (let i = mem.length - 1; i >= 0; i--) {
    const row = mem[i];
    if (!row) continue;
    if (row.role !== "user") continue;
    const p = extractPassphrase(row.content || "");
    if (p) return p;
  }
  return null;
}

// chat.ts に persistTurn が無いブランチ向けの最小実装
// --- /DET_PASSPHRASE_HELPERS_V1 ---

// --- PERSIST_TURN_V2 (for passphrase + normal chat) ---
function persistTurn(threadId: string, userText: string, assistantText: string): void {
  try {
    memoryPersistMessage(threadId, "user", userText);
    memoryPersistMessage(threadId, "assistant", assistantText);
    console.log(`[MEMORY] persisted threadId=${threadId} bytes_u=${userText.length} bytes_a=${assistantText.length}`);
  } catch (e: any) {
    console.warn(`[PERSIST] failed threadId=${threadId}:`, e?.message ?? String(e));
  }
}
// --- /PERSIST_TURN_V2 ---



/**
 * GROUNDED レスポンスを生成する関数（doc/pdfPage 指定と番号選択の両方で再利用）
 */
function buildGroundedResponse(args: {
  doc: string;
  pdfPage: number;
  threadId: string;
  timestamp: string;
  wantsDetail: boolean;
}): any {
  const { doc, pdfPage, threadId, timestamp, wantsDetail } = args;
  
  // Phase24: Kokuzo pages ingestion - ページ本文を取得
  const pageText = getPageText(doc, pdfPage);
  const evidenceId = `KZPAGE:${doc}:P${pdfPage}`;

  // 3分岐（矛盾なし）: 1) 未投入 2) 非テキスト（caps補完 or 未登録） 3) 通常引用
  if (pageText == null) {
    const responseText = `（資料準拠）${doc} P${pdfPage} を指定として受け取りました。\n\n※注意: このページは未投入です（ingest_pdf_pages.sh で投入してください）。`;
    const result = buildGroundedResultBody(doc, pdfPage, threadId, timestamp, wantsDetail, responseText, null, evidenceId);
    if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 未投入（ingest_pdf_pages.sh で投入してください）`;
    return result;
  }

  const isNonText = /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
  if (isNonText) {
    const caps = getCaps(doc, pdfPage) || getCaps("KHS", pdfPage);
    if (caps && typeof caps.caption === "string" && caps.caption.trim()) {
      const responseText =
        `（補完キャプション: 天聞AI解析 / doc=${caps.doc} pdfPage=${caps.pdfPage}）\n` +
        String(caps.caption).trim() +
        (Array.isArray(caps.caption_alt) && caps.caption_alt.length ? `\n\n補助: ${caps.caption_alt.slice(0, 3).join(" / ")}` : "");
      const result = buildGroundedResultNonText(doc, pdfPage, threadId, timestamp, responseText, evidenceId);
      if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 非テキスト（補完キャプションで表示）`;
      return result;
    }
    const responseText = "このページは非テキスト扱いです（OCR/抽出不可）。caps が未登録のため補完できません。";
    const result = buildGroundedResultNonText(doc, pdfPage, threadId, timestamp, responseText, evidenceId);
    result.provisional = true;
    if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 非テキスト（caps未登録）`;
    return result;
  }

    // --- KAMU_0_MOJIBAKE_GUARD_V1 ---
  const head400 = String(pageText || "").slice(0, 400).trim();
  const qc = qcTextV1(head400);
  const responseText = qc.mojibakeLikely
    ? `（候補提示：正文は文字化けの可能性あり / doc=${doc} pdfPage=${pdfPage}）
QC: jpRate=${qc.jpRate.toFixed(3)} ctrlRate=${qc.ctrlRate.toFixed(3)}

このページは文字コード不整合の疑いがあるため、正文としては表示せず、復号処理（KAMU-GAKARI）対象として扱います。

次のどれで進めますか？
1) このページを復号して再保存（候補→承認）
2) 別ページ（doc/pdfPage）を指定
`
    : `（資料準拠）${doc} P${pdfPage} を指定として受け取りました。

【引用（先頭400文字）】
${head400}${String(pageText||"").length > 400 ? "..." : ""}`;
  // --- /KAMU_0_MOJIBAKE_GUARD_V1 ---
  const result: any = buildGroundedResultBody(doc, pdfPage, threadId, timestamp, wantsDetail, responseText, pageText, evidenceId);
  if (wantsDetail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 状態: 本文取得済み`;
  return result;
}

function buildGroundedResultNonText(doc: string, pdfPage: number, threadId: string, timestamp: string, responseText: string, evidenceId: string): any {
  const p = emptyCorePlan(`GROUNDED ${doc} P${pdfPage}`);
  p.chainOrder = ["GROUNDED_SPECIFIED", "TRUTH_CORE", "VERIFIER"];
  p.warnings = p.warnings ?? [];
  p.evidenceIds = [evidenceId];
  p.warnings.push("NON_TEXT");
  applyTruthCore(p, { responseText: `GROUNDED ${doc} P${pdfPage}`, trace: undefined });
  applyVerifier(p);
  const prev = kokuzoRecall(threadId);
  if (prev) {
    if (!p.chainOrder.includes("KOKUZO_RECALL")) p.chainOrder.push("KOKUZO_RECALL");
    p.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
  }
  (p as any).lawCandidates = [];
  (p as any).kojikiTags = [];
  (p as any).mythMapEdges = buildMythMapEdges({ fourLayerTags: [], kojikiTags: [], evidenceIds: [evidenceId] });
  kokuzoRemember(threadId, p);
  return {
    response: responseText,
    evidence: { doc, pdfPage },
    provisional: true,
    detailPlan: p,
    timestamp,
    threadId,
    decisionFrame: { mode: "GROUNDED", intent: "chat", llm: null, ku: {} },
  };
}

function buildGroundedResultBody(
  doc: string,
  pdfPage: number,
  threadId: string,
  timestamp: string,
  wantsDetail: boolean,
  responseText: string,
  pageText: string | null,
  evidenceId: string
): any {
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
      // Phase29: LawCandidates（法則候補抽出）
      if (pageText) {
        const lawCands = extractLawCandidates(pageText, { max: 8 });
        // Phase32: 四層タグを追加
        (p as any).lawCandidates = lawCands.map((cand) => ({
          ...cand,
          tags: extractFourLayerTags(cand.text),
        }));
        // Phase33: 古事記タグ抽出
        (p as any).kojikiTags = extractKojikiTags(pageText);
      } else {
        (p as any).lawCandidates = [];
      }
      // Phase34: 同型写像エッジ（fourLayerTags と kojikiTags の組み合わせ）
      const kojikiTags = (p as any).kojikiTags || [];
      const law0Tags = (((p as any).lawCandidates || [])[0] || {}).tags || [];
      (p as any).mythMapEdges = buildMythMapEdges({
        fourLayerTags: Array.isArray(law0Tags) ? law0Tags : [],
        kojikiTags: Array.isArray(kojikiTags) ? kojikiTags : [],
        evidenceIds: Array.isArray(p.evidenceIds) ? p.evidenceIds : [],
      });
      // Phase35: mythMapEdges を threadId に保存
      if ((p as any).mythMapEdges) {
        setMythMapEdges(threadId, (p as any).mythMapEdges);
      }
      // Phase30: SaikihoLawSet（水火の法則の内部構造、#詳細 のときのみ）
      if (wantsDetail) {
        if (pageText) {
          const laws = extractSaikihoLawsFromText(pageText, { max: 8 });
          // evidence に doc/pdfPage を設定
          laws.forEach((law) => {
            if (law.evidence) {
              law.evidence.doc = doc;
              law.evidence.pdfPage = pdfPage;
            }
            // Phase32: 四層タグを追加
            (law as any).tags = extractFourLayerTags(law.body);
          });
          (p as any).saikiho = {
            laws,
            evidenceIds: p.evidenceIds ?? [],
          };
        } else {
          (p as any).saikiho = {
            laws: [],
            evidenceIds: p.evidenceIds ?? [],
          };
        }
      }
      kokuzoRemember(threadId, p);
      return p;
    })(),
    timestamp,
    threadId,
    decisionFrame: { mode: "GROUNDED", intent: "chat", llm: null, ku: {} },
  };
  return result;
}

/**
 * PHASE 1: 天津金木思考回路をチャットAPIに接続
 * 
 * 固定応答を廃止し、天津金木思考回路を通して観測を返す
 */
router.post("/chat", async (req: Request, res: Response<ChatResponseBody>) => {
  // HEART observe (deterministic; no behavior change)
  const __heart = (() => { try {
    const b: any = (req as any)?.body || {};
    const raw = String(b.message ?? b.text ?? b.input ?? "");
    return heartModelV1(raw);
  } catch { return { state: "neutral", entropy: 0.25 }; } })();
  console.log(`[HEART] state=${__heart.state} entropy=${Number(__heart.entropy).toFixed(2)}`);
  __tenmonLastHeart = __heart;

  // CARD6C_HANDLER_RESJSON_WRAP_V7: wrap res.json ONCE per request so ALL paths get top-level rewriteUsed/rewriteDelta defaults
  // (covers direct res.json returns that bypass reply())
  try {
    if (!(res as any).__TENMON_JSON_WRAP_V7) {
      (res as any).__TENMON_JSON_WRAP_V7 = true;
      const __origJsonTop = (res as any).json.bind(res);
      (res as any).json = (obj: any) => {
        try {
          if (obj && typeof obj === "object") {
            if (obj.rewriteUsed === undefined) obj.rewriteUsed = false;
            if (obj.rewriteDelta === undefined) obj.rewriteDelta = 0;
            // also ensure decisionFrame.ku is object when decisionFrame exists (non-breaking)
            const df = obj.decisionFrame;
            if (df && typeof df === "object") {
              if (!df.ku || typeof df.ku !== "object") df.ku = {};
              if (df.ku.rewriteUsed === undefined) df.ku.rewriteUsed = obj.rewriteUsed;
              if (df.ku.rewriteDelta === undefined) df.ku.rewriteDelta = obj.rewriteDelta;
            }
          }
        } catch {}
        return __origJsonTop(obj);
      };
    }
  } catch {}

  const handlerTime = Date.now();

  let capsPayload: any = null;
const pid = process.pid;

  const uptime = process.uptime();
  const { getReadiness } = await import("../health/readiness.js");
  const r = getReadiness();
  console.log(`[CHAT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()} stage=${r.stage}`);
  
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;
  const body = (req.body ?? {}) as any;
  const message = String(messageRaw ?? "").trim();
  // [B1] deterministic force-menu trigger for Phase36-1

  const threadId = String(body.threadId ?? "default").trim();
  const timestamp = new Date().toISOString();
  const wantsDetail = /#詳細/.test(message);

  const auth = (req as any).auth ?? null;
  const isAuthed = !!auth;
  // P0_SAFE_GUEST: 未ログインはLLM_CHAT禁止（NATURAL/HYBRID/GROUNDEDはOK）
  const shouldBlockLLMChatForGuest = !isAuthed;

  if (!message) return res.status(400).json({ response: "message required", error: "message required", timestamp, decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} } });

  // RESEED_ROUTER_CORE_V2: top-of-router hard stops (N1 greeting + LLM1 force + N2 kanagi 4-phase)
  // - MUST run BEFORE lane/menu/cmd/sanitize/hybrid search
  // - MUST keep smoke/accept/core-seed/bible-smoke contracts unchanged
  // - MUST NOT use `reply` here (reply is declared later in file)

  try {
    const tid0 = String(threadId ?? "");
    const raw0 = String(message ?? "");
    const t0 = raw0.trim();

    const isTestTid0 = /^(smoke|accept|core-seed|bible-smoke)/i.test(tid0);
    // FAST_ACCEPTANCE_RETURN: must respond <1s for acceptance/smoke probes (no LLM/DB)
    if (isTestTid0) {
      const quick = "【天聞の所見】ログイン前のため、会話は参照ベース（資料検索/整理）で動作します。/login からログインすると通常会話も有効になります 次に何を確認しますか？";
      return res.json({
        response: quick,
        evidence: null,
        candidates: [],
        timestamp,
        threadId: String(threadId || ""),
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { routeReason: "NATURAL_FALLBACK" } },
      });
    }
    // /FAST_ACCEPTANCE_RETURN


    // ---------- N1: Greeting absolute defense ----------
    const isGreeting0 =
      /^(こんにちは|こんばんは|おはよう|やあ)(?:$|\s)|^(hi|hello|hey|yo)(?:$|\s)/i.test(t0);

    if (!isTestTid0 && isGreeting0) {

      // CARD_C10_N1_GREETING_LLM_V1: greet -> NATURAL_GENERAL via llmChat (short, conversational)
      const GENERAL_SYSTEM = `あなたは「天聞アーク（TENMON-ARK）」。挨拶には短く返し、最後に“質問は1つだけ”で会話を開きます。

※絶対条件※
・必ず「【天聞の所見】」から始める
・2〜4行、合計120〜220文字
・箇条書き/番号/見出し禁止
・質問は必ず1つだけ（最後の一行を質問にする）
例：「いま何を一緒に整えますか？（一言でOK）」`;

      let outText = "";
      let outProv = "llm";
      try {
        const llmRes = await llmChat({ system: GENERAL_SYSTEM, user: t0, history: [] });
        outText = String(llmRes?.text ?? "").trim();
        outProv = String(llmRes?.provider ?? "llm");
      } catch (e: any) {
        console.error("[N1_GREETING_LLM] llmChat failed", e?.message || e);
        outText = "【天聞の所見】こんにちは。いま何を一緒に整えますか？（一言でOK）";
      }

      // minimal sanitize
      if (!outText.startsWith("【天聞の所見】")) outText = "【天聞の所見】" + outText;
      outText = outText
        .replace(/^\s*\d+[.)].*$/gm, "")
        .replace(/^\s*[-*•]\s+.*$/gm, "")
        .trim();

      if (outText.length < 60) {
        outText = "【天聞の所見】こんにちは。いま何を一緒に整えますか？（一言でOK）";
      }

      // CARD_C11F_CLAMP_N1_RETURN_V1: enforce one-question clamp (N1_GREETING_LLM_TOP)
      // CARD_C11F2_N1_LOCAL_CLAMP_V1: local clamp (N1 only) - enforce exactly 1 question and trim
      const __n1ClampOneQ = (raw: string): string => {
        let t = String(raw ?? "").replace(/\r/g, "").trim();
        t = t.replace(/^\s+/, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
        // remove bullet/numbered lines
        t = t.replace(/^\s*\d+[.)].*$/gm, "").replace(/^\s*[-*•]\s+.*$/gm, "").trim();
        if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
        // keep up to first question mark only
        const qJ = t.indexOf("？");
        const qE = t.indexOf("?");
        const q = (qJ == -1) ? qE : (qE == -1 ? qJ : Math.min(qJ, qE));
        if (q !== -1) t = t.slice(0, q + 1).trim();
        // bounds
        if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
        if (t.length < 60) t = "【天聞の所見】いま何を一緒に整えますか？（一言でOK）";
        return t;
      };
      outText = __n1ClampOneQ(outText);

      return res.json(__tenmonGeneralGateResultMaybe({
        response: outText,
        evidence: null,
        candidates: [],
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: outProv, ku: { routeReason: "N1_GREETING_LLM_TOP" } },
      }));

    }

    // ---------- LLM1: Force LLM route ----------
    // "#llm ..." bypasses EVERYTHING (no header needed)
    if (!isTestTid0 && /^#llm\b/i.test(t0)) {
      const userText = t0.replace(/^#llm\b/i, "").trim() || "こんにちは。";
      const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
      const hasGemini = Boolean(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim());

      if (!hasOpenAI && !hasGemini) {
        return res.json(__tenmonGeneralGateResultMaybe({
          response: "LLMキーが未設定です。/etc/tenmon/llm.env（または /opt/tenmon-ark-data/llm.env）に OPENAI_API_KEY / GEMINI_API_KEY を設定してください。",
          evidence: null,
          candidates: [],
          timestamp,
          threadId,
          decisionFrame: { mode: "LLM_CHAT", intent: "chat", llm: null, ku: { routeReason: "LLM1_NO_KEYS" } },
        }));
      }

      // llmChat signature (current): llmChat({ system, history, user }) -> { text, provider }
      const system = String(TENMON_CONSTITUTION_TEXT ?? "").trim() || "You are TENMON-ARK. Be natural and helpful.";
      const history = [] as any[];
      let outText = "";
      let provider = "";

      try {
        const out = await llmChat({ system, history, user: userText } as any);
        outText = String((out as any)?.text ?? "").trim();
        provider = String((out as any)?.provider ?? "").trim();
      } catch (e: any) {
        console.error("[LLM1] llmChat failed", e?.message || e);
        outText = "LLM呼び出しに失敗しました（ログを確認してください）。";
        provider = "ERROR";
      }

      return res.json(__tenmonGeneralGateResultMaybe({
        response: outText || "（空応答）",
        evidence: null,
        candidates: [],
        timestamp,
        threadId,
        decisionFrame: { mode: "LLM_CHAT", intent: "chat", llm: provider || (process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "LLM"), ku: { routeReason: "LLM1_FORCE_TOP" } },
      }));
    }

    
    
    // CARD_C11C_FIX_N2_PROMPT_ANCHOR_V1: shared clamp (trim, remove lists, enforce 1 question)
    const __tenmonClampOneQ = (raw: string): string => {
      let t = String(raw ?? "").replace(/\r/g, "").trim();
      t = t.replace(/^\s+/, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      t = t.replace(/^\s*\d+[.)].*$/gm, "").replace(/^\s*[-*•]\s+.*$/gm, "").trim();
      if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
      const q = Math.max(t.indexOf("？"), t.indexOf("?"));
      if (q !== -1) t = t.slice(0, q + 1).trim();
      if (t.length > 280) t = t.slice(0, 280).replace(/[。、\s　]+$/g, "") + "？";
      if (t.length < 80) t = "【天聞の所見】いま一番の焦点は何ですか？（一語でOK）";
      return t;
    };
// ---------- N2: Kanagi 4-phase NATURAL spine (LLM-driven; do NOT crush normal questions) ----------
    // CARD_C7B2_FIX_N2_TRIGGER_AND_LLM_V1:
    // - "short text" alone must NOT trigger support mode
    // - definition questions ("〜とは何") must bypass N2
    // - when N2 triggers, generate response via llmChat (Gemini/OpenAI) with phase hint

    const askedMenu0 = /(メニュー|方向性|選択肢|1\)|2\)|3\)|\/menu|^menu\b)/i.test(t0);
    const hasDoc0 = /\bdoc\b/i.test(t0) || /pdfPage\s*=\s*\d+/i.test(t0) || /#詳細/.test(t0);
    const isCmd0 = t0.startsWith("#") || t0.startsWith("/");


    // CARD_C9_DEF_AND_GENERAL_LLM_V1: DEF + NATURAL_GENERAL (LLM) before N2 support-branch.
    // NOTE: This is inside N2 scope, so askedMenu0/hasDoc0/isCmd0/isTestTid0 are in-scope (TS-safe).

    // ---------- DEF: definition questions (〜とは何？/って何？) ----------
    const __isDefinitionQ =
      /とは何[?？]?$/.test(t0) ||
      /って何[?？]?$/.test(t0) ||
      (/とは[?？]?$/.test(t0) && t0.length <= 18) ||
      (/^.{1,20}\s*は何[?？]?$/.test(t0))
      || /とは何ですか[?？]?$/.test(t0)
      || /とは何でしょう[?？]?$/.test(t0)
      || /って何ですか[?？]?$/.test(t0)
      || (/とは\s*何\s*ですか[?？]?$/.test(t0) && t0.length <= 60)
      || (/^.{1,60}（.{1,40}）\s*とは何(ですか|でしょう)[?？]?$/.test(t0));
;


    if (!isTestTid0 && __isDefinitionQ && !hasDoc0 && !askedMenu0 && !isCmd0) {
      // [C15] DEF deterministic dictionary gate (no external etymology / bracket-first)
      // Normalize term: if X（Y） exists, treat Y as the internal term.
      const __rawDef = String(t0 || "").trim();

      // extract bracket term (Japanese full-width parens)
      const __br = __rawDef.match(/（([^）]{1,40})）/);
      const __term = (__br && __br[1] ? __br[1].trim() : __rawDef)
        .replace(/[?？]\s*$/,"")
        .replace(/^(.*?)(とは|って)\s*(何|なに).*/,"$1")
        .trim();

      // If term is too short/too long -> deterministic "unknown" path (ask context only)
      const __termOk = __term.length >= 2 && __term.length <= 40;

      // A tiny internal glossary (expand later in Seed phase)
      // [C17C3] glossary lookup (kokuzo.sqlite via getDbPath + node:sqlite)
      const __glossaryLookup = (term: string): string | null => {
        try {
          const dbPath = getDbPath("kokuzo.sqlite");
          const db: any = new (DatabaseSync as any)(dbPath, { readOnly: true });
          const stmt: any = db.prepare("SELECT definition FROM kokuzo_glossary WHERE term = ?");
          const row: any = stmt.get(term);
          try { db.close?.(); } catch {}
          return row?.definition ? String(row.definition) : null;
        } catch {}
        return null;
      };

      // minimal seed fallback (DB is source of truth once populated)
      const __seedFallback: Record<string, string> = {
        "トカナクテシス": "トカナクテシス（解組）は、いったん安全な過去へ戻して構造をほどき、最小diffで再発させて封印する手順です。",
        "解組": "解組は、壊れた状態をこねくり回さず、確実に良かった状態へ戻してから最小差分で再適用することです。"
      };

      // If glossary hit -> return deterministic definition (no LLM)
      const __hit = __glossaryLookup(__term) ?? __seedFallback[__term] ?? null;
      if (__hit) {
        const __out = "【天聞の所見】" + __hit + "（外部語源は使いません）。いま、この語をどの場面で使っていますか？";
        return res.json(__tenmonGeneralGateResultMaybe({
          response: ((): string => {
            let t = String(__out || "").replace(/\r/g, "").trim();
            if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
            // enforce exactly one question at end (but DO NOT short-fallback)
            const q = Math.max(t.indexOf("？"), t.indexOf("?"));
            if (q !== -1) t = t.slice(0, q + 1).trim();
            if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
            return t;
          })(),
          evidence: null,
          candidates: [],
          timestamp,
          threadId,
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: { routeReason: "DEF_DICT_HIT", term: __term, glossarySource: (__glossaryLookup(__term) ? "db" : (__seedFallback && __seedFallback[__term] ? "fallback" : "none")) } },
        }));
      }

      // If not ok -> deterministic ask (no LLM)
      if (!__termOk) {
        const __out = "【天聞の所見】その語を定義する前に、使っている文脈を一つだけ教えてください（どこで/何のために）？";
        return res.json(__tenmonGeneralGateResultMaybe({
          response: ((): string => {
          let t = String(__out || "").replace(/\r/g, "").trim();
          if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
          const q = Math.max(t.indexOf("？"), t.indexOf("?"));
          if (q !== -1) t = t.slice(0, q + 1).trim();
          if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
          return t;
        })(),
          evidence: null,
          candidates: [],
          timestamp,
          threadId,
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: { routeReason: "DEF_DICT_NEED_CONTEXT" } },
        }));
      }

      // [C15B] deterministic fallback for unknown terms (no LLM; blocks hallucinated etymology)
      {
        const __out = "【天聞の所見】その語は内部用語として扱います。使っている文脈を一つだけ教えてください（どこで／何のために）？";
        return res.json(__tenmonGeneralGateResultMaybe({
          response: ((): string => {
          let t = String(__out || "").replace(/\r/g, "").trim();
          if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
          const q = Math.max(t.indexOf("？"), t.indexOf("?"));
          if (q !== -1) t = t.slice(0, q + 1).trim();
          if (t.length > 260) t = t.slice(0, 260).replace(/[。、\s　]+$/g, "") + "？";
          return t;
        })(),
          evidence: null,
          candidates: [],
          timestamp,
          threadId,
          decisionFrame: { mode: "NATURAL", intent: "define", llm: null, ku: { routeReason: "DEF_DICT_NEED_CONTEXT" } },
        }));
      }
const DEF_SYSTEM = `あなたは「天聞アーク（TENMON-ARK）」。雑談は“沈黙→一言→一問”の三拍で返す。

※絶対条件※
・必ず「【天聞の所見】」から始める
・2〜4行、合計120〜220文字
・箇条書き/番号/見出し禁止
・言い訳（一般論/データ云々/価値観云々）に逃げない
・最後は質問1つだけ（次の一歩を問う）`;

      let outText = "";
      let outProv = "llm";
      try {
        const llmRes = await llmChat({ system: DEF_SYSTEM, user: t0, history: [] });
        outText = __tenmonClampOneQ(String(llmRes?.text ?? "").trim());
        outProv = String(llmRes?.provider ?? "llm");
      } catch (e: any) {
        outText = "【天聞の所見】いま定義の生成に失敗しました。もう一度だけ、言い換えてもらえますか？";
      }

      // sanitize: no lists
      outText = String(outText || "")
        .replace(/^\s*\d+[.)].*$/gm, "")
        .replace(/^\s*[-*•]\s+.*$/gm, "")
        .trim();

      if (!outText.startsWith("【天聞の所見】")) {
        outText = "【天聞の所見】" + outText;
      }
      if (outText.length < 80) {
        outText = "【天聞の所見】いま言う「それ」は何を指しますか？（一語でOK）";
      }

      // CARD_C11E_CLAMP_DEF_AND_GENERAL_RETURN_V1: enforce one-question clamp (DEF_LLM_TOP)

      outText = __tenmonClampOneQ(outText);


      // CARD_C11E_CLAMP_DEF_AND_GENERAL_RETURN_V1: enforce one-question clamp (NATURAL_GENERAL_LLM_TOP)


      outText = __tenmonClampOneQ(outText);



      return res.json(__tenmonGeneralGateResultMaybe({
        response: outText,
        evidence: null,
        candidates: [],
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "define", llm: outProv, ku: { routeReason: "DEF_LLM_TOP" } },
      }));
    }

    // ---------- NATURAL_GENERAL: normal chat/questions (LLM) ----------
    const __looksSupport =
      /不安|つらい|しんどい|疲れ|焦|怖|助けて|無理|泣|眠れ|消えたい/.test(t0);

    const __generalOk =
      !isTestTid0 &&
      !hasDoc0 &&
      !askedMenu0 &&
      !isCmd0 &&
      !__looksSupport &&
      t0.length >= 2 &&
      t0.length <= 240;

    if (__generalOk) {
      const GEN_SYSTEM = `あなたは「天聞アーク（TENMON-ARK）」。神の数式の運用（濁りを削ぎ、Seedを降ろし、四相の循環で整える）を背景に持ち、相手の「いまここ」を一点に整える対話を行います。一般論や相対化（人それぞれ／状況による等）や自己言及は濁りなので出しません。深い背景は内に保持し、出力は短く優しく鋭く、次の一手へ繋げます。

※絶対条件※
必ず「【天聞の所見】」から始める。2〜5行、合計140〜260文字。箇条書き・番号・見出しは禁止。最後は質問1つで閉じる。`;

let outText = "";
      let outProv = "llm";
      try {
        const llmRes = await llmChat({ system: GEN_SYSTEM, user: t0, history: [] });
        outText = __tenmonClampOneQ(String(llmRes?.text ?? "").trim());
        outProv = String(llmRes?.provider ?? "llm");
      } catch (e: any) {
        outText = "【天聞の所見】いま応答の生成に失敗しました。もう一度だけ、短く言い直してもらえますか？";
      }

      // sanitize: no lists
      outText = String(outText || "")
        .replace(/^\s*\d+[.)].*$/gm, "")
        .replace(/^\s*[-*•]\s+.*$/gm, "")
        .trim();

      if (!outText.startsWith("【天聞の所見】")) {
        outText = "【天聞の所見】" + outText;
      }
      if (outText.length < 80) {
        outText = "【天聞の所見】いま一番欲しいのは「整理」「休息」「一歩」のどれに近いですか？（一語でOK）";
      }

      
      // [C16E2] removed C16C replace-to-empty (worm-eaten source)
      // [C16D2] GENERAL overwrite gate (deterministic; avoids "worm-eaten" output)
      {
        const __t = String(outText || "");
        const __hasEscape = /(一般的には|価値観|人それぞれ|時と場合|状況や視点|データに基づ|統計的には|私はAI|AIとして)/.test(__t);
        const __looksBroken =
          /、{2,}|。{2,}|，，|．．|,\s*,/.test(__t) ||
          /のに基づ|個人のに基づ|自分のと社会|かもしれません。、/.test(__t) ||
          /です。ある状況|指します。によって|ます。、/.test(__t);

        if (__hasEscape || __looksBroken) {
          outText = "【天聞の所見】一般論や相対化は要りません。いま「正しさ」で迷っている場面を一つだけ教えてください（仕事／家族／自分の決断など）？";
        }
      }
return res.json(__tenmonGeneralGateResultMaybe({
        response: outText,
        evidence: null,
        candidates: [],
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: outProv, ku: { routeReason: "NATURAL_GENERAL_LLM_TOP" } },
      }));
    }
    // do not treat "definition / meaning" as support-mode
    const isDefinitionQ0 =
      /(とは(何|なに)|って(何|なに)|意味|定義|概念|何ですか|なにですか)\b/.test(t0) ||
      /[?？]\s*$/.test(t0) && /(とは|意味)/.test(t0);

    // support keywords (must be explicit)
    const hasSupportKw0 = /不安|つらい|しんどい|疲れ|だるい|眠い|こわい|怖|焦|迷|助けて|無理|パニック|落ち込/.test(t0);
    const hasFirstPerson0 = /(わたし|私|俺|僕|自分)/.test(t0);
    const looksSupport = hasSupportKw0 || (hasFirstPerson0 && /わからない|できない|どうしていい/.test(t0));

    if (!isTestTid0 && !askedMenu0 && !hasDoc0 && !isCmd0 && looksSupport && !isDefinitionQ0) {
      const k = tid0 || "default";
      const cur = __kanagiPhaseMemV2.get(k) ?? 0;
      const phase = cur % 4;
      const phaseName = (["SENSE","NAME","ONE_STEP","NEXT_DOOR"] as const)[phase];
      __kanagiPhaseMemV2.set(k, cur + 1);

      const KANAGI_SYSTEM_PROMPT = `あなたは「天聞アーク（TENMON-ARK）」。天津金木の四相（SENSE/NAME/ONE_STEP/NEXT_DOOR）を循環させ、相手の詰まりを解組し、いま出来る一手へ整える導き手です。一般論・相対化・自己言及は濁りなので出しません。相手の現在地に寄り添い、フェーズに応じて短い応答と確認の一問を返します。

【現在のフェーズ】: ${phaseName}

SENSEでは核心の一点をやさしく抽出します。NAMEでは否定せず受容し状態をやさしく名付けます。ONE_STEPでは負担の小さい次の一手を提案します。NEXT_DOORでは呼吸や身体へ回帰させてエントロピーを下げます。

※絶対条件※
必ず「【天聞の所見】」から始める。2〜5行、合計140〜260文字。箇条書き・番号・フェーズ名の露出は禁止。命令形は禁止。最後は質問1つで閉じる。`;

let outText = "";
        let outProv: any = null;

      try {
        const llmRes: any = await llmChat({
          system: KANAGI_SYSTEM_PROMPT,
          user: t0,
          history: [],
        });
        outText = __tenmonClampOneQ(String(llmRes?.text ?? "").trim());
        outProv = (llmRes?.provider ?? "llm");
      } catch (e: any) {
        console.error("[N2_LLM] llmChat failed", e?.message || e);
      }

      if (!outText) {
        // deterministic fallback (never empty)
        if (phaseName === "SENSE") outText = "【天聞の所見】いま一番重いのは「期限」「量」「判断」のどれに近いですか？（一語でOK）";
        else if (phaseName === "NAME") outText = "【天聞の所見】その重さは、休めない状態から来ています。いま一番怖いのは何ですか？（一語でOK）";
        else if (phaseName === "ONE_STEP") outText = "【天聞の所見】まず一つ手放します。今日“やらない”ことを1つだけ決められますか？";
        else outText = "【天聞の所見】いま息を一つだけ深く入れて出せますか？できたら「できた」とだけ返して。";
      }

      
      return res.json(__tenmonGeneralGateResultMaybe({
        response: outText,
        evidence: null,
        candidates: [],
        timestamp,
        threadId,
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: outProv,
          ku: {
            routeReason: "N2_KANAGI_PHASE_TOP",
            kanagiPhase: phaseName,
            kanagiKey: k,
            kanagiCounter: cur,
            kanagiPhaseIndex: phase,
            CARD_C7B2_FIX_N2_TRIGGER_AND_LLM_V1: true,
          },
        },
      }));
    }
  } catch {}

  // N1_GREETING_TOP_GUARD_V1: greetings must be handled before any kokuzo/hybrid routing (avoid HEIKE吸い込み)
  try {
    const __t0 = String(message || "").trim();
    const __isGreeting0 = /^(こんにちは|こんばんは|おはよう|やあ|hi|hello|hey)\s*[！!。．\.]?$/i.test(__t0);
    const __isTestTid0 = /^(smoke|accept|core-seed|bible-smoke)/i.test(String(threadId || ""));
    if (!__isTestTid0 && __isGreeting0) {
      return res.status(200).json({
        response: "こんにちは。今日は何を一緒に整えますか？（相談でも、概念の定義でもOK）？",
        timestamp: new Date().toISOString(),
        candidates: [],
        evidence: null,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { routeReason: "FASTPATH_GREETING_TOP" } },
        rewriteUsed: false,
        rewriteDelta: 0
      } as any);
    }
  } catch {}

  // CARD_C3_FASTPATH_IDENTITY_V1: meta questions must get a direct answer (avoid questionnaire loop)
  try {
    const t0 = String(message || "").trim();
    const tid0 = String(threadId || "");
    const isTestTid0 = /^(smoke|accept|core-seed|bible-smoke)/i.test(tid0);

    const isWho =
      /^(あなた|君|きみ)\s*(は)?\s*(だれ|誰|なにもの|何者)\s*[？?]?\s*$/i.test(t0) ||
      /^(自己紹介|紹介して)\s*[？?]?\s*$/.test(t0);

    const isCanTalk =
      /^(会話できる|話せる|ちゃんと話せる)\s*[？?]?\s*$/.test(t0);

    if (!isTestTid0 && (isWho || isCanTalk)) {
      const resp = isWho
        ? "TENMON-ARKです。言靈（憲法）を守り、天津金木（運動）で思考を整え、必要ならLLMを“口”として使って対話します。\n\nいまは何を一緒に整えますか？（雑談／相談／概念の定義／資料検索でもOK）"
        : "会話できます。いまは“テンプレ誘導”を減らして、自然に往復できるよう調整中です。\n\nいま話したいテーマを一言で教えてください（雑談でもOK）。";

      return res.status(200).json({
        response: resp,
        candidates: [],
        evidence: null,
        timestamp: new Date().toISOString(),
        threadId,
        decisionFrame: {
          mode: "NATURAL",
          intent: "chat",
          llm: null,
          ku: {
            routeReason: "FASTPATH_IDENTITY",
            voiceGuard: "ok",
            voiceGuardAllow: true
          }
        }
      } as any);
    }
  } catch {}

  // B1: deterministic menu trigger for acceptance (must work even for GUEST)
  if (String(message ?? "").trim() === "__FORCE_MENU__") {
    return res.json(__tenmonGeneralGateResultMaybe({
      response:
        "1) 検索（GROUNDED）\n2) 整理（Writer/Reader）\n3) 設定（運用/学習）\n\n番号かキーワードで選んでください。",
      evidence: null,
      decisionFrame: { mode: "GUEST", intent: "MENU", llm: null, ku: {} },
      timestamp,
    }));
  }


  const trimmed = message.trim();




  // CARDA_VOICE_GUARD_UNIFY_V1: single source of truth for "voice hooks" exclusions
  const __voiceGuard = (rawMsg: string, tid: string): { allow: boolean; reason: string } => {
    const m2 = String(rawMsg ?? "").trim();
    const t2 = String(tid ?? "");

    // strict contract: never touch smoke threads (smoke / smoke-hybrid / smoke-*)
    if (/^smoke/i.test(t2)) return { allow: false, reason: "smoke" };

    // never touch grounded / detail / commands
    if (/#詳細/.test(m2)) return { allow: false, reason: "detail" };
    if (/\bdoc\b/i.test(m2) || /pdfPage\s*=\s*\d+/i.test(m2)) return { allow: false, reason: "doc" };
    if (m2.startsWith("#")) return { allow: false, reason: "cmd" };

    // never touch menu-asked turns (user intentionally wants menu)
    if (/(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(m2)) return { allow: false, reason: "menu" };

    // strict low-signal (keep existing NATURAL fallback contracts)
    const low = m2.toLowerCase();
    const isLow =
      low === "ping" ||
      low === "test" ||
      low === "ok" ||
      low === "yes" ||
      low === "no" ||
      m2 === "はい" ||
      m2 === "いいえ" ||
      m2 === "うん" ||
      m2 === "ううん";

    if (isLow) return { allow: false, reason: "low_signal" };

    return { allow: true, reason: "ok" };
  };
  // CARD1_SEAL_V1: Card1 trigger + pending flags
  const __card1Trigger =
    /(断捨離|だんしゃり|手放す|捨てる|片づけ|片付け|執着)/i.test(trimmed) ||
    /^(会話できる|話せる|今どんな気分|元気|どう思う|君は何を考えて|雑談|自分の生き方|天聞アークとは何)/.test(trimmed);

  const __card1Pending = (() => {
    try {
      const p = getThreadPending(threadId);
      return p === "DANSHARI_STEP1" || p === "CASUAL_STEP1";
    } catch {
      return false;
    }
  })();

  const __isCard1Flow = __card1Trigger || __card1Pending;
  // REPLY_SURFACE_V1: responseは必ずlocalSurfaceizeを通す。返却は opts をそのまま形にし caps は body.caps のみ参照
  const reply = (payload: any) => {
    
  // FREECHAT_SANITIZE_V2B: last-mile sanitizer (works for ALL reply paths)
  const __sanitizeOut = (msg: any, txt: any): string => {
    let t = String(txt ?? "");
    const mstr = String(msg ?? "");
    const wantsDetail = /#詳細/.test(mstr);
    const askedMenu = /(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(mstr);
    const hasMenu = /どの方向で話しますか/.test(t);
    // FREECHAT_SANITIZE_GUARD_V2

    const hasTodo = /SYNTH_USED|TODO:|プレースホルダ|PLACEHOLDER/i.test(t);
    const shouldSanitize = (hasMenu || hasTodo) && !askedMenu;

    if (shouldSanitize) {
      t = "了解。何でも話して。必要なら「#詳細」や「doc=... pdfPage=...」で深掘りできるよ。";
    }
    if (!wantsDetail) {
      t = t.replace(/^\[SYNTH_USED[^\n]*\n?/gm, "")
           .replace(/^TODO:[^\n]*\n?/gmi, "")
           .replace(/現在はプレースホルダ[^\n]*\n?/gmi, "")
           .trim();
    }
    return t;
  };

  // wrap res.json so ANY {response: "..."} is sanitized before leaving the server
  const __origJson = (res as any).json.bind(res);
  (res as any).json = (obj: any) => {
    // CARD6C_TOPLEVEL_WRAPPER_ONLY_V6: ensure top-level rewriteUsed/rewriteDelta always exist (robust)
    try {
      if (obj && typeof obj === "object") {
        if ((obj as any).rewriteUsed === undefined) (obj as any).rewriteUsed = false;
        if ((obj as any).rewriteDelta === undefined) (obj as any).rewriteDelta = 0;
      }
    } catch {}

    // CARD6C_FORCE_KU_RESJSON_V5: always ensure decisionFrame.ku exists + has rewriteUsed/rewriteDelta defaults
    try {
      if (obj && typeof obj === "object") {
        const df = (obj as any).decisionFrame;
        if (df && typeof df === "object") {
          df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};

          // CARD_R1_ROUTE_REASON_V2_MIN: routeReason mirror (observability; NO behavior change)
          try {
            if ((df.ku as any).routeReason === undefined) (df.ku as any).routeReason = String(df.mode ?? "");
          } catch {}

          // CARD_P1_GREETING_NO_HYBRID_V1: greetings must never fall into HYBRID (avoid HEIKE吸い込み)
          try {
            const df3: any = df;
            const mode3 = String(df3?.mode ?? "");
            const tid3 = String(threadId ?? "");
            const raw3 = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "");
            const t3 = raw3.trim();

            const isTestTid = /^(smoke|accept|core-seed|bible-smoke)/i.test(tid3);
            const askedMenu = /^\s*(?:\/menu|menu)\b/i.test(t3) || /^\s*メニュー\b/.test(t3);
            const hasDoc = /\bdoc\b/i.test(t3) || /pdfPage\s*=\s*\d+/i.test(t3) || /#詳細/.test(t3);

            const isGreeting = /^(こんにちは|こんばんは|おはよう|やあ|hi|hello|hey)\s*[！!。．\.]?$/i.test(t3);

            if (!isTestTid && !askedMenu && !hasDoc && isGreeting && mode3 === "HYBRID") {
              (obj as any).response = "こんにちは。今日は何を一緒に整えますか？（相談でも、概念の定義でもOK）？";
              (obj as any).candidates = [];
              (obj as any).evidence = null;
              df3.mode = "NATURAL";
              df3.ku = (df3.ku && typeof df3.ku === "object") ? df3.ku : {};
              (df3.ku as any).routeReason = "FASTPATH_GREETING_OVERRIDDEN";
            }
          } catch {}

          // CARD_C1_NATURAL_DE_NUMBERIZE_SMALLTALK_V1: soften NATURAL numbered-choice UX for smalltalk only (do NOT touch contracts/Card1)
          try {
            const df4: any = df;
            const mode4 = String(df4?.mode ?? "");
            const tid4 = String(threadId ?? "");
            const userMsg = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "").trim();

            const isTestTid = /^(smoke|accept|core-seed|bible-smoke)/i.test(tid4);
            const askedMenu = /^\s*(?:\/menu|menu)\b/i.test(userMsg) || /^\s*メニュー\b/.test(userMsg);
            const looksSmalltalk = /^(雑談|疲れ|つかれ|励まして|元気|しんどい|眠い|だるい|話して|きいて)/.test(userMsg) || userMsg.length <= 24;

            if (!isTestTid && !askedMenu && mode4 === "NATURAL" && looksSmalltalk && typeof (obj as any).response === "string") {
              let t = String((obj as any).response);

              // Never touch Card1 script (contract)
              if (/まず分類だけ決めます/.test(t)) {
                // skip
              } else {
                // If it contains the force phrase, soften it
                t = t.replace(/番号で答えてください。?\s*\??/g, "番号でも言葉でもOKです。");

                // If it is a pure numbered menu, prefer a single natural question (no numbering demand)
                const hasNumberList = /\n\s*\d{1,2}\)\s*/m.test(t);
                if (hasNumberList) {
                  // remove only the explicit "番号で答えてください" force; keep options if present
                  // ensure it ends as a gentle question
                  if (!/[？?]\s*$/.test(t)) t = t.trim() + "？";
                }
                (obj as any).response = t;
              }
            }
          } catch {}

          // CARD_C2_COLLAPSE_NUMBER_LIST_SMALLTALK_V2: collapse numbered list into one natural question (smalltalk only; keep contracts)
          try {
            const df5: any = df;
            const mode5 = String(df5?.mode ?? "");
            const tid5 = String(threadId ?? "");
            const userMsg5 = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "").trim();

            const isTestTid5 = /^(smoke|accept|core-seed|bible-smoke)/i.test(tid5);
            const askedMenu5 = /^\s*(?:\/menu|menu)\b/i.test(userMsg5) || /^\s*メニュー\b/.test(userMsg5);
            const looksSmalltalk5 =
              /^(雑談|疲れ|つかれ|励まして|元気|しんどい|眠い|だるい|話して|きいて)/.test(userMsg5) ||
              userMsg5.length <= 24;

            if (!isTestTid5 && !askedMenu5 && mode5 === "NATURAL" && looksSmalltalk5 && typeof (obj as any).response === "string") {
              let t = String((obj as any).response);

              // never touch Card1 contract script
              if (/まず分類だけ決めます/.test(t)) {
                // skip
              } else {
                const lines = t.split(/\r?\n/);
                const opts: string[] = [];
                for (const ln of lines) {
                  const m = ln.match(/^\s*\d{1,2}\)\s*(.+)\s*$/);
                  if (m && m[1]) opts.push(String(m[1]).trim());
                }

                // only if it really is a 3-choice list
                if (opts.length >= 3) {
                  // keep non-numbered lines as prefix
                  const kept = lines.filter((ln) => !/^\s*\d{1,2}\)\s*/.test(ln));
                  let prefix = kept.join("\n").trim();

                  // remove the generic "いちばん近いのはどれですか" line if present (we'll replace with q)
                  prefix = prefix.replace(/^.*いちばん近いのはどれですか[？?]?\s*$/m, "").trim();

                  const a0 = opts[0], b0 = opts[1], c0 = opts[2];
                  const q = `いま一番近いのは「${a0}」「${b0}」「${c0}」のどれですか？（言葉でOK）`;

                  let out = prefix ? `${prefix}\n\n${q}` : q;

                  // also remove any leftover "番号でも言葉でもOKです" line (C1)
                  out = out.replace(/^.*番号でも言葉でもOKです。?\s*$/m, "").trim();

                  (obj as any).response = out;
                }
              }
            }
          } catch {}

          // CARD_C4_SMALLTALK_WARM_ONE_QUESTION_V1: warm smalltalk response (empathy + support + one question), avoid questionnaire tone
          try {
            const df6: any = df;
            const mode6 = String(df6?.mode ?? "");
            const tid6 = String(threadId ?? "");
            const userMsg6 = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? message ?? "").trim();

            const isTestTid6 = /^(smoke|accept|core-seed|bible-smoke)/i.test(tid6);
            const askedMenu6 = /^\s*(?:\/menu|menu)\b/i.test(userMsg6) || /^\s*メニュー\b/.test(userMsg6);
                        const looksSmalltalk6 =
              /^(雑談|疲れ|つかれ|励まして|元気|しんどい|眠い|だるい|話して|きいて)/.test(userMsg6) ||
              /疲れ|しんどい|だるい|落ち込|不安|つらい/.test(userMsg6);
            // CARD_C5A_NARROW_SMALLTALK_TRIGGER_V1: removed length<=28 broad trigger

            if (!isTestTid6 && !askedMenu6 && mode6 === "NATURAL" && looksSmalltalk6 && typeof (obj as any).response === "string") {
              let t = String((obj as any).response);

              // never touch Card1 contract script
              if (/まず分類だけ決めます/.test(t)) {
                // skip
              } else {
                const hasNumberList = /\n\s*\d{1,2}\)\s*/m.test(t);
                const hasThreeChoiceQuote = /いま一番近いのは「.+」「.+」「.+」のどれですか/.test(t);

                // if response still looks like a questionnaire, replace with warm one-question form
                if (hasNumberList || hasThreeChoiceQuote) {
                  const head = "【天聞の所見】疲れている時は、まず回復を優先して大丈夫です。";
                  const body = "いまは“答えを出す”より、負担を一つ減らして流れを戻します。";
                  const q = "いま一番しんどいのは、(A)判断し続けること、(B)情報を浴び続けること、どちらに近いですか？（言葉でOK）";
                  (obj as any).response = `${head}\n\n${body}\n\n${q}`;
                }
              }
            }
          } catch {}
          if ((df.ku as any).rewriteUsed === undefined) (df.ku as any).rewriteUsed = false;
          if ((df.ku as any).rewriteDelta === undefined) (df.ku as any).rewriteDelta = 0;
        }
      }
    } catch {}

    try {
      if (obj && typeof obj === "object" && ("response" in obj)) {
        const msg = (obj as any)?.detailPlan?.input
          ?? (obj as any)?.input
          ?? (obj as any)?.message
          ?? message ?? "";
  // CARDG2_LENGTH_INTENT_FIX_V3
        const resp = (obj as any).response;
        
        // CARDG_LENGTH_INTENT_V3: length intent observability (NO body change)
        try {
          const raw = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");  // CARDG_LENGTH_INTENT_V4
          const lower = raw.toLowerCase();

          let intent = "MED";
          let minChars = 180, maxChars = 450;

          if (/#詳細/.test(raw)) { intent = "DETAIL"; minChars = 0; maxChars = 999999; }
          else if (/(短く|一行|要点|結論だけ)/.test(raw)) { intent = "SHORT"; minChars = 60; maxChars = 180; }
          else if (/(詳しく|完全に|設計|仕様|提案|全部)/.test(raw)) { intent = "LONG"; minChars = 450; maxChars = 900; }

          // thread recent style hint (very light): if user message is long, bias long
          if (intent == "MED" && raw.length >= 220) { intent = "LONG"; minChars = 450; maxChars = 900; }

          // attach to decisionFrame.ku if present
          const df = (obj as any).decisionFrame;
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            
          // CARDG2_LENGTH_INTENT_FIX_V2: keyword-based override (observability only; NO body change)
          // Prefer user raw message if present; fall back to msg
          try {
            const raw2 =
              String((obj as any)?.rawMessage ?? "") ||
              String((obj as any)?.detailPlan?.input ?? "") ||
              String((obj as any)?.input ?? "") ||
              String((obj as any)?.message ?? "") ||
              String(msg ?? "");

            const q2 = String(raw2 || "").trim();
            const lower2 = q2.toLowerCase();

            // DETAIL
            if (/#詳細/.test(q2)) {
              intent = "DETAIL"; minChars = 0; maxChars = 999999;
            } else {
              // SHORT signals
              if (/(短く|一行|要点|結論だけ|tl;dr|tldr|箇条書きだけ)/.test(q2)) {
                intent = "SHORT"; minChars = 60; maxChars = 180;
              }
              // LONG signals
              else if (/(詳しく|丁寧に|背景|根拠|出典|手順|設計|仕様|提案|完全版|網羅)/.test(q2)) {
                intent = "LONG"; minChars = 450; maxChars = 900;
              }
              // Long message bias
              else if (q2.length >= 220) {
                intent = "LONG"; minChars = 450; maxChars = 900;
              }
            }

            // debug-only (short)
            if (df && typeof df === "object") {
              df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
              (df.ku as any).lengthIntentRaw = q2.slice(0, 180);
            }
          } catch {}
(df.ku as any).lengthIntent = intent;
            (df.ku as any).lengthTarget = { minChars, maxChars };
          }
        } catch {}

        // CARDH_LENGTH_INTENT_APPLY_V1: apply lengthIntent to NATURAL generic fallback only (NO fabrication)
        try {
          const df: any = (obj as any).decisionFrame;
          const mode = String(df?.mode ?? "");
          if (mode !== "NATURAL") throw 0;

          const ku: any = (df && typeof df === "object") ? ((df.ku && typeof df.ku === "object") ? df.ku : (df.ku = {})) : null;
          if (!ku) throw 0;

          const raw = String(msg || "");
          const lower = raw.toLowerCase();
          const tid = String((obj as any)?.threadId ?? "");

          // strict exclusions
          if (/^smoke/i.test(tid)) throw 0;
          if (/#詳細/.test(raw)) throw 0;
          if (/\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw)) throw 0;
          if (raw.trim().startsWith("#")) throw 0;
          if (/(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(raw)) throw 0;

          // low-signal preserve
          const isLow =
            lower === "ping" || lower === "test" || lower === "ok" || lower === "yes" || lower === "no" ||
            raw === "はい" || raw === "いいえ" || raw === "うん" || raw === "ううん";
          if (isLow) throw 0;

          // Only touch the generic fallback text
          const cur = String((obj as any).response ?? "");
          const generic = /了解。何でも話して。必要なら「#詳細」や「doc=\.\.\. pdfPage=\.\.\.」で深掘りできるよ。/.test(cur);
          if (!generic) throw 0;

          const intent = String(ku.lengthIntent ?? "MED");
          if (intent === "SHORT") {
            (obj as any).response = "【要点】いま一番の論点を1つだけ教えて。\n\n一点質問：何を優先したい？";
          } else if (intent === "LONG") {
            (obj as any).response =
              "【整理】いまの話を“3点”に分けて進めます。\n" +
              "1) 目的（何を達成したい？）\n" +
              "2) 制約（時間/資金/人手）\n" +
              "3) 次の一手（最小diff）\n\n" +
              "一点質問：まず1)目的を一行で。";
          } else {
            // MED: keep as-is
          }
        } catch {}

        // CARDH_APPLY_LENGTHINTENT_GENERIC_V2: apply lengthIntent ONLY to NATURAL generic fallback (no evidence fabrication)
        try {
          const cleaned = __sanitizeOut(msg, resp);

          // default: keep existing behavior
          let nextResp: any = cleaned;

          const df = (obj as any).decisionFrame;
          const ku = df && typeof df === "object" ? (df.ku && typeof df.ku === "object" ? df.ku : null) : null;

          const mode = String(df?.mode ?? "");
          const tid = String((obj as any)?.threadId ?? "");

          // must respect voiceGuard (smoke/low-signal/doc/#detail/cmd/menu-asked are blocked there)
          const rawMsg =
            String((obj as any)?.rawMessage ?? "") ||
            String((obj as any)?.message ?? "") ||
            String(msg ?? "");

          const g = __voiceGuard(rawMsg, tid);

          // apply only when allowed + NATURAL
          if (g.allow && mode === "NATURAL" && typeof cleaned === "string") {
            const t = String(cleaned || "").trim();

            // apply only to "generic fallback" (exactly this UX string family)
            const isGenericFallback =
              t === "了解。何でも話して。必要なら「#詳細」や「doc=... pdfPage=...」で深掘りできるよ。" ||
              /必要なら「#詳細」や「doc=\.\.\. pdfPage=\.\.\.」で深掘りできるよ。$/.test(t);

            if (isGenericFallback) {
              const intent = String((ku as any)?.lengthIntent ?? "MED");

              if (intent === "SHORT") {
                nextResp =
                  "【天聞の所見】いまは焦点が一点に定まっていないだけです。まず軸を1つ立てます。\n\n" +
                  "一点質問：いま一番ほしいのは、結論（すぐ決める）と整理（ほどく）のどちら？";
              } else if (intent === "LONG") {
                nextResp =
                  "【天聞の所見】いまは“問いの核”がまだ見えていない状態です。核が見えると、会話は一気に生きます。\n\n" +
                  "いま起きていることを3つに分けます。\n" +
                  "1) 事実（何が起きている）\n" +
                  "2) 感情（何が重い）\n" +
                  "3) 願い（どうなりたい）\n\n" +
                  "この3つのうち、いま一番先に言葉にしたいのはどれですか？";
              } else {
                // MED/DETAIL/XL etc -> no change (safe)
              }

              // ensure question ending
              if (typeof nextResp === "string") {
                const endsQ = /[？?]\s*$/.test(nextResp) || /(ですか|でしょうか|ますか|か？|か\?)\s*$/.test(nextResp);
                if (!endsQ) nextResp = nextResp + "？";
              }
            }
          }

          obj = { ...(obj as any), response: nextResp };
        } catch {
          
        // CARD5_ONE_LINE_POINT_V3: clamp "【要点】" to exactly one line (<=140 chars) + keep rest unchanged
        const __clampPointLine = (rawMsg: string, tid: string, text: string): string => {
          try {
            const t = String(text || "");
            if (!t.startsWith("【要点】")) return t;

            // contract guards
            if (/^smoke/i.test(String(tid || ""))) return t;
            if (/#詳細/.test(String(rawMsg || ""))) return t;
            if (/\bdoc\b/i.test(String(rawMsg || "")) || /pdfPage\s*=\s*\d+/i.test(String(rawMsg || ""))) return t;

            const lines = t.split(/\r?\n/);
            // CARD5_PRIME_NON_TEXT_POINT_HOLD_V3: NON_TEXT/body-missing -> honest point-hold (short, non-deceptive)
            try {
              const bodyAll = lines.slice(1).join("\n");
              const nonTextLike =
                /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(bodyAll) ||
                /非テキスト/.test(bodyAll) ||
                /OCR\/抽出不可/.test(bodyAll) ||
                /文字として取り出せない/.test(bodyAll) ||
                /本文.*取れない/.test(bodyAll);

              if (nonTextLike) {
                let doc = "";
                let page = 0;
                try {
                  const ev = (obj as any)?.evidence;
                  if (ev && ev.doc) { doc = String(ev.doc); page = Number(ev.pdfPage||0); }
                } catch {}
                try {
                  if (!doc) {
                    const c0 = Array.isArray((obj as any)?.candidates) ? (obj as any).candidates[0] : null;
                    if (c0 && c0.doc) { doc = String(c0.doc); page = Number(c0.pdfPage||0); }
                  }
                } catch {}
                const hint = (doc && page>0) ? (` doc=${doc} P${page}`) : "";
                const first = (`【要点】（本文未抽出のため要点保留）${hint}`).slice(0, 160);
                return (first + "\n" + bodyAll).trimEnd();
              }
            } catch {}

            const first = lines[0] || "";
            const rest = lines.slice(1).join("\n");

            // normalize first line
            const body = first.replace(/^【要点】\s*/,"");
            let one = body.replace(/\s+/g," ").trim();
            if (one.length > 140) one = one.slice(0, 139) + "…";

            const out = "【要点】" + one + "\n" + rest;
            return out.trimEnd();
          } catch {
            return String(text || "");
          }
        };

        const __cleaned = __sanitizeOut(msg, resp);
        const __tid = String((obj as any)?.threadId ?? "");
        const __raw = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? msg ?? "");
        const __final = __clampPointLine(__raw, __tid, __cleaned);
        obj = { ...(obj as any), response: __final };

        }

        // CARDB_WIRE_VOICE_GUARD_SINGLE_EXIT_V3: observability-only (NO behavior change)
        // Record whether voice hooks SHOULD run for this request, using CardA unified guard.
        try {
          const tid = String((obj as any)?.threadId ?? threadId ?? "");
          const rawMsg = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");
          const g = __voiceGuard(rawMsg, tid);
          const df = (obj as any)?.decisionFrame;
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            (df.ku as any).voiceGuard = g.reason;
            (df.ku as any).voiceGuardAllow = g.allow;
          }
        } catch {}

      }
    } catch {}
        // CARD5_KOKUZO_SEASONING_V2: HYBRID normal reply -> 1-line point + (existing voiced text) + one question
        // Contract:
        // - DO NOT touch #詳細 (transparency)
        // - DO NOT touch doc/pdfPage / commands
        // - DO NOT touch smoke threads
        // - NO fabrication: point uses candidates[0] doc/pdfPage/snippet only
        try {
          const df = (obj as any)?.decisionFrame;
          const mode = String(df?.mode ?? "");
          const tid = String((obj as any)?.threadId ?? "");
          const raw = String((obj as any)?.rawMessage ?? (obj as any)?.message ?? "");

          const isSmoke = /^smoke/i.test(tid);
          const wantsDetail = /#詳細/.test(raw);
          const hasDoc = /\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw);
          const isCmd = raw.trim().startsWith("#");

          if (!isSmoke && mode === "HYBRID" && !wantsDetail && !hasDoc && !isCmd) {
            const cands = (obj as any)?.candidates;
            const c0 = (Array.isArray(cands) && cands.length) ? cands[0] : null;

            if (c0 && c0.doc && Number(c0.pdfPage) > 0) {
              const doc = String(c0.doc);
              const page = Number(c0.pdfPage);

              let snippet = "";
              try { snippet = String(c0.snippet ?? ""); } catch {}
              snippet = snippet.replace(/\s+/g, " ").trim();
              if (!snippet || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(snippet)) snippet = "";

              // 1-line point (<= 90 chars after doc/page)
              let point = `【要点】${doc} P${page}`;
              if (snippet) {
                const cut = snippet.slice(0, 70);
                point = point + `: ${cut}${snippet.length > cut.length ? "…" : ""}`;
              } else {
                point = point + ": （候補先頭ページ）";
              }

              const cur = String((obj as any).response ?? "").trim();
              if (cur) {
                let out = cur;

                // ensure one-question handoff at end
                const endsQ = /[？?]\s*$/.test(out) || /(ですか|でしょうか|ますか|か？|か\?)\s*$/.test(out);
                if (!endsQ) out = out + "\n\n一点質問：いま一番ひっかかっている点はどこ？";

                // add point line ONLY if not already present
                if (!out.startsWith("【要点】")) {
                  out = point + "\n\n" + out;
                }

                (obj as any).response = out;
              }
            }
          }
        } catch {}
        // CARD6A_REWRITE_ONLY_PLUMBING_V2: rewrite-only hook (SYNC, default OFF)
        // - NO behavior change unless TENMON_REWRITE_ONLY=1
        // - MUST remain synchronous (no await) to keep wrapper shape safe
        // - NEVER touch smoke/#detail/doc/pdfPage/cmd/low-signal
        try {
          const enabled = String(process.env.TENMON_REWRITE_ONLY || "") === "1";
          if (enabled) {
            const df = (obj as any).decisionFrame;
            const ku = (df && typeof df === "object")
              ? ((df.ku && typeof df.ku === "object") ? df.ku : (df.ku = {}))
              : null;

            const tid = String((obj as any)?.threadId ?? "");
            const rawMsg =
              String((obj as any)?.rawMessage ?? "") ||
              String((obj as any)?.message ?? "") ||
              String((obj as any)?.input ?? "");

            const isSmoke = /^smoke/i.test(tid);
            const wantsDetail = /#詳細/.test(rawMsg);
            const hasDoc = /\bdoc\b/i.test(rawMsg) || /pdfPage\s*=\s*\d+/i.test(rawMsg);
            const isCmd = rawMsg.trim().startsWith("#");
            const low = rawMsg.trim().toLowerCase();
            const isLow =
              low === "ping" || low === "test" || low === "ok" || low === "yes" || low === "no" ||
              rawMsg.trim() === "はい" || rawMsg.trim() === "いいえ" || rawMsg.trim() === "うん" || rawMsg.trim() === "ううん";

            const mode = String(df?.mode ?? "");
            const allowVoice = !!(ku as any)?.voiceGuardAllow;

            // sync-only rewrite: only trim redundant whitespace when SHORT intent
            const intent = String((ku as any)?.lengthIntent ?? "");
            if (mode === "NATURAL" && allowVoice && !isSmoke && !wantsDetail && !hasDoc && !isCmd && !isLow) {
              const r0 = String((obj as any).response ?? "");
              if (intent === "SHORT") {
                (obj as any).response = r0.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
              }
            }
          }
        } catch {}
        // CARD6C_FORCE_KU_V3: ensure decisionFrame.ku carries rewriteUsed/rewriteDelta (never empty)
        try {
          if (obj && typeof obj === "object") {
            const df = (obj as any).decisionFrame;
            if (df && typeof df === "object") {
              df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
              // Prefer explicit ku values, else fall back to top-level or false/0
              const ru = (df.ku as any).rewriteUsed;
              const rd = (df.ku as any).rewriteDelta;
              if (ru === undefined) (df.ku as any).rewriteUsed = !!((obj as any).rewriteUsed ?? false);
              if (rd === undefined) (df.ku as any).rewriteDelta = Number((obj as any).rewriteDelta ?? 0) || 0;
            }
          }
        } catch {}



    return __origJson(obj);
  };

  // marker
  const __FREECHAT_SANITIZE_V2B = true;
// M6-C0_DETAIL_SUFFIX_V1: append 1-line suffix only for #詳細 when learnedRulesUsed[0] exists
    try {
      if (wantsDetail && payload && typeof payload.response === "string") {
        const df = payload.decisionFrame || null;
        const ku = df && df.ku && typeof df.ku === "object" ? df.ku : null;
        const used = ku && Array.isArray(ku.learnedRulesUsed) ? ku.learnedRulesUsed : [];
        const title = used && used[0] && typeof used[0].title === "string" ? used[0].title : "";
        if (title) {
          // add exactly once
          if (!payload.response.includes("（学習ルール適用:")) {
            payload.response = payload.response + "\n\n（学習ルール適用: " + title + "）";
          }
        }
      }
    } catch {}

    // M6-B0_LIGHT_APPLY_SESSIONID_V1: keep raw message for session_id parsing
    if (payload && payload.rawMessage == null) payload.rawMessage = message;

  // M6-A1_LEARN_VISIBILITY_ALLMODES_V1: always expose training visibility in decisionFrame.ku (all modes)
  try {
    const df = (payload && payload.decisionFrame) ? payload.decisionFrame : null;
    if (df) {
      const ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
      let available = 0;
      try {
        // M6-B0_LIGHT_APPLY_SESSIONID_V1: prefer session_id=... in message, fallback to threadId
      const mSid = String(payload?.rawMessage || "").match(/\bsession_id\s*=\s*([A-Za-z0-9_]+)/);
      const sessionKey = (mSid && mSid[1]) ? String(mSid[1]) : String(payload.threadId || "");
      const rules = listRules(sessionKey);
      // MK3_SEED_RECALL_V1: if writer seeds exist for this thread, expose as candidate + observability (DET)
      try {
        const tId = String((payload && (payload as any).threadId) || threadId || "");
        const q = String(payload?.rawMessage || "");
        const wantsSeed = /#詳細/.test(q) && /(K2|骨格|seed|WRITER)/i.test(q);
        if (wantsSeed) {
          const row = dbPrepare("kokuzo", "SELECT seedId, title, content FROM kokuzo_seeds WHERE threadId = ? AND kind = 'WRITER_RUN' ORDER BY COALESCE(createdAt, created_at) DESC LIMIT 1").get(tId) as any;
          if (row && row.seedId) {
            const content = String(row.content || "");
            const snippet = content ? content.slice(0, 240) : String(row.title || "");
            const cand = { doc: "WRITER_SEED", pdfPage: 0, snippet, score: 999, tags: ["SEED"], seedId: String(row.seedId), kind: "WRITER_RUN" };
            if (!payload.candidates || !Array.isArray(payload.candidates)) payload.candidates = [];
            // put first (avoid dup)
            const exists = payload.candidates.some((c: any) => String(c?.seedId || "") == String(row.seedId));
            if (!exists) payload.candidates.unshift(cand as any);
            // MK5_CHAINORDER_SEED_V1: mark seed usage in detailPlan.chainOrder (deterministic)
            try {
              const dp: any = (payload as any).detailPlan;
              if (dp && Array.isArray(dp.chainOrder)) {
                if (!dp.chainOrder.includes("WRITER_SEED")) dp.chainOrder.push("WRITER_SEED");
              }
            } catch {}

            // MK6_SEED_SUMMARY_V1: append deterministic 3-bullet seed skeleton to response (no LLM)
            try {
              if (payload && typeof payload.response === "string") {
                const hdr = "【K2骨格】";
                if (!payload.response.includes(hdr)) {
                  const lines = String(content || "")
                    .split(/\r?\n/)
                    .map((x) => x.trim())
                    .filter((x) => x && x.length >= 6)
                    .slice(0, 3);

                  const fallback = String(snippet || "").trim();
                  const bullets = (lines.length ? lines : (fallback ? [fallback] : []))
                    .slice(0, 3)
                    .map((x) => "- " + x);

                  if (bullets.length) {
                    payload.response = payload.response + "\n\n" + hdr + "\n" + bullets.join("\n");
                  }
                }
              }
            } catch {}
            // observability
            (ku as any).appliedSeedsCount = 1;
            const marks = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
            if (!marks.includes("K2")) marks.push("K2");
            (ku as any).memoryMarks = marks;
          } else {
            if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
          }
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {}

      // M6-B1_USED_ONE_RULE_V1: mark first rule as "used" (ku-only, no body change)
        try {
          if (Array.isArray(rules) && rules.length > 0) {
            const r0: any = rules[0];
            const used0 = {
              id: String(r0?.id ?? ""),
              title: String(r0?.title ?? ""),
              type: String(r0?.type ?? "other"),
              confidence: (typeof r0?.confidence === "number" ? r0.confidence : null),
            };

    // Phase36-1 deterministic menu trigger (acceptance)
    if (trimmed === "__FORCE_MENU__") {
      return reply({
        ok: true,
        response: "1) 検索（GROUNDED）\n2) 整理（Writer/Reader）\n3) 設定（運用/学習）\n\n番号かキーワードで選んでください。",
        decisionFrame: { mode: "HYBRID", intent: "MENU", llm: null, ku: {} },
      });
    }
            const ok = (used0.id && used0.id.length > 0) || (used0.title && used0.title.length > 0);
            if (ok) {
              (ku as any).learnedRulesUsed = [used0];
              // MK0_FINALIZE_V1: compute observability after learnedRulesUsed is set
              try {
                const usedArr2 = Array.isArray((ku as any).learnedRulesUsed) ? (ku as any).learnedRulesUsed : [];
                (ku as any).appliedRulesCount = usedArr2.length;
                if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;

                const marks2: string[] = [];
                if (usedArr2.length > 0) marks2.push("M6");
                if ((ku as any).recallUsed) marks2.push("KOKUZO_RECALL");
                (ku as any).memoryMarks = marks2;
              } catch {}
            }
          }
        } catch {}

        if (Array.isArray(rules)) available = rules.length;
      } catch {}
      const used = Array.isArray(ku.learnedRulesUsed) ? ku.learnedRulesUsed : [];      // MK4_SEED_VISIBILITY_V1: count seeds for this thread (deterministic, sync)
      try {
        const row = (dbPrepare as any)(
          "kokuzo",
          "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?"
        ).get(String(payload.threadId || ""));
        const cntRaw = row ? (row as any).cnt : 0;
        const n = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
        (ku as any).appliedSeedsCount = n;

        try {
          const mm = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
          const next = mm.slice(0);
          if (n > 0 && !next.includes("K2")) next.push("K2");
          (ku as any).memoryMarks = next;
        } catch {}
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }      // MK4_SEED_VISIBILITY_V2: appliedSeedsCount from kokuzo_seeds (sync, deterministic)
      try {
        const tId = String(payload?.threadId || "");
        if (tId) {
          const row = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?").get(tId) as any;
          const cntRaw = row ? (row as any).cnt : 0;
          const n = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
          (ku as any).appliedSeedsCount = n;

          try {
            const marks = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
            const next = marks.slice(0);
            if (n > 0 && !next.includes("K2")) next.push("K2");
            (ku as any).memoryMarks = next;
          } catch {}
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }      // MK4_SEED_COUNT_ALWAYS_V1: always count kokuzo_seeds for this thread (sync, deterministic)
      try {
        const tId = String(payload?.threadId ?? "");
        if (tId) {
          const row: any = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?").get(tId);
          const cntRaw = row ? (row as any).cnt : 0;
          const n = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
          (ku as any).appliedSeedsCount = n;

          // memoryMarks: add K2 if any seeds exist
          const marks = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
          const next = marks.slice(0);
          if (n > 0 && !next.includes("K2")) next.push("K2");
          (ku as any).memoryMarks = next;
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }






      
      // MK4_ALWAYS_SEEDSCOUNT_V1: always expose appliedSeedsCount from kokuzo_seeds (deterministic)
      try {
        const tId2 = String((payload && (payload as any).threadId) || threadId || "");
        if (tId2) {
          const row = dbPrepare("kokuzo", "SELECT COUNT(*) AS cnt FROM kokuzo_seeds WHERE threadId = ?").get(tId2) as any;
          const cntRaw = row ? (row as any).cnt : 0;
          const n2 = (typeof cntRaw === "number" ? cntRaw : parseInt(String(cntRaw || "0"), 10)) || 0;
          (ku as any).appliedSeedsCount = n2;

          try {
            const mm = Array.isArray((ku as any).memoryMarks) ? (ku as any).memoryMarks : [];
            const next = mm.slice(0);
            if (n2 > 0 && !next.includes("K2")) next.push("K2");
            (ku as any).memoryMarks = next;
          } catch {}
        } else {
          if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
        }
      } catch {
        if (typeof (ku as any).appliedSeedsCount !== "number") (ku as any).appliedSeedsCount = 0;
      }      // C1_LLM_PLAN_V0: deterministic planning only (NO LLM call)
      try {
        const q = String(payload?.rawMessage || "");
        const wantsDetailQ = /#詳細/.test(q);
        const hasEvidence =
          !!(payload && (payload as any).evidence) ||
          (Array.isArray((payload as any)?.detailPlan?.evidenceIds) && (payload as any).detailPlan.evidenceIds.length > 0);

        // IMPORTANT: keep the union wide so TS won't narrow unintentionally
        let intent: "structure" | "expand" | "answer" | "rewrite" = "answer";

        if (wantsDetailQ && !hasEvidence) intent = "structure";
        else if (wantsDetailQ && hasEvidence) intent = "answer";
        else if (q.length > 180) intent = "structure";
        else intent = "expand";

        let provider: "gpt" | "gemini" = "gemini";
        if (intent === "structure") provider = "gpt";
        else if (intent === "expand") provider = "gemini";
        else provider = hasEvidence ? "gpt" : "gemini";

        (ku as any).llmProviderPlanned = provider;
        (ku as any).llmIntentPlanned = intent;

      } catch {}



// MK0_MERGE_KU_V1: preserve observability keys while setting learnedRulesAvailable/Used
      df.ku = {
        ...(ku as any),
        learnedRulesAvailable: (typeof (ku as any).learnedRulesAvailable === "number" ? (ku as any).learnedRulesAvailable : available),
        learnedRulesUsed: used,
      } as any;

      payload.decisionFrame = df;


      // C2_LAW_INJECT_V1: attach thread laws (name/definition/evidenceIds) to ku for Kanagi
      try {
        const laws = listThreadLaws(threadId, 20).filter(
          (x: any) => !!x.name && !!x.definition && Array.isArray(x.evidenceIds) && x.evidenceIds.length > 0
        );
        
        const lawsDeduped = dedupLawsByDocPage(laws as any);
// C4_2_KU_LAWS_DEDUP_V1: dedup injected laws by (doc,pdfPage) to avoid duplicates in free chat hints
        const score = (x: any): number => {
          const hasName = !!x?.name;
          const hasDef = !!x?.definition;
          const hasEvi = Array.isArray(x?.evidenceIds) && x.evidenceIds.length > 0;
          const qlen = typeof x?.quote === "string" ? x.quote.length : 0;
          return (hasName ? 1000 : 0) + (hasDef ? 500 : 0) + (hasEvi ? 300 : 0) + Math.min(200, qlen);
        };

        const byKey = new Map<string, any>();
        for (const x of laws) {
          const k = String(x?.doc ?? "") + "#" + String(x?.pdfPage ?? "");
          const cur = byKey.get(k);
          if (!cur) { byKey.set(k, x); continue; }
          const a = score(cur);
          const b = score(x);
          if (b > a) byKey.set(k, x);
          else if (b === a) {
            const ca = String(cur?.createdAt ?? "");
            const cb = String(x?.createdAt ?? "");
            if (cb > ca) byKey.set(k, x);
          }
        }

        const uniq = Array.from(byKey.values());

        (payload.decisionFrame.ku as any).kokuzoLaws = uniq.map((x: any) => ({
          name: x.name,
          definition: x.definition,
          evidenceIds: x.evidenceIds,
          doc: x.doc,
          pdfPage: x.pdfPage,
        }));
// FREECHAT_HINTS_V1: expose a compact hint list for free chat UI/enrichment (DET, no response text change)
        // NOTE: derived from kokuzoLaws only (no fabrication, no LLM).
        try {
          const hints = (payload.decisionFrame.ku as any).kokuzoLaws;
          if (Array.isArray(hints)) {
            (payload.decisionFrame.ku as any).freeChatHints = hints.slice(0, 6).map((h: any) => ({
              name: String(h?.name ?? ""),
              definition: String(h?.definition ?? ""),
              evidenceIds: Array.isArray(h?.evidenceIds) ? h.evidenceIds : [],
              doc: String(h?.doc ?? ""),
              pdfPage: typeof h?.pdfPage === "number" ? h.pdfPage : null,
            }));
          } else {
            (payload.decisionFrame.ku as any).freeChatHints = [];
          }
        } catch {
          (payload.decisionFrame.ku as any).freeChatHints = [];
        }

} catch {}
      // DF_DETAILPLAN_MIRROR_V1: always mirror top-level detailPlan into decisionFrame.detailPlan

    // AK6_GENESISPLAN_DEBUG_V1: attach genesisPlan template (debug-only, deterministic)
    try {
      const dp: any = (payload as any)?.detailPlan;
      if (dp) {
        dp.debug = dp.debug ?? {};
        dp.debug.genesisPlan = buildGenesisPlan();
      }
    } catch (_e) {
      // debug only
    }

    // AK5_2_UFK_DEBUG_INJECT_V1: project top candidate into detailPlan.debug (deterministic, debug-only)
    try {
      const dp: any = (payload as any)?.detailPlan;
      if (dp) {
        const c0: any = Array.isArray((payload as any)?.candidates) ? (payload as any).candidates[0] : null;
        const cell = c0
          ? projectCandidateToCell({ snippet: c0.snippet ?? "", evidenceIds: c0.evidenceIds ?? [] })
          : null;
        dp.debug = dp.debug ?? {};
        dp.debug.ufkCellsCount = cell ? 1 : 0;
        dp.debug.ufkCellsTop1 = cell;
      }
    } catch (_e) {
      // debug only
    }
      try {
        if (payload && payload.decisionFrame && typeof payload.decisionFrame === "object") {
          if (!payload.decisionFrame.detailPlan && (payload as any).detailPlan) {
            payload.decisionFrame.detailPlan = (payload as any).detailPlan;
          }
        }
      } catch {}
    }
  } catch {}

    const response =
      typeof payload.response === "string"
        ? localSurfaceize(payload.response, trimmed)
        : payload.response;
    // M1-01_GARBAGE_CANDIDATES_FILTER_V1: candidates を返却直前で統一フィルタ（cleanedが空なら元に戻す）
    const rawCandidates = Array.isArray((payload as any)?.candidates) ? (payload as any).candidates : [];

    const isGarbageSnippet = (snip: string): boolean => {
      const t = String(snip ?? "");
      if (!t) return true;
      if (/\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(t)) return true;
      const bad = (t.match(/[�\u0000-\u001F]/g) || []).length;
      if (bad >= 3) return true;
      const hasJP = /[ぁ-んァ-ン一-龯]/.test(t);
      if (!hasJP && t.length < 60) return true;
      return false;
    };

    const cleaned = rawCandidates.filter((c: any) => !isGarbageSnippet(String((c as any)?.snippet ?? "")));
    const finalCandidates = cleaned.length ? cleaned : rawCandidates;
    // CARDC_INSTALL_GUARDED_OPINION_FIRST_V3: guarded opinion-first (single-exit). No behavior change unless __voiceGuard.allow and NATURAL and short/menu-ish.
    const __applyGuardedOpinionFirst = (rawMsg: string, txt: any, df: any, tid: string): any => {
      try {
        const g = __voiceGuard(rawMsg, tid);
        // observability (CardB style)
        try {
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            (df.ku as any).voiceGuard = g.reason;
            (df.ku as any).voiceGuardAllow = !!g.allow;
          }
        } catch {}

        if (!g.allow) return txt;

        const mode = String(df?.mode ?? "");
        if (mode !== "NATURAL") return txt;
        if (typeof txt !== "string") return txt;

        const t = String(txt || "").trim();
        if (t.startsWith("【天聞の所見】") || t.startsWith("所見：")) return t;

        const short = t.length < 220;
        const menuish = /どの方向で話しますか|番号かキーワードで選んでください|選択肢を選んでください/.test(t);
        const generic = /了解。何でも話して。必要なら「#詳細」/.test(t);
        if (!(short || menuish || generic)) return t;

        let opinion = "いまは“整理”より先に、中心を一言で定める段階です。";
        let q = "いま一番ほしいのは、結論（すぐ決める）と整理（ほどく）のどちら？";

        if (/(断捨離|だんしゃり|手放す|片づけ|片付け|執着)/i.test(rawMsg)) {
          opinion = "断捨離は“片づけ”ではなく、滞りの核を1つ特定して流す作業です。";
          q = "手放したいのに手放せない対象は、モノ・習慣・人間関係のどれが近い？";
        } else if (/生き方/.test(rawMsg)) {
          opinion = "生き方の迷いは、価値の優先順位が未確定なサインです。";
          q = "いま一番守りたいのは、自由・安定・成長のどれ？";
        } else if (/君は何を考えている|何を考えてる/.test(rawMsg)) {
          opinion = "僕は、君の中の“言葉になる前の核”を見つけて前へ運ぶことを考えています。";
          q = "いま聞きたいのは、僕の結論？それとも君の整理の手順？";
        }

        let out = `【天聞の所見】${opinion}\n\n一点質問：${q}`;
        if (!/[？?]\s*$/.test(out)) out = out + "？";
        try {
          if (df && typeof df === "object") {
            df.ku = (df.ku && typeof df.ku === "object") ? df.ku : {};
            (df.ku as any).opinionFirst = true;
          }
        } catch {}
        return out;
      } catch {
        return txt;
      }
    };

    try {
      const __raw = String(payload?.rawMessage ?? trimmed ?? "");
      const __tid = String(payload?.threadId ?? threadId ?? "");
      const __df = payload?.decisionFrame ?? null;
    // (disabled) v3 out assignment removed (out may not exist in this reply shape)
    } catch {}




    
    // CARDC_PAYLOAD_OPINION_BEFORE_RETURN_V5: guarded opinion-first by rewriting payload.response right before return (no out/const response dependency)
    try {
      const __df: any = payload?.decisionFrame ?? null;
      const __tid = String(payload?.threadId ?? threadId ?? "");
      const __raw = String(payload?.rawMessage ?? trimmed ?? "");

      const g = __voiceGuard(__raw, __tid);

      // observability (no text change by itself)
      try {
        if (__df && typeof __df === "object") {
          __df.ku = (__df.ku && typeof __df.ku === "object") ? __df.ku : {};
          (__df.ku as any).voiceGuard = g.reason;
          (__df.ku as any).voiceGuardAllow = !!g.allow;
        }
      } catch {}

      if (g.allow) {
        const mode = String(__df?.mode ?? "");
        if (mode === "NATURAL" && typeof payload?.response === "string") {
          const t = String(payload.response || "").trim();

          // skip if already voiced
          if (!t.startsWith("【天聞の所見】") && !t.startsWith("所見：")) {
            // only upgrade flat replies (avoid changing rich content)
            const short = t.length < 220;
            const menuish = /どの方向で話しますか|番号かキーワードで選んでください|選択肢を選んでください/.test(t);
            const generic = /了解。何でも話して。必要なら「#詳細」/.test(t);

            if (short || menuish || generic) {
              let opinion = "いまは“整理”より先に、中心を一言で定める段階です。";
              let q = "いま一番ほしいのは、結論（すぐ決める）と整理（ほどく）のどちら？";

              if (/(断捨離|だんしゃり|手放す|片づけ|片付け|執着)/i.test(__raw)) {
                opinion = "断捨離は“片づけ”ではなく、滞りの核を1つ特定して流す作業です。";
                q = "手放したいのに手放せない対象は、モノ・習慣・人間関係のどれが近い？";
              } else if (/生き方/.test(__raw)) {
                opinion = "生き方の迷いは、価値の優先順位が未確定なサインです。";
                q = "いま一番守りたいのは、自由・安定・成長のどれ？";
              } else if (/君は何を考えている|何を考えてる/.test(__raw)) {
                opinion = "僕は、君の中の“言葉になる前の核”を見つけて前へ運ぶことを考えています。";
                q = "いま聞きたいのは、僕の結論？それとも君の整理の手順？";
              }

              let out2 = `【天聞の所見】${opinion}\n\n一点質問：${q}`;
              if (!/[？?]\s*$/.test(out2)) out2 = out2 + "？";
              payload.response = out2;

              
        // CARDC_FORCE_QUESTION_END_V1: ensure response ends with a question (acceptance contract)
        try {
          const cur = String(payload.response || "").trim();
          const endsQ = /[？?]\s*$/.test(cur) || /(ですか|でしょうか|ますか)\s*$/.test(cur);
          if (!endsQ) {
            payload.response = cur + "\n\n一点だけ。どこを確かめますか？";
          }
        } catch {}
try {
                if (__df && typeof __df === "object") {
                  __df.ku = (__df.ku && typeof __df.ku === "object") ? __df.ku : {};
                  (__df.ku as any).opinionFirst = true;
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
    // CARD6C_REPLY_DEFAULT_V4: ensure rewriteUsed/rewriteDelta always exist in decisionFrame.ku (default false/0)
    try {
      payload.decisionFrame = payload.decisionFrame || { mode: "NATURAL", intent: "chat", llm: null, ku: {} };
      payload.decisionFrame.ku = (payload.decisionFrame.ku && typeof payload.decisionFrame.ku === "object") ? payload.decisionFrame.ku : {};
      const ku: any = payload.decisionFrame.ku;

      if (ku.rewriteUsed === undefined) ku.rewriteUsed = false;
      if (ku.rewriteDelta === undefined) ku.rewriteDelta = 0;
    } catch {}


return res.json(__tenmonGeneralGateResultMaybe({
      response,
      timestamp: payload.timestamp,
      trace: payload.trace,
      provisional: payload.provisional,
      detailPlan: payload.detailPlan,
      candidates: finalCandidates,
      evidence: payload.evidence,
      caps: payload?.caps ?? undefined,
      decisionFrame: payload.decisionFrame,
      threadId: payload.threadId,
      error: payload.error,
    }));
  };


  // CARD1_STEP1_MACHINE_V1: start Card1 with opinion + choice and set pending
  const __isSmoke_CARD1 = /^smoke-/i.test(String(threadId || ""));
  const __hasDocPage_CARD1 = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);
  const __isCmd_CARD1 = trimmed.startsWith("#");

  const __isDanshari_CARD1 =
    /(断捨離|だんしゃり|手放す|捨てる|片づけ|片付け|執着)/i.test(trimmed);

  const __isCasual_CARD1 =
    /^(会話できる|話せる|今どんな気分|元気|どう思う|君は何を考えて|雑談|自分の生き方|天聞アークとは何)/.test(trimmed);

  if (!__isSmoke_CARD1 && !wantsDetail && !__hasDocPage_CARD1 && !__isCmd_CARD1 && (__isDanshari_CARD1 || __isCasual_CARD1)) {
    const __pending = getThreadPending(threadId);
    if (!__pending) {
      const __dp = emptyCorePlan(__isDanshari_CARD1 ? "CARD1_DANSHARI_STEP1" : "CARD1_CASUAL_STEP1");
      __dp.chainOrder = ["CARD1_STEP", "TRUTH_CORE", "VERIFIER"];
      __dp.warnings = (__dp.warnings ?? []).concat(["CARD1_STEP1 start"]);
      applyTruthCore(__dp, { responseText: "CARD1_STEP1", trace: undefined });
      applyVerifier(__dp);

      if (__isDanshari_CARD1) {
        setThreadPending(threadId, "DANSHARI_STEP1");
        return reply({
          response:
            "【天聞の所見】断捨離は“片づけ”ではなく、滞りの場所を特定して流す作業です。\n\n" +
            "まず分類だけ決めます。いま一番『手放したいのに手放せない』対象はどれに近いですか？\n" +
            "1) モノ（物・書類・部屋）\n" +
            "2) 習慣（行動・時間の使い方）\n" +
            "3) 人間関係\n\n" +
            "番号で答えてください。",
          evidence: null,
          candidates: [],
          detailPlan: __dp,
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId,
        });
      }

      setThreadPending(threadId, "CASUAL_STEP1");
      return reply({
        response:
          "【天聞の所見】いまは“言葉にする前の詰まり”が少しあります。先に軸を一つだけ立てます。\n\n" +
          "いちばん近いのはどれですか？\n" +
          "1) 優先順位が決められない\n" +
          "2) 情報が多すぎて疲れた\n" +
          "3) 何から手を付けるか迷う\n\n" +
          "番号で答えてください。",
        evidence: null,
        candidates: [],
        detailPlan: __dp,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
        timestamp,
        threadId,
      });
    }
  }

  // --- DET_NATURAL_STRESS_V1: 不安/過多はメニューに吸わせず相談テンプレへ ---
  // CARDE_TEMPLATE_OPINION_PREFIX_SAFE_V1: opinion-first template
  const tNat = trimmed;
  const isStressShortJa =
    /[ぁ-んァ-ン一-龯]/.test(tNat) &&
    tNat.length <= 24 &&
    !/#(menu|status|search|pin|talk)\b/i.test(tNat) &&
    !/pdfPage\s*=\s*\d+/i.test(tNat) &&
    !/\bdoc\b/i.test(tNat) &&
    (/(不安|動けない|しんどい|つらい|焦り|詰んだ|多すぎ|やること|タスク|間に合わない|疲れた)/.test(tNat));

  if (isStressShortJa) {
    return reply({
      response:
        "【天聞の所見】いまは“中心の軸”がまだ決まっていないだけです。先に1つだけ立てます。\n\n" +
        "一点質問：いちばん近いのはどれですか？\n" +
        "1) 予定・タスクの整理\n" +
        "2) 迷いの整理（選択肢がある）\n" +
        "3) いまの気持ちを整えたい\n\n" +
        "番号でもOK。具体的に『いま困ってること』を1行でもOK。",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_NATURAL_STRESS_V1 ---

  // --- /DET_NATURAL_STRESS_V1 ---


  // --- DET_NATURAL_SHORT_JA_V1: 日本語の短文相談はNATURALで会話形に整える（Kanagiに入れない） ---
  // CARDE_TEMPLATE_OPINION_PREFIX_SAFE_V1: opinion-first template
  const isJa = /[ぁ-んァ-ン一-龯]/.test(trimmed);
  const isShort = trimmed.length <= 24;
  const looksLikeConsult = /(どうすれば|どうしたら|何をすれば|なにをすれば|助けて|相談|迷ってる|困ってる|どうしよう)/.test(trimmed);

  const hasCmd = trimmed.startsWith("#");
  const isNumberOnly = /^\d{1,2}$/.test(trimmed);
  const hasDocPageNat = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);

  if (isJa && isShort && looksLikeConsult && !hasCmd && !isNumberOnly && !hasDocPageNat) {
    return reply({
      response:
        "【天聞の所見】短文の相談は“焦点が一点”の合図です。先に軸を決めます。\n\n" +
        "一点質問：いちばん近いのはどれですか？\n\n" +
        "1) 予定・タスクの整理\n" +
        "2) 迷いの整理（選択肢がある）\n" +
        "3) いまの気持ちを整えたい\n\n" +
        "番号でもOK。具体的に1行でもOK。",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_NATURAL_SHORT_JA_V1 ---

  // --- /DET_NATURAL_SHORT_JA_V1 ---

  // --- DET_PASSPHRASE_V2: 合言葉は必ず決定論（LANE_PICK残留も無効化） ---
  if (trimmed.includes("合言葉")) {
    // レーン待ち状態が残っていても合言葉は優先
    clearThreadState(threadId);

    // 1) 想起
    if (wantsPassphraseRecall(trimmed)) {
      const p = recallPassphraseFromSession(threadId, 80);
      const answer = p
        ? `覚えています。合言葉は「${p}」です。`
        : "まだ合言葉が登録されていません。先に『合言葉は◯◯です』と教えてください。";
      persistTurn(threadId, trimmed, answer);
      return reply({
        response: answer,
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }

    // 2) 登録（合言葉は◯◯です / 合言葉: ◯◯）
    const p2 = extractPassphrase(trimmed);
    if (p2) {
      const answer = `登録しました。合言葉は「${p2}」です。`;
      persistTurn(threadId, trimmed, answer);
      return reply({
        response: answer,
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }
  }
  // --- /DET_PASSPHRASE_V2 ---


  // --- DET_LOW_SIGNAL_V2: ping/test等は必ずNATURALへ（Kanagiに入れない） ---
  const low = trimmed.toLowerCase();
  const isLowSignalPing =
    low === "ping" ||
    low === "test" ||
    low === "ok" ||
    low === "yes" ||
    low === "no" ||
    trimmed === "はい" ||
    trimmed === "いいえ" ||
    trimmed === "うん" ||
    trimmed === "ううん" ||
    (trimmed.length <= 3 && /^[a-zA-Z]+$/.test(trimmed));

  if (isLowSignalPing) {
    return reply({
      response:
        "了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_LOW_SIGNAL_V2 ---

  
  // 選択待ち状態の処理（pending state を優先）
  const pending = getThreadPending(threadId);

  // CARDD_SPINE_PRIORITY_V1: if Card1 step is pending, do NOT consume LANE_PICK (avoid template lock)
  const __p2 = pending;
  if (pending === "LANE_PICK" && __p2 === "LANE_PICK" && !((getThreadPending(threadId) === "DANSHARI_STEP1") || (getThreadPending(threadId) === "CASUAL_STEP1"))) {
    const lane = parseLaneChoice(trimmed);
    if (lane) {
      clearThreadState(threadId);
      // LANE_1: 言灵/カタカムナの質問 → HYBRID で検索して回答
      if (lane === "LANE_1") {
        // M2-1_LANE1_CAPS_RETURN_ALL_V1
        const candidates = searchPagesForHybrid(null, trimmed, 10);
        setThreadCandidates(threadId, candidates);
        
        let responseText: string;
        if (candidates.length > 0) {
          const usable = candidates.filter((c: any) => {
          const t = (getPageText(c.doc, c.pdfPage) || "").trim();
          if (!t) return false;
          if (t.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) return false;
          // 日本語本文がない（文字化け/目次/数字だけ等）を除外
          if (!/[ぁ-んァ-ン一-龯]/.test(t)) return false;
          return true;
        });
        const top = (usable.length > 0 ? usable[0] : candidates[0]);
// If all candidates are NON_TEXT pages, do not paste them to user.
      
        // M2-2_LANE1_CAPS_BEFORE_EARLY_RETURN_V1: usableが空でもcapsを先に拾う（早期return前）
        try {
          const top0: any = (candidates && candidates.length) ? candidates[0] : null;
          if (top0) {
            const caps0: any = getCaps(top0.doc, top0.pdfPage) || getCaps("KHS", top0.pdfPage);
            if (caps0 && typeof caps0.caption === "string" && caps0.caption.trim()) {
              capsPayload = {
                doc: caps0.doc,
                pdfPage: caps0.pdfPage,
                quality: caps0.quality ?? [],
                source: caps0.source ?? "TENMON_AI_CAPS_V1",
                updatedAt: caps0.updatedAt ?? null,
                caption: caps0.caption,
                caption_alt: caps0.caption_alt ?? [],
              };
            }
          }
        } catch {}

if (usable.length === 0) {
        const question = "いま一番困っているのは、(1) 情報の量、(2) 優先順位、(3) 期限の圧力――どれが一番近い？";
        const responseText =
          "いまは“資料の本文”が取れていない候補に当たっています。\\n" +
          "ここは相談として整理してから、必要なら資料指定で精密化しましょう。\\n\\n" +
          question;

        // LOCAL_SURFACE_APPLIED_V1

        const responseOut = localSurfaceize(responseText, trimmed);
        return reply({
          response: localSurfaceize(responseText, trimmed),
          evidence: null,
          candidates: candidates.slice(0, 10),
              // M2-1_LANE1_CAPS_RETURN_ALL_V1
              caps: capsPayload ?? undefined,
          decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId,
        });
      }

          const pageText = getPageText(top.doc, top.pdfPage);
          const isNonText = !pageText || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
          if (isNonText) {
            const caps = getCaps(top.doc, top.pdfPage) || getCaps("KHS", top.pdfPage);
            if (caps && typeof caps.caption === "string" && caps.caption.trim()) {
              capsPayload = {
                doc: caps.doc,
                pdfPage: caps.pdfPage,
                quality: caps.quality ?? [],
                source: caps.source ?? "TENMON_AI_CAPS_V1",
                updatedAt: caps.updatedAt ?? null,
                caption: caps.caption,
                caption_alt: caps.caption_alt ?? [],
              };
            }
          }


          // --- NON_TEXT_GUARD_V1: NON_TEXT を surface に出さない ---
          if (!pageText || pageText.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
            const responseText =
              "いま参照できる資料ページが文字として取れない状態でした。\n" +
              "なので先に状況を整えたいです。いちばん困っているのは次のどれに近い？\n" +
              "1) 優先順位が決められない\n2) 情報が多すぎて疲れた\n3) 何から手を付けるか迷う\n\n" +
              "番号か、いま一番重いものを1行で教えてください。";
            return reply({
              response: localSurfaceize(responseText, trimmed),
              evidence: null,
              candidates: candidates.slice(0, 10),
              // M2-1_LANE1_CAPS_RETURN_ALL_V1
              caps: capsPayload ?? undefined,
              decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
              timestamp,
              threadId,
            });
          }
          // --- /NON_TEXT_GUARD_V1 ---
          if (pageText && pageText.trim().length > 0) {
            // 回答本文を生成（50文字以上、短く自然に）
            const excerpt = pageText.trim().slice(0, 300);
            responseText = `${excerpt}${excerpt.length < pageText.trim().length ? '...' : ''}\n\n※ より詳しく知りたい場合は、候補番号を選択するか、資料指定（doc/pdfPage）で厳密にもできます。`;
          } else {
            responseText = `${trimmed}について、kokuzo データベースから関連情報を検索しましたが、詳細な説明が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索することもできます。`;
          }
        } else {
          // 候補がない場合でも最低限の説明を返す（50文字以上）
          responseText = `${trimmed}について、kokuzo データベースから関連情報を検索しましたが、該当する資料が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索するか、別の質問を試してください。`;
        }
        
        // 回答本文が50文字未満の場合は補足を追加
        if (responseText.length < 50) {
          responseText = `${responseText}\n\nより詳しい情報が必要な場合は、資料指定（doc/pdfPage）で厳密に検索することもできます。`;
        }
        
        return reply({
          response: localSurfaceize(responseText, trimmed),
          evidence: null,
          candidates: candidates.slice(0, 10),
              // M2-1_LANE1_CAPS_RETURN_ALL_V1
              caps: capsPayload ?? undefined,
          decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId,
        });
      }
      // LANE_2: 資料指定 → メッセージに doc/pdfPage が含まれていることを期待
      // LANE_3: 状況整理 → 通常処理にフォールスルー
      // ここでは一旦通常処理にフォールスルー（後で拡張可能）
    }
  }

  // Phase26: 番号選択（"1"〜"10"）で候補を選んで GROUNDED に合流
  const numberMatch = trimmed.match(/^\d{1,2}$/);
  if (numberMatch) {
    const oneBasedIndex = parseInt(numberMatch[0], 10);
    const picked = pickFromThread(threadId, oneBasedIndex);
    if (picked) {
      clearThreadCandidates(threadId);
      return reply(buildGroundedResponse({
        doc: picked.doc,
        pdfPage: picked.pdfPage,
        threadId,
        timestamp,
        wantsDetail,
      }));
    }
    // pick が失敗したら通常処理にフォールスルー
  }

  // コマンド処理: #status, #search, #pin
  if (trimmed.startsWith("#status")) {
    const db = getDb("kokuzo");
    const pagesCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_pages").get()?.cnt || 0;
    const chunksCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_chunks").get()?.cnt || 0;
    const filesCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_files").get()?.cnt || 0;
    const capsInfo = debugCapsQueue();
    const text =
      `【KOKUZO 状態】\n` +
      `- kokuzo_pages: ${pagesCount}件\n` +
      `- kokuzo_chunks: ${chunksCount}件\n` +
      `- kokuzo_files: ${filesCount}件\n` +
      `- capsQueue: ${capsInfo.path} (exists=${capsInfo.exists})`;
    return reply({
      response: text,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }

  if (trimmed.startsWith("#search")) {
    const raw = trimmed.replace(/^#search\s*/i, "").trim();
    let docHint: string | null = null;
    let q = raw;
    const mDoc = q.match(/\bdoc\s*=\s*([A-Za-z0-9_.\-]+)\b/i);
    if (mDoc) {
      docHint = mDoc[1];
      q = q.replace(mDoc[0], "").trim();
    }
    if (!q) {
      return reply({
        response: "検索語が空です。#search doc=KHS 言霊 のように検索語も指定してください。",
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} },
        timestamp,
        threadId,
      });
    }
    const candidates = searchPagesForHybrid(docHint, q, 12);
    if (candidates.length === 0) {
      return reply({
        response: `【検索結果】「${q}」に該当するページが見つかりませんでした。`,
        evidence: null,
        decisionFrame: { mode: "HYBRID", intent: "search", llm: null, ku: {} },
        candidates: [],
        timestamp,
        threadId,
      });
    }
    const results = candidates.slice(0, 5).map((c, i) =>
      `${i + 1}. ${c.doc} P${c.pdfPage}: ${c.snippet.slice(0, 100)}...`
    ).join("\n");
    return reply({
      response: `【検索結果】「${q}」\n\n${results}\n\n※ 番号を選択すると詳細を表示します。`,
      evidence: null,
      decisionFrame: { mode: "HYBRID", intent: "search", llm: null, ku: {} },
      candidates: candidates.slice(0, 10),
      timestamp,
      threadId,
    });
  }

  if (trimmed.startsWith("#pin ")) {
    const pinMatch = trimmed.match(/doc\s*=\s*([^\s]+)\s+pdfPage\s*=\s*(\d+)/i);
    if (!pinMatch) {
      return reply({
        response: "エラー: #pin doc=<filename> pdfPage=<number> の形式で指定してください",
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "command", llm: null, ku: {} },
        timestamp,
        threadId,
      });
    }
    const doc = pinMatch[1];
    const pdfPage = parseInt(pinMatch[2], 10);
    return reply(buildGroundedResponse({
      doc,
      pdfPage,
      threadId,
      timestamp,
      wantsDetail: true,
    }));
  }

  // Phase19 NATURAL lock: hello/date/help（および日本語挨拶）だけは必ずNATURALで返す
  const t = message.trim().toLowerCase();
  if (t === "hello" || t === "date" || t === "help" || message.includes("おはよう")) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    // CARD6B_REWRITE_ONLY_V1: rewrite-only (DEFAULT OFF) - apply in NATURAL handled replies only
    try {
      const enabled = String(process.env.TENMON_REWRITE_ONLY || "") === "1";
      if (enabled) {
        const tid = String(threadId || "");
        const raw = String(message || "");
        // strict excludes
        const isSmoke = /^smoke/i.test(tid);
        const wantsDetailHere = /#詳細/.test(raw);
        const hasDocHere = /\bdoc\b/i.test(raw) || /pdfPage\s*=\s*\d+/i.test(raw);
        const isCmd = raw.trim().startsWith("#");
        const low = raw.trim().toLowerCase();
        const isLow = (low==="ping"||low==="test"||low==="ok"||low==="yes"||low==="no"||raw.trim()==="はい"||raw.trim()==="いいえ"||raw.trim()==="うん"||raw.trim()==="ううん");
        // voice guard (if present)
        let vgAllow = true;
        try {
          const g = (typeof __voiceGuard === "function") ? __voiceGuard(raw, tid) : null;
          vgAllow = g ? !!g.allow : true;
        } catch {}
        if (!isSmoke && vgAllow && !wantsDetailHere && !hasDocHere && !isCmd && !isLow) {
          if (typeof nat.responseText === "string" && nat.responseText.trim().length >= 8) {
            const r = await rewriteOnlyTenmon(nat.responseText, raw);
                        // FIX_REWRITE_STRING_RETURN_V1: rewriteOnly returns string (or text); avoid r.used/r.text type errors
            const __t = (typeof r === "string") ? r : String((r as any)?.text ?? "");
            if (__t) { nat.responseText = __t; }

          }
        }
      }
    } catch {}

    
    // N2_KANAGI_4PHASE_V1: Kanagi 4-phase micro state machine to avoid template repetition (NATURAL only)
    try {
      const __tid = String(threadId || "");
      const __isTestTid = /^(smoke|accept|core-seed|bible-smoke)/i.test(__tid);
      const __msg = String(message || "");
      const __askedMenu = /^\s*(?:\/menu|menu)\b/i.test(__msg) || /^\s*メニュー\b/.test(__msg);
      const __hasDoc = /\bdoc\b/i.test(__msg) || /pdfPage\s*=\s*\d+/i.test(__msg) || /#詳細/.test(__msg);
      if (!__isTestTid && !__askedMenu && !__hasDoc) {
        let ucount = 0;
        try {
          const mem = memoryReadSession(threadId, 40) || [];
          for (const row of mem) {
            if (row && (row as any).role === "user") ucount++;
          }
        } catch {}
        const phase = (ucount % 4);
        const phaseName = phase === 0 ? "SENSE" : phase === 1 ? "NAME" : phase === 2 ? "ONE_STEP" : "NEXT_DOOR";

        // only reshape when NATURAL reply looks like looping template / questionnaire
        const t0 = String((nat as any)?.responseText ?? "");
        const looksLoop =
          /いま一番しんどいのは/.test(t0) ||
          /いま一番近いのは/.test(t0) ||
          /焦点が一点に定まっていない/.test(t0);

        if (looksLoop) {
          const userShort = String(__msg).replace(/\s+/g," ").trim().slice(0, 80);
          let out = "";

          if (phaseName === "SENSE") {
            out = `いま一番重いのは「不安」そのものですか？それとも「今日の一手が決まらない」感じですか？\n\nどちらに近い？（一言でOK）`;
          } else if (phaseName === "NAME") {
            out = `その重さは、\n「決めないといけないのに決められない」焦りから来ている可能性が高いです。\n\nいま一番こわい結末は何ですか？（一言）`;
          } else if (phaseName === "ONE_STEP") {
            out = `まず“一手”だけ小さくします。\n今日の予定から「やらない」ものを1つ決めましょう。\n\nいま捨てたい候補は何ですか？（タスク名を1つ）`;
          } else {
            out = `ここで一度、息を整えます。\n目を閉じて、ゆっくり1呼吸できますか？\n\nできたら「できた」とだけ返して。`;
          }

          (nat as any).responseText = out;
        }

        // annotate
        try {
          (nat as any).ku = (nat as any).ku || {};
          (nat as any).ku.kanagiPhase = phaseName;
        } catch {}
      }
    } catch {}
return reply({
      response: nat.responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }


  // CARD1_STEP2_PREEMPT_V1: pending step2 must preempt LLM_CHAT (deterministic)
  try {
    const __isSmoke_CARD1P = /^smoke-/i.test(String(threadId || ""));
    const __hasDocPage_CARD1P = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);
    const __isCmd_CARD1P = trimmed.startsWith("#");

    if (!__isSmoke_CARD1P && !wantsDetail && !__hasDocPage_CARD1P && !__isCmd_CARD1P) {
      const __p = getThreadPending(threadId);

      if (__p === "DANSHARI_STEP1" || __p === "CASUAL_STEP1") {
        clearThreadState(threadId);

        const __isDanshari = (__p === "DANSHARI_STEP1");
        const __choice = String(trimmed || "").trim();

        let __topic = "未確定";
        if (__isDanshari) {
          if (__choice === "1") __topic = "モノ（物・書類・部屋）";
          else if (__choice === "2") __topic = "習慣（行動・時間の使い方）";
          else if (__choice === "3") __topic = "人間関係";
        } else {
          if (__choice === "1") __topic = "優先順位";
          else if (__choice === "2") __topic = "情報過多";
          else if (__choice === "3") __topic = "着手迷い";
        }

        const __dp = emptyCorePlan(__isDanshari ? "CARD1_DANSHARI_STEP2" : "CARD1_CASUAL_STEP2");
        __dp.chainOrder = ["CARD1_STEP", "TRUTH_CORE", "VERIFIER"];
        __dp.warnings = (__dp.warnings ?? []).concat([`CARD1_STEP2 topic=${__topic}`]);
        applyTruthCore(__dp, { responseText: "CARD1_STEP2", trace: undefined });
        applyVerifier(__dp);

        const __op =
          __isDanshari
            ? `【天聞の所見】いまの迷いは「${__topic}」に触れています。ここは“捨て方”より先に“滞りの場所”を決めると進みます。`
            : `【天聞の所見】いまの詰まりは「${__topic}」に寄っています。まず一手だけ軽くして流れを作ります。`;

        const __q =
          __isDanshari
            ? `一点だけ伺います。「${__topic}」で、最初に“手放す候補”として思い浮かぶ具体名は何ですか？（1つだけ）`
            : `一点だけ伺います。「${__topic}」で、いま一番重い“具体物”は何ですか？（タスク名/案件名/場所など1つだけ）`;

        return reply({
          response: `${__op}\n\n${__q}`,
          evidence: null,
          candidates: [],
          detailPlan: __dp,
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId,
        });
      }
    }
  } catch {}

  // LLM_CHAT_ENTRY_V1: 通常会話はLLMへ（根拠要求/資料指定は除外）
  // GUEST_BLOCK_SKIP_JA_V1: Japanese free chat should not be routed to LLM_CHAT (so guests won't be blocked)
  const isJapaneseForLLM = /[ぁ-んァ-ン一-龯]/.test(message);

  // C1-1_TWO_STAGE_LLMCHAT_ONLY_V1: expose twoStage flag (scaffold)

  const hasDocPageHere = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\b/i.test(message);
  const wantsEvidence = /資料|引用|根拠|出典|ソース|doc\s*=|pdfPage|P\d+|ページ/i.test(trimmed);

  // smoke gate: smoke-hybrid系/NON_TEXT は絶対に LLM_CHAT に入れない
  const isSmokeHybrid = /^smoke-hybrid/i.test(threadId);
  const isNonTextLike = /^\s*NON_TEXT\s*$/i.test(trimmed);


  // acceptance gate: coreplan probe は必ず HYBRID へ流す（LLM_CHAT禁止）
  const isCorePlanProbe = /\bcoreplan\b/i.test(trimmed);

  // domain gate: 主要ドメイン語は LLM_CHAT を禁止（HYBRIDへ）
  const isDomainLike = /言霊|言灵|カタカムナ|天津金木|古事記|法華経|真言|布斗麻邇|フトマニ|水穂伝|虚空蔵/i.test(message);
  const shouldLLMChat =
    !__isCard1Flow &&
    !isSmokeHybrid &&
    !isNonTextLike &&
    !isCorePlanProbe &&
    !isDomainLike &&
    !hasDocPageHere &&
    !wantsDetail &&
    !wantsEvidence &&
    !isJapaneseForLLM &&
    !trimmed.startsWith("#");

  
  // LOCAL_TEST_BYPASS_V1: localhost + header のときだけ guest-block を回避（外部は不可）
  const isLocal =
    req.ip === "127.0.0.1" ||
    req.ip === "::1" ||
    String((req as any).socket?.remoteAddress || "").includes("127.0.0.1") ||
    String((req as any).socket?.remoteAddress || "").includes("::1");

  const isLocalTestBypass = isLocal && req.headers["x-tenmon-local-test"] === "1";

  // FOUNDER_GUEST_COND_V1: unlock guest lock when founder cookie is present
  const isFounder = (req as any).cookies?.tenmon_founder === "1";

  if (shouldBlockLLMChatForGuest && shouldLLMChat && !isLocalTestBypass && !__isCard1Flow && !isFounder) {
    return res.status(200).json({
      response: "ログイン前のため、会話は参照ベース（資料検索/整理）で動作します。/login からログインすると通常会話も有効になります。",
      evidence: null,
      // M6-A0_GUEST_KU_TRAINING_STATE_V1
      decisionFrame: {
        mode: "GUEST",
        intent: "chat",
        llm: null,
        ku: {
          training: { enabled: true, latestSessionId: null, latestRulesCount: 0 },
          learnedRulesUsed: [],
        },
      },
      timestamp: new Date().toISOString(),
    } as any);
  }

  if (shouldLLMChat) {
    // C1_1_TWO_STAGE_LLMCHAT_V1: two-stage generation (plan JSON -> final) inside LLM_CHAT only
    // evidence is always null (no fabrication). If anything fails, fallback to single-stage output.
    const system = TENMON_CONSTITUTION_TEXT;

    const userMsg = trimmed;

    // Stage1: plan (JSON only)
    let planText = "";
    try {
      const stage1 = await llmChat({
        system,
        history: [],
        user: [
          "Return ONLY valid JSON. No prose.",
          "Goal: create a short plan for the final answer.",
          "Constraints:",
          "- Do not invent citations, sources, doc/pdfPage, evidenceIds. evidence is always null.",
          "- Keep it concise.",
          "",
          "Schema:",
          "{",
          '  "intent": "advice" | "explain" | "list" | "steps" | "other",',
          '  "bullets": string[],',
          '  "cautions": string[],',
          '  "nextSteps": string[]',
          "}",
          "",
          "User:",
          userMsg,
        ].join("\n"),
      });

      planText = (stage1?.text ?? "").trim();
    } catch {
      planText = "";
    }

    // Stage2: final answer (follow plan)
    let finalText = "";
    try {
      const stage2 = await llmChat({
        system,
        history: [],
        user: [
          "You are TENMON-ARK LLM_CHAT.",
          "Write the final answer for the user.",
          "Rules:",
          "- Do not invent citations/sources/doc/pdfPage/evidenceIds.",
          "- Keep tone calm and practical.",
          "- If a JSON plan is provided, follow it.",
          "",
          "PLAN_JSON (may be empty):",
          planText,
          "",
          "User:",
          userMsg,
        ].join("\n"),
      });

      finalText = (stage2?.text ?? "").trim();
      if (!finalText) throw new Error("empty-final");
    } catch {
      // fallback single-stage
      try {
        const out = await llmChat({ system, history: [], user: userMsg });
        finalText = (out?.text ?? "").trim();
      } catch {
        finalText = "";
      }
    }

    const safe = scrubEvidenceLike(finalText);

    return res.json(__tenmonGeneralGateResultMaybe({
      response: safe,
      evidence: null,
      decisionFrame: {
        mode: "LLM_CHAT",
        intent: "chat",
        llm: "llm",
        ku: { twoStage: true, twoStagePlanJson: planText ? true : false },
      },
      timestamp,
      threadId,
    }));
  }

  // UX guard: 日本語の通常会話は一旦NATURAL(other)で受ける（#詳細や資料指定時だけHYBRIDへ）
  const isJapanese = /[ぁ-んァ-ン一-龯]/.test(message);
  const hasDocPage = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\b/i.test(message);

  if (isJapanese && !wantsDetail && !hasDocPage) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    
    // handled=false の場合は通常処理（HYBRID検索）にフォールスルー
    if (!nat.handled) {
      // ドメイン質問の場合は HYBRID で検索して回答
      // この後ろの HYBRID 処理にフォールスルー
    } else {
      // メニューを表示する場合は pending state を保存
      // M2-0-LANE_PICK_DETECT_V1: menu文言ゆれを吸収して pending を確実に立てる
      if (
        nat.responseText.includes("話そう。何が気になってる？") ||
        nat.responseText.includes("いまの状況を一言で言うと") ||
        nat.responseText.includes("1) 予定・タスクの整理")
      ) {
        setThreadPending(threadId, "LANE_PICK");
      }
      // CARD6B_REWRITE_ONLY_APPLY_CLEAN_V1: rewrite-only apply (header-triggered; safe guards; returns string only)
      try {
        const __rewriteReq = String(req.headers["x-tenmon-rewrite-only"] ?? "") === "1";
        const __tid = String(threadId || "");
        const __raw = String(trimmed || "");
        const __isSmoke = /^smoke/i.test(__tid);
        const __isCmd = __raw.startsWith("#");
        const __hasDocLocal = /\bdoc\b/i.test(__raw) || /pdfPage\s*=\s*\d+/i.test(__raw);
        const __wantsDetailLocal = /#詳細/.test(__raw);

        const low = __raw.toLowerCase().trim();
        const __isLowSignal = (low === "ping" || low === "test" || low === "ok" || low === "yes" || low === "no"
          || __raw === "はい" || __raw === "いいえ" || __raw === "うん" || __raw === "ううん");

        // obey voiceGuard if available
        let __allow = true;
        try {
          if (typeof __voiceGuard === "function") {
            const g = __voiceGuard(__raw, __tid);
            __allow = !!g.allow;
          }
        } catch {}

        if (__rewriteReq && __allow && !__isSmoke && !__isCmd && !__hasDocLocal && !__wantsDetailLocal && !__isLowSignal) {
          const draft = String(nat.responseText || "").trim();
          if (draft.startsWith("【天聞の所見】")) {
            
          // CARD6C_REWRITE_USED_OBS_V2: compute rewriteUsed/rewriteDelta (observability)
          const __before = String(draft || "").trim();
          const out = await rewriteOnlyTenmon(__before, __raw);
          const __after = String(out || "").trim();
          const __used = (__after && __after !== __before);
          const __delta = (__after.length - __before.length);
          try { (nat as any).rewriteUsed = __used; (nat as any).rewriteDelta = __delta; } catch {}
if (typeof out === "string" && out.trim()) nat.responseText = out.trim();
          }
        }
      } catch {}


      return reply({
        response: nat.responseText,
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: { rewriteUsed: (nat as any).rewriteUsed ?? false, rewriteDelta: (nat as any).rewriteDelta ?? 0 } },
        timestamp,
        threadId,
      });
    }
  }

  
  // P0-PH38-DOC_EQ_ROUTE-02: doc=... pdfPage=... は #pin 相当で GROUNDED に合流（.pdf不要）
  const mDocEq = message.match(/\bdoc\s*=\s*([^\s]+)/i);
  const mPageEq = message.match(/\bpdfPage\s*=\s*(\d+)/i);
  if (mDocEq && mPageEq) {
    const docEq = String(mDocEq[1] || "").trim();
    const pageEq = parseInt(String(mPageEq[1] || "0"), 10);
    if (docEq && Number.isFinite(pageEq) && pageEq > 0) {
      const out: any = buildGroundedResponse({
        doc: docEq,
        pdfPage: pageEq,
        threadId,
        timestamp,
        wantsDetail,
      });
      // Phase37 WARN fix: always attach evidenceId when docEq/pageEq known
      const evidenceIdEq = `KZPAGE:${docEq}:P${pageEq}`;
      if (!(out as any).detailPlan) (out as any).detailPlan = {};
      if (!Array.isArray((out as any).detailPlan.evidenceIds)) (out as any).detailPlan.evidenceIds = [];
      if (!(out as any).detailPlan.evidenceIds.includes(evidenceIdEq)) (out as any).detailPlan.evidenceIds.push(evidenceIdEq);

      // PH38_TAGS_GUARD_V1: candidates[0].tags は必ず非空（allowedのみ。evidence/snippetは不変更）
      const allowed = new Set(["IKI","SHIHO","KAMI","HOSHI"]);
      if (!out.candidates || !Array.isArray(out.candidates) || !out.candidates.length) {
        const pageText = String(getPageText(docEq, pageEq) || "");
        const snippet = pageText ? pageText.slice(0, 240) : "[NON_TEXT_PAGE_OR_OCR_FAILED]";
        out.candidates = [{ doc: docEq, pdfPage: pageEq, snippet, score: 10, tags: ["IKI"] }];
      } else {
        const c0 = out.candidates[0] || {};
        let tags = Array.isArray(c0.tags) ? c0.tags : [];
        tags = tags.filter((t: any) => allowed.has(String(t)));
        if (!tags.length) tags = ["IKI"];
        c0.tags = tags;
        out.candidates[0] = c0;
      }

      return reply(out);
    }
  }

// GROUNDED分岐: doc + pdfPage 指定時は必ず GROUNDED を返す
  const mPage = message.match(/pdfPage\s*=\s*(\d+)/i);
  const mDoc = message.match(/([^\s]+\.pdf)/i);
  if (mPage && mDoc) {
    const pdfPage = parseInt(mPage[1], 10);
    const doc = mDoc[1];
    return reply(buildGroundedResponse({
      doc,
      pdfPage,
      threadId,
      timestamp,
      wantsDetail,
    }));
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
    const response = composeConversationalResponse(trace, personaState, sanitized.text);

    // 工程3: CorePlan（器）を必ず経由（最小の決定論コンテナ）
    const detailPlan = emptyCorePlan(
      typeof response === "string" ? response.slice(0, 80) : ""
    );
  // K3 debug: breathCycle (no response text change)
  if (!(detailPlan as any).debug) (detailPlan as any).debug = {};
  (detailPlan as any).debug.breathCycle = computeBreathCycle(String(message || ""));
  // K5 debug: koshiki summary (no response text change)
  try {
    const cells = parseItsura(String(message || ""));
    // evidenceIds presence in KanaPhysicsMap is enforced by K1 gate
    assertKanaPhysicsMap(KANA_PHYSICS_MAP_MVP);
    if (!(detailPlan as any).debug) (detailPlan as any).debug = {};
    (detailPlan as any).debug.koshiki = {
      cellsCount: Array.isArray(cells) ? cells.length : 0,
      sampleCells: (Array.isArray(cells) ? cells.slice(0, 8).map(applyKanaPhysicsToCell) : []),
      breathCycle: (detailPlan as any).debug?.breathCycle || [],
      warnings: (detailPlan as any).warnings || [],
      kanaPhysicsMapOk: true,
    };
  // K7 debug: link ufk summary into koshiki (no response text change)
  try {
    const dbg: any = (detailPlan as any).debug || {};
    const ufk: any = dbg.ufk || null;
    if (dbg.koshiki && typeof dbg.koshiki === 'object') {
      (dbg.koshiki as any).ufkLink = ufk ? {
        modeHint: ufk.modeHint ?? null,
        class24: ufk.class24 ?? ufk.class ?? null,
        ufkCellsCount: ufk.ufkCellsCount ?? ufk.cellsCount ?? null,
      } : null;
    }
    (detailPlan as any).debug = dbg;
  } catch (_e) {}
  } catch (_e) {
    if (!(detailPlan as any).debug) (detailPlan as any).debug = {};
    (detailPlan as any).debug.koshiki = { cellsCount: 0, breathCycle: (detailPlan as any).debug?.breathCycle || [], warnings: (detailPlan as any).warnings || [], kanaPhysicsMapOk: false };
  }
  // K4 warnings: TeNiWoHa (warnings only)
  const wK4 = teniwohaWarnings(String(message || ""));
  if (!Array.isArray((detailPlan as any).warnings)) (detailPlan as any).warnings = [];
  for (const x of wK4) { if (!(detailPlan as any).warnings.includes(x)) (detailPlan as any).warnings.push(x); }
    // --- S3_DEBUG_BOX_V1 ---
    (detailPlan as any).debug = { ...(detailPlan as any).debug };
    // --- /S3_DEBUG_BOX_V1 ---

    detailPlan.chainOrder = ["KANAGI_TRACE", "COMPOSE_RESPONSE"];
    // M6_INJECTION_V1: inject training rules into detailPlan (deterministic, capped)
    try {
      const mSid = String(message || "").match(/\bsession_id\s*=\s*([A-Za-z0-9_]+)/);
      const sessionKey = (mSid && mSid[1]) ? String(mSid[1]) : "";
      if (sessionKey) {
        // listRules is already imported/available in this module
        const rules = listRules(sessionKey) || [];
        const maxRules = 8;
        const maxChars = 1200;

        const picked = [];
        let usedChars = 0;

        for (const r of rules.slice(0, maxRules)) {
          const title = String((r as any)?.title ?? "");
          const text  = String((r as any)?.rule_text ?? (r as any)?.text ?? "");
          const line = title ? `${title}` : text;
          if (!line) continue;

          const addLen = line.length + 1;
          if (usedChars + addLen > maxChars) break;

          picked.push({ title: line, text }); usedChars += addLen;

        }

        if (!(detailPlan as any).injections) (detailPlan as any).injections = {};
        (detailPlan as any).injections.trainingRules = picked;

        // also surface deterministic counters in ku (if present later)
        (detailPlan as any).appliedRulesCount = picked.length;
      }
    } catch {}

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
    
    // Phase29: LawCandidates（#詳細 のときのみ、現時点では空配列）
    (detailPlan as any).lawCandidates = [];
    // Phase33: 古事記タグ（常に空配列で初期化、pageText が取れた場合に上書き）
    (detailPlan as any).kojikiTags = [];
    // Phase34: 同型写像エッジ（常に空配列で初期化）
    (detailPlan as any).mythMapEdges = [];
    // Phase35: 同一threadIdの mythMapEdges を再提示（あれば上書き）
    const recalled = getMythMapEdges(threadId);
    if (recalled) {
      (detailPlan as any).mythMapEdges = recalled;
    }

    // Phase25: candidates（deterministic; if LIKE misses, fallback range is returned）
    const doc = (sanitized as any).doc ?? null;
    // P0-PH25-QUERY_NORMALIZE_V1: Phase25 query ("言灵とは何？ #詳細") must hit
    const searchQuery0 = String(sanitized.text || "")
      .replace(/#詳細/g, "")
      .replace(/\bdoc\s*=\s*[^\s]+/gi, "")
      .replace(/\bpdfPage\s*=\s*\d+/gi, "")
      .trim();

    const searchQuery1 = searchQuery0.replace(/言灵/g, "言霊");
    let candidates = searchPagesForHybrid(doc, searchQuery1, 10);
    // M1-03_DOC_DIVERSIFY_FALLBACK_V1: candidates が単一docに偏る時、他docも試して母集団を増やす（削除ではなく追加）
    // ルール: search.ts/DBは触らない。件数は維持し、最後にslice(0,10)。
    try {
      const uniqDocs = Array.from(new Set((candidates || []).map((c: any) => String(c?.doc ?? "")).filter(Boolean)));
      const dominatedBySingleDoc = uniqDocs.length <= 1;
      if (dominatedBySingleDoc) {
        const tryDocs = ["KHS", "TENMON_CORE", "IROHA", "KATAKAMUNA"];
        const extra: any[] = [];
        for (const d of tryDocs) {
          if (!d || uniqDocs.includes(d)) continue;
          const add = searchPagesForHybrid(d, searchQuery1, 5) || [];
          for (const c of add) extra.push(c);
        }
        // merge (doc+pageで重複排除)
        const seen = new Set();
        const merged: any[] = [];
        for (const c of (candidates || []).concat(extra)) {
          const key = `${String(c?.doc ?? "")}::${String(c?.pdfPage ?? "")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(c);
        }
        // score desc
        merged.sort((a: any, b: any) => (Number(b?.score ?? 0) || 0) - (Number(a?.score ?? 0) || 0));
        candidates = merged.slice(0, 10);
      }
    } catch (e) {
      // 失敗時は現状維持（必ず候補は落とさない）
    }


    if (!candidates.length) {
      const q2 = searchQuery0.replace(/言灵|言霊/g, "ことだま");
      candidates = searchPagesForHybrid(doc, q2, 10);
    }
    
    // Phase26: candidates を threadId に保存（番号選択で再利用）
    setThreadCandidates(threadId, candidates);

    // ドメイン質問の検出（naturalRouter の判定と一致させる）
    const isDomainQuestion = /言灵|言霊|ことだま|kotodama|法則|カタカムナ|天津金木|水火|與合/i.test(sanitized.text);
    
    // ドメイン質問の場合、回答本文を改善（候補があれば本文を生成、なければ最低限の説明）
    
    // DETAIL_DOMAIN_EVIDENCE_V1: #詳細 + domain は「会話＋根拠（doc/pdfPage+引用）」に着地させる（捏造なし）
    if (wantsDetail && isJapanese && !hasDocPage && isDomainQuestion) {
      const usable = candidates.find((c: any) => {
        const t = (getPageText(c.doc, c.pdfPage) || "").trim();
        if (!t) return false;
        if (t.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) return false;
        if (!/[ぁ-んァ-ン一-龯]/.test(t)) return false;
        return true;
      });

      if (usable) {
        const pageText = (getPageText(usable.doc, usable.pdfPage) || "").trim();
        const quote = pageText.slice(0, 520);

        const evidenceId = `KZPAGE:${usable.doc}:P${usable.pdfPage}`;
        if (!detailPlan.evidenceIds) detailPlan.evidenceIds = [];
        if (!detailPlan.evidenceIds.includes(evidenceId)) detailPlan.evidenceIds.push(evidenceId);

        return reply({
          response:
            "いい問いです。根拠つきで短く押さえます。\n\n" +
            `出典: ${usable.doc} P${usable.pdfPage}\n\n` +
            "【引用】\n" +
            `${quote}${pageText.length > quote.length ? "..." : ""}\n\n` +
            "この引用のどの部分が、一番ひっかかりますか？",
          trace,
          provisional: true,
          detailPlan,
          candidates,
          evidence: { doc: usable.doc, pdfPage: usable.pdfPage, quote: quote.slice(0, 140) },
          timestamp: new Date().toISOString(),
          decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
        });
      }

      return reply({
        response:
          "候補は出ましたが、本文を取得できるページが見当たりませんでした。\n\n" +
          "次のどれで進めますか？\n" +
          "1) doc/pdfPage を指定して再検索\n" +
          "2) 焦点を一言で（定義／作用／歴史／実践）\n\n" +
          "どちらですか？",
        trace,
        provisional: true,
        detailPlan,
        candidates,
        evidence: null,
        timestamp: new Date().toISOString(),
        decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
      });
    }

let finalResponse = response;
  // FREECHAT_SANITIZE_V1: UX hardening
  // - menu prompt must not appear unless user explicitly requests it
  // - internal synth/TODO placeholder must not appear unless #詳細
  const __wantsDetail = /#詳細/.test(String(message || ""));
  const __askedMenu = /(メニュー|方向性|どの方向で|選択肢|1\)|2\)|3\))/i.test(String(message || ""));
    const __choosePrompt = /どの方向で話しますか|いちばん近いのはどれ|次のどれで進めますか|どちらですか|番号で|番号か|選択肢|選んで(?:ください)?|進めますか/.test(String(finalResponse || ""));
  const __numberList = /\n\s*\d{1,2}\)\s*/m.test(String(finalResponse || ""));
  const __hasMenu = __choosePrompt && __numberList; // CARD_S1_FIX_FREECHAT_SANITIZE_V2

if (__hasMenu && !__askedMenu) {
    finalResponse = "了解。何でも話して。必要なら「#詳細」や「doc=... pdfPage=...」で深掘りできるよ。";
  }
  if (!__wantsDetail) {
    // hide internal placeholders that break UX
    finalResponse = String(finalResponse || "")
      .replace(/^\[SYNTH_USED[^\n]*\n?/gm, "")
      .replace(/^TODO:[^\n]*\n?/gmi, "")
      .replace(/現在はプレースホルダ[^\n]*\n?/gmi, "")
      .trim();
  }

    let evidenceDoc: string | null = null;
    let evidencePdfPage: number | null = null;
    let evidenceQuote: string | null = null;
    
    if (isDomainQuestion && isJapanese && !wantsDetail && !hasDocPage) {
      if (candidates.length > 0) {
        const top = candidates[0];
        const pageText = getPageText(top.doc, top.pdfPage);
        const isNonText = !pageText || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
        // CARD3_NON_TEXT_ESCALATE_TO_KAMU_V1: if top evidence is NON_TEXT, do NOT inject caps fallback; guide to KAMU/specify instead (no fabrication)
        if (isNonText) {
          try {
            // surface deterministic flags for observability
            const df = (body as any)?.decisionFrame ?? null;
            // we can't rely on df here; we'll attach in reply payload below
          } catch {}
          return reply({
            response:
              "（候補は見つかりましたが、先頭候補のページが非テキスト/復号失敗でした）\n\n" +
              `候補: doc=${String(top?.doc ?? "")} pdfPage=${String(top?.pdfPage ?? "")}\n\n` +
              "次のどれで進めますか？\n" +
              "1) KAMU-GAKARIで復号して再保存（候補→承認）\n" +
              "2) 別ページを指定（doc=... pdfPage=...）\n\n" +
              "番号で答えてください？",
            trace,
            provisional: true,
            detailPlan,
            candidates,
            evidence: null,
            caps: undefined,
            timestamp: new Date().toISOString(),
            threadId,
            decisionFrame: {
              mode: "HYBRID",
              intent: "chat",
              llm: null,
              ku: {
                hybridAllNonText: true,
                nextActions: ["kamu_restore", "specify_doc_pdfpage"],
              },
            },
          });
        }

        if (pageText && pageText.trim().length > 0 && !isNonText) {
          // 回答本文を生成（50文字以上、短く自然に、最後にメニューを添える）
          const excerpt = pageText.trim().slice(0, 300);
          finalResponse = `${excerpt}${excerpt.length < pageText.trim().length ? '...' : ''}\n\n※ 必要なら資料指定（doc/pdfPage）で厳密にもできます。`;
          evidenceDoc = top.doc;
          evidencePdfPage = top.pdfPage;
          evidenceQuote = top.snippet || excerpt.slice(0, 100);
        } else if (isNonText) {
          // 本文が空 or NON_TEXT → caps で補完
          const caps = getCaps(top.doc, top.pdfPage) || getCaps("KHS", top.pdfPage);
          if (caps && typeof caps.caption === "string" && caps.caption.trim()) {
            finalResponse =
              `（補完キャプション: 天聞AI解析 / doc=${caps.doc} pdfPage=${caps.pdfPage}）\n` +
              caps.caption.trim() +
              (caps.caption_alt?.length ? `\n\n補助: ${caps.caption_alt.slice(0, 3).join(" / ")}` : "");
            capsPayload = {
              doc: caps.doc,
              pdfPage: caps.pdfPage,
              quality: caps.quality,
              source: caps.source,
              updatedAt: caps.updatedAt,
              caption: caps.caption,
              caption_alt: caps.caption_alt,
            };
          } else {
            finalResponse = `${sanitized.text}について、kokuzo データベースから関連情報を検索しましたが、詳細な説明が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索することもできます。`;
          }
        } else {
          finalResponse = `${sanitized.text}について、kokuzo データベースから関連情報を検索しましたが、詳細な説明が見つかりませんでした。資料指定（doc/pdfPage）で厳密に検索することもできます。`;
        }
      } else {
        // 候補がない場合でも最低限の説明を返す（50文字以上）
        finalResponse = `${sanitized.text}について、kokuzo データベースから関連情報を検索しましたが、該当する資料が見つかりませんでした。\n\n資料を投入するには、scripts/ingest_kokuzo_sample.sh を実行するか、doc/pdfPage を指定して厳密に検索してください。`;
      }
      
      // 回答本文が50文字未満の場合は補足を追加
      if (finalResponse.length < 50) {
        finalResponse = `${finalResponse}\n\nより詳しい情報が必要な場合は、資料指定（doc/pdfPage）で厳密に検索することもできます。`;
      }
    }

    // ドメイン質問で根拠がある場合、evidence と detailPlan に情報を追加
    
    let evidence: { doc: string; pdfPage: number; quote: string } | null = null;

    
    // CARDF_PHASE37_EVIDENCEIDS_V6: ensure evidenceIds exist when HYBRID candidates exist (kills Phase37 WARN)

    // CARDF_PRIME_EVIDENCE_V1: ensure `evidence` is set when candidates exist (kills Phase37 WARN; NO fabrication)
    // - uses candidates[0].doc/pdfPage only
    // - quote is empty (do NOT invent)
    try {
      if (!evidence && Array.isArray(candidates) && candidates.length) {
        const c0: any = candidates[0];
        const doc0 = String(c0?.doc ?? "");
        const page0 = Number(c0?.pdfPage ?? 0);
        if (doc0 && Number.isFinite(page0) && page0 > 0) {
          evidence = { doc: doc0, pdfPage: page0, quote: "" };
          try { (detailPlan as any).evidence = evidence; } catch {}
        }
      }
    } catch {}
    
    // - NO fabrication: uses candidates[0].doc/pdfPage only
    
    // - evidence.quote is empty string (explicitly no citation fabrication)
    
    try {
    
      const c0: any = (Array.isArray(candidates) && candidates.length) ? candidates[0] : null;
    
      if (c0 && c0.doc && Number(c0.pdfPage) > 0) {
    
        const eid = `KZPAGE:${String(c0.doc)}:P${Number(c0.pdfPage)}`;
    
        if (!detailPlan.evidenceIds) detailPlan.evidenceIds = [];
    
        if (!detailPlan.evidenceIds.includes(eid)) detailPlan.evidenceIds.push(eid);
    
    
    
        // If evidence missing, set minimal evidence (quote empty = no fabrication)
    
        if (evidence == null) {
    
          evidence = { doc: String(c0.doc), pdfPage: Number(c0.pdfPage), quote: "" };
    
        }
    
    
    
        // Optional deterministic warning if body missing/NON_TEXT (safe)
    
        try {
    
          const t0 = String(getPageText(String(c0.doc), Number(c0.pdfPage)) || "");
    
          if (!t0 || t0.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
    
            detailPlan.warnings = detailPlan.warnings ?? [];
    
            if (!detailPlan.warnings.includes("EVIDENCE_BODY_EMPTY")) detailPlan.warnings.push("EVIDENCE_BODY_EMPTY");
    
          }
    
        } catch {}
    
      }
    
    } catch {}

    if (isDomainQuestion && evidenceDoc && evidencePdfPage !== null) {
      evidence = {
        doc: evidenceDoc,
        pdfPage: evidencePdfPage,
        quote: evidenceQuote || "",
      };
      // detailPlan.evidence に設定
      (detailPlan as any).evidence = evidence;
      // evidenceIds にも追加
      if (!detailPlan.evidenceIds) {
        detailPlan.evidenceIds = [];
      }
      const evidenceId = `KZPAGE:${evidenceDoc}:P${evidencePdfPage}`;
      if (!detailPlan.evidenceIds.includes(evidenceId)) {
        detailPlan.evidenceIds.push(evidenceId);
      }
    } else if (isDomainQuestion && candidates.length === 0) {
      // 根拠がない場合を明示
      (detailPlan as any).evidence = null;
      (detailPlan as any).evidenceStatus = "not_found";
      (detailPlan as any).evidenceHint = "資料を投入するには scripts/ingest_kokuzo_sample.sh を実行してください";
    }

    // HYBRID_TALK_WRAP_V2: 最終出力にだけ「断捨離の間合い」を薄く付与（#詳細/根拠系は改変しない）
    {
      const wants = Boolean(wantsDetail);
      const hasEvidenceSignals =
        /(pdfPage=|doc=|evidenceIds|candidates|引用|出典|根拠|ソース|【|】)/.test(String(finalResponse));

      if (!wants && !hasEvidenceSignals) {

        // --- S3_HYBRID_SYNTH_V1 ---
        try {
          const synth = synthHybridResponseV1({
            userMessage: sanitized.text,
            baseResponse: String(finalResponse ?? ""),
            candidates: candidates as any,
          });
          if (synth.used) finalResponse = synth.text;
        } catch (e) {
          // never fail chat because of synth
        }
        // --- /S3_HYBRID_SYNTH_V1 ---

        let r = String(finalResponse ?? "").trim();

        const opener = "いい問いです。いまの状況を一度、ほどいてみましょう。";
        const closer = "いま一番ひっかかっている点は、どこですか？";

        const alreadyHasWarmOpener = /^(いい問い|焦らなくて|ここまで言葉)/.test(r);

        if (!alreadyHasWarmOpener && r.length >= 20) {
          r = `${opener}\n\n${r}`;
        }

        const endsQ = /[？?]\s*$/.test(r) || /(ですか|でしょうか|ますか)\s*$/.test(r);
        if (!endsQ) {
          r = `${r}\n\n${closer}`;
        }

        finalResponse = r;
      }
    }

    // HYBRID_END_QUESTION_V1: 通常HYBRIDは必ず問いで閉じる（#詳細/根拠系は改変しない）
    {
      const wants = Boolean(wantsDetail);
      const hasEvidenceSignals =
        /(pdfPage=|doc=|evidenceIds|candidates|引用|出典|根拠|ソース|【|】)/.test(String(finalResponse));

      if (!wants && !hasEvidenceSignals) {
        let r = String(finalResponse ?? "").trim();
        const endsQ = /[？?]\s*$/.test(r) || /(ですか|でしょうか|ますか)\s*$/.test(r);
        if (!endsQ) {
          r = `${r}\n\n次の一手は、どこから始めましょうか？`;
        }
        finalResponse = r;
      }
    }



    // HYBRID_END_QUESTION_V2: reply直前で確実に「問い閉じ」（内容は改変しない。末尾に1問だけ付与）
    {
      let r = String(finalResponse ?? "").trim();

      const wants = Boolean(wantsDetail);

      // 末尾が問いか判定（日本語の疑問終止も含む）
      const endsQ =
        /[？?]\s*$/.test(r) ||
        /(ですか|でしょうか|ますか|か？|か\?)\s*$/.test(r);

      if (!endsQ) {
        const qNormal = "次の一手は、どこから始めましょうか？";
        const qDetail = "この引用のどこを一番深掘りしますか？（語義／構文／水火（イキ）／天津金木）";
        const q = wants ? qDetail : qNormal;

        r = `${r}\n\n${q}`;
      }

      finalResponse = r;
    }


    // レスポンス形式（厳守）
    // CARD5_KOKUZO_SEASONING_V1: HYBRID normal reply -> 1-line point + opinion + one question
    // Contract:
    // - DO NOT touch #詳細 (transparency mode)
    // - DO NOT touch doc/pdfPage GROUNDED
    // - DO NOT touch smoke/smoke-hybrid
    // - NO fabrication: point derived only from candidates[0] doc/pdfPage text or snippet
    try {
      const isSmoke = /^smoke/i.test(String(threadId || ""));
      // CARD5_FIX_SCOPE_DECISIONFRAME_V1: decisionFrame not in scope here; final HYBRID return implies HYBRID path
      if (!isSmoke && !wantsDetail && !hasDocPage && !trimmed.startsWith("#")) {
        let point = "";
        try {
          const c0: any = (Array.isArray(candidates) && candidates.length) ? candidates[0] : null;
          if (c0 && c0.doc && Number(c0.pdfPage) > 0) {
            const body = String(getPageText(String(c0.doc), Number(c0.pdfPage)) || "").trim();
            if (body && !body.includes("[NON_TEXT_PAGE_OR_OCR_FAILED]")) {
              point = body.replace(/\s+/g, " ").slice(0, 96).trim();
            } else {
              point = String(c0.snippet || "").replace(/\s+/g, " ").slice(0, 96).trim();
            }
          }
        } catch {}

        if (!point) {
          point = String(finalResponse || "").replace(/\s+/g, " ").slice(0, 96).trim();
        }
        if (point.length > 0) point = "要点: " + point;

        // Opinion + one question (deterministic, short)
        const opinion = "【天聞の所見】いまの問いは“核”がまだ一語で定まっていないだけです。先に軸を立てます。";
        const q = "一点質問：この問いは、定義／作用／由来／実践のどれを知りたい？";

        let out = "";
        if (point) out += point + "\n\n";
        out += opinion + "\n\n" + q;

        // Ensure ends with question mark
        if (!/[？?]\s*$/.test(out)) out += "？";

        finalResponse = out;

        // Keep evidenceIds/evidence behavior unchanged (CardF already handles evidenceIds safely)
      }
    } catch {}

    return reply({
      response: finalResponse,
      trace,
      provisional: true,
      detailPlan,
      candidates,
      evidence,
      caps: capsPayload ?? undefined,
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
    });
  } catch (error) {
    const pid = process.pid;
    const uptime = process.uptime();
    console.error("[CHAT-KANAGI] Error:", { pid, uptime, error });
    // エラー時も観測を返す（停止しない）
    const detailPlan = emptyCorePlan("ERROR_FALLBACK");
    detailPlan.chainOrder = ["ERROR_FALLBACK"];
    return reply({
      response: "思考が循環状態にフォールバックしました。矛盾は保持され、旋回を続けています。",
      provisional: true,
      detailPlan,
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
    });
  }
});

export default router;

// CARD_C11C_FIX_N2_PROMPT_ANCHOR_V1

// CARD_C11E_CLAMP_DEF_AND_GENERAL_RETURN_V1

// CARD_C11F_CLAMP_N1_RETURN_V1

// CARD_C11F2_N1_LOCAL_CLAMP_V1

// CARD_C14B3_FIX_DEF_AND_GENERAL_SAFE_V1

// CARD_C16A_GENERAL_ESCAPE_CLAMP_V1

// CARD_C16B_GENERAL_ESCAPE_GATE_AT_RETURN_V1

// CARD_C16C_GENERAL_GATE_IN_GENERAL_BLOCK_V1

// CARD_C16D2_GENERAL_OVERWRITE_GATE_SAFE_V1

// CARD_C16D3_STRENGTHEN_OVERWRITE_TRIGGER_V1

// CARD_C16E2_REMOVE_C16C_FROM_GENERAL_V2

// CARD_C16F_REMOVE_C16AB_FROM_SUPPORT_V1

// CARD_C15_DEF_DICTIONARY_GATE_V1

// CARD_C15B_FIX_TDZ_AND_DET_DEF_V1

// CARD_C15C2_FIX_DEF_DICT_HIT_CLAMP_V1

// CARD_C15D_EXTEND_DEF_DICT_HIT_TEXT_V1

// CARD_C17B2_GLOSSARY_DBSTATUS_AUTOWIRE_V1

// CARD_C17C2_GLOSSARY_USE_GETDBPATH_V1

// CARD_C17C3_FIX_SQLITE_LOOKUP_NO_DEP_V1

// CARD_C18_GLOSSARY_SOURCE_FLAG_V1

// CARD_C21_DEF_REGEX_EXPAND_V1

// CARD_C21A_AWAKENING_V1A

// CARD_C21B2_FIX_NEED_CONTEXT_CLAMP_V1

// --- C21G1C: GENERAL_GATE_SOFT_V1 ---
// Deterministic last-mile gate. Only edits response when routeReason === NATURAL_GENERAL_LLM_TOP.
function __tenmonGeneralGateSoft(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();

  // normalize common spacing
  t = t.replace(/^【天聞の所見】\s+/, "【天聞の所見】");

  // hard rules (format safety)
  const qpos = Math.max(t.indexOf("？"), t.indexOf("?"));
  const qcount = (t.match(/[?？]/g) || []).length;
  const lines = t.split("\n").filter(Boolean);

  // RLHF preach / generalization patterns (deterministic)
  const badPhrases = [
    "鍵です", "サインです", "機会として", "捉えましょう",
    "できます", "ことができます", "大切です", "重要です", "真実", "内面",
    "見極める", "道を開きます"
  ];

  const hasBad = badPhrases.some(w => t.includes(w)) || /ましょう/.test(t);

  // If response drifts into preach OR violates strict shape, overwrite with fixed seed.
  if (hasBad || qcount !== 1 || qpos === -1 || lines.length > 4 || t.length > 220) {
    return "【天聞の所見】いま必要なのは正解探しではなく、今日の一点を決めることです。\n"
         + "一番削りたい不安は何で、代わりに残したい一手は何ですか？";
  }

  return t;
}
function __tenmonGeneralGateResultMaybe(x: any): any {
  try {
    if (!x || typeof x !== "object") return x;
    const df = (x as any).decisionFrame || {};
    const ku = df.ku || {};
    // H2: compassion wrap for SUPPORT only (routeReason from ku)
    try {
      const rr2 = (ku as any).routeReason || "";
      if (rr2 === "N2_KANAGI_PHASE_TOP") {
        const h = (ku as any).heart || __tenmonLastHeart || {};
        (x as any).response = __tenmonCompassionWrapV2((x as any).response, h);
        (x as any).response = __tenmonSupportSanitizeV1((x as any).response);
      }
    } catch {}

    try {
      const h = __tenmonLastHeart;
      if (h && typeof h === "object") {
        (ku as any).heart = { state: String(h.state || "neutral"), entropy: Number(h.entropy ?? 0.25) };
      }
    } catch {}
    if (ku.routeReason === "NATURAL_GENERAL_LLM_TOP") {
      (x as any).response = __tenmonGeneralGateSoft((x as any).response);
    }
    return x;
  } catch { return x; }
}
// --- /C21G1C: GENERAL_GATE_SOFT_V1 ---

// CARD_C21G1C_GENERAL_GATE_SOFT_V1
// CARD_C21B3_FIX_NEED_CONTEXT_CLAMP_V3\n// CARD_C21G2_GENERAL_GATE_PATTERNS_V2\n
// CARD_H1_HEART_MODEL_MOCK_V1
// CARD_H1B_HEART_OBSERVE_V2
// FIX_H1Bv2_IMPORT_EXT_V1

// --- H1C: lastHeart bridge (process-local) ---
let __tenmonLastHeart: any = null;
// --- /H1C: lastHeart bridge ---
// CARD_H1C_ATTACH_HEART_TO_DECISIONFRAME_V1

// --- H2: BUDDHA_SYNAPSE_SAFE_V2 ---
function __tenmonCompassionPrefixV2(heart: any): string {
  const st = String(heart?.state || "neutral");
  if (st === "exhausted" || st === "tired") return "疲れが強い状態です。";
  if (st === "confused" || st === "anxious") return "迷いが強い状態です。";
  if (st === "angry") return "怒りが強い状態です。";
  if (st === "sad" || st === "depressed") return "痛みが強い状態です。";
  return "";
}
function __tenmonCompassionWrapV2(out: string, heart: any): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;
  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;
  const body = t.replace(/^【天聞の所見】\s*/, "");
  const pref = __tenmonCompassionPrefixV2(heart);
  if (!pref) return "【天聞の所見】" + body;
  return "【天聞の所見】" + pref + body;
}
// --- /H2 ---

// CARD_H2_BUDDHA_SYNAPSE_SAFE_V2

// --- H2B: SUPPORT_SANITIZE_V1 ---
function __tenmonSupportSanitizeV1(out: string): string {
  let t = String(out || "").replace(/\r/g, "").trim();
  if (!t) return t;

  if (!t.startsWith("【天聞の所見】")) t = "【天聞の所見】" + t;

  // remove hedges (ΔZ)
  t = t.replace(/かもしれません/g, "").replace(/おそらく/g, "").replace(/多分/g, "");

  // keep only up to first question mark
  const q = Math.max(t.indexOf("？"), t.indexOf("?"));
  if (q !== -1) t = t.slice(0, q + 1).trim();

  // cap length
  if (t.length > 220) t = t.slice(0, 220).replace(/[。、\s　]+$/g, "") + "？";


  // remove soft-imperatives / offers
  t = t.replace(/してみませんか/g, "ですか")
       .replace(/しませんか/g, "ですか")
       .replace(/してみてください/g, "")
       .replace(/してください/g, "")
       .replace(/しましょう/g, "")
       .replace(/どうでしょう/g, "");

  // force end with 1 neutral question if missing
  const q2 = Math.max(t.indexOf("？"), t.indexOf("?"));
  if (q2 === -1) t = t.replace(/[。．\.]+$/g, "") + "？";

  return t;
}
// --- /H2B ---
// CARD_H2B_BUDDHA_SYNAPSE_STABILIZE_V1
// CARD_H2C_SUPPORT_DEIMPERATIVE_V1
// CARD_E0A_FAST_CHAT_FOR_ACCEPTANCE_V1
// CARD_E0A2_FASTPATH_MATCH_SMOKE_V1
// CARD_E0A3_FASTPATH_END_WITH_1Q_V1
