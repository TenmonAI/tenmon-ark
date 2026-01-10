// /opt/tenmon-ark/api/src/routes/chat.ts
import { Router, type IRouter, type Request, type Response } from "express";
import { getCorpusPage, getAvailableDocs } from "../kotodama/corpusLoader.js";
import { determineKanagiPhase, applyKanagiPhaseStructure } from "../persona/kanagi.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import { runTruthCheck } from "../synapse/truthCheck.js";

import { llmChat } from "../llm/client.js";
import { systemNatural, systemHybridDomain, systemGrounded } from "../llm/prompts.js";
import { pushTurn, getContext } from "../llm/threadMemory.js";

import { detectIntent, isDetailRequest, composeNatural } from "../persona/speechStyle.js";
import { buildTruthSkeleton } from "../truth/truthSkeleton.js";
import { fetchLiveEvidence } from "../tools/liveEvidence.js";
import { getRequestId } from "../middleware/requestId.js";
import { buildEvidencePack, estimateDocAndPage } from "../kotodama/evidencePack.js";

import fs from "node:fs";
import readline from "node:readline";

const router: IRouter = Router();

function parseDocAndPageStrict(text: string): { doc: string | null; pdfPage: number | null } {
  const docs = getAvailableDocs();
  const doc = docs.find((d) => text.includes(d)) ?? null;
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
    // HYBRID モード（domain: 表1段で答える、裏#詳細なら根拠）
    // =========================
    if (mode === "HYBRID") {
      const sys = systemHybridDomain();
      const ctx = getContext(threadId);

      // Phase 2-C: evidencePack を構築（doc/pdfPage がある場合、推定も含む）
      let evidencePack = null;
      let isEstimated = false;
      let estimateExplain: string | undefined;
      
      if (parsed.doc && parsed.pdfPage) {
        // 明示指定されている場合
        evidencePack = await buildEvidencePack(parsed.doc, parsed.pdfPage, false);
      } else {
        // Phase 2-C/P3: doc/pdfPage が無い場合は推定を試みる（必須）
        // Phase 3: estimateDocAndPage() を使用
        const estimated = await estimateDocAndPage(message);
        if (estimated && estimated.score > 0) {
          evidencePack = await buildEvidencePack(estimated.doc, estimated.pdfPage, true, estimated.explain);
          isEstimated = true;
          estimateExplain = estimated.explain;
        } else {
          // 推定失敗時は null のまま（「資料不足」を宣言）
          evidencePack = null;
          estimateExplain = "推定失敗: キーワード一致なし、利用可能な資料なし";
        }
      }

      // Phase 2-C: プロンプトに evidencePack を注入（推定の場合は明示、Evidence外断定禁止を絶対制約として含める）
      let userPrompt = message;
      if (evidencePack) {
        const estimatedNote = evidencePack.isEstimated
          ? `【推定】この資料は推定です（理由: ${estimateExplain || "簡易推定"}）。明示的な指定が必要です。`
          : "";
        const evidenceText =
          `【資料】doc=${evidencePack.doc} pdfPage=${evidencePack.pdfPage}${evidencePack.isEstimated ? "（推定）" : ""}\n` +
          (estimatedNote ? `${estimatedNote}\n` : "") +
          `【要約】${evidencePack.summary || "（要約なし）"}\n` +
          (evidencePack.pageText ? `【ページ本文】${evidencePack.pageText.substring(0, 4000)}\n` : "") +
          (evidencePack.imageUrl ? `【画像URL】${evidencePack.imageUrl}\n` : "") +
          `【法則候補】\n${evidencePack.laws.length > 0 ? evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n") : "（法則候補なし）"}\n\n` +
          `【質問】${message}\n\n` +
          `【絶対制約】\n` +
          `- 上記のEvidenceに無い固有名詞/年代/数値を断定しない\n` +
          `- 上記のEvidenceに無い情報を一般知識で補完しない\n` +
          `- 上記のEvidenceだけを根拠にする\n` +
          `- 不足があれば「資料不足」と明示し、次に読むpdfPageを1〜3提示する\n` +
          `- 上記のEvidence以外で断定しないでください。`;
        userPrompt = evidenceText;
      } else {
        // Phase 2-C: 資料注入できない場合は「資料不足」を宣言（勝手に一般知識で埋めない）
        const availableDocs = getAvailableDocs();
        const recommendedPages = availableDocs.length > 0
          ? availableDocs.slice(0, 3).map((doc, i) => `- ${doc} pdfPage=${i + 1}（推定候補）`).join("\n")
          : "（利用可能な資料なし）";
        
        userPrompt =
          `${message}\n\n【重要】資料（doc/pdfPage）が指定されておらず、EvidencePack を取得できませんでした。\n\n【絶対制約】\n` +
          `- 「資料不足」と明示する\n` +
          `- 次に読むべきpdfPageを1〜3提示する（推奨候補:\n${recommendedPages}）\n` +
          `- 一般知識で埋めない（一般知識で断定回答しない）\n` +
          `- 資料が無い場合は「資料が不足しています」と明示し、資料指定を促す`;
      }

      const llmStart = Date.now();
      const rawAnswer = await llmChat(
        [
          { role: "system", content: sys },
          ...ctx,
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.4, max_tokens: 380 }
      ).catch((e) => {
        console.error("[LLM-ERROR]", e);
        return "承知しました。いまの問い、もう少しだけ状況を教えてください。";
      });
      const llmLatency = Date.now() - llmStart;

      // response は常に短い自然文（composeNatural で整形）
      const response = composeNatural({
        message: rawAnswer,
        intent: skeleton.intent as "domain" | "smalltalk" | "aboutArk" | "grounded" | "unknown",
        core: evidencePack
          ? {
              appliedLaws: evidencePack.laws.map((l: { id: string; title: string; quote: string }) => ({ lawId: l.id, title: l.title })),
              doc: evidencePack.doc,
              pdfPage: evidencePack.pdfPage,
            }
          : undefined,
      });

      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: response, at: Date.now() });
      const totalLatency = Date.now() - startTime;

      const result: any = {
        response, // 常に短い自然文
        evidence: evidencePack
          ? {
              doc: evidencePack.doc,
              pdfPage: evidencePack.pdfPage,
              isEstimated: evidencePack.isEstimated || false,
              estimateExplain: evidencePack.estimateExplain,
            }
          : null,
        decisionFrame: {
          mode,
          intent: skeleton.intent,
          estimateExplain: estimateExplain, // Phase 3: 推定理由を decisionFrame に追加
        },
        timestamp: new Date().toISOString(),
      };

      // Phase 2-B: #詳細 がある場合のみ、裏面で根拠（pdfPage / lawId / 引用）を出す（null禁止）
      if (detail) {
        let detailText: string;
        if (evidencePack) {
          detailText =
            `【根拠】doc=${evidencePack.doc} pdfPage=${evidencePack.pdfPage}${evidencePack.isEstimated ? "（推定）" : ""}\n` +
            `【要約】${evidencePack.summary || "（要約なし）"}\n` +
            `【ページ本文】${evidencePack.pageText || "（ページ本文なし）"}\n` +
            (evidencePack.imageUrl ? `【画像URL】${evidencePack.imageUrl}\n` : "") +
            `\n【法則候補】\n${evidencePack.laws.length > 0 ? evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n") : "（法則候補なし）"}`;
        } else {
          // Phase 2-B: 資料不足の場合も detail に「不足理由 + 次の導線（pdfPage候補）」を入れる
          const availableDocs = getAvailableDocs();
          const recommendedPages = availableDocs.length > 0
            ? availableDocs.slice(0, 3).map(doc => `- ${doc} pdfPage=1（推定起点）`).join("\n")
            : "（利用可能な資料なし）";
          
          detailText =
            `【HYBRID モード】\n質問: ${message}\n回答: ${response}\n\n【資料不足の理由】\n資料（doc/pdfPage）が指定されておらず、EvidencePack を取得できませんでした。\n\n【次の導線（推奨pdfPage候補）】\n${recommendedPages}\n\n資料が必要な場合は、doc/pdfPage を明示してください。`;
        }
        // Phase 2-B: detail は必ず string で返す（null禁止）
        result.detail = detailText || "（詳細生成に失敗）";
      }

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

      return res.json(result);
    }

    // =========================
    // GROUNDED モード（資料準拠）
    // =========================
    // doc/pdfPageが無ければ自然に確認質問を1つ返す
    if (!parsed.doc || !parsed.pdfPage) {
      const sys = systemGrounded();
      const ctx = getContext(threadId);

      const answer = await llmChat(
        [
          { role: "system", content: sys },
          ...ctx,
          {
            role: "user",
            content:
              `ユーザーは資料準拠を求めていますが、doc/pdfPageが未指定です。\n` +
              `次に必要な情報（doc名 or pdfPage）を"自然な一問"で確認してください。\n` +
              `ユーザー文: ${message}`,
          },
        ],
        { temperature: 0.3, max_tokens: 220 }
      ).catch(() => "承知しました。どの資料（言霊秘書／カタカムナ／いろは）を土台にしますか。");

      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: answer, at: Date.now() });

      const result: any = {
        response: answer,
        evidence: null,
        decisionFrame: { mode, intent: skeleton.intent, need: ["doc", "pdfPage"] },
        timestamp: new Date().toISOString(),
      };

      // Phase 2-B: #詳細 がある場合のみ、detail を返す（null禁止、不足理由+次の導線を入れる）
      if (detail) {
        const availableDocs = getAvailableDocs();
        const recommendedPages = availableDocs.length > 0
          ? availableDocs.map(doc => `- ${doc} pdfPage=1（推定起点）`).join("\n")
          : "（利用可能な資料なし）";
        
        const detailText =
          `【GROUNDED モード】\n質問: ${message}\n回答: ${answer}\n\n【不足理由】\ndoc/pdfPage が未指定のため、詳細な根拠情報は提供できません。\n\n【次の導線（推奨pdfPage候補）】\n${recommendedPages}\n\ndoc/pdfPage を指定してください。`;
        // Phase 2-B: detail は必ず string で返す（null禁止）
        result.detail = detailText || "（詳細生成に失敗）";
      }
      // Phase 2-B: detail === false の場合は detail フィールドを返さない（nullも返さない）

      return res.json(result);
    }

    const doc = parsed.doc!;
    const pdfPage = parsed.pdfPage!;

    const rec = getCorpusPage(doc, pdfPage);
    if (!rec) {
      const answer = composeNatural({
        message: "そのページは見当たりませんでした。pdfPage番号を一度だけ確認させてください。",
        intent: skeleton.intent as "domain" | "smalltalk" | "aboutArk" | "grounded" | "unknown",
      });
      const result: any = { 
        response: answer, 
        evidence: null, 
        decisionFrame: { mode, intent: skeleton.intent }, 
        timestamp: new Date().toISOString() 
      };
      // Phase 2-B: #詳細 がある場合のみ、detail を返す（null禁止、不足理由+次の導線を入れる）
      if (detail) {
        const availableDocs = getAvailableDocs();
        const recommendedPages = availableDocs.length > 0
          ? availableDocs.map(doc => `- ${doc} pdfPage=1（推定起点）`).join("\n")
          : "（利用可能な資料なし）";
        
        const detailText =
          `【GROUNDED モード】\n質問: ${message}\n回答: ${answer}\n\n【不足理由】\nページ（doc=${doc}, pdfPage=${pdfPage}）が見つかりませんでした。\n\n【次の導線（推奨pdfPage候補）】\n${recommendedPages}`;
        // Phase 2-B: detail は必ず string で返す（null禁止）
        result.detail = detailText || "（詳細生成に失敗）";
      }
      // Phase 2-B: detail === false の場合は detail フィールドを返さない（nullも返さない）
      
      return res.json(result);
    }

    // Phase 2-C: evidencePack を構築（GROUNDEDモードでも必須）
    const evidencePack = await buildEvidencePack(doc, pdfPage, false);

    const ops = ["省", "延開", "反約", "反", "約", "略", "転"];
    
    // appliedLaws 形式に変換
    const appliedLaws = evidencePack
      ? evidencePack.laws.map((l: { id: string; title: string; quote: string }) => ({
          lawId: l.id,
          title: l.title,
          source: `page-candidate`,
        }))
      : [];

    const truth = runTruthCheck({
      doc,
      pdfPage,
      message,
      pageText: evidencePack?.pageText || rec.cleanedText.substring(0, 500),
      appliedLaws,
      operations: ops.map(op => ({ op, description: `${op}操作` })),
    });

    // LLMに渡す "資料"（evidencePack を注入）
    const sys = systemGrounded();
    const ctx = getContext(threadId);

    const injected = evidencePack
      ? `【資料】doc=${doc} pdfPage=${pdfPage}\n` +
        `【要約】${evidencePack.summary}\n` +
        `【ページ本文】${evidencePack.pageText.substring(0, 500)}\n` +
        `【法則候補】\n${evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n")}\n` +
        `\n【真理チェック】missing=${truth.items.filter(i => !i.present).map(i => i.label).join(", ")}\n` +
        `【質問】${message}\n\n` +
        `上記のEvidence以外で断定しないでください。不足があれば「不足」と述べ、次に読むpdfPageを1つ提示してください。`
      : `【資料】doc=${doc} pdfPage=${pdfPage}\n【質問】${message}\n\n上記のEvidence以外で断定しないでください。`;

    const llmStart = Date.now();
    const rawAnswer = await llmChat(
      [
        { role: "system", content: sys },
        ...ctx,
        { role: "user", content: injected },
      ],
      { temperature: 0.35, max_tokens: 420 }
    ).catch(() => "承知しました。資料の範囲では、ここまでは言えます。どの部分を最優先で確かめますか。");
    const llmLatency = Date.now() - llmStart;

    // response は常に短い自然文（composeNatural で整形）
    const response = composeNatural({
      message: rawAnswer,
      intent: skeleton.intent as "domain" | "smalltalk" | "aboutArk" | "grounded" | "unknown",
      core: {
        appliedLaws,
        truthCheck: truth,
        doc,
        pdfPage,
      },
    });

    pushTurn(threadId, { role: "user", content: message, at: Date.now() });
    pushTurn(threadId, { role: "assistant", content: response, at: Date.now() });

    const axis = inferAxis(message);
    const phase = determineKanagiPhase(axis);

    // response に構造を適用（必要に応じて）
    const responseFinal = applyKanagiPhaseStructure(response, phase);

    const result: any = {
      response: responseFinal, // 常に短い自然文
      evidence: { 
        doc, 
        pdfPage, 
        imagePath: rec.imagePath, 
        quote: evidencePack?.pageText.substring(0, 500) || rec.cleanedText.substring(0, 500),
      },
      timestamp: new Date().toISOString(),
    };

    // Phase 2-B: #詳細 がある場合のみ、内部根拠（LawCandidate / pdfPage / truthCheck / decisionFrame）を返す（null禁止）
    if (detail) {
      let detailText: string;
      if (evidencePack) {
        detailText =
          `【根拠】doc=${doc} pdfPage=${pdfPage}\n` +
          `【要約】${evidencePack.summary || "（要約なし）"}\n` +
          `【ページ本文】${evidencePack.pageText || "（ページ本文なし）"}\n\n` +
          `【法則候補】\n${evidencePack.laws.length > 0 ? evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n") : "（法則候補なし）"}\n\n` +
          `【真理チェック】\n` +
          `present=${JSON.stringify(truth.items.map(i => ({ key: i.key, present: i.present })))}\n` +
          `missing=${truth.items.filter(i => !i.present).map(i => i.label).join(", ") || "（不足なし）"}\n` +
          (truth.recommendedNextPages?.length ? `next:\n- ${truth.recommendedNextPages.map(p => `${p.doc} P${p.pdfPage}: ${p.reason}`).join("\n- ")}` : "");
      } else {
        // Phase 2-B: evidencePack が無い場合も detail に「不足理由 + 次の導線」を入れる
        const recommendedPages = truth.recommendedNextPages?.length > 0
          ? truth.recommendedNextPages.map(p => `- ${p.doc} P${p.pdfPage}: ${p.reason}`).join("\n")
          : `- ${doc} pdfPage=${pdfPage + 1}（次ページ推奨）`;
        
        detailText =
          `【根拠】doc=${doc} pdfPage=${pdfPage}\n` +
          `【不足理由】evidencePack が取得できませんでした。\n` +
          `【真理チェック】\n` +
          `missing=${truth.items.filter(i => !i.present).map(i => i.label).join(", ") || "（不足なし）"}\n\n` +
          `【次の導線（推奨pdfPage候補）】\n${recommendedPages}`;
      }
      // Phase 2-B: detail は必ず string で返す（null禁止）
      result.detail = detailText || "（詳細生成に失敗）";
      result.truthCheck = truth;
      result.decisionFrame = {
        mode,
        intent: skeleton.intent,
        grounds: [{ doc, pdfPage }],
        appliedLaws,
        operations: ops.map(op => ({ op, description: `${op}操作` })),
        truthCheck: truth,
      };
    }
    // Phase 2-B: detail === false の場合は detail フィールドを返さない（nullも返さない）

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

    return res.json(result);
  } catch (err: any) {
    console.error("[CHAT-ERROR]", err);
    const message = req.body?.message || "";
    return res.json({
      response: `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${String(message).substring(0, 50)}${String(message).length > 50 ? "..." : ""}」について、改めて考えさせてください。`,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
