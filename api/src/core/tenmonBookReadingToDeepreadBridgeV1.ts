import type { TenmonBookReadingHandoffCandidateV1, TenmonBookReadingResultV1 } from "./tenmonBookReadingKernelV1.js";

export type TenmonDeepreadHandoffV1 = {
  schema: "TENMON_BOOK_TO_DEEPREAD_BRIDGE_V1";
  source_schema: "TENMON_BOOK_READING_KERNEL_V1";
  handoff: Array<{
    target: "sanskrit_deepread" | "godname_deepread" | "scripture_comparison_deepread";
    payload: {
      title: string;
      center_terms: string[];
      contrast_terms: Array<{ left: string; right: string }>;
      generation_order: string[];
      focus_key: string;
      confidence: number;
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
  const handoff = reading.handoff_candidates.map((c: TenmonBookReadingHandoffCandidateV1) => ({
    target: mapTarget(c.type),
    payload: {
      title: reading.title,
      center_terms: [...reading.center_terms],
      contrast_terms: [...reading.contrast_terms],
      generation_order: [...reading.generation_order],
      focus_key: c.key,
      confidence: Number(c.confidence),
    },
  }));

  return {
    schema: "TENMON_BOOK_TO_DEEPREAD_BRIDGE_V1",
    source_schema: "TENMON_BOOK_READING_KERNEL_V1",
    handoff,
  };
}
