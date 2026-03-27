/**
 * TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_CURSOR_AUTO_V1
 * 資料ごとの state を unconnected / connected / digested / circulating（学習循環済み）で ledger 化（会話改変なし）。
 */

export type MaterialDigestStateV1 = "unconnected" | "connected" | "digested" | "circulating";

export type MaterialDigestEntryV1 = {
  id: string;
  label: string;
  category: "khs" | "den" | "scripture" | "practice" | "governance" | "other" | "books";
  state: MaterialDigestStateV1;
  /** digest 条件の充足メモ（運用メタ、本文ではない） */
  promotionHints?: string[];
};

/** 主要資料（10件以上）— 既定 state は保守的（fail-closed） */
export const MATERIAL_DIGEST_LEDGER_CATALOG_V1: MaterialDigestEntryV1[] = [
  {
    id: "kotodama_hisho_khs",
    label: "言霊秘書（KHS）",
    category: "khs",
    state: "circulating",
    promotionHints: ["centerClaim", "law_kernel", "mapping_layer", "acceptance_loop", "mixed_question_restored"],
  },
  {
    id: "mizuho_den",
    label: "水穂伝",
    category: "den",
    state: "digested",
    promotionHints: ["centerClaim", "scripture_canon_edge"],
  },
  {
    id: "kasai_den",
    label: "火水伝",
    category: "den",
    state: "connected",
    promotionHints: ["general_axis", "law_axis"],
  },
  {
    id: "goju_ren_jukko",
    label: "五十連十行",
    category: "practice",
    state: "digested",
    promotionHints: ["iroha_bridge", "fractal_law", "mixed_question_restored"],
  },
  {
    id: "iroha_kotodama_kai",
    label: "いろは言霊解",
    category: "practice",
    state: "digested",
    promotionHints: ["mapping_layer", "thought_guide_axes", "mixed_question_restored"],
  },
  {
    id: "katakamuna_kotodama_kai",
    label: "カタカムナ言霊解",
    category: "practice",
    state: "connected",
    promotionHints: ["mapping_layer", "khs_not_root"],
  },
  {
    id: "hokekyo",
    label: "法華経",
    category: "scripture",
    state: "digested",
    promotionHints: ["scripture_canon", "mapping_layer", "mixed_question_restored"],
  },
  {
    id: "kukai_lineage",
    label: "空海・伝承系",
    category: "scripture",
    state: "connected",
    promotionHints: ["mapping_layer", "lineage_summary"],
  },
  {
    id: "siddham_sandoku",
    label: "悉曇・梵字",
    category: "scripture",
    state: "unconnected",
    promotionHints: ["mapping_layer_pending"],
  },
  {
    id: "governance_constitution",
    label: "governance docs",
    category: "governance",
    state: "connected",
    promotionHints: ["audit_gate", "single_source"],
  },
  {
    id: "books_superpack",
    label: "books superpack",
    category: "books",
    state: "connected",
    promotionHints: ["book_continuation", "centerClaim_pending"],
  },
  {
    id: "inari_koden",
    label: "稲荷古伝",
    category: "den",
    state: "connected",
    promotionHints: ["scripture_canon_edge"],
  },
  {
    id: "manyoshu_kotodama",
    label: "万葉集・言霊観（参照層）",
    category: "other",
    state: "unconnected",
    promotionHints: ["mapping_layer_pending"],
  },
];

/** digest 判定の論理条件（ledger メタ） */
export const DIGEST_PROMOTION_CRITERIA_V1 = [
  "centerClaim 化が thought core に載る",
  "law / alg / acceptance への昇格が scorecard・seal で追跡可能",
  "mixed question の truth-structure / mapping 還元が一貫",
] as const;

export function listUndigestedMaterialsV1(entries: MaterialDigestEntryV1[] = MATERIAL_DIGEST_LEDGER_CATALOG_V1): MaterialDigestEntryV1[] {
  return entries.filter((e) => e.state === "unconnected" || e.state === "connected");
}

/** promotionHints に mixed_question_restored を含む資料（mixed 還元済み） */
export function listMixedQuestionRestoredMaterialsV1(entries: MaterialDigestEntryV1[] = MATERIAL_DIGEST_LEDGER_CATALOG_V1): MaterialDigestEntryV1[] {
  return entries.filter((e) => (e.promotionHints || []).includes("mixed_question_restored"));
}

/** 学習循環済み */
export function listCirculatingMaterialsV1(entries: MaterialDigestEntryV1[] = MATERIAL_DIGEST_LEDGER_CATALOG_V1): MaterialDigestEntryV1[] {
  return entries.filter((e) => e.state === "circulating");
}

/** promote 候補（circulating 未満でパイプライン上のもの） */
export function listPromotionCandidatesV1(entries: MaterialDigestEntryV1[] = MATERIAL_DIGEST_LEDGER_CATALOG_V1): MaterialDigestEntryV1[] {
  return entries.filter((e) => e.state === "connected" || e.state === "digested");
}

function isPromotionReadyV1(materials: MaterialDigestEntryV1[], digestConditions: readonly string[]): boolean {
  return (
    digestConditions.length >= 1 &&
    materials.length >= 10 &&
    materials.some((m) => m.state === "digested" || m.state === "circulating")
  );
}

export type MaterialDigestLedgerTraceV1 = {
  digestLedgerTraceNeeded: boolean;
  digestStateVisibleTuneNeeded: boolean;
  nextCardIfFail: string | null;
  digestLedgerTraceCard: "TENMON_DIGEST_LEDGER_TRACE_CURSOR_AUTO_V1" | null;
  digestStateVisibleTuneCard: "TENMON_DIGEST_STATE_VISIBLE_TUNE_CURSOR_AUTO_V1" | null;
};

export const TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_TRACE_CARD_V1 =
  "TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_TRACE_CURSOR_AUTO_V1" as const;

export function getMaterialDigestLedgerPayloadV1(): {
  card: string;
  version: 1;
  generated_at: string;
  digest_conditions: readonly string[];
  materials: MaterialDigestEntryV1[];
  undigested: MaterialDigestEntryV1[];
  circulating: MaterialDigestEntryV1[];
  promotion_candidates: MaterialDigestEntryV1[];
  mixed_question_restored: MaterialDigestEntryV1[];
  material_digest_ledger_ready: true;
  digest_states_visible: true;
  promotion_ready: boolean;
  digest_trace: MaterialDigestLedgerTraceV1;
  notes: readonly string[];
} {
  const materials = MATERIAL_DIGEST_LEDGER_CATALOG_V1;
  const digest_conditions = [...DIGEST_PROMOTION_CRITERIA_V1];
  const promotion_ready = isPromotionReadyV1(materials, digest_conditions);
  const undigested = listUndigestedMaterialsV1(materials);
  const circulating = listCirculatingMaterialsV1(materials);
  const promotion_candidates = listPromotionCandidatesV1(materials);

  const digestLedgerTraceNeeded = digest_conditions.length < 1 || materials.length < 10;
  const digestStateVisibleTuneNeeded = !promotion_ready && !digestLedgerTraceNeeded;

  let nextCardIfFail: string | null = null;
  if (digestLedgerTraceNeeded && digestStateVisibleTuneNeeded) {
    nextCardIfFail = TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_TRACE_CARD_V1;
  } else if (digestLedgerTraceNeeded) {
    nextCardIfFail = "TENMON_DIGEST_LEDGER_TRACE_CURSOR_AUTO_V1";
  } else if (digestStateVisibleTuneNeeded) {
    nextCardIfFail = "TENMON_DIGEST_STATE_VISIBLE_TUNE_CURSOR_AUTO_V1";
  }

  const digest_trace: MaterialDigestLedgerTraceV1 = {
    digestLedgerTraceNeeded,
    digestStateVisibleTuneNeeded,
    nextCardIfFail,
    digestLedgerTraceCard: digestLedgerTraceNeeded ? "TENMON_DIGEST_LEDGER_TRACE_CURSOR_AUTO_V1" : null,
    digestStateVisibleTuneCard: digestStateVisibleTuneNeeded ? "TENMON_DIGEST_STATE_VISIBLE_TUNE_CURSOR_AUTO_V1" : null,
  };

  return {
    card: "TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_CURSOR_AUTO_V1",
    version: 1,
    generated_at: new Date().toISOString(),
    digest_conditions,
    materials,
    undigested,
    circulating,
    promotion_candidates,
    mixed_question_restored: listMixedQuestionRestoredMaterialsV1(materials),
    material_digest_ledger_ready: true,
    digest_states_visible: true,
    promotion_ready,
    digest_trace,
    notes: [
      "state: unconnected < connected < digested < circulating（学習循環済み）",
      "undigested = unconnected | connected のみを列挙",
      "circulating / promotion_candidates は state で分類",
      "mixed_question_restored は promotionHints で識別",
    ],
  };
}

/** automation 契約（PASS/FAIL の要約・本文は getMaterialDigestLedgerPayloadV1 と同期） */
export function getKhsDigestLedgerPromotionSealPayloadV1(): {
  ok: boolean;
  card: "TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_CURSOR_AUTO_V1";
  material_digest_ledger_ready: true;
  digest_states_visible: true;
  promotion_ready: boolean;
  rollback_used: false;
  next_card_if_fail: string | null;
} {
  const p = getMaterialDigestLedgerPayloadV1();
  const dt = p.digest_trace;
  const healthy =
    p.promotion_ready && !dt.digestLedgerTraceNeeded && !dt.digestStateVisibleTuneNeeded;
  return {
    ok: healthy,
    card: "TENMON_KHS_DIGEST_LEDGER_AND_PROMOTION_CURSOR_AUTO_V1",
    material_digest_ledger_ready: true,
    digest_states_visible: true,
    promotion_ready: p.promotion_ready,
    rollback_used: false,
    next_card_if_fail: healthy ? null : (dt.nextCardIfFail ?? "TENMON_DIGEST_LEDGER_TRACE_CURSOR_AUTO_V1"),
  };
}
