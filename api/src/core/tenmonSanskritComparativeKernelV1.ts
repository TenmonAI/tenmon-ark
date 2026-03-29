/**
 * サンスクリット資料は comparative（root を上書きしない）。
 */

export type SanskritComparativeKernelBundleV1 = {
  card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1";
  sanskritComparativeAxis: string;
  mappingConfidence: number;
  rootVsComparativeBoundary: "KHS_root_only_comparative_here";
  comparativeInsight: string;
};

export function resolveSanskritComparativeKernelV1(
  message: string,
  opts?: { uncertainty_registry_flags?: readonly string[] | null },
): SanskritComparativeKernelBundleV1 | null {
  const msg = String(message || "").replace(/\s+/gu, " ").trim();
  if (!/サンスクリット|梵字|悉曇|BHS|Buddhist Hybrid|真言|母音|子音|五大/u.test(msg)) return null;
  const unc = opts?.uncertainty_registry_flags?.filter(Boolean).slice(0, 6) ?? [];
  const uncSuffix = unc.length ? ` 未決着束: ${unc.join("｜")}。` : "";
  return {
    card: "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1",
    sanskritComparativeAxis: "音韻・生成・構造の対照（断定ではなく比較）",
    mappingConfidence: 0.62,
    rootVsComparativeBoundary: "KHS_root_only_comparative_here",
    comparativeInsight:
      "KHS を root、サンスクリット・悉曇は comparative layer。同一視せず対応関係のみ言語化。" + uncSuffix,
  };
}
