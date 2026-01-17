// src/persona/composeDetail.ts
// Phase 2: detail を完全コード生成で統一（捏造ゼロ）
//
// composeDetailFromEvidence(corePlan, evidencePack) を提供
// detail文はここで組む（doc/pdfPage/lawId/quote/axes/steps）

import type { CorePlan, EvidencePack } from "../kanagi/kanagiCore.js";
import { pad4 } from "../kanagi/kanagiCore.js";

/**
 * detail を EvidencePack から完全にコード生成で組み立てる
 */
export function composeDetailFromEvidence(
  corePlan: CorePlan,
  evidencePack: EvidencePack,
  verification?: { valid: boolean; failedClaims: number; warnings: string[] }
): string {
  const lines: string[] = [];
  const p = pad4(evidencePack.pdfPage);

  // 基本情報
  lines.push("#詳細");
  lines.push(`- doc: ${evidencePack.doc}`);
  lines.push(`- pdfPage: ${evidencePack.pdfPage}`);
  lines.push(`- idPrefix: ${evidencePack.docKey === "khs" ? "KHS" : evidencePack.docKey === "ktk" ? "KTK" : evidencePack.docKey === "iroha" ? "IROHA" : "DOC"}-P${p}`);
  lines.push(`- isEstimated: ${evidencePack.isEstimated}`);

  // 真理軸（axes）
  if (corePlan.thesis) {
    lines.push(`- 正中命題：${corePlan.thesis}`);
  }
  if (corePlan.tai) {
    lines.push(`- 躰（骨格）：${corePlan.tai.slice(0, 100)}...`);
  }
  if (corePlan.yo) {
    lines.push(`- 用（はたらき）：${corePlan.yo.slice(0, 100)}...`);
  }

  // 空仮中検知
  if (corePlan.kokakechuFlags.length > 0) {
    lines.push(`- 空仮中検知：${corePlan.kokakechuFlags.join("、")}`);
  }

  // 検証結果
  if (verification) {
    lines.push(`- 検証結果：${verification.valid ? "有効" : "無効"}`);
    lines.push(`- 失敗したclaims：${verification.failedClaims}件`);
    if (verification.warnings.length > 0) {
      lines.push(`- 警告：${verification.warnings.join("、")}`);
    }
  }

  // 根拠（抜粋） - Evidence由来のみ
  lines.push("- 根拠（抜粋）:");
  const usedLaws = corePlan.usedLawIds.length > 0
    ? evidencePack.laws.filter(l => corePlan.usedLawIds.includes(l.id))
    : evidencePack.laws.slice(0, 3);

  for (const law of usedLaws) {
    lines.push(`  - ${law.id} ${law.title}`);
    lines.push(`    引用: ${law.quote}`);
  }

  // claims（検証済み）
  if (corePlan.claims.length > 0) {
    lines.push("- 主張（根拠付き）:");
    for (const claim of corePlan.claims) {
      lines.push(`  - ${claim.text}`);
      if (claim.evidenceIds.length > 0) {
        lines.push(`    根拠ID: ${claim.evidenceIds.join(", ")}`);
      }
    }
  }

  return lines.join("\n");
}

