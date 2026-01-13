// src/kotodama/evidenceAdapter.ts
// 既存のEvidencePackを新しいEvidencePack型に変換するアダプター

import type { EvidencePack as OldEvidencePack } from "./evidencePack.js";
import type { EvidencePack as NewEvidencePack, DocKey } from "../kanagi/types/corePlan.js";

/**
 * 既存のEvidencePackを新しいEvidencePack型に変換
 */
export function convertToNewEvidencePack(
  oldPack: OldEvidencePack | null,
  query: string
): NewEvidencePack | null {
  if (!oldPack) return null;

  // doc名をDocKeyに変換
  const docKeyMap: Record<string, DocKey> = {
    "言霊秘書.pdf": "khs",
    "カタカムナ言灵解.pdf": "ktk",
    "いろは最終原稿.pdf": "iroha",
  };
  const docKey = docKeyMap[oldPack.doc] || "khs";

  // hitsを構築
  const hits = oldPack.laws.map((law, index) => {
    // sourceIdを生成（例: KHS-P0103-T02）
    const pageStr = String(oldPack.pdfPage).padStart(4, "0");
    const sourceId = `${docKey.toUpperCase()}-P${pageStr}-T${String(index + 1).padStart(2, "0")}`;

    return {
      doc: docKey,
      page: oldPack.pdfPage,
      sourceId,
      lawId: law.id || undefined,
      quote: law.quote,
      score: undefined,
    };
  });

  // pageTextもhitsに追加（lawsが少ない場合）
  if (hits.length === 0 && oldPack.pageText) {
    const pageStr = String(oldPack.pdfPage).padStart(4, "0");
    hits.push({
      doc: docKey,
      page: oldPack.pdfPage,
      sourceId: `${docKey.toUpperCase()}-P${pageStr}-T01`,
      lawId: undefined,
      quote: oldPack.pageText.substring(0, 300) + (oldPack.pageText.length > 300 ? "..." : ""),
      score: undefined,
    });
  }

  return {
    hits,
    debug: {
      query,
      usedFallback: oldPack.isEstimated || false,
    },
  };
}

