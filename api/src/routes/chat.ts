import { synthHybridResponseV1 } from "../hybrid/synth.js";
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

import { localSurfaceize } from "../tenmon/surface/localSurfaceize.js";
import { llmChat } from "../core/llmWrapper.js";

import { memoryPersistMessage, memoryReadSession } from "../memory/index.js";
import { listRules } from "../training/storage.js";
const router: IRouter = Router();

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

  // B1: deterministic menu trigger for acceptance (must work even for GUEST)
  if (String(message ?? "").trim() === "__FORCE_MENU__") {
    return res.json({
      response:
        "1) 検索（GROUNDED）\n2) 整理（Writer/Reader）\n3) 設定（運用/学習）\n\n番号かキーワードで選んでください。",
      evidence: null,
      decisionFrame: { mode: "GUEST", intent: "MENU", llm: null, ku: {} },
      timestamp,
    });
  }


  const trimmed = message.trim();


  // REPLY_SURFACE_V1: responseは必ずlocalSurfaceizeを通す。返却は opts をそのまま形にし caps は body.caps のみ参照
  const reply = (payload: any) => {
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


    return res.json({
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
    });
  };

  // --- DET_NATURAL_STRESS_V1: 不安/過多はメニューに吸わせず相談テンプレへ ---
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
        "了解。いまの状況を一言で言うと、どれに近い？\n\n" +
        "1) 予定・タスクの整理\n" +
        "2) 迷いの整理（選択肢がある）\n" +
        "3) いまの気持ちを整えたい\n\n" +
        "番号で答えてくれてもいいし、具体的に『いま困ってること』を1行で書いてもOK。",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { 
          mode: "NATURAL", intent: "chat", llm: null,
          // FREECHAT_HINTS_NATURAL_V1: expose compact hints in NATURAL responses (read-only, no fabrication)
          ku: (() => {
            try {
              const laws = listThreadLaws(threadId, 20).filter(
                (x: any) => x && typeof x === "object" && x.name && x.definition && Array.isArray(x.evidenceIds) && x.evidenceIds.length > 0
              );
              const freeChatHints = (() => {
              const seen = new Set<string>();
              const out: any[] = [];
              for (const x of laws) {
                const name = String((x as any)?.name ?? "").trim();
                if (!name) continue;
                if (seen.has(name)) continue;
                seen.add(name);
                out.push({
                  name,
                  definition: (x as any)?.definition ?? null,
                  evidenceIds: Array.isArray((x as any)?.evidenceIds) ? (x as any).evidenceIds : [],
                  doc: (x as any)?.doc ?? null,
                  pdfPage: (x as any)?.pdfPage ?? null,
                });
                if (out.length >= 6) break;
              }
              return out;
            })() /* FREECHAT_HINTS_LIMIT6_NAMEDEDUP_V1 */;
              return { freeChatHints };
            } catch {
              return { freeChatHints: [] };
            }
          })()
        },
    });
  }
  // --- /DET_NATURAL_STRESS_V1 ---


  // --- DET_NATURAL_SHORT_JA_V1: 日本語の短文相談はNATURALで会話形に整える（Kanagiに入れない） ---
  const isJa = /[ぁ-んァ-ン一-龯]/.test(trimmed);
  const isShort = trimmed.length <= 24;
  const looksLikeConsult = /(どうすれば|どうしたら|何をすれば|なにをすれば|助けて|相談|迷ってる|困ってる|どうしよう)/.test(trimmed);

  // doc/pdfPage や # コマンド、番号選択はここで奪わない
  const hasCmd = trimmed.startsWith("#");
  const isNumberOnly = /^\d{1,2}$/.test(trimmed);
  const hasDocPageNat = /pdfPage\s*=\s*\d+/i.test(trimmed) || /\bdoc\b/i.test(trimmed);

  if (isJa && isShort && looksLikeConsult && !hasCmd && !isNumberOnly && !hasDocPageNat) {
    return reply({
      response:
        "了解。いまの状況を一言で言うと、どれに近い？\n\n1) 予定・タスクの整理\n2) 迷いの整理（選択肢がある）\n3) いまの気持ちを整えたい\n\n番号で答えてくれてもいいし、具体的に『いま困ってること』を1行で書いてもOK。",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
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
  if (pending === "LANE_PICK") {
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
    return reply({
      response: nat.responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }

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

  if (shouldBlockLLMChatForGuest && shouldLLMChat && !isLocalTestBypass) {
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

    return res.json({
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
    });
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
        nat.responseText.includes("どの方向で話しますか") ||
        nat.responseText.includes("いまの状況を一言で言うと") ||
        nat.responseText.includes("1) 予定・タスクの整理")
      ) {
        setThreadPending(threadId, "LANE_PICK");
      }
      return reply({
        response: nat.responseText,
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
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
    let evidenceDoc: string | null = null;
    let evidencePdfPage: number | null = null;
    let evidenceQuote: string | null = null;
    
    if (isDomainQuestion && isJapanese && !wantsDetail && !hasDocPage) {
      if (candidates.length > 0) {
        const top = candidates[0];
        const pageText = getPageText(top.doc, top.pdfPage);
        const isNonText = !pageText || /\[NON_TEXT_PAGE_OR_OCR_FAILED\]/.test(String(pageText));
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
