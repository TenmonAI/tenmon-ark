/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export type TenmonBookReadingHandoffCandidateV1 = {
  type: "sanskrit" | "godname" | "scripture_comparison";
  key: string;
  confidence: number;
};

export type TenmonBookReadingResultV1 = {
  title: string;
  center_terms: string[];
  contrast_terms: Array<{ left: string; right: string }>;
  generation_order: string[];
  handoff_candidates: TenmonBookReadingHandoffCandidateV1[];
};

export function resolveTenmonBookReadingKernelV1(_message: string): TenmonBookReadingResultV1 {
  void _message;
  return {
    title: "",
    center_terms: [],
    contrast_terms: [],
    generation_order: [],
    handoff_candidates: [],
  };
}
