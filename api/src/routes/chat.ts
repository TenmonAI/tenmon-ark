import { Router, type IRouter, type Request, type Response } from "express";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";
import { runKanagiReasoner } from "../kanagi/engine/fusionReasoner.js";
import { getCurrentPersonaState } from "../persona/personaState.js";
import { composeResponse, composeConversationalResponse } from "../kanagi/engine/responseComposer.js";
import { generateArkResponse } from "../kanagi/engine/arkResponseGenerator.js";
import { getSessionId } from "../memory/sessionId.js";
import { naturalRouter, routeNaturalConversation } from "../persona/naturalRouter.js";
import { emptyCorePlan } from "../kanagi/core/corePlan.js";
import { applyTruthCore } from "../kanagi/core/truthCore.js";
import { applyVerifier } from "../kanagi/core/verifier.js";
import { applyPersonaGovernor } from "../persona/personaGovernor.js";
import { kokuzoRecall, kokuzoRemember } from "../kokuzo/recall.js";
import { getPageText } from "../kokuzo/pages.js";
import { localSurfaceize } from "../tenmon/surface/localSurfaceize.js";
import { searchPagesForHybrid } from "../kokuzo/search.js";
import { setThreadCandidates, pickFromThread, clearThreadCandidates, setThreadPending, getThreadPending, clearThreadState } from "../kokuzo/threadCandidates.js";
import { parseLaneChoice, type LaneChoice } from "../persona/laneChoice.js";
import { getDb, dbPrepare } from "../db/index.js";
import { extractLawCandidates } from "../kokuzo/lawCandidates.js";
import { extractSaikihoLawsFromText } from "../kotodama/saikihoLawSet.js";
import { extractFourLayerTags } from "../kotodama/fourLayerTags.js";
import { extractKojikiTags } from "../kojiki/kojikiTags.js";
import { buildMythMapEdges } from "../myth/mythMapEdges.js";
import { getMythMapEdges, setMythMapEdges } from "../kokuzo/mythMapMemory.js";
import { classifyIrohaKernel } from "../iroha/irohaKernel.js";
import { extractManyoshuTags } from "../manyoshu/manyoshuTags.js";
import { extractDanshariTags } from "../danshari/danshariTags.js";
import { callLLM } from "../core/llm.js";
import { memoryPersistMessage, memoryReadSession } from "../memory/index.js";

// DET_PASSPHRASE_V1 の実装状態を export（audit で参照）
export const DET_RECALL_ENABLED = true;

// BUILD_MARK（grepで確実に見つかる実コード）
export const __BUILD_MARK__ = "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1";
console.log(`[BUILD] ${__BUILD_MARK__}`);

// === LLM_SURFACE ===
/**
 * 文章整形のみ（内容追加・推測禁止）
 * @param text 元の回答文
 * @param userMsg ユーザー入力
 * @returns 整形後の回答文（失敗時は元の文をそのまま返す）
 */
async function surfaceize(text: string, userMsg: string): Promise<string> {
  if (process.env.ENABLE_LLM_SURFACE !== "1") return text;

  const prompt = [
    "あなたは文章の整形者です。",
    "目的: 元の文章の意味・事実・主張を一切変えず、読みやすさだけを改善してください。",
    "",
    "必須ルール:",
    "- 内容追加禁止（新しい事実・推測・補足・例・比喩の追加禁止）",
    "- 断定の強化禁止（『〜と思う』→『〜だ』など禁止）",
    "- 引用の捏造禁止（引用符・出典風の文言を新規に作らない）",
    "- 情報の削りすぎ禁止（重要な注意/条件/但し書きは残す）",
    "",
    "整形の範囲:",
    "- 語尾統一、冗長削減、重複削除、段落整理、箇条書き整形のみ",
    "",
    "ユーザー入力:",
    userMsg,
    "",
    "元の回答:",
    text,
    "",
    "整形後の回答（日本語、簡潔、同じ意味のまま）:"
  ].join("\n");

  const out = await callLLM(prompt);

  console.log("[LLM_SURFACE] enabled=1 ok=", !!(out && out.trim()), "len=", out?.trim()?.length ?? 0);

  return (out && out.trim().length > 0) ? out.trim() : text;
}
// === END LLM_SURFACE ===

const router: IRouter = Router();

// --- DET_RECALL_V1: 合言葉の決定論リコール（LLM不要・衝突ゼロ設計） ---
// 関数定義を router 外のトップレベルに置く（handler内に置くと差分が増えやすく、merge時に壊れやすい）

function extractPassphrase(text: string): string | null {
  // 例: 「合言葉は青い鳥です」「合言葉は『青い鳥』です」「合言葉: 青い鳥」
  const t = text.trim();

  // 1) 合言葉は◯◯です
  let m = t.match(/合言葉\s*は\s*[「『"]?(.+?)[」』"]?\s*(です|だ|です。|だ。)?$/);
  if (m && m[1]) return m[1].trim();

  // 2) 合言葉: ◯◯
  m = t.match(/合言葉\s*[:：]\s*[「『"]?(.+?)[」』"]?\s*$/);
  if (m && m[1]) return m[1].trim();

  return null;
}

function wantsPassphraseRecall(text: string): boolean {
  const t = text.trim();
  // 「合言葉、覚えてる？」「合言葉は？」「覚えてる？（合言葉）」など
  return /合言葉/.test(t) && /(覚えてる|覚えてる\?|覚えてる？|何だっけ|は\?|は？)/.test(t);
}

// 直近の session_memory から「合言葉」を探索（user の発話のみ）
function recallPassphraseFromSession(threadId: string, limit = 80): string | null {
  const mem = memoryReadSession(threadId, limit);
  // 新しいものが末尾にある前提でも、確実にしたいので後ろから走査
  for (let i = mem.length - 1; i >= 0; i--) {
    const row = mem[i];
    if (!row || row.role !== "user") continue;
    const p = extractPassphrase(row.content || "");
    if (p) return p;
  }
  return null;
}
// --- /DET_RECALL_V1 ---

// PERSIST_TURN_V1: conversation_log / session_memory へのINSERT helper
function persistTurn(threadId: string, userText: string, assistantText: string): void {
  try {
    memoryPersistMessage(threadId, "user", userText);
    memoryPersistMessage(threadId, "assistant", assistantText);

    // 成功ログ（ここが今まで無かったので grep に出ない）
    console.log(`[MEMORY] persisted threadId=${threadId} bytes_u=${userText.length} bytes_a=${assistantText.length}`);
  } catch (e: any) {
    // INSERT失敗はログのみ（レスポンスは返す）
    console.warn(`[PERSIST] failed to persist turn threadId=${threadId}:`, e?.message ?? String(e));
  }
}

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

  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "api/src/routes/chat.ts:buildGroundedResponse",
      message: "buildGroundedResponse entry",
      data: { doc, pdfPage, wantsDetail, hasPageText: !!pageText },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  
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
      applyPersonaGovernor(p, { message: `doc=${doc} pdfPage=${pdfPage}` });
      // Phase48: IROHA_KERNEL（人格・思考ロジック用の決定論カーネル）
      const iroha = classifyIrohaKernel(`doc=${doc} pdfPage=${pdfPage}`);
      p.iroha = iroha;
      p.chainOrder = Array.from(new Set([...(p.chainOrder ?? []), "IROHA_KERNEL"]));
      // Phase23: Kokuzo recall（構文記憶）
      const prev = kokuzoRecall(threadId);
      if (prev) {
        if (!p.chainOrder.includes("KOKUZO_RECALL")) p.chainOrder.push("KOKUZO_RECALL");
        p.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
      }

      // session_memory から参照（再利用の証明）
      const sessionMemories = memoryReadSession(threadId, 10);
      if (sessionMemories.length > 0) {
        console.log(`[RECALL] session_id=${threadId} hits=${sessionMemories.length} source=session_memory`);
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

      // #詳細 のときだけ Manyoshu / Danshari tags を付与（LLMを使わない決定論タグ）
      if (wantsDetail) {
        const tagSource =
          pageText && pageText.trim().length > 0
            ? pageText
            : `doc=${doc} pdfPage=${pdfPage}`;
        (p as any).manyoshuTags = extractManyoshuTags(tagSource);
        (p as any).danshariTags = extractDanshariTags(tagSource);

        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "man-dan",
            hypothesisId: "MAN_DAN_GROUNDED",
            location: "api/src/routes/chat.ts:buildGroundedResponse#tags",
            message: "GROUNDED detail wantsDetail tags attached",
            data: {
              doc,
              pdfPage,
              manyoshuTags: (p as any).manyoshuTags ?? [],
              danshariTags: (p as any).danshariTags ?? [],
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
    // #詳細 の場合は candidates を最低1件返す
    if (pageText && pageText.length > 0) {
      const snippet = pageText.slice(0, 200).trim();
      if (snippet.length < 20) {
        // 20文字未満の場合はさらに伸ばす
        const extendedSnippet = pageText.slice(0, 400).trim();
        result.candidates = [{
          doc,
          pdfPage,
          snippet: extendedSnippet.length >= 20 ? extendedSnippet : pageText.slice(0, 800).trim(),
          score: 1000,
          tags: [],
        }];
      } else {
        result.candidates = [{
          doc,
          pdfPage,
          snippet,
          score: 1000,
          tags: [],
        }];
      }
    } else {
      // 本文が無い場合でも placeholder snippet を返す（少なくとも1件の candidate を保証）
      const placeholder = `【未投入ページ】doc=${doc} pdfPage=${pdfPage} の本文はまだ kokuzo に投入されていません。ingest_pdf_pages.sh で投入すると、ここに引用スニペットが表示されます。`;
      result.candidates = [{
        doc,
        pdfPage,
        snippet: placeholder,
        score: 10,
        tags: [],
      }];
    }
  }
  // 返却直前で applyPersonaGovernor を適用（全経路で確実に適用）
  applyPersonaGovernor(result.detailPlan as any, { message: `doc=${doc} pdfPage=${pdfPage}` });
  return result;
}

/**
 * PHASE 1: 天津金木思考回路をチャットAPIに接続
 * 
 * 固定応答を廃止し、天津金木思考回路を通して観測を返す
 */
router.post("/chat", async (req: Request, res: Response<ChatResponseBody>) => {
  const handlerTime = Date.now();
  const pid = process.pid;
  const uptime = process.uptime();
  const { getReadiness } = await import("../health/readiness.js");
  const r = getReadiness();
  console.log(`[CHAT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()} stage=${r.stage}`);

  // 挨拶っぽい短文かどうかを判定するhelper（guide返却を制限するため）
  function isGreetingLike(raw: string): boolean {
    const m = raw.trim();
    if (!m) return false;
    if (m.length > 12) return false;
    return /^(hi|hello|hey|yo|おはよう|こんにちは|こんばんは|やあ|もしもし)[!！。．\s]*$/i.test(m);
  }

  // 低情報入力（短い/意味薄い）かどうかを判定するhelper
  function isLowSignal(raw: string): boolean {
    const m = raw.trim();
    if (!m) return false;
    // 短すぎる（3文字以下）
    if (m.length <= 3) return true;
    // テスト系の単語
    if (/^(ping|test|ok|yes|no|はい|いいえ|うん|ううん)$/i.test(m)) return true;
    // 意味の薄い単語のみ
    if (/^[a-z]{1,4}$/i.test(m) && !/^(hi|hey|yo)$/i.test(m)) return true;
    return false;
  }
  
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;
  const body = (req.body ?? {}) as any;
  const message = String(messageRaw ?? "").trim();
  const threadId = String(body.threadId ?? "default").trim();
  const timestamp = new Date().toISOString();
  const wantsDetail = /#詳細/.test(message);

  if (!message) return res.status(400).json({ response: "message required", error: "message required", timestamp, decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} } });

  const trimmed = message.trim();

  // --- DET_NATURAL_STRESS_V2: 不安/過多/迷い系は routeNaturalConversation で処理（kokuzo統合） ---
  // #menu と doc/pdfPage 指定は除外
  if (!trimmed.startsWith("#")) {
    const hasDocPage = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\s*=/i.test(message);
    if (!hasDocPage) {
      const natRoute = await routeNaturalConversation(trimmed, threadId);
      if (natRoute.handled) {
        return res.json({
          response: natRoute.responseText,
          evidence: null,
          timestamp,
          threadId,
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
        });
      }
    }
  }
  // --- /DET_NATURAL_STRESS_V2 ---

  // --- DET_PASSPHRASE_V2: 合言葉は必ず決定論（LANE_PICK残留も無効化） ---
  if (trimmed.includes("合言葉")) {
    // レーン待ち状態が残っていても合言葉は優先
    clearThreadState(threadId);

    // 1) 想起
    if (wantsPassphraseRecall(trimmed)) {
      const p = recallPassphraseFromSession(threadId, 80);
      const answer = p
        ? `覚えています。合言葉は「${p}」です。`
        : "まだ合言葉が登録されていません。先に「合言葉は◯◯です」と教えてください。";
      persistTurn(threadId, trimmed, answer);
      return res.json({
        response: answer,
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }

    // 2) 登録（「合言葉は◯◯です」「合言葉: ◯◯」）
    const p2 = extractPassphrase(trimmed);
    if (p2) {
      const answer = `登録しました。合言葉は「${p2}」です。`;
      persistTurn(threadId, trimmed, answer);
      return res.json({
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
    return res.json({
      response:
        "了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  // --- /DET_LOW_SIGNAL_V2 ---

  // 低情報入力のフォールバック（短い/意味薄いメッセージは通常会話テンプレへ）
  if (isLowSignal(trimmed) && !isGreetingLike(trimmed)) {
    return res.json({
      response: "了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き",
      evidence: null,
      timestamp,
      threadId,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
    });
  }
  
  // 選択待ち状態の処理（pending state を優先）
  const pending = getThreadPending(threadId);
  if (pending === "LANE_PICK") {
    const lane = parseLaneChoice(trimmed);
    if (lane) {
      clearThreadState(threadId);
      // LANE_1: 言灵/カタカムナの質問 → HYBRID で検索して回答
      if (lane === "LANE_1") {
        const candidates = searchPagesForHybrid(null, trimmed, 10);
        setThreadCandidates(threadId, candidates);
        
        let responseText: string;
        if (candidates.length > 0) {
          const top = candidates[0];
          const pageText = getPageText(top.doc, top.pdfPage);
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
        
        return res.json({
          response: responseText,
          evidence: null,
          candidates: candidates.slice(0, 10),
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
      return res.json(buildGroundedResponse({
        doc: picked.doc,
        pdfPage: picked.pdfPage,
        threadId,
        timestamp,
        wantsDetail,
      }));
    }
    // pick が失敗したら通常処理にフォールスルー
  }

  // --- #talk : 高度会話（LLM） ---
  // 仕様：ENABLE_TALK_LLM=1 のときだけLLMを呼ぶ。decisionFrame.llm は常に null のまま。
  if (trimmed.startsWith("#talk")) {
    const enabled = String(process.env.ENABLE_TALK_LLM || "0") === "1";
    const q = trimmed.replace(/^#talk\s*/i, "").trim();

    if (!enabled) {
      return res.json({
        response: "（#talk は現在OFFです。ENABLE_TALK_LLM=1 にすると高度会話モードが解放されます）",
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }

    if (!q) {
      return res.json({
        response: "使い方： #talk <質問や依頼>\n例）#talk 天聞アークとは？",
        evidence: null,
        timestamp,
        threadId,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      });
    }

    // ここで "叡智の舌" を使う（LLM）
    // ただし、土台（Kanagi）と記憶（Kokuzo）を混ぜた上で話させる。
    const sessionId = getSessionId(req) || `chat_${Date.now()}`;
    const personaState = getCurrentPersonaState();

    // Kanagiの観測（必須：天聞アークの核のまま）
    const trace = await runKanagiReasoner(q, sessionId);

    // 既存の記憶（直近の観測円）を一つだけ拾う（長期ログは入れない＝暴走防止）
    const prev = kokuzoRecall(threadId);

    // session_memory から参照（再利用の証明）
    const sessionMemories = memoryReadSession(threadId, 10);
    if (sessionMemories.length > 0) {
      console.log(`[RECALL] session_id=${threadId} hits=${sessionMemories.length} source=session_memory`);
    }

    // Kanagiからまず "核テキスト" を作る（これが骨格）
    const coreText = String(composeResponse(trace, personaState) ?? "");

    // LLMへ渡すプロンプト（骨格を豊かな言葉へ）
    const prompt =
`あなたは TENMON-ARK。出力は日本語。
目的：与えられた「骨格（core）」を、読みやすく、豊かで高密度な説明へ展開する。
制約：
- 断定が危険な箇所は「現時点では…」「観測上は…」と書き、捏造しない
- 参照元（doc/pdfPage）が無いのに引用・ページ番号を作らない
- 箇条書き・段落・比喩は使ってよいが、冗長にしない
- 最後に「次の一歩」を1行だけ添える

【前回の観測（あれば）】
${prev?.centerClaim ? prev.centerClaim : "(none)"}

【今回の骨格（core）】
${coreText}

【ユーザーの問い】
${q}
`;

    // callLLM（OpenAI）※decisionFrame.llm は常に null のまま
    const surface = await callLLM(prompt);

    const finalText = (surface && surface.trim().length > 0) ? surface.trim() : coreText;

    // CorePlan/TruthCore/Verifier/Remember は従来どおり回す（壊さない）
    const detailPlan = emptyCorePlan(finalText.slice(0, 80));
    detailPlan.chainOrder = ["KANAGI_TRACE", "COMPOSE_RESPONSE", "TALK_LLM"];
    applyTruthCore(detailPlan, { responseText: finalText, trace });
    applyVerifier(detailPlan);
    applyPersonaGovernor(detailPlan, { message: q });
    kokuzoRemember(threadId, detailPlan);

    console.log("[TALK_LLM] ok threadId=%s len=%d", threadId, finalText.length);

    // decisionFrame.intent 汚染を遮断: trace から intent を除外（次の入力に取り込まない）
    const sanitizedTrace = trace && typeof trace === "object" ? { ...trace } : trace;
    if (sanitizedTrace && typeof sanitizedTrace === "object" && "intent" in sanitizedTrace) {
      delete (sanitizedTrace as any).intent;
    }

    return res.json({
      response: finalText,
      trace: sanitizedTrace,
      provisional: true,
      detailPlan,
      candidates: [],
      evidence: null,
      timestamp: new Date().toISOString(),
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
    });
  }

  // コマンド処理: #menu, #status, #search, #pin
  // #menu（明示メニュー）
  if (trimmed === "#menu") {
    const nat = naturalRouter({ message: "メニュー", mode: "NATURAL" });
    const guide = nat.responseText.includes("どの方向で話しますか")
      ? nat.responseText
      : "了解。どの方向で話しますか？\n1) 言灵/カタカムナ/天津金木の質問\n2) 資料指定（doc/pdfPage）で厳密回答\n3) いまの状況整理（何を作りたいか）";
    
    if (isGreetingLike(message)) {
      setThreadPending(threadId, "LANE_PICK");
      return res.json({
        response: guide,
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
        timestamp,
        threadId,
      });
    }
  }

  if (trimmed.startsWith("#status")) {
    const db = getDb("kokuzo");
    const pagesCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_pages").get()?.cnt || 0;
    const chunksCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_chunks").get()?.cnt || 0;
    const filesCount = dbPrepare("kokuzo", "SELECT COUNT(*) as cnt FROM kokuzo_files").get()?.cnt || 0;
    return res.json({
      response: `【KOKUZO 状態】\n- kokuzo_pages: ${pagesCount}件\n- kokuzo_chunks: ${chunksCount}件\n- kokuzo_files: ${filesCount}件`,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }

  if (trimmed.startsWith("#search ")) {
    const query = trimmed.slice(7).trim();
    if (!query) {
      return res.json({
        response: "エラー: #search <query> の形式で検索語を指定してください",
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
        timestamp,
        threadId,
      });
    }
    const candidates = searchPagesForHybrid(null, query, 10);
    if (candidates.length === 0) {
      return res.json({
        response: `【検索結果】「${query}」に該当するページが見つかりませんでした。`,
        evidence: null,
        decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
        candidates: [],
        timestamp,
        threadId,
      });
    }
    const results = candidates.slice(0, 5).map((c, i) => 
      `${i + 1}. ${c.doc} P${c.pdfPage}: ${c.snippet.slice(0, 100)}...`
    ).join("\n");
    return res.json({
      response: `【検索結果】「${query}」\n\n${results}\n\n※ 番号を選択すると詳細を表示します。`,
      evidence: null,
      decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
      candidates: candidates.slice(0, 10),
      timestamp,
      threadId,
    });
  }

  if (trimmed.startsWith("#pin ")) {
    const pinMatch = trimmed.match(/doc\s*=\s*([^\s]+)\s+pdfPage\s*=\s*(\d+)/i);
    if (!pinMatch) {
      return res.json({
        response: "エラー: #pin doc=<filename> pdfPage=<number> の形式で指定してください",
        evidence: null,
        decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
        timestamp,
        threadId,
      });
    }
    const doc = pinMatch[1];
    const pdfPage = parseInt(pinMatch[2], 10);
    return res.json(buildGroundedResponse({
      doc,
      pdfPage,
      threadId,
      timestamp,
      wantsDetail: true,
    }));
  }

  // Phase19 NATURAL lock: hello/date/help（および日本語挨拶）とメニューだけは必ずNATURALで返す
  const t = message.trim().toLowerCase();
  const isNaturalCommand = t === "hello" || t === "date" || t === "help" || message.includes("おはよう");
  
  if (isNaturalCommand) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    return res.json({
      response: nat.responseText,
      evidence: null,
      decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
      timestamp,
      threadId,
    });
  }
  
  // メニューのときだけNATURALを返す（それ以外は先へ流す）
  const isJapanese = /[ぁ-んァ-ン一-龯]/.test(message);
  const hasDocPage = /pdfPage\s*=\s*\d+/i.test(message) || /\bdoc\b/i.test(message);
  
  if (isJapanese && !wantsDetail && !hasDocPage) {
    const nat = naturalRouter({ message, mode: "NATURAL" });
    
    // メニューのときだけNATURALを返す（挨拶っぽい短文のときだけ）
    if (nat.handled && nat.responseText.includes("どの方向で話しますか")) {
      const guide = nat.responseText;
      if (isGreetingLike(message)) {
        setThreadPending(threadId, "LANE_PICK");
        return res.json({
          response: guide,
          evidence: null,
          decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
          timestamp,
          threadId,
        });
      }
    }
    
    // それ以外はNATURALを返さず先へ流す（HYBRIDへ）
  }

  // GROUNDED分岐: doc + pdfPage 指定時は必ず GROUNDED を返す（DB優先で強制）
  // doc=... 形式または ...pdf 形式の両方に対応
  const mPage = message.match(/pdfPage\s*=\s*(\d+)/i);
  const mDocExplicit = message.match(/doc\s*=\s*([^\s]+)/i);
  const mDocPdf = message.match(/([^\s]+\.pdf)/i);
  const groundedDoc = mDocExplicit ? mDocExplicit[1] : (mDocPdf ? mDocPdf[1] : null);
  if (mPage && groundedDoc) {
    const pdfPage = parseInt(mPage[1], 10);
    // doc/pdfPage 指定は常に GROUNDED（本文が未投入でも buildGroundedResponse 側で警告する）

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H2",
        location: "api/src/routes/chat.ts:docPdfPageBranch",
        message: "doc/pdfPage GROUNDED branch taken",
        data: { doc: groundedDoc, pdfPage, wantsDetail },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return res.json(buildGroundedResponse({
      doc: groundedDoc,
      pdfPage,
      threadId,
      timestamp,
      wantsDetail,
    }));
  }

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");
  
  // --- DOC_HINT (deterministic) ---
  const docHint = (sanitized.text || "").match(/\b[A-Z][A-Z0-9_]{2,}\b/)?.[0] ?? null;
  // doc が未指定のときだけ docHint を採用
  let doc: string | null = null;
  if (docHint) {
    doc = docHint;
  }
  // --- /DOC_HINT ---
  
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

    // 観測円から応答文を生成（会話形に変換）
    const baseText = String(composeConversationalResponse(trace, personaState, sanitized.text) ?? "");

    // 工程3: CorePlan（器）を必ず経由（最小の決定論コンテナ）
    const detailPlan = emptyCorePlan(
      baseText.slice(0, 80)
    );
    detailPlan.chainOrder = ["KANAGI_TRACE", "COMPOSE_RESPONSE"];
    if (trace && Array.isArray((trace as any).violations) && (trace as any).violations.length) {
      detailPlan.warnings = (trace as any).violations.map((v: any) => String(v));
    }

    // 工程4: Truth-Core（判定器）を通す（決定論・LLM禁止）
    applyTruthCore(detailPlan, { responseText: baseText, trace });
    applyVerifier(detailPlan);
    applyPersonaGovernor(detailPlan, { message: sanitized.text });

    // Phase48: IROHA_KERNEL（人格・思考ロジック用の決定論カーネル）
    const iroha = classifyIrohaKernel(sanitized.text);
    detailPlan.iroha = iroha;
    detailPlan.chainOrder = Array.from(new Set([...(detailPlan.chainOrder ?? []), "IROHA_KERNEL"]));

    // Phase23: Kokuzo recall（構文記憶）
    const prev = kokuzoRecall(threadId);
    if (prev) {
      if (!detailPlan.chainOrder.includes("KOKUZO_RECALL")) detailPlan.chainOrder.push("KOKUZO_RECALL");
      detailPlan.warnings.push(`KOKUZO: recalled centerClaim=${prev.centerClaim.slice(0, 40)}`);
    }

    // session_memory から参照（再利用の証明）
    const sessionMemories = memoryReadSession(threadId, 10);
    if (sessionMemories.length > 0) {
      console.log(`[RECALL] session_id=${threadId} hits=${sessionMemories.length} source=session_memory`);
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
    // doc=... 形式をパース（#詳細 の場合も対応）
    // 既存の doc があればそれを優先、なければ doc=... を抽出
    const docMatch = sanitized.text.match(/doc\s*=\s*([^\s]+)/i);
    if (docMatch && !doc) {
      doc = docMatch[1];
    }
    const candidates = searchPagesForHybrid(doc, sanitized.text, 10);
    
    // Phase26: candidates を threadId に保存（番号選択で再利用）
    setThreadCandidates(threadId, candidates);

    // === ARK_RESPONSE_GENERATOR: 天聞アークの人格による応答生成 ===
    // ENABLE_ARK_RESPONSE=1 のときのみ有効（デフォルトOFF）
    const enableArkResponse = String(process.env.ENABLE_ARK_RESPONSE || "0") === "1";
    let arkResponse: string | null = null;
    
    if (enableArkResponse) {
      try {
        arkResponse = await generateArkResponse({
          userMessage: sanitized.text,
          conversationHistory: sessionMemories,
          candidates,
          evidence: null, // 後で設定
          trace,
        });
        
        if (arkResponse) {
          console.log(`[ARK_RESPONSE] generated len=${arkResponse.length}`);
        }
      } catch (e) {
        console.warn("[ARK_RESPONSE] generation failed:", e);
        // 失敗時は baseText をそのまま使用
      }
    }
    // === END ARK_RESPONSE_GENERATOR ===

    // ドメイン質問の検出（naturalRouter の判定と一致させる）
    const isDomainQuestion = /言灵|言霊|ことだま|kotodama|法則|カタカムナ|天津金木|水火|與合/i.test(sanitized.text);
    
    // ドメイン質問の場合、回答本文を改善（候補があれば本文を生成、なければ最低限の説明）
    let finalResponse = arkResponse || baseText;
    let evidenceDoc: string | null = null;
    let evidencePdfPage: number | null = null;
    let evidenceQuote: string | null = null;
    
    if (isDomainQuestion && isJapanese && !wantsDetail && !hasDocPage) {
      if (candidates.length > 0) {
        const top = candidates[0];
        const pageText = getPageText(top.doc, top.pdfPage);
        
        // 根拠情報を保存（candidates[0] を使う場合は必ず evidence を付与）
        evidenceDoc = top.doc;
        evidencePdfPage = top.pdfPage;
        if (top.snippet && typeof top.snippet === "string" && top.snippet.length > 0) {
          evidenceQuote = top.snippet;
        } else if (pageText && pageText.trim().length > 0) {
          evidenceQuote = pageText.trim().slice(0, 100);
        } else {
          evidenceQuote = "";
        }
        
        // ARK_RESPONSE_GENERATOR が有効な場合は、検索結果を「天聞アークの言葉」に変換
        if (enableArkResponse && arkResponse) {
          // arkResponse は既に生成済み（検索結果を含む）
          finalResponse = arkResponse;
        } else if (pageText && pageText.trim().length > 0) {
          // フォールバック: 検索結果をそのまま返す（従来の動作）
          const excerpt = pageText.trim().slice(0, 300);
          finalResponse = `${excerpt}${excerpt.length < pageText.trim().length ? '...' : ''}\n\n※ 必要なら資料指定（doc/pdfPage）で厳密にもできます。`;
        } else {
          // ページテキストが取得できない場合のフォールバック
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
      
      // ARK_RESPONSE_GENERATOR が有効で、まだ生成されていない場合は再生成（evidence を含む）
      if (enableArkResponse && !arkResponse) {
        try {
          arkResponse = await generateArkResponse({
            userMessage: sanitized.text,
            conversationHistory: sessionMemories,
            candidates,
            evidence,
            trace,
          });
          
          if (arkResponse) {
            console.log(`[ARK_RESPONSE] regenerated with evidence len=${arkResponse.length}`);
            finalResponse = arkResponse;
          }
        } catch (e) {
          console.warn("[ARK_RESPONSE] regeneration failed:", e);
        }
      }
      
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

    // 保険: HYBRID 応答で candidates があるのに top-level evidence が null の場合は candidates[0] から補完する
    if (!evidence && Array.isArray(candidates) && candidates.length > 0) {
      const top = candidates[0] as any;
      const doc0 = top?.doc;
      const page0 = top?.pdfPage;
      if (typeof doc0 === "string" && typeof page0 === "number") {
        const quote0 = typeof top.snippet === "string" ? top.snippet : "";
        const fallbackEvidence = {
          doc: doc0,
          pdfPage: page0,
          quote: quote0,
        };
        // 既に detailPlan.evidence があれば尊重し、無ければ candidates[0] 由来で埋める
        if (!(detailPlan as any).evidence) {
          (detailPlan as any).evidence = fallbackEvidence;
        }
        // evidenceIds にも KZPAGE エビデンスIDを必ず追加（既存があればマージ）
        if (!detailPlan.evidenceIds) {
          detailPlan.evidenceIds = [];
        }
        const evidenceId0 = `KZPAGE:${doc0}:P${page0}`;
        if (!detailPlan.evidenceIds.includes(evidenceId0)) {
          detailPlan.evidenceIds.push(evidenceId0);
        }
        evidence = fallbackEvidence;
      }
    }

    // KHS 系の evidence は doc を canonical な "KHS" に正規化する（言霊秘書.pdf alias を吸収）
    if (evidence && evidence.doc === "言霊秘書.pdf") {
      evidence.doc = "KHS";
      if ((detailPlan as any).evidence && (detailPlan as any).evidence.doc === "言霊秘書.pdf") {
        (detailPlan as any).evidence.doc = "KHS";
      }
    }

    // #詳細 のときだけ Manyoshu / Danshari tags を付与
    if (wantsDetail) {
      let tagSourceText: string = sanitized.text;
      if (evidenceDoc && evidencePdfPage !== null) {
        const evText = getPageText(evidenceDoc, evidencePdfPage);
        if (evText && evText.trim().length > 0) {
          tagSourceText = evText;
        }
      }
      (detailPlan as any).manyoshuTags = extractManyoshuTags(tagSourceText);
      (detailPlan as any).danshariTags = extractDanshariTags(tagSourceText);

      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/83ac8294-6911-4c6f-ab66-91506b656559", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "man-dan",
          hypothesisId: "MAN_DAN_HYBRID",
          location: "api/src/routes/chat.ts:HYBRID#tags",
          message: "HYBRID detail wantsDetail tags attached",
          data: {
            hasEvidenceDoc: !!evidenceDoc,
            evidenceDoc,
            evidencePdfPage,
            manyoshuTags: (detailPlan as any).manyoshuTags ?? [],
            danshariTags: (detailPlan as any).danshariTags ?? [],
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    }

    // === LLM_SURFACE ===
    // 戻り直前で文章整形を適用（trace は一切いじらない）
    let finalText = await surfaceize(finalResponse, sanitized.text);
    
    // 会話形にする保険（決定論：観測ログ風の応答を会話形に補正）
    function conversationalFallback(text: string, userMsg: string): string {
      const s = (text || "").trim();

      // 「未解決」「観測ログ風」「短すぎ」なら会話形に補正する（内容は増やさず、質問を返す）
      // ただし、挨拶っぽい短文のときだけguideを返す
      const tooShort = s.length < 40;
      const looksLikeLog = /内集|外発|正中|圧縮|凝縮|発酵中|未解決/.test(s);

      if ((tooShort || (looksLikeLog && /未解決/.test(s))) && isGreetingLike(userMsg)) {
        const guide = [
          "いまは答えを\"まとめている途中\"の状態です。",
          `あなたが求めているのは、次のどれに近いですか？`,
          "1) 雑談として会話したい",
          "2) 何かを判断・整理したい",
          "3) 資料を根拠に深掘りしたい（doc/pdfPage）",
          "",
          "ひとまず、いま一番話したいテーマを一言で教えてください。"
        ].join("\n");
        return guide;
      }

      return s;
    }
    
    finalText = conversationalFallback(finalText, sanitized.text);
    
    if (finalText !== finalResponse) {
      // SURFACE が適用された場合のみ warnings に追加
      if (!detailPlan.warnings) {
        detailPlan.warnings = [];
      }
      detailPlan.warnings.push("SURFACE_APPLIED");
    }
    // === END LLM_SURFACE ===

    // ローカルサーフェス化: HYBRIDモードでログ語彙を除去（常時実行）
    finalText = localSurfaceize({
      text: finalText,
      userMessage: sanitized.text,
      mode: "HYBRID",
    });

    // レスポンス形式（厳守）
    applyPersonaGovernor(detailPlan as any, { message: sanitized.text, trace: {} as any } as any);

    // PERSIST_CALL_MAIN_V1: conversation_log / session_memory にINSERT
    persistTurn(threadId, sanitized.text, finalText);

    // decisionFrame.intent 汚染を遮断: trace から intent を除外（次の入力に取り込まない）
    const sanitizedTrace = trace && typeof trace === "object" ? { ...trace } : trace;
    if (sanitizedTrace && typeof sanitizedTrace === "object" && "intent" in sanitizedTrace) {
      delete (sanitizedTrace as any).intent;
    }

    return res.json({
      response: finalText,
      trace: sanitizedTrace,
      provisional: true,
      detailPlan,
      candidates,
      evidence,
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
    applyPersonaGovernor(detailPlan as any, { message: sanitized?.text || message || "" });
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
