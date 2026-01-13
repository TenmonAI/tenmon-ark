// /opt/tenmon-ark/api/src/persona/surfaceGenerator.ts
// Surface Generator（テンプレ固定、LLMは口のみ）

import type { CoreAnswerPlan } from "../core/types.js";

/**
 * CoreAnswerPlan から response を生成（テンプレ固定）
 * 
 * 出力テンプレ：
 * - 1文目：資料上の定義（言い換え）
 * - 2文目：真理軸に照らした位置づけ
 * - 3文目：質問への結論（短い）
 */
export function generateResponseFromPlan(plan: CoreAnswerPlan): string {
  const parts: string[] = [];

  // 1文目：資料上の定義（言い換え）
  if (plan.quotes.length > 0) {
    const topQuote = plan.quotes[0];
    const definition = topQuote.quote.substring(0, 100).replace(/\s+/g, " ").trim();
    parts.push(`資料（${plan.refs[0].doc} P${plan.refs[0].pdfPage}）より、${definition}${definition.length >= 100 ? "..." : ""}。`);
  } else {
    parts.push(`資料（${plan.refs[0].doc} P${plan.refs[0].pdfPage}）を参照。`);
  }

  // 2文目：真理軸に照らした位置づけ
  if (plan.truthAxes.length > 0) {
    parts.push(`真理軸（${plan.truthAxes.join("、")}）に照らして、${plan.topic}の位置づけを確認。`);
  } else {
    parts.push(`${plan.topic}について資料準拠の確認。`);
  }

  // 3文目：質問への結論（短い）
  if (plan.conclusion) {
    parts.push(plan.conclusion);
  } else {
    parts.push(`資料より結論を導出。`);
  }

  // missing がある場合は追加
  if (plan.missing && plan.missing.length > 0) {
    parts.push(`（不足軸：${plan.missing.join("、")}）`);
  }

  return parts.join(" ");
}

/**
 * CoreAnswerPlan から detail を生成（#詳細のみ）
 */
export function generateDetailFromPlan(plan: CoreAnswerPlan): string {
  const parts: string[] = [];

  // refs（doc/pdfPage）
  parts.push(`【根拠】`);
  for (const ref of plan.refs) {
    parts.push(`- doc=${ref.doc} pdfPage=${ref.pdfPage}${ref.sha256 ? ` sha256=${ref.sha256.substring(0, 16)}...` : ""}`);
    if (ref.imageUrl) {
      parts.push(`  画像URL: ${ref.imageUrl}`);
    }
  }

  // quotes（Evidence由来）
  if (plan.quotes.length > 0) {
    parts.push(`\n【引用（EvidencePack由来のみ）】`);
    for (const quote of plan.quotes) {
      if (quote.lawId) {
        parts.push(`- ${quote.lawId}: ${quote.title || ""}`);
      } else {
        parts.push(`- ページ本文抜粋`);
      }
      parts.push(`  引用: ${quote.quote.substring(0, 300)}${quote.quote.length > 300 ? "..." : ""}`);
      parts.push(`  出典: ${quote.ref.doc} P${quote.ref.pdfPage}`);
    }
  }

  // truthAxes と steps
  parts.push(`\n【真理軸】`);
  parts.push(`- ${plan.truthAxes.length > 0 ? plan.truthAxes.join("、") : "（検出なし）"}`);

  if (plan.steps.length > 0) {
    parts.push(`\n【推論ステップ】`);
    for (const step of plan.steps) {
      parts.push(`- ${step}`);
    }
  }

  // estimated.explain（推定なら）
  if (plan.estimated) {
    parts.push(`\n【推定理由】`);
    parts.push(`- ${plan.estimated.explain}（スコア: ${plan.estimated.score}）`);
  }

  // suggestNext（次のpdfPage候補）
  if (plan.suggestNext && plan.suggestNext.length > 0) {
    parts.push(`\n【次の導線（推奨pdfPage候補）】`);
    for (const ref of plan.suggestNext) {
      parts.push(`- ${ref.doc} pdfPage=${ref.pdfPage}`);
    }
  }

  // missing（不足軸）
  if (plan.missing && plan.missing.length > 0) {
    parts.push(`\n【不足軸】`);
    parts.push(`- ${plan.missing.join("、")}`);
  }

  return parts.join("\n");
}


