import {
  emptyTenmonBookJudgeSplitV1,
  type TenmonBookClassV1,
  type TenmonBookJudgeSplitV1,
  type TenmonBookReadingHandoffCandidateV1,
  type TenmonBookReadingResultV1,
  type TenmonOcrBookSettlementUnitV1,
} from "./tenmonBookReadingKernelV1.js";

export type TenmonDeepreadHandoffV1 = {
  schema: "TENMON_BOOK_TO_DEEPREAD_BRIDGE_V1";
  source_schema: "TENMON_BOOK_READING_KERNEL_V1";
  /** settlement layer: deepread 先でも judge 6 束を混線させない */
  book_settlement: {
    primary_book_material_id: string | null;
    book_class: TenmonBookClassV1 | null;
    judge_split_template: TenmonBookJudgeSplitV1;
  };
  /**
   * OCR/PDF 抽出→judge 分離済み単位（Notion/ARK 前）。未バインドは null。
   * 本文 verified 化・law card 単独昇格は禁止（reuse_safety 参照）。
   */
  book_extract_settlement_unit: TenmonOcrBookSettlementUnitV1 | null;
  handoff: Array<{
    target: "sanskrit_deepread" | "godname_deepread" | "scripture_comparison_deepread";
    payload: {
      title: string;
      center_terms: string[];
      contrast_terms: Array<{ left: string; right: string }>;
      generation_order: string[];
      focus_key: string;
      confidence: number;
      primary_book_material_id: string | null;
      book_class: TenmonBookClassV1 | null;
      judge_split_template: TenmonBookJudgeSplitV1;
    };
  }>;
};

function mapTarget(
  t: "sanskrit" | "godname" | "scripture_comparison",
): "sanskrit_deepread" | "godname_deepread" | "scripture_comparison_deepread" {
  if (t === "sanskrit") return "sanskrit_deepread";
  if (t === "godname") return "godname_deepread";
  return "scripture_comparison_deepread";
}

export function buildTenmonBookReadingToDeepreadBridgeV1(
  reading: TenmonBookReadingResultV1,
): TenmonDeepreadHandoffV1 {
  const judge_split_template = emptyTenmonBookJudgeSplitV1();
  const book_settlement = {
    primary_book_material_id: reading.primary_book_material_id,
    book_class: reading.book_class,
    judge_split_template,
  };
  const handoff = reading.handoff_candidates.map((c: TenmonBookReadingHandoffCandidateV1) => ({
    target: mapTarget(c.type),
    payload: {
      title: reading.title,
      center_terms: [...reading.center_terms],
      contrast_terms: [...reading.contrast_terms],
      generation_order: [...reading.generation_order],
      focus_key: c.key,
      confidence: Number(c.confidence),
      primary_book_material_id: reading.primary_book_material_id,
      book_class: reading.book_class,
      judge_split_template,
    },
  }));

  return {
    schema: "TENMON_BOOK_TO_DEEPREAD_BRIDGE_V1",
    source_schema: "TENMON_BOOK_READING_KERNEL_V1",
    book_settlement,
    book_extract_settlement_unit: null,
    handoff,
  };
}
