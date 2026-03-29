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

/** VPS 抽出の出自（canon 化せず judge 束へ分離する） */
export type TenmonBookExtractSourceClassV1 =
  | "ocr_engine"
  | "pdf_text_layer"
  | "pypdf_builtin"
  | "hybrid"
  | "unknown";

export type TenmonBookExtractNasLocatorV1 = {
  locator_ref?: string | null;
  nas_relative_path?: string | null;
  canonical_root?: string | null;
};

/** OCR/PDF extract 行の必須メタ（Notion / ARK 手前のゲート） */
export type TenmonBookExtractMetadataV1 = {
  schema: "TENMON_BOOK_EXTRACT_METADATA_V1";
  source_hash: string;
  page_range: string;
  engine: string;
  nas_locator: TenmonBookExtractNasLocatorV1;
  extracted_ref: string;
  book_id: string;
  source_class: TenmonBookExtractSourceClassV1;
};

/** NAS→VPS 抽出→judge 分離→定着入口の保存単位（OCR を学習と見なさない） */
export type TenmonOcrBookSettlementUnitV1 = {
  schema: "TENMON_OCR_BOOK_SETTLEMENT_UNIT_V1";
  card: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1";
  extract_metadata: TenmonBookExtractMetadataV1;
  judge_split: TenmonBookJudgeSplitV1;
  reuse_safety: {
    ocr_not_verified_truth: true;
    raw_fragments_not_law_card_source: true;
    law_card_requires_judge_pass: true;
  };
  pipeline: {
    nas_original_to_vps_extract_to_judge_split_to_notion_ark_gate: true;
  };
};

export type TenmonExtractQualityHintV1 = "clean" | "ocr_suspect" | "text_layer_incomplete";

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
export function normalizeTenmonBookExtractMetadataV1(
  partial: Partial<TenmonBookExtractMetadataV1> & Pick<TenmonBookExtractMetadataV1, "book_id" | "source_hash">,
): TenmonBookExtractMetadataV1 {
  const rawNas = partial.nas_locator;
  const nas: TenmonBookExtractNasLocatorV1 =
    rawNas && typeof rawNas === "object"
      ? {
          locator_ref: rawNas.locator_ref ?? null,
          nas_relative_path: rawNas.nas_relative_path ?? null,
          canonical_root: rawNas.canonical_root ?? null,
        }
      : {};
  const sc = partial.source_class;
  const source_class: TenmonBookExtractSourceClassV1 =
    sc === "ocr_engine" ||
    sc === "pdf_text_layer" ||
    sc === "pypdf_builtin" ||
    sc === "hybrid" ||
    sc === "unknown"
      ? sc
      : "unknown";
  return {
    schema: "TENMON_BOOK_EXTRACT_METADATA_V1",
    source_hash: String(partial.source_hash),
    page_range: String(partial.page_range ?? ""),
    engine: String(partial.engine ?? "unknown"),
    nas_locator: nas,
    extracted_ref: String(partial.extracted_ref ?? ""),
    book_id: partial.book_id,
    source_class,
  };
}

/**
 * 抽出結果を settlement unit に載せる。生本文は verified 扱いにせず、OCR/不全は uncertainty へ寄せる。
 */
export function buildTenmonOcrBookSettlementUnitFromExtractV1(
  meta: TenmonBookExtractMetadataV1,
  partialSplit: Partial<TenmonBookJudgeSplitV1> | null | undefined,
  quality: TenmonExtractQualityHintV1,
): TenmonOcrBookSettlementUnitV1 {
  const split = normalizeTenmonBookJudgeSplitForSaveV1(partialSplit);
  const flags = [...split.uncertainty_flags];
  if (quality === "ocr_suspect") {
    flags.push("ocr_contamination_or_engine_noise_suspected");
  }
  if (quality === "text_layer_incomplete") {
    flags.push("pdf_text_layer_missing_or_partial");
  }
  if (meta.source_class === "ocr_engine") {
    flags.push("extract_class_ocr_engine_not_canon_without_judge");
  }
  return {
    schema: "TENMON_OCR_BOOK_SETTLEMENT_UNIT_V1",
    card: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1",
    extract_metadata: meta,
    judge_split: { ...split, uncertainty_flags: flags },
    reuse_safety: {
      ocr_not_verified_truth: true,
      raw_fragments_not_law_card_source: true,
      law_card_requires_judge_pass: true,
    },
    pipeline: {
      nas_original_to_vps_extract_to_judge_split_to_notion_ark_gate: true,
    },
  };
}

/** study planner / 自動化が同じ文言を参照するための単一ソース */
export const TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_PIPELINE_NOTE_V1 =
  "NAS 原本 → VPS 抽出 → judge 6 束分離 → law/comparison/uncertainty は judge 通過後のみ。OCR は truth としない。" as const;

/** fail-closed: メタ必須・judge schema 整合 */
export function settlementUnitJudgeSeparationOkV1(unit: TenmonOcrBookSettlementUnitV1): boolean {
  if (unit.schema !== "TENMON_OCR_BOOK_SETTLEMENT_UNIT_V1") return false;
  if (unit.judge_split.schema !== "TENMON_BOOK_JUDGE_SPLIT_V1") return false;
  const m = unit.extract_metadata;
  if (m.schema !== "TENMON_BOOK_EXTRACT_METADATA_V1") return false;
  if (!m.source_hash.trim()) return false;
  if (!m.book_id.trim()) return false;
  if (!m.extracted_ref.trim()) return false;
  return true;
}

export function getTenmonOcrToBookSettlementBindProbePayloadV1(): {
  schema: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_PROBE_V1";
  card: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1";
  generated_at: string;
  example_unit: TenmonOcrBookSettlementUnitV1;
  analysis_log_from_example: TenmonBookAnalysisLogEntryV1;
  law_card_blocked_until_judge: true;
  bridge_ingest_note: string;
  digest_ledger_note: string;
  study_planner_note: string;
  acceptance_pass: boolean;
  failure_reasons: string[];
  nextOnPass: string;
  nextOnFail: string;
} {
  const meta = normalizeTenmonBookExtractMetadataV1({
    book_id: "books_superpack",
    source_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    page_range: "1-2",
    engine: "pdftotext",
    extracted_ref: "kokuzo_pages:books_superpack:pdfPage=1",
    source_class: "pdf_text_layer",
    nas_locator: {
      locator_ref: "nas+path:/example/ledger",
      nas_relative_path: "materials/books/example.pdf",
    },
  });
  const unit = buildTenmonOcrBookSettlementUnitFromExtractV1(
    meta,
    {
      source_facts: ["extracted_ref=kokuzo_pages:books_superpack:pdfPage=1（参照子のみ・本文 verified 化禁止）"],
      text_summary: "要約は text_summary のみ。抽出断片を tradition / mapping に昇格させない。",
      tradition_evidence: [],
      tenmon_mapping: [],
      uncertainty_flags: [],
      provisional_verdict: "unsettled_pending_judge",
    },
    "clean",
  );
  const separation_ok = settlementUnitJudgeSeparationOkV1(unit);
  const analysis_log = buildTenmonBookAnalysisLogEntryV1(meta.book_id, unit.judge_split, "bal:ocr_settlement_bind:probe");
  const failure_reasons: string[] = [];
  if (!separation_ok) failure_reasons.push("settlement_unit_judge_separation_failed");
  return {
    schema: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_PROBE_V1",
    card: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    example_unit: unit,
    analysis_log_from_example: analysis_log,
    law_card_blocked_until_judge: true,
    bridge_ingest_note:
      "TenmonDeepreadHandoffV1.book_extract_settlement_unit: judge 6 束＋extract メタを Notion/ARK 前ゲートに同梱（null は未バインド）。",
    digest_ledger_note:
      "getMaterialDigestLedgerPayloadV1: book_ledger_settlement と OCR settlement 経路を併記（本文は NAS・抽出は参照子）。",
    study_planner_note: `${TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_PIPELINE_NOTE_V1} queue は NAS locator のみ同梱。`,
    acceptance_pass: separation_ok,
    failure_reasons,
    nextOnPass: "TENMON_KATAKAMUNA_SOURCE_AUDIT_AND_CLASSIFICATION_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_OCR_TO_BOOK_SETTLEMENT_BIND_RETRY_CURSOR_AUTO_V1",
  };
}

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
      "OCR/PDF extract は TenmonOcrBookSettlementUnitV1（extract メタ＋judge 6 束）で保存し、Notion/ARK 前ゲートを経由する。",
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
