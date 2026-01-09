// /opt/tenmon-ark/api/src/routes/chat.ts
import { Router, type IRouter, type Request, type Response } from "express";
import { getCorpusPage, getAvailableDocs } from "../kotodama/corpusLoader.js";
import { determineKanagiPhase, applyKanagiPhaseStructure } from "../persona/kanagi.js";
import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import { runTruthCheck } from "../synapse/truthCheck.js";

import { llmChat } from "../llm/client.js";
import { systemNatural, systemHybridDomain, systemGrounded } from "../llm/prompts.js";
import { pushTurn, getContext } from "../llm/threadMemory.js";

import { detectIntent, isDetailRequest } from "../persona/speechStyle.js";

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

// "資料要求"を文章から拾う（#詳細以外の根拠要求）
function wantsGrounding(message: string) {
  return /(根拠|引用|出典|法則|lawId|真理チェック|truthCheck|decisionFrame|pdfPage|doc=)/i.test(message);
}

// LawCandidates（ページ候補）を読む：既存の実装を拡張
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
      // JSON parse エラーは無視
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
  try {
    const body = (req.body ?? {}) as any;
    const message = String(body.message ?? "").trim();
    const threadId = String(body.threadId ?? "default").trim();

    if (!message) {
      return res.status(400).json({ error: "message required" });
    }

    const parsed = parseDocAndPageStrict(message);
    const intent = detectIntent(message, !!parsed.doc || !!parsed.pdfPage);
    const detail = isDetailRequest(message); // debug完全無視

    const wantGrounded = detail || wantsGrounding(message) || (!!parsed.doc && !!parsed.pdfPage);

    // =========================
    // MODE決定
    // =========================
    const mode: "NATURAL" | "HYBRID" | "GROUNDED" =
      wantGrounded ? "GROUNDED" : intent === "domain" ? "HYBRID" : "NATURAL";

    // =========================
    // NATURAL / HYBRID（表）
    // =========================
    if (mode === "NATURAL" || mode === "HYBRID") {
      const sys = mode === "HYBRID" ? systemHybridDomain() : systemNatural();

      // 直近文脈（暫定：プロセス内）
      const ctx = getContext(threadId);

      const answer = await llmChat(
        [
          { role: "system", content: sys },
          ...ctx,
          { role: "user", content: message },
        ],
        { temperature: 0.4, max_tokens: 380 }
      ).catch((e) => {
        // LLMが落ちても最低限会話を返す
        console.error("[LLM-ERROR]", e);
        return "承知しました。いまの問い、もう少しだけ状況を教えてください。";
      });

      pushTurn(threadId, { role: "user", content: message, at: Date.now() });
      pushTurn(threadId, { role: "assistant", content: answer, at: Date.now() });

      return res.json({
        response: answer,
        evidence: null,
        decisionFrame: { mode, intent },
        timestamp: new Date().toISOString(),
      });
    }

    // =========================
    // GROUNDED（資料準拠）
    // =========================
    // doc/pdfPageが無ければ "聞き返し" ではなく、まず自然に確認質問を1つ返す
    // （ここで「doc名とpdfPageを指定してください」は禁止）
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
        decisionFrame: { mode, intent, need: ["doc", "pdfPage"] },
        timestamp: new Date().toISOString(),
      });
    }

    const doc = parsed.doc;
    const pdfPage = parsed.pdfPage;

    const rec = getCorpusPage(doc, pdfPage);
    if (!rec) {
      const answer = "そのページは見当たりませんでした。pdfPage番号を一度だけ確認させてください。";
      return res.json({ 
        response: answer, 
        evidence: null, 
        decisionFrame: { mode, intent }, 
        timestamp: new Date().toISOString() 
      });
    }

    // コア素材
    const candidates = await getPageCandidates(doc, pdfPage, 12);
    const ops = ["省", "延開", "反約", "反", "約", "略", "転"];
    
    // appliedLaws 形式に変換
    const appliedLaws = candidates.map((c: LawCandidate) => ({
      lawId: c.id,
      title: c.title,
      source: `page-candidate/${c.rule}`,
    }));

    const truth = runTruthCheck({
      doc,
      pdfPage,
      message,
      pageText: rec.cleanedText.substring(0, 500),
      appliedLaws,
      operations: ops.map(op => ({ op, description: `${op}操作` })),
    });

    // LLMに渡す "資料"
    const sys = systemGrounded();
    const ctx = getContext(threadId);

    const injected =
      `【資料】doc=${doc} pdfPage=${pdfPage}\n` +
      `【候補（LawCandidates）】\n` +
      candidates.map((c: LawCandidate) => `- ${c.id}: ${c.title}\n  引用: ${c.quote}`).join("\n") +
      `\n\n【真理チェック】missing=${truth.items.filter(i => !i.present).map(i => i.label).join(", ")}\n` +
      `【ユーザー質問】${message}`;

    const responseText = await llmChat(
      [
        { role: "system", content: sys },
        ...ctx,
        { role: "user", content: `上の資料だけを根拠に、自然な短文で答えてください。\n${injected}` },
      ],
      { temperature: 0.35, max_tokens: 420 }
    ).catch(() => "承知しました。資料の範囲では、ここまでは言えます。どの部分を最優先で確かめますか。");

    pushTurn(threadId, { role: "user", content: message, at: Date.now() });
    pushTurn(threadId, { role: "assistant", content: responseText, at: Date.now() });

    // detail（要求時のみ）
    const detailText =
      `【根拠】doc=${doc} pdfPage=${pdfPage}\n` +
      candidates.map((c: LawCandidate) => `- ${c.id}: ${c.title}\n  引用: ${c.quote}`).join("\n") +
      `\n\n【真理チェック】\n` +
      `present=${JSON.stringify(truth.items.map(i => ({ key: i.key, present: i.present })))}\n` +
      `missing=${truth.items.filter(i => !i.present).map(i => i.label).join(", ")}\n` +
      (truth.recommendedNextPages?.length ? `next:\n- ${truth.recommendedNextPages.map(p => `${p.doc} P${p.pdfPage}: ${p.reason}`).join("\n- ")}` : "");

    const axis = inferAxis(message);
    const phase = determineKanagiPhase(axis);

    const responseFinal = applyKanagiPhaseStructure(responseText, phase);

    const result: any = {
      response: responseFinal,
      evidence: { 
        doc, 
        pdfPage, 
        imagePath: rec.imagePath, 
        sha256: rec.rawText ? undefined : undefined, // sha256 は rec に無い場合は undefined
        quote: rec.cleanedText.substring(0, 500),
      },
      truthCheck: truth,
      decisionFrame: {
        mode,
        intent,
        grounds: [{ doc, pdfPage }],
        appliedLaws,
        operations: ops.map(op => ({ op, description: `${op}操作` })),
        truthCheck: truth,
      },
      timestamp: new Date().toISOString(),
    };

    if (detail) result.detail = detailText;

    return res.json(result);
  } catch (err: any) {
    // エラー時も必ず reply を返す（UIが沈黙しないようにする）
    console.error("[CHAT-ERROR]", err);
    const message = req.body?.message || "";
    return res.json({
      response: `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${String(message).substring(0, 50)}${String(message).length > 50 ? "..." : ""}」について、改めて考えさせてください。`,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
