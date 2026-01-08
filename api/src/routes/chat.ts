import { Router, type IRouter, type Request, type Response } from "express";
import { kanagiThink } from "../kanagi/kanagiThink.js";
import { getSettings } from "../db/knowledge.js";
import { listKnowledgeFiles } from "../db/knowledge.js";
import { tenmonCore } from "../tenmon-core/index.js";
import { OUTPUT_TEMPLATE } from "../tenmon-core/persona.js";
import { getCorpusPage, getAvailableDocs } from "../kotodama/corpusLoader.js";
import { getPageText } from "../kotodama/textLoader.js";
import { detectLaws } from "../kotodama/ingest/detectLaws.js";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { runTruthCheck } from "../synapse/truthCheck.js";

const router: IRouter = Router();

// ストレージディレクトリ
const STORAGE_DIR = path.resolve(process.cwd(), "storage", "knowledge");

/**
 * Knowledge ファイルからテキストを抽出（最小実装：txt/md/json のみ）
 */
function extractTextFromFile(storedName: string, mime: string): string {
  const filePath = path.join(STORAGE_DIR, storedName);
  
  if (!fs.existsSync(filePath)) {
    return "";
  }

  try {
    // txt/md/json のみ対応（UTF-8テキストとして読み込む）
    if (mime.includes("text") || mime.includes("json") || storedName.endsWith(".txt") || storedName.endsWith(".md") || storedName.endsWith(".json")) {
      const content = fs.readFileSync(filePath, "utf-8");
      // 先頭5000文字
      if (content.length > 5000) {
        return content.substring(0, 5000) + "\n\n[... 続きがあります ...]";
      }
      return content;
    }
  } catch (err: any) {
    console.error("[KNOWLEDGE-EXTRACT-ERROR]", err);
    return "";
  }

  return "";
}

/**
 * ページ由来のLaw候補を取得（JSONLファイルから読み込む）
 */
type LawCandidate = {
  id: string;
  doc: string;
  pdfPage: number;
  title: string;
  quote: string;
  rule: string;
  confidence: number;
};

async function getPageCandidates(doc: string, pdfPage: number, limit = 6): Promise<LawCandidate[]> {
  const fileMap: Record<string, string> = {
    "言霊秘書.pdf": "/opt/tenmon-corpus/db/khs_law_candidates.jsonl",
  };
  const fp = fileMap[doc];
  if (!fp || !fs.existsSync(fp)) return [];

  const out: LawCandidate[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(fp, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    const c = JSON.parse(t) as LawCandidate;
    if (c.doc === doc && c.pdfPage === pdfPage) {
      out.push(c);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * message から doc と pdfPage を抽出（資料指定必須）
 * パターン例：
 * - "言霊秘書.pdf pdfPage=13"
 * - "言霊秘書.pdf 13ページ"
 * - "カタカムナ言灵解.pdf pdfPage=5"
 * - "いろは最終原稿.pdf pdfPage=10"
 */
function extractDocAndPage(message: string): { doc: string; pdfPage: number } | null {
  const availableDocs = getAvailableDocs();
  
  // パターン1: "doc名.pdf pdfPage=N" または "doc名.pdf Nページ"
  for (const doc of availableDocs) {
    const docName = doc.replace(/\.pdf$/i, "");
    const escapedDocName = docName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // "doc名.pdf pdfPage=N" パターン
    const pdfPagePattern = new RegExp(`${escapedDocName}\\.pdf[^\\d]*pdfPage[=:]\\s*(\\d+)`, "i");
    const pdfPageMatch = message.match(pdfPagePattern);
    if (pdfPageMatch && pdfPageMatch[1]) {
      const pdfPage = Number(pdfPageMatch[1]);
      if (Number.isFinite(pdfPage) && pdfPage > 0) {
        return { doc, pdfPage };
      }
    }
    
    // "doc名.pdf Nページ" パターン
    const pagePattern = new RegExp(`${escapedDocName}\\.pdf[^\\d]*(\\d+)[^\\d]*ページ`, "i");
    const pageMatch = message.match(pagePattern);
    if (pageMatch && pageMatch[1]) {
      const pdfPage = Number(pageMatch[1]);
      if (Number.isFinite(pdfPage) && pdfPage > 0) {
        return { doc, pdfPage };
      }
    }
    
    // "doc名 Nページ" パターン（.pdf なしでも）
    const simplePattern = new RegExp(`${escapedDocName}[^\\d]*(\\d+)[^\\d]*ページ`, "i");
    const simpleMatch = message.match(simplePattern);
    if (simpleMatch && simpleMatch[1]) {
      const pdfPage = Number(simpleMatch[1]);
      if (Number.isFinite(pdfPage) && pdfPage > 0) {
        return { doc, pdfPage };
      }
    }
  }
  
  return null;
}

/**
 * Kanagi解析ステップとdecisionFrameを生成
 * doc/pdfPageで根拠ページが確定したら、tenmon-coreのanalyzeKotodamaを呼んで
 * analysis.steps と decisionFrame を生成
 */
async function generateKanagiAnalysis(
  message: string,
  doc: string,
  pdfPage: number
): Promise<{
  analysis: import("../tenmon-core/index.js").KotodamaAnalysis;
  decisionFrame: {
    conclusion: string;
    grounds: { doc: string; pdfPage: number; quote?: string };
    appliedLaws: Array<{ lawId: string; title: string; source: string }>;
    operations: Array<{ op: string; description: string }>;
    alignment: Array<{ doc: string; relation: string }>;
    truthCheck: import("../synapse/truthCheck.js").TruthCheckResult;
  };
}> {
  // tenmon-core の analyzeKotodama を呼ぶ
  const analysis = tenmonCore.analyze(message);

  // decisionFrame を構築
  const appliedLaws: Array<{ lawId: string; title: string; source: string }> = [];
  const operations: Array<{ op: string; description: string }> = [];
  const alignment: Array<{ doc: string; relation: string }> = [];
  let truthCheck = undefined as import("../synapse/truthCheck.js").TruthCheckResult | undefined;

  // ========================================
  // 帯域Law（analysis.hints から取得：補助）
  // ========================================
  const laws: Array<{ lawId: string; title: string; note?: string; quote?: string }> = [];
  for (const lawId of analysis.hints) {
    const law = tenmonCore.getLawById(lawId);
    if (law) {
      laws.push({
        lawId: law.id,
        title: law.title,
        note: `${law.source.doc} P${law.source.pdfPage}${law.source.section ? ` [${law.source.section}]` : ""}`,
        quote: law.quote,
      });
    }
  }

  // ========================================
  // ページ由来のLaw候補を取得（synapse候補Law：優先）
  // ========================================
  const candidates = await getPageCandidates(doc, pdfPage, 6);

  // ========================================
  // lawsMerged を構築（候補を優先、帯域Lawを補助）
  // ========================================
  const lawsMerged = [
    ...candidates.map(c => ({
      lawId: c.id,
      title: c.title,
      note: `page-candidate/${c.rule}`,
      quote: c.quote,
    })),
    ...laws,
  ];

  // lawsMerged を appliedLaws 形式に変換（decisionFrame.appliedLaws に差し替え）
  for (const law of lawsMerged) {
    appliedLaws.push({
      lawId: law.lawId,
      title: law.title,
      source: law.note || "",
    });
  }

  // analysis.steps から操作を抽出
  for (const step of analysis.steps) {
    if (step.operation) {
      operations.push({
        op: step.operation,
        description: step.description,
      });
    }
  }

  // 整合チェック（言霊秘書/カタカムナ/いろは への接続）
  const availableDocs = getAvailableDocs();
  for (const otherDoc of availableDocs) {
    if (otherDoc !== doc) {
      // 簡易的な整合チェック（実際の実装ではより詳細なチェックが必要）
      alignment.push({
        doc: otherDoc,
        relation: "参照可能",
      });
    }
  }

  // 真理構造チェックを実行
  truthCheck = runTruthCheck({
    doc,
    pdfPage,
    message,
    pageText: getPageText(doc, pdfPage) ?? undefined,
    appliedLaws,
    operations,
  });

  const decisionFrame = {
    conclusion: "", // 結論は後で生成（この段階では空）
    grounds: {
      doc,
      pdfPage,
      quote: "", // 後で corpus から取得
    },
    appliedLaws,
    operations,
    alignment,
    truthCheck,
  };

  return { analysis, decisionFrame };
}

/**
 * analysis.hints から LawCard を組み立てる
 * tenmon-core の getLawById で引けるものは引く
 * 足りない場合にのみ corpusLoader を参照（自動全文参照は禁止）
 */
function buildLawCards(hints: string[]): string {
  const lawCards: string[] = [];
  const seenIds = new Set<string>();

  for (const lawId of hints) {
    if (seenIds.has(lawId)) continue;
    seenIds.add(lawId);

    // まず tenmon-core から取得を試みる
    const law = tenmonCore.getLawById(lawId);
    if (law) {
      lawCards.push(
        `【法則: ${law.title} (${lawId})】\n` +
        `引用: ${law.quote}\n` +
        `正規化: ${law.normalized}\n` +
        `出典: ${law.source.doc} P${law.source.pdfPage}${law.source.bookPage ? ` (書籍P${law.source.bookPage})` : ""}${law.source.section ? ` [${law.source.section}]` : ""}`
      );
      continue;
    }

    // tenmon-core にない場合、corpusLoader から該当ページを参照（ただし自動全文参照は禁止）
    // ここでは LawID から pdfPage を推定できないため、hint としてのみ記録
    lawCards.push(`【法則候補: ${lawId}】\n（詳細は corpus を参照してください）`);
  }

  return lawCards.length > 0 ? lawCards.join("\n\n") : "";
}

/**
 * System Prompt を三層構造で組み立てる
 * 
 * 構造：
 * 1) CORE（固定・編集不可）
 *    - 天津金木思考の核
 *    - 「あなたは天聞アークである」
 *    - 「言灵・天津金木・構文を重視」
 *    - 「応答は必ず日本語」
 * 
 * 2) STYLE（Settingsの instructions）
 *    - ユーザーが設定した口調・方針
 * 
 * 3) KNOWLEDGE（アップロード資料）
 *    - txt/md/json から抽出
 *    - 最大 N ファイル、各先頭 M 文字
 * 
 * 4) LAWS（analyzeKotodama の結果から LawCard を注入）
 */
function buildSystemPrompt(analysisHints?: string[]): string {
  const settings = getSettings();
  const files = listKnowledgeFiles();

  // ========================================
  // 1) CORE（固定・編集不可）
  // ========================================
  let prompt = `あなたは天聞アーク（TENMON-ARK）です。
天津金木の思考プロセスに従って、ユーザーとの会話を行います。

【思考の基本構造】
1. 受信（入力の受容）
2. 内省（内部での振り返り）
3. 構文化（構造として整理）
4. 応答（出力の生成）

【重要な原則】
- 言灵（ことだま）を重視し、言葉の本質を捉える
- 天津金木の構文に従い、思考を構造化する
- 応答は必ず日本語で行う
- 自然で親しみやすい会話を心がける`;

  // ========================================
  // 2) STYLE（Settingsの instructions）
  // ========================================
  if (settings.instructions && settings.instructions.trim()) {
    prompt += `\n\n【追加指示・口調・方針】\n${settings.instructions.trim()}`;
  }

  // ========================================
  // 3) KNOWLEDGE（アップロード資料）
  // ========================================
  if (files.length > 0) {
    prompt += `\n\n【参考資料】\n`;
    const maxFiles = 10; // 最大10ファイルまで
    const maxCharsPerFile = 5000; // 各ファイル先頭5000文字まで
    
    for (const file of files.slice(0, maxFiles)) {
      const text = extractTextFromFile(file.storedName, file.mime);
      if (text) {
        const truncated = text.length > maxCharsPerFile 
          ? text.substring(0, maxCharsPerFile) + "\n\n[... 続きがあります ...]"
          : text;
        prompt += `\n--- ${file.originalName} ---\n${truncated}\n`;
      }
    }
  }

  // ========================================
  // 4) LAWS（analyzeKotodama の結果から LawCard を注入）
  // ========================================
  if (analysisHints && analysisHints.length > 0) {
    const lawCards = buildLawCards(analysisHints);
    if (lawCards) {
      prompt += `\n\n【適用法則（LawCard）】\n${lawCards}`;
    }
  }

  // ========================================
  // 出力フォーマット（OUTPUT_TEMPLATE の骨格を固定）
  // ========================================
  prompt += `\n\n【出力フォーマット（必須）】\n` +
    `${OUTPUT_TEMPLATE.promise}\n\n` +
    OUTPUT_TEMPLATE.format.map((item, idx) => `${idx + 1}. ${item}`).join("\n");

  return prompt;
}

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const mode = req.query.mode || req.body.mode;
    const message = req.body.message || "";

    if (!message || typeof message !== "string") {
      return res.json({
        reply: "メッセージが必要です。何かお聞きしたいことがあれば教えてください。",
      });
    }

    // ========================================
    // 資料指定必須（SOURCE-GATE）：doc/pdfPage が抽出できない場合は固定応答
    // ========================================
    const docAndPage = extractDocAndPage(message);
    
    if (!docAndPage) {
      // 抽出できない場合は固定応答（外部知識を遮断）
      const availableDocs = getAvailableDocs();
      return res.json({
        reply: `doc名とpdfPageを指定してください。例：言霊秘書.pdf pdfPage=6\n\n利用可能なドキュメント：\n${availableDocs.map((d) => `- ${d}`).join("\n")}`,
      });
    }

    // ========================================
    // doc/pdfPage が抽出できた場合、corpusLoader を直接呼ぶ
    // ========================================
    const rec = getCorpusPage(docAndPage.doc, docAndPage.pdfPage);
    
    if (!rec) {
      return res.json({
        reply: `指定されたページ（${docAndPage.doc} P${docAndPage.pdfPage}）が見つかりませんでした。`,
      });
    }

    // ========================================
    // Kanagi解析ステップを生成（doc/pdfPageで根拠ページが確定したら）
    // ========================================
    const { analysis, decisionFrame } = await generateKanagiAnalysis(
      message,
      docAndPage.doc,
      docAndPage.pdfPage
    );

    // decisionFrame に corpus からの引用を追加
    decisionFrame.grounds.quote = rec.cleanedText.substring(0, 500);

    // ========================================
    // 返答フォーマットを固定：「結論→根拠→適用法則→操作→整合」
    // ========================================
    const conclusion = `【結論】\n${docAndPage.doc} P${docAndPage.pdfPage} を参照しました。`;
    
    const grounds = `【根拠】\n` +
      `ドキュメント: ${decisionFrame.grounds.doc}\n` +
      `ページ: ${decisionFrame.grounds.pdfPage}\n` +
      `引用（抜粋）: ${decisionFrame.grounds.quote.substring(0, 200)}${decisionFrame.grounds.quote.length > 200 ? "..." : ""}`;

    // 真理構造チェックを実行
    const truthCheck = runTruthCheck({
      doc: decisionFrame.grounds.doc,
      pdfPage: decisionFrame.grounds.pdfPage,
      message,
      pageText: decisionFrame.grounds.quote,
      appliedLaws: decisionFrame.appliedLaws,
      operations: decisionFrame.operations,
    });
    
    // lawsMerged を表示（decisionFrame.appliedLaws に含まれている）
    const appliedLawsText = decisionFrame.appliedLaws.length > 0
      ? `【適用法則】\n${decisionFrame.appliedLaws.map((law) => {
          const isPageCandidate = law.source.includes("page-candidate");
          return `- ${law.title} (${law.lawId})${isPageCandidate ? ` [${law.source}]` : ""}\n  出典: ${law.source}`;
        }).join("\n")}`
      : `【適用法則】\n（該当する法則が見つかりませんでした）`;
    
    const operationsText = decisionFrame.operations.length > 0
      ? `【操作】\n${decisionFrame.operations.map((op) => `- ${op.op}: ${op.description}`).join("\n")}`
      : `【操作】\n（適用された操作はありません）`;
    
    const alignmentText = decisionFrame.alignment.length > 0
      ? `【整合】\n${decisionFrame.alignment.map((a) => `- ${a.doc}: ${a.relation}`).join("\n")}`
      : `【整合】\n（他の資料との整合チェックは未実施）`;

    // 真理チェック結果をフォーマット（統一されたキーで取得）
    const truthItems = truthCheck.items;
    const truthPresent = {
      himizu: truthItems.find((i) => i.key === "himizu")?.present ?? false,
      taiyo: truthItems.find((i) => i.key === "taiyo")?.present ?? false,
      seichu: truthItems.find((i) => i.key === "seichu")?.present ?? false,
      genesis: truthItems.find((i) => i.key === "genesis")?.present ?? false,
      tenioha: truthItems.find((i) => i.key === "tenioha")?.present ?? false,
      ops: truthItems.find((i) => i.key === "ops")?.present ?? false,
    };
    const truthMissing = truthItems.filter((i) => !i.present).map((i) => i.label);
    const truthNextHints = truthCheck.recommendedNextPages.map(
      (p) => `${p.doc} P${p.pdfPage}: ${p.reason}`
    );

    let reply = `${conclusion}\n\n${grounds}\n\n${appliedLawsText}\n\n${operationsText}\n\n${alignmentText}`;

    // 真理チェックを末尾に追記
    reply +=
      `\n【真理チェック】\n` +
      `- 火水: ${truthPresent.himizu ? "OK" : "不足"}\n` +
      `- 体用: ${truthPresent.taiyo ? "OK" : "不足"}\n` +
      `- 正中: ${truthPresent.seichu ? "OK" : "不足"}\n` +
      `- 生成鎖: ${truthPresent.genesis ? "OK" : "不足"}\n` +
      `- 辞: ${truthPresent.tenioha ? "OK" : "不足"}\n` +
      `- 操作: ${truthPresent.ops ? "OK" : "不足"}\n` +
      (truthMissing.length
        ? `- 不足項目: ${truthMissing.join(" / ")}\n`
        : `- 不足項目: なし\n`) +
      (truthNextHints.length
        ? `- 次の導線:\n  - ${truthNextHints.join("\n  - ")}\n`
        : "");

    // rec を返す（imageUrl も含める）
    const imageUrl = `/api/corpus/page-image?doc=${encodeURIComponent(docAndPage.doc)}&pdfPage=${docAndPage.pdfPage}`;
    
    return res.json({
      reply,
      doc: docAndPage.doc,
      pdfPage: docAndPage.pdfPage,
      page: rec,
      imageUrl: rec.imagePath ? imageUrl : null,
      analysis: {
        steps: analysis.steps,
        hints: analysis.hints,
      },
      decisionFrame,
    });

  } catch (err: any) {
    // エラー時も必ず reply を返す（UIが沈黙しないようにする）
    console.error("[CHAT-ERROR]", err);
    const message = req.body.message || "";
    return res.json({
      reply: `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${String(message).substring(0, 50)}${String(message).length > 50 ? "..." : ""}」について、改めて考えさせてください。`,
    });
  }
});

export default router;
