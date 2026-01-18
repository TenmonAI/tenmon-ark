// src/kotodama/rankingPolicy.ts
// Ranking Policy: スコアリング加点/抑制を一箇所に集約

export const RANKING_POLICY = {
  // IROHAへの寄せ補正（いろは系クエリ）
  IROHA_BOOST: 30,

  // KTKへの寄せ補正（カタカムナ系クエリ）
  KTK_BOOST: 30,

  // KHS定義帯域ボーナス（言霊系クエリ、hasIrohaがfalseの場合のみ）
  KHS_DEFINITION_ZONE_BONUS: {
    PRIMARY: { pages: [6, 7, 8, 9, 10], bonus: 15 }, // P6-10
    SECONDARY: { pages: [13, 14, 15, 16, 17, 18, 19, 20], bonus: 5 }, // P13-20
  },

  // law_candidates スコアリング
  LAW_CANDIDATES: {
    TITLE_MATCH: 20, // title一致 ×20
    QUOTE_MATCH: 10, // quote一致 ×10
    QUERY_CONTAINED: 20, // query全体がquoteに含まれる場合 +20
  },

  // DOCSのweight
  DOC_WEIGHTS: {
    KHS: 1.2,
    KTK: 1.0,
    IROHA: 1.1,
  },
} as const;

/**
 * KHS定義帯域（P6-10, P13-20）に該当するかチェック
 */
export function isKHSDefinitionZone(pdfPage: number): { isPrimary: boolean; isSecondary: boolean } {
  const { PRIMARY, SECONDARY } = RANKING_POLICY.KHS_DEFINITION_ZONE_BONUS;
  return {
    isPrimary: PRIMARY.pages.includes(pdfPage as any),
    isSecondary: SECONDARY.pages.includes(pdfPage as any),
  };
}

