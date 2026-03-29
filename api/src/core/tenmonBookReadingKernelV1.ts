/**
 * TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1
 * TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1
 * 書籍台帳・解析ログ・law/comparison/uncertainty カードの settlement（全文ダンプを学習と見なさない）。
 */

export type TenmonBookReadingHandoffCandidateV1 = {
  type: "sanskrit" | "godname" | "scripture_comparison";
  key: string;
  confidence: number;
};

/** 資料の整理上の class（route ではない） */
export type TenmonBookClassV1 = "root" | "mapping" | "comparative" | "auxiliary";

export type TenmonBookJudgeSplitV1 = {
  schema: "TENMON_BOOK_JUDGE_SPLIT_V1";
  /** 参照子・版情報等（本文一括投入禁止） */
  source_facts: readonly string[];
  text_summary: string;
  tradition_evidence: readonly string[];
  tenmon_mapping: readonly string[];
  uncertainty_flags: readonly string[];
  provisional_verdict: string;
};

export type TenmonBookLedgerEntryV1 = {
  material_id: string;
  label: string;
  book_class: TenmonBookClassV1;
  digest_catalog_id: string;
};

export type TenmonBookAnalysisLogEntryV1 = {
  schema: "TENMON_BOOK_ANALYSIS_LOG_ENTRY_V1";
  log_id: string;
  book_material_id: string;
  created_at_iso: string;
  judge_split: TenmonBookJudgeSplitV1;
};

export type TenmonBookLawCardV1 = {
  schema: "TENMON_BOOK_LAW_CARD_V1";
  card_id: string;
  book_material_id: string;
  law_hooks: readonly string[];
  binds_to_split: true;
};

export type TenmonBookComparisonCardV1 = {
  schema: "TENMON_BOOK_COMPARISON_CARD_V1";
  card_id: string;
  book_material_id: string;
  comparison_axes: readonly string[];
  binds_to_split: true;
};

export type TenmonBookUncertaintyIssueCardV1 = {
  schema: "TENMON_BOOK_UNCERTAINTY_ISSUE_CARD_V1";
  card_id: string;
  book_material_id: string;
  issue_codes: readonly string[];
  note: string;
  binds_to_split: true;
};

/**
 * 最低限帯域（digest catalog id と一致）
 * root: 言霊秘書・水穂伝・稲荷古伝 / mapping: 古事記・空海・法華・いろは・カタカムナ / comparative: 悉曇・比較本
 */
export const BOOK_LEDGER_SETTLEMENT_CATALOG_V1: readonly TenmonBookLedgerEntryV1[] = [
  { material_id: "kotodama_hisho_khs", label: "言霊秘書", book_class: "root", digest_catalog_id: "kotodama_hisho_khs" },
  { material_id: "mizuho_den", label: "水穂伝", book_class: "root", digest_catalog_id: "mizuho_den" },
  { material_id: "inari_koden", label: "稲荷古伝", book_class: "root", digest_catalog_id: "inari_koden" },
  { material_id: "kojiki_lineage", label: "古事記系", book_class: "mapping", digest_catalog_id: "kojiki_lineage" },
  { material_id: "kukai_lineage", label: "空海系", book_class: "mapping", digest_catalog_id: "kukai_lineage" },
  { material_id: "hokekyo", label: "法華経系", book_class: "mapping", digest_catalog_id: "hokekyo" },
  { material_id: "iroha_kotodama_kai", label: "いろは言霊解", book_class: "mapping", digest_catalog_id: "iroha_kotodama_kai" },
  { material_id: "katakamuna_kotodama_kai", label: "カタカムナ言霊解", book_class: "mapping", digest_catalog_id: "katakamuna_kotodama_kai" },
  { material_id: "siddham_sandoku", label: "サンスクリット・悉曇系", book_class: "comparative", digest_catalog_id: "siddham_sandoku" },
  { material_id: "books_superpack", label: "その他主要比較本", book_class: "comparative", digest_catalog_id: "books_superpack" },
];

const LEDGER_BY_MATERIAL_ID = new Map(BOOK_LEDGER_SETTLEMENT_CATALOG_V1.map((e) => [e.material_id, e]));

const MESSAGE_TO_LEDGER: { material_id: string; patterns: RegExp[] }[] = [
  { material_id: "kotodama_hisho_khs", patterns: [/言霊秘書/u, /\bKHS\b/u] },
  { material_id: "mizuho_den", patterns: [/水穂伝/u] },
  { material_id: "inari_koden", patterns: [/稲荷古伝/u] },
  { material_id: "kojiki_lineage", patterns: [/古事記/u] },
  { material_id: "kukai_lineage", patterns: [/空海/u, /弘法/u] },
  { material_id: "hokekyo", patterns: [/法華経/u, /\b法華\b/u] },
  { material_id: "iroha_kotodama_kai", patterns: [/いろは言霊/u] },
  { material_id: "katakamuna_kotodama_kai", patterns: [/カタカムナ/u, /かたかむな/u] },
  { material_id: "siddham_sandoku", patterns: [/悉曇/u, /梵字/u, /サンスクリット/u, /梵語/u] },
  { material_id: "books_superpack", patterns: [/比較本/u, /比較宗教/u] },
];

export type TenmonBookReadingResultV1 = {
  title: string;
  center_terms: string[];
  contrast_terms: Array<{ left: string; right: string }>;
  generation_order: string[];
  handoff_candidates: TenmonBookReadingHandoffCandidateV1[];
  /** settlement: メッセージから推定した主資料（無ければ null） */
  primary_book_material_id: string | null;
  book_class: TenmonBookClassV1 | null;
};

export function emptyTenmonBookJudgeSplitV1(): TenmonBookJudgeSplitV1 {
  return {
    schema: "TENMON_BOOK_JUDGE_SPLIT_V1",
    source_facts: [],
    text_summary: "",
    tradition_evidence: [],
    tenmon_mapping: [],
    uncertainty_flags: [],
    provisional_verdict: "",
  };
}

/**
 * 保存時: 6 束を常に分離したオブジェクトに正規化（欠落は空、束間マージはしない）。
 */
export function normalizeTenmonBookJudgeSplitForSaveV1(
  partial: Partial<TenmonBookJudgeSplitV1> | null | undefined,
): TenmonBookJudgeSplitV1 {
  const lines = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter((s) => s.length > 0) : [];
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const p = partial && typeof partial === "object" ? partial : {};
  return {
    schema: "TENMON_BOOK_JUDGE_SPLIT_V1",
    source_facts: lines((p as TenmonBookJudgeSplitV1).source_facts),
    text_summary: str(p.text_summary),
    tradition_evidence: lines(p.tradition_evidence),
    tenmon_mapping: lines(p.tenmon_mapping),
    uncertainty_flags: lines(p.uncertainty_flags),
    provisional_verdict: str(p.provisional_verdict),
  };
}

export function buildTenmonBookAnalysisLogEntryV1(
  book_material_id: string,
  split: TenmonBookJudgeSplitV1,
  log_id?: string,
): TenmonBookAnalysisLogEntryV1 {
  return {
    schema: "TENMON_BOOK_ANALYSIS_LOG_ENTRY_V1",
    log_id: log_id ?? `bal:${book_material_id}:${Date.now()}`,
    book_material_id,
    created_at_iso: new Date().toISOString(),
    judge_split: split,
  };
}

export function buildTenmonBookLawCardFromJudgeSplitV1(
  book_material_id: string,
  split: TenmonBookJudgeSplitV1,
  card_suffix = "0",
): TenmonBookLawCardV1 {
  return {
    schema: "TENMON_BOOK_LAW_CARD_V1",
    card_id: `law:${book_material_id}:${card_suffix}`,
    book_material_id,
    law_hooks: [...split.tradition_evidence],
    binds_to_split: true,
  };
}

export function buildTenmonBookComparisonCardFromJudgeSplitV1(
  book_material_id: string,
  split: TenmonBookJudgeSplitV1,
  card_suffix = "0",
): TenmonBookComparisonCardV1 {
  return {
    schema: "TENMON_BOOK_COMPARISON_CARD_V1",
    card_id: `cmp:${book_material_id}:${card_suffix}`,
    book_material_id,
    comparison_axes: [...split.tenmon_mapping],
    binds_to_split: true,
  };
}

export function buildTenmonBookUncertaintyIssueCardFromJudgeSplitV1(
  book_material_id: string,
  split: TenmonBookJudgeSplitV1,
  card_suffix = "0",
): TenmonBookUncertaintyIssueCardV1 {
  return {
    schema: "TENMON_BOOK_UNCERTAINTY_ISSUE_CARD_V1",
    card_id: `unc:${book_material_id}:${card_suffix}`,
    book_material_id,
    issue_codes: [...split.uncertainty_flags],
    note: "uncertainty は source_facts / tenmon_mapping / provisional_verdict と混ぜない",
    binds_to_split: true,
  };
}

export function buildBookLedgerSettlementLayerSliceV1(): {
  card: "TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1";
  book_ledger_catalog: readonly TenmonBookLedgerEntryV1[];
  judge_split_empty_template: TenmonBookJudgeSplitV1;
  settlement_notes: readonly string[];
} {
  return {
    card: "TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1",
    book_ledger_catalog: BOOK_LEDGER_SETTLEMENT_CATALOG_V1,
    judge_split_empty_template: emptyTenmonBookJudgeSplitV1(),
    settlement_notes: [
      "全文投入を学習と見なさない。継承知識化は judge_split のカード束への正規化後のみ。",
      "source_facts / text_summary / tradition_evidence / tenmon_mapping / uncertainty_flags / provisional_verdict を混線させない。",
    ],
  };
}

export function buildTenmonBookLedgerSettlementAutomationBundleV1(): {
  schema: "TENMON_BOOK_LEDGER_SETTLEMENT_AUTOMATION_BUNDLE_V1";
  card: "TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1";
  book_ledger_catalog: readonly TenmonBookLedgerEntryV1[];
  judge_split_normalized_example: TenmonBookJudgeSplitV1;
  analysis_log_example: TenmonBookAnalysisLogEntryV1;
  law_card_example: TenmonBookLawCardV1;
  comparison_card_example: TenmonBookComparisonCardV1;
  uncertainty_card_example: TenmonBookUncertaintyIssueCardV1;
  nextOnPass: string;
  nextOnFail: string;
} {
  const split = normalizeTenmonBookJudgeSplitForSaveV1({
    source_facts: ["版・巻・頁の参照子（本文ダンプは不可）"],
    text_summary: "要約は text_summary のみへ。",
    tradition_evidence: ["注釈・伝統束の参照"],
    tenmon_mapping: ["天聞写像は tenmon_mapping のみへ"],
    uncertainty_flags: ["未確定は uncertainty_flags のみへ"],
    provisional_verdict: "暫定裁定は provisional_verdict のみへ",
  });
  const bookId = "mizuho_den";
  return {
    schema: "TENMON_BOOK_LEDGER_SETTLEMENT_AUTOMATION_BUNDLE_V1",
    card: "TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_CURSOR_AUTO_V1",
    book_ledger_catalog: BOOK_LEDGER_SETTLEMENT_CATALOG_V1,
    judge_split_normalized_example: split,
    analysis_log_example: buildTenmonBookAnalysisLogEntryV1(bookId, split, `bal:${bookId}:example`),
    law_card_example: buildTenmonBookLawCardFromJudgeSplitV1(bookId, split),
    comparison_card_example: buildTenmonBookComparisonCardFromJudgeSplitV1(bookId, split),
    uncertainty_card_example: buildTenmonBookUncertaintyIssueCardFromJudgeSplitV1(bookId, split),
    nextOnPass: "TENMON_VPS_TO_NOTION_BOOK_ANALYSIS_REFLECTION_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_BOOK_LEDGER_AND_SETTLEMENT_LAYER_RETRY_CURSOR_AUTO_V1",
  };
}

export function resolveTenmonBookReadingKernelV1(message: string): TenmonBookReadingResultV1 {
  const m = String(message || "").normalize("NFKC");
  let primary_book_material_id: string | null = null;
  let book_class: TenmonBookClassV1 | null = null;
  let title = "";
  for (const row of MESSAGE_TO_LEDGER) {
    if (row.patterns.some((re) => re.test(m))) {
      primary_book_material_id = row.material_id;
      const ledger = LEDGER_BY_MATERIAL_ID.get(row.material_id);
      book_class = ledger?.book_class ?? null;
      title = ledger?.label ?? "";
      break;
    }
  }
  return {
    title,
    center_terms: [],
    contrast_terms: [],
    generation_order: [],
    handoff_candidates: [],
    primary_book_material_id,
    book_class,
  };
}
