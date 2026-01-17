// /opt/tenmon-ark/api/src/routes/chat.ts
import { Router, type IRouter, type Request, type Response } from "express";
import { getCorpusPage, getAvailableDocs } from "../kotodama/corpusLoader.js";
import { determineKanagiPhase, applyKanagiPhaseStructure } from "../persona/kanagi.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import { runTruthCheck } from "../synapse/truthCheck.js";

import { llmChat } from "../llm/client.js";
import { systemNatural, systemGrounded } from "../llm/prompts.js";
import { pushTurn, getContext } from "../llm/threadMemory.js";

import { detectIntent, isDetailRequest, composeNatural } from "../persona/speechStyle.js";
import { buildTruthSkeleton } from "../truth/truthSkeleton.js";
import { fetchLiveEvidence } from "../tools/liveEvidence.js";
import { getRequestId } from "../middleware/requestId.js";
import { buildEvidencePack, estimateDocAndPage } from "../kotodama/evidencePack.js";
import {
  buildCoreAnswerPlanFromEvidence,
  inferDocKey,
  makeFallbackLawsFromText,
  stripForbiddenFromResponse,
  type EvidenceLaw,
} from "../kanagi/kanagiCore.js";
import { verifyCorePlan } from "../kanagi/verifier.js";
import { containsForbiddenTemplate, getFallbackTemplate } from "../persona/outputGuard.js";
import { searchPages } from "../kotodama/retrievalIndex.js";
import { retrieveAutoEvidence, type AutoEvidenceHit } from "../kotodama/retrieveAutoEvidence.js";
import { composeDetailFromEvidence } from "../persona/composeDetail.js";
import { getPatternsLoadStatus } from "../kanagi/patterns/loadPatterns.js";

import fs from "node:fs";
import readline from "node:readline";

const router: IRouter = Router();

function parseDocAndPageStrict(text: string): { 
  doc: string | null; 
  pdfPage: number | null;
  isEstimated?: boolean;
  autoEvidence?: {
    confidence: number;
    topHit: {
      doc: string;
      pdfPage: number;
      quoteSnippets: string[];
    };
  };
} {
  const mDoc = text.match(/(?:^|\s)doc\s*[:=]\s*([^\s]+)/i);
  let doc = mDoc ? String(mDoc[1]).trim() : null;

  if (!doc) {
    const mPdf = text.match(/([^\s]+\.pdf)/i);
    if (mPdf) doc = String(mPdf[1]).trim();
  }

  const m = text.match(/pdfPage\s*[:=]\s*(\d{1,4})/i);
  const pdfPage = m ? Number(m[1]) : null;

  return { doc, pdfPage };
}

// LawCandidates（ページ候補）を読む
type LawCandidate = {
  id: string;
  doc: string;
  pdfPage: number;
  title: string;
  quote: string;
  rule: string;
  confidence: number;
};

async function getPageCandidates(doc: string, pdfPage: number, limit = 12): Promise<LawCandidate[]> {
  const file =
    doc === "言霊秘書.pdf"
      ? "/opt/tenmon-corpus/db/khs_law_candidates.jsonl"
      : doc === "カタカムナ言灵解.pdf"
      ? "/opt/tenmon-corpus/db/ktk_law_candidates.jsonl"
      : doc === "いろは最終原稿.pdf"
      ? "/opt/tenmon-corpus/db/iroha_law_candidates.jsonl"
      : "";

  const out: LawCandidate[] = [];
  if (!file || !fs.existsSync(file)) return out;

  const rl = readline.createInterface({ input: fs.createReadStream(file, "utf-8"), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = String(line).trim();
    if (!t) continue;
    try {
      const r = JSON.parse(t) as LawCandidate;
      if (r.doc === doc && r.pdfPage === pdfPage) {
        out.push(r);
        if (out.length >= limit) break;
      }
    } catch (e) {
      continue;
    }
  }
  return out;
}

function inferAxis(message: string): ThinkingAxis {
  const t = message;
  if (/(どうすれば|手順|実装|設定|コマンド)/.test(t)) return "executive";
  if (/(設計|統合|整理|列挙|抽出)/.test(t)) return "constructive";
  if (/(本質|とは|なぜ|意味|原理)/.test(t)) return "introspective";
  return "observational";
}

router.post("/chat", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  
  try {
    const body = (req.body ?? {}) as any;
    const message = String(body.message ?? "").trim();
    const threadId = String(body.threadId ?? "default").trim();

    if (!message) {
      return res.status(400).json({ error: "message required" });
    }

    // =========================
    // detail 判定（req.body.debug を無視）
    // =========================
    const parsed = parseDocAndPageStrict(message);
    const detail = isDetailRequest(message); // req.body.debug は完全無視

    // =========================
    // TASK B: Truth Skeleton（真理骨格）を生成
    // =========================
    const skeleton = buildTruthSkeleton(message, !!parsed.doc && !!parsed.pdfPage, detail);

    // =========================
    // doc/pdfPage バリデーション（GROUNDED/HYBRID前）
    // =========================
    if (parsed.doc && !parsed.pdfPage) {
      return res.json({
        response: "pdfPage が見つかりませんでした。例）言霊秘書.pdf pdfPage=6 ... のように指定してください。",
        decisionFrame: { mode: skeleton.mode, intent: skeleton.intent, llm: null, need: ["pdfPage"] },
        timestamp: new Date().toISOString(),
      });
    }
    if (!parsed.doc && parsed.pdfPage) {
      return res.json({
        response: "doc（PDF名）が見つかりませんでした。例）言霊秘書.pdf pdfPage=6 ... のように指定してください。",
        decisionFrame: { mode: skeleton.mode, intent: skeleton.intent, llm: null, need: ["doc"] },
        timestamp: new Date().toISOString(),
      });
    }

    // リスクゲート（暴走防止）
    if (skeleton.risk === "high") {
      const safeResponse = "申し訳ございませんが、その内容については回答できません。安全で適切な代替案をご案内できますので、別の質問をお願いします。";
      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: safeResponse, at: Date.now() });
      return res.json({
        response: safeResponse,
        evidence: null,
        decisionFrame: { mode: skeleton.mode, intent: skeleton.intent, risk: skeleton.risk },
        timestamp: new Date().toISOString(),
      });
    }

    // =========================
    // MODE決定（Truth Skeleton ベース）
    // =========================
    const mode = skeleton.mode;

    // =========================
    // LIVE モード（Web検索必須）
    // =========================
    if (mode === "LIVE") {
      // STEP 4-2: LIVEモードはさらに厳しめのレート制限
      // （ミドルウェアで既に適用されているが、念のため）
      const liveEvidenceStart = Date.now();
      const liveEvidence = await fetchLiveEvidence(message, skeleton);
      const liveEvidenceLatency = Date.now() - liveEvidenceStart;

      if (!liveEvidence) {
        // Bing APIが落ちた時や検索失敗時の劣化動作
        const fallbackResponse = "申し訳ございませんが、現在の情報を取得できませんでした。検索サービスに接続できないか、情報が見つかりませんでした。しばらく時間をおいて再度お試しください。または、公式サイトやニュースサイトで直接確認していただくことをお勧めします。";
        pushTurn(threadId, { role: "user", content: message, at: Date.now() });
        pushTurn(threadId, { role: "assistant", content: fallbackResponse, at: Date.now() });
        return res.json({
          response: fallbackResponse,
          evidence: null,
          decisionFrame: { mode, intent: skeleton.intent, error: "live_evidence_fetch_failed" },
          timestamp: new Date().toISOString(),
        });
      }

      // LIVE回答を生成
      const sys = systemNatural();
      const ctx = getContext(threadId);
      // JST時刻に変換
      const jstTime = new Date(liveEvidence.timestamp).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      const livePrompt = `${message}\n\n取得した情報:\n- 値: ${liveEvidence.value}\n- 取得時刻: ${jstTime} JST\n- 出典: ${liveEvidence.sources.map(s => s.url).join(", ")}\n- 信頼度: ${liveEvidence.confidence}\n${liveEvidence.note ? `- 注意: ${liveEvidence.note}\n` : ""}\n\n上記情報を基に、自然な短文で答えてください。必ず取得時刻（JST）と出典URL（最低1、推奨2）を含めてください。不一致や不確実な場合は「確認中」「不一致」と明示し、断定しないでください。`;

      const liveAnswer = await llmChat(
        [
          { role: "system", content: sys },
          ...ctx,
          { role: "user", content: livePrompt },
        ],
        { temperature: 0.3, max_tokens: 300 }
      ).catch(() => {
        // LLMが失敗した場合のフォールバック（取得時刻＋出典URLを必ず含める）
        const jstTimeFallback = new Date(liveEvidence.timestamp).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        return `${liveEvidence.value}（取得時刻: ${jstTimeFallback} JST、出典: ${liveEvidence.sources.map(s => s.url).join(", ")}）`;
      });

      const llmStart = Date.now();
      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: liveAnswer, at: Date.now() });
      const llmLatency = Date.now() - llmStart;
      const totalLatency = Date.now() - startTime;

      // STEP 3-1: 必須ログ（info）
      console.log(JSON.stringify({
        level: "info",
        requestId,
        threadId,
        mode,
        risk: skeleton.risk,
        latency: {
          total: totalLatency,
          liveEvidence: liveEvidenceLatency,
          llm: llmLatency,
        },
        evidenceConfidence: liveEvidence.confidence,
        returnedDetail: detail,
      }));

      const result: any = {
        response: liveAnswer,
        evidence: {
          live: true,
          value: liveEvidence.value,
          timestamp: liveEvidence.timestamp,
          sources: liveEvidence.sources,
          confidence: liveEvidence.confidence,
        },
        decisionFrame: { mode, intent: skeleton.intent },
        timestamp: new Date().toISOString(),
      };

      // Phase 2-B: #詳細 がある場合のみ、detail を返す（null禁止、detail=falseの場合はフィールドを返さない）
      if (detail) {
        const detailText =
          `【LIVE情報】\n` +
          `- 値: ${liveEvidence.value}\n` +
          `- 取得時刻: ${new Date(liveEvidence.timestamp).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} JST\n` +
          `- 出典: ${liveEvidence.sources.map(s => s.url).join(", ")}\n` +
          `- 信頼度: ${liveEvidence.confidence}\n` +
          (liveEvidence.note ? `- 注意: ${liveEvidence.note}\n` : "");
        // Phase 2-B: detail は必ず string で返す（null禁止）
        result.detail = detailText || "（詳細生成に失敗）";
      }
      // Phase 2-B: detail === false の場合は detail フィールドを返さない（nullも返さない）

      return res.json(result);
    }

    // =========================
    // NATURAL モード（一般会話）
    // =========================
    if (mode === "NATURAL") {
      const sys = systemNatural();
      const ctx = getContext(threadId);

      // 制約をプロンプトに追加
      const constraintsText = skeleton.constraints.length > 0
        ? `\n\n【制約】\n${skeleton.constraints.join("\n")}`
        : "";

      const llmStart = Date.now();
      const answer = await llmChat(
        [
          { role: "system", content: sys + constraintsText },
          ...ctx,
          { role: "user", content: message },
        ],
        { temperature: 0.4, max_tokens: 380 }
      ).catch((e) => {
        console.error("[LLM-ERROR]", e);
        return "承知しました。いまの問い、もう少しだけ状況を教えてください。";
      });
      const llmLatency = Date.now() - llmStart;

      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: answer, at: Date.now() });
      const totalLatency = Date.now() - startTime;

      // STEP 3-1: 必須ログ（info）
      console.log(JSON.stringify({
        level: "info",
        requestId,
        threadId,
        mode,
        risk: skeleton.risk,
        latency: {
          total: totalLatency,
          liveEvidence: null,
          llm: llmLatency,
        },
        evidenceConfidence: null,
        returnedDetail: detail,
      }));

      const result: any = {
        response: answer,
        evidence: null,
        decisionFrame: { mode, intent: skeleton.intent },
        timestamp: new Date().toISOString(),
      };

      // Phase 2-B: #詳細 がある場合のみ、detail を返す（null禁止、detail=falseの場合はフィールドを返さない）
      if (detail) {
        const detailText = `【NATURAL モード】\n質問: ${message}\n回答: ${answer}\n\n※ NATURAL モードでは、資料準拠の詳細は返されません。詳細が必要な場合は、doc/pdfPage を指定するか「#詳細」とともに送信してください。`;
        // Phase 2-B: detail は必ず string で返す（null禁止）
        result.detail = detailText || "（詳細生成に失敗）";
      }
      // Phase 2-B: detail === false の場合は detail フィールドを返さない（nullも返さない）

      return res.json(result);
    }

    // =========================
    // HYBRID モード（domain）
    // ルール：LLM禁止 / evidence必須 / detailはコード生成のみ
    // =========================
        // =========================
        // HYBRID モード（domain）
        // ルール：LLM禁止 / evidence必須 / detailはコード生成のみ
        // =========================
        if (mode === "HYBRID") {
          // Phase 4: Kanagi patterns がロードされていない場合は ASK に倒す（断定禁止）
          const kanagiStatus = getPatternsLoadStatus();
          if (!kanagiStatus.loaded) {
            const askResponse = "（資料準拠）\n天津金木パターンが読み込まれていないため、断定を避けます。\n候補ページを指定していただけますか？\n例）言霊秘書.pdf pdfPage=6 言灵とは？ #詳細";

            const result: any = {
              response: askResponse,
              evidence: null,
              decisionFrame: {
                mode,
                intent: skeleton.intent,
                llm: null,
                kanagiPatternsLoaded: false,
              },
              timestamp: new Date().toISOString(),
            };

            if (detail) {
              result.detail = `#詳細\n- 天津金木パターン: 未ロード（patternsLoaded=false）\n- 対応: 候補ページを指定してください\n- Kanagi patterns のロード状態は /api/health で確認できます。`;
            }

            pushTurn(threadId, { role: "user", content: message, at: Date.now() });
            pushTurn(threadId, { role: "assistant", content: askResponse, at: Date.now() });
            const totalLatency = Date.now() - startTime;

            console.log(JSON.stringify({
              level: "info",
              requestId,
              threadId,
              mode,
              risk: skeleton.risk,
              latency: { total: totalLatency, liveEvidence: null, llm: null },
              evidenceConfidence: null,
              kanagiPatternsLoaded: false,
              returnedDetail: detail,
            }));

            return res.json(result);
          }

          // domainで doc/pdfPage が未指定の場合、自動検索を試みる
          if (!parsed.doc || !parsed.pdfPage) {
            const auto = retrieveAutoEvidence(message, 3);
            console.info(
              `[HYBRID-AUTO-EVIDENCE] hits=${auto.hits.length} confidence=${auto.confidence.toFixed(2)} top=${auto.hits[0] ? `${auto.hits[0].doc} P${auto.hits[0].pdfPage}` : "none"}`
            );

            if (auto.hits.length === 0 || !auto.hits[0]) {
              // 従来通り（資料指定）
              const response =
                "資料準拠で答えるため、参照する資料の指定が必要です。\n" +
                "例）言霊秘書.pdf pdfPage=6 言灵とは？ #詳細";

              const result: any = {
                response,
                evidence: null,
                decisionFrame: { 
                  mode, 
                  intent: skeleton.intent, 
                  need: ["doc", "pdfPage"], 
                  llm: null,
                },
                timestamp: new Date().toISOString(),
              };

              if (detail) {
                result.detail = `#詳細\n- 自動検索結果: 候補が見つかりませんでした\n- 指定方法: 「言霊秘書.pdf pdfPage=6 言灵とは？ #詳細」のように指定してください。`;
              }

              pushTurn(threadId, { role: "user", content: message, at: Date.now() });
              pushTurn(threadId, { role: "assistant", content: response, at: Date.now() });
              const totalLatency = Date.now() - startTime;

              console.log(JSON.stringify({
                level: "info",
                requestId,
                threadId,
                mode,
                risk: skeleton.risk,
                latency: { total: totalLatency, liveEvidence: null, llm: null },
                evidenceConfidence: 0.0,
                returnedDetail: detail,
              }));

              return res.json(result);
            } else if (auto.confidence >= 0.6) {
              // confidence>=0.6 → 暫定採用して既存のGROUNDED処理へ流す
              const topHit = auto.hits[0]!;
              parsed.doc = topHit.doc;
              parsed.pdfPage = topHit.pdfPage;
              parsed.isEstimated = true; // 自動検索フラグ
              parsed.autoEvidence = { // 自動検索結果を保存（detailに追加するため）
                confidence: auto.confidence,
                topHit: {
                  doc: topHit.doc,
                  pdfPage: topHit.pdfPage,
                  quoteSnippets: topHit.quoteSnippets,
                },
              };
              // 未指定分岐を抜けて下の既存処理（doc/pdfPage指定時の rec/candidates/laws生成）へ流す
            } else {
              // confidence < 0.6 → 候補提示
              const response =
                "候補を見つけました。どれを参照しますか？（番号で答えてください）\n" +
                auto.hits.map((h, i) => `${i + 1}) ${h.doc} P${h.pdfPage}（score=${h.score.toFixed(1)}）`).join("\n");

              const result: any = {
                response,
                evidence: { auto: true, hits: auto.hits.map(h => ({ doc: h.doc, pdfPage: h.pdfPage, score: h.score })) },
                decisionFrame: { mode, intent: skeleton.intent, llm: null, isEstimated: true },
                timestamp: new Date().toISOString(),
              };

              if (detail) {
                result.detail =
                  "#詳細\n- 自動検索候補:\n" +
                  auto.hits.map((h, i) => `  ${i + 1}. doc=${h.doc} pdfPage=${h.pdfPage}\n     抜粋: ${(h.quoteSnippets?.[0] ?? "").slice(0, 120)}...`).join("\n\n");
              }

              pushTurn(threadId, { role: "user", content: message, at: Date.now() });
              pushTurn(threadId, { role: "assistant", content: response, at: Date.now() });
              const totalLatency = Date.now() - startTime;

              console.log(JSON.stringify({
                level: "info",
                requestId,
                threadId,
                mode,
                risk: skeleton.risk,
                latency: { total: totalLatency, liveEvidence: null, llm: null },
                evidenceConfidence: auto.confidence,
                returnedDetail: detail,
              }));

              return res.json(result);
            }
          }

      // doc/pdfPage 指定がある場合：Evidenceを組む（LLM禁止）
      const doc = parsed.doc!;
      const pdfPage = parsed.pdfPage!;
      const docKey = inferDocKey(doc);

      const rec = getCorpusPage(doc, pdfPage);
      const pageText = (rec?.cleanedText ?? "").toString().slice(0, 4000);

      // law candidates（あれば）
      const candidates = await getPageCandidates(doc, pdfPage, 12);
      let laws = candidates.map((c: LawCandidate) => ({ id: c.id, title: c.title, quote: c.quote }));

      // ktk/irohaは candidates が空になりやすいので fallback
      if (laws.length === 0 && pageText) {
        laws = makeFallbackLawsFromText({ docKey, pdfPage, pageText, message, limit: 6 });
      }

      // evidenceが弱すぎる場合も資料不足扱い
      if (!pageText && laws.length === 0) {
        const response =
          "指定ページの本文データが見つかりませんでした。\n" +
          "pdfPage番号を一度だけ確認してください。\n" +
          `doc=${doc} pdfPage=${pdfPage}`;

        const result: any = {
          response,
          evidence: { doc, pdfPage, laws: [] },
          decisionFrame: { mode, intent: skeleton.intent, llm: null },
          timestamp: new Date().toISOString(),
        };
        if (detail) result.detail = `#詳細\n- doc: ${doc}\n- pdfPage: ${pdfPage}\n- 根拠: （本文データ無し）`;

        pushTurn(threadId, { role: "user", content: message, at: Date.now() });
        pushTurn(threadId, { role: "assistant", content: response, at: Date.now() });
        const totalLatency = Date.now() - startTime;

        console.log(JSON.stringify({
          level: "info",
          requestId,
          threadId,
          mode,
          risk: skeleton.risk,
          latency: { total: totalLatency, liveEvidence: null, llm: null },
          evidenceConfidence: null,
          returnedDetail: detail,
        }));

        return res.json(result);
      }

      // CorePlan（天津金木の最低骨格：躰/用）を構築
      const isEstimated = parsed.isEstimated ?? false;
      const plan = buildCoreAnswerPlanFromEvidence(message, {
        doc, docKey, pdfPage, pageText,
        laws,
        isEstimated,
      });

      // Verifierでclaimsを検証
      const verification = verifyCorePlan(plan.claims, plan.evidence);
      
      // 空仮中検知があれば「断定禁止」に落ちる
      if (plan.kokakechuFlags.length > 0) {
        const response = `（資料準拠）\n${plan.thesis}\n\n注意：${plan.kokakechuFlags.join("、")}が検知されました。根拠に基づく回答のみを提供します。\n\n躰：${plan.tai || "（抽出不足）"}\n用：${plan.yo || "（抽出不足）"}`;
        
        const result: any = {
          response: stripForbiddenFromResponse(response),
          evidence: {
            doc,
            pdfPage,
            isEstimated,
            laws: plan.evidence.laws.slice(0, 10).map(l => ({ id: l.id, title: l.title })),
            usedLawIds: plan.usedLawIds,
          },
          decisionFrame: { 
            mode, 
            intent: skeleton.intent, 
            llm: null, 
            grounds: [{ doc, pdfPage }],
            kokakechuFlags: plan.kokakechuFlags,
          },
          timestamp: new Date().toISOString(),
        };

        if (detail) {
          // Phase 2: detail を完全コード生成で統一（捏造ゼロ）
          let detailText = composeDetailFromEvidence(plan, plan.evidence, {
            valid: verification.valid,
            failedClaims: verification.failedClaims.length,
            warnings: verification.warnings,
          });
          if (isEstimated && parsed.autoEvidence) {
            const topHitSnippets = parsed.autoEvidence.topHit.quoteSnippets.slice(0, 2).map((s: string, i: number) => `  [抜粋${i + 1}] ${s.slice(0, 150)}...`).join("\n");
            detailText += `\n\n【自動検索結果（暫定回答）】\n- 採用: ${doc} P${pdfPage}\n- confidence: ${parsed.autoEvidence.confidence.toFixed(2)}\n- 抜粋:\n${topHitSnippets}`;
          }
          result.detail = detailText;
        }

        pushTurn(threadId, { role: "user", content: message, at: Date.now() });
        pushTurn(threadId, { role: "assistant", content: result.response, at: Date.now() });
        const totalLatency = Date.now() - startTime;

        console.log(JSON.stringify({
          level: "info",
          requestId,
          threadId,
          mode,
          risk: skeleton.risk,
          latency: { total: totalLatency, liveEvidence: null, llm: null },
          evidenceConfidence: plan.evidence.laws.length > 0 ? 1.0 : null,
          kokakechuFlags: plan.kokakechuFlags,
          returnedDetail: detail,
        }));

        return res.json(result);
      }

      // response/detail はコード生成のみ
      const response = stripForbiddenFromResponse(plan.responseDraft);

      const result: any = {
        response,
        evidence: {
          doc,
          pdfPage,
          isEstimated,
          laws: plan.evidence.laws.slice(0, 10).map(l => ({ id: l.id, title: l.title })),
          usedLawIds: plan.usedLawIds,
        },
        decisionFrame: { 
          mode, 
          intent: skeleton.intent, 
          llm: null, 
          grounds: [{ doc, pdfPage }],
          thesis: plan.thesis,
          kokakechuFlags: plan.kokakechuFlags.length > 0 ? plan.kokakechuFlags : undefined,
        },
        timestamp: new Date().toISOString(),
      };

      if (detail) {
        // Phase 2: detail を完全コード生成で統一（捏造ゼロ）
        let detailText = composeDetailFromEvidence(plan, plan.evidence, {
          valid: verification.valid,
          failedClaims: verification.failedClaims.length,
          warnings: verification.warnings,
        });
        if (isEstimated && parsed.autoEvidence) {
          const topHitSnippets = parsed.autoEvidence.topHit.quoteSnippets.slice(0, 2).map((s, i) => `  [抜粋${i + 1}] ${s.slice(0, 150)}...`).join("\n");
          detailText += `\n\n【自動検索結果（暫定回答）】\n- 採用: ${doc} P${pdfPage}\n- confidence: ${parsed.autoEvidence.confidence.toFixed(2)}\n- 抜粋:\n${topHitSnippets}`;
        }
        result.detail = detailText;
      }

      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: response, at: Date.now() });
      const totalLatency = Date.now() - startTime;

      console.log(JSON.stringify({
        level: "info",
        requestId,
        threadId,
        mode,
        risk: skeleton.risk,
        latency: { total: totalLatency, liveEvidence: null, llm: null },
        evidenceConfidence: plan.evidence.laws.length > 0 ? 1.0 : null,
        returnedDetail: detail,
      }));

      return res.json(result);
    }

  } catch (err: any) {
    const errorMessage = req.body?.message || "";
    const errorStack = err?.stack || String(err);
    const errorLine = err?.line || err?.lineNumber || "unknown";
    const errorRequestId = getRequestId(req);
    const errorThreadId = String(req.body?.threadId ?? "default").trim();
    
    console.error("[CHAT-ERROR]", {
      message: errorMessage,
      error: String(err),
      stack: errorStack,
      line: errorLine,
      requestId: errorRequestId,
      threadId: errorThreadId,
    });
    
    // mode=null を返さない（必ず mode/intent を設定）
    return res.json({
      response: `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${String(errorMessage).substring(0, 50)}${String(errorMessage).length > 50 ? "..." : ""}」について、改めて考えさせてください。`,
      decisionFrame: { 
        mode: "NATURAL", 
        intent: "unknown", 
        error: "internal_error",
        llm: null 
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
