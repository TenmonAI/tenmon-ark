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
import { buildEvidencePack } from "../kotodama/evidencePack.js";

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
        returnedDetail: false,
      }));

      return res.json({
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
      });
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
        returnedDetail: false,
      }));

      return res.json({
        response: answer,
        evidence: null,
        decisionFrame: { mode, intent: skeleton.intent },
        timestamp: new Date().toISOString(),
      });
    }

    // =========================
    // HYBRID モード（domain: 表1段で答える、裏#詳細なら根拠）
    // =========================
    if (mode === "HYBRID") {
      const sys = systemHybridDomain();
      const ctx = getContext(threadId);

      // evidencePack を構築（doc/pdfPage がある場合）
      let evidencePack = null;
      if (parsed.doc && parsed.pdfPage) {
        evidencePack = await buildEvidencePack(parsed.doc, parsed.pdfPage);
      }

      // プロンプトに evidencePack を注入
      let userPrompt = message;
      if (evidencePack) {
        const evidenceText =
          `【資料】doc=${evidencePack.doc} pdfPage=${evidencePack.pdfPage}\n` +
          `【要約】${evidencePack.summary}\n` +
          (evidencePack.pageText ? `【ページ本文】${evidencePack.pageText.substring(0, 500)}\n` : "") +
          `【法則候補】\n${evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n")}\n\n` +
          `【質問】${message}\n\n` +
          `上記のEvidence以外で断定しないでください。不足があれば「不足」と述べ、次に読むpdfPageを1つ提示してください。`;
        userPrompt = evidenceText;
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
            }
          : null,
        decisionFrame: { mode, intent: skeleton.intent },
        timestamp: new Date().toISOString(),
      };

      // #詳細 がある場合のみ、裏面で根拠（pdfPage / lawId / 引用）を出す
      if (detail && evidencePack) {
        const detailText =
          `【根拠】doc=${evidencePack.doc} pdfPage=${evidencePack.pdfPage}\n` +
          `【要約】${evidencePack.summary}\n` +
          `【ページ本文】${evidencePack.pageText}\n\n` +
          `【法則候補】\n${evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n")}`;
        result.detail = detailText;
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

      return res.json({
        response: answer,
        evidence: null,
        decisionFrame: { mode, intent: skeleton.intent, need: ["doc", "pdfPage"] },
        timestamp: new Date().toISOString(),
      });
    }

    const doc = parsed.doc!;
    const pdfPage = parsed.pdfPage!;

    const rec = getCorpusPage(doc, pdfPage);
    if (!rec) {
      const answer = composeNatural({
        message: "そのページは見当たりませんでした。pdfPage番号を一度だけ確認させてください。",
        intent: skeleton.intent as "domain" | "smalltalk" | "aboutArk" | "grounded" | "unknown",
      });
      return res.json({ 
        response: answer, 
        evidence: null, 
        decisionFrame: { mode, intent: skeleton.intent }, 
        timestamp: new Date().toISOString() 
      });
    }

    // evidencePack を構築
    const evidencePack = await buildEvidencePack(doc, pdfPage);

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

    // #詳細 がある場合のみ、内部根拠（LawCandidate / pdfPage / truthCheck / decisionFrame）を返す
    if (detail) {
      const detailText = evidencePack
        ? `【根拠】doc=${doc} pdfPage=${pdfPage}\n` +
          `【要約】${evidencePack.summary}\n` +
          `【ページ本文】${evidencePack.pageText}\n\n` +
          `【法則候補】\n${evidencePack.laws.map((l: { id: string; title: string; quote: string }) => `- ${l.id}: ${l.title}\n  引用: ${l.quote}`).join("\n")}\n\n` +
          `【真理チェック】\n` +
          `present=${JSON.stringify(truth.items.map(i => ({ key: i.key, present: i.present })))}\n` +
          `missing=${truth.items.filter(i => !i.present).map(i => i.label).join(", ")}\n` +
          (truth.recommendedNextPages?.length ? `next:\n- ${truth.recommendedNextPages.map(p => `${p.doc} P${p.pdfPage}: ${p.reason}`).join("\n- ")}` : "")
        : `【根拠】doc=${doc} pdfPage=${pdfPage}\n【注意】evidencePack が取得できませんでした。`;

      result.detail = detailText;
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
