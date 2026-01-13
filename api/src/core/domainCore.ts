// /opt/tenmon-ark/api/src/core/domainCore.ts
// CoreAnswerPlan Builder（中枢）

import type { CoreAnswerPlan, EvidenceRef } from "./types.js";
import { buildEvidencePack, type EvidencePack } from "../kotodama/evidencePack.js";
import { searchPages, type RetrievalResult } from "../kotodama/retrievalIndex.js";
import { inferTruthAxesFromEvidence, buildSteps, detectMissingAxes, TRUTH_AXES } from "../truth/axes.js";

/**
 * CoreAnswerPlan を構築
 * 
 * 入力：message, detailFlag
 * 処理：
 * 1. RetrievalIndexで候補ページを出す
 * 2. EvidencePackを生成（Top1を主、Top2〜3はsuggestNext）
 * 3. truthAxes抽出
 * 4. quotesは EvidencePack由来のみ
 * 5. conclusionはテンプレで生成（ネット文禁止）
 * 
 * 出力：CoreAnswerPlan
 */
export async function buildCoreAnswerPlan(
  message: string,
  detailFlag: boolean
): Promise<CoreAnswerPlan | null> {
  // 1. RetrievalIndexで候補ページを出す
  const retrievalResults = await searchPages(message, 3);
  
  if (retrievalResults.length === 0) {
    // 候補が見つからない場合はnullを返す（LLMを呼ばずに終了）
    return null;
  }

  // 2. Top1を主としてEvidencePackを生成
  const topResult = retrievalResults[0];
  const evidencePack = await buildEvidencePack(
    topResult.doc,
    topResult.pdfPage,
    true, // 推定
    topResult.explain
  );

  if (!evidencePack) {
    // EvidencePackが取得できない場合はnullを返す（LLMを呼ばずに終了）
    return null;
  }

  // 3. truthAxes抽出
  const truthAxes = inferTruthAxesFromEvidence(evidencePack);
  const steps = buildSteps(truthAxes, evidencePack);

  // 4. quotesは EvidencePack由来のみ
  const quotes: Array<{ 
    ref: EvidenceRef; 
    lawId?: string; 
    title?: string; 
    quote: string;
  }> = evidencePack.laws.slice(0, 5).map(law => ({
    ref: {
      doc: evidencePack.doc,
      pdfPage: evidencePack.pdfPage,
      imageUrl: evidencePack.imageUrl,
      sha256: evidencePack.sha256,
    } as EvidenceRef,
    lawId: law.id,
    title: law.title,
    quote: law.quote.substring(0, 300), // 引用は300文字まで
  }));

  // pageTextからも短い抜粋を追加（lawが少ない場合）
  if (quotes.length === 0 && evidencePack.pageText) {
    const excerpt = evidencePack.pageText.substring(0, 200);
    quotes.push({
      ref: {
        doc: evidencePack.doc,
        pdfPage: evidencePack.pdfPage,
        imageUrl: evidencePack.imageUrl,
        sha256: evidencePack.sha256,
      } as EvidenceRef,
      quote: excerpt,
    });
  }

  // 5. refs（必ず1件以上）
  const refs: EvidenceRef[] = [{
    doc: evidencePack.doc,
    pdfPage: evidencePack.pdfPage,
    imageUrl: evidencePack.imageUrl,
    sha256: evidencePack.sha256,
  }];

  // 6. suggestNext（Top2〜3）
  const suggestNext: EvidenceRef[] = retrievalResults.slice(1, 3).map(r => ({
    doc: r.doc,
    pdfPage: r.pdfPage,
  }));

  // 7. topic抽出（簡易版：メッセージから重要語を抽出）
  const topic = extractTopic(message);

  // 8. conclusionはテンプレで生成（ネット文禁止）
  const conclusion = buildConclusionTemplate(truthAxes, evidencePack, topic);

  // 9. missing軸
  const missing = detectMissingAxes([...TRUTH_AXES], truthAxes);

  return {
    mode: "HYBRID",
    intent: "domain",
    topic,
    truthAxes,
    refs,
    quotes,
    steps,
    conclusion,
    missing: missing.length > 0 ? missing : undefined,
    suggestNext: suggestNext.length > 0 ? suggestNext : undefined,
    estimated: {
      explain: topResult.explain,
      score: topResult.score,
    },
  };
}

/**
 * トピックを抽出（簡易版）
 */
function extractTopic(message: string): string {
  // ドメインキーワードを抽出
  const domainKeywords = [
    { pattern: /(言[霊靈灵]|言霊|言靈|言灵|ことだま)/, topic: "言灵" },
    { pattern: /(カタカムナ|天津金木|布斗麻邇|フトマニ)/, topic: "カタカムナ" },
    { pattern: /(いろは|辞|テニヲハ|てにをは)/, topic: "いろは" },
  ];

  for (const { pattern, topic } of domainKeywords) {
    if (pattern.test(message)) {
      return topic;
    }
  }

  // デフォルト
  return message.substring(0, 20);
}

/**
 * 結論をテンプレで生成（ネット文禁止）
 */
function buildConclusionTemplate(
  truthAxes: string[],
  evidencePack: EvidencePack,
  topic: string
): string {
  // テンプレ1: 引用がある場合
  if (evidencePack.laws.length > 0) {
    const topLaw = evidencePack.laws[0];
    return `資料（${evidencePack.doc} P${evidencePack.pdfPage}）より「${topLaw.title}」を引用。${truthAxes.length > 0 ? `真理軸（${truthAxes.join("、")}）に照らして` : ""}、${topic}について資料準拠の結論を導出。`;
  }

  // テンプレ2: 引用がない場合
  return `資料（${evidencePack.doc} P${evidencePack.pdfPage}）を参照。${truthAxes.length > 0 ? `真理軸（${truthAxes.join("、")}）に照らして` : ""}、${topic}について資料準拠の結論を導出。`;
}

