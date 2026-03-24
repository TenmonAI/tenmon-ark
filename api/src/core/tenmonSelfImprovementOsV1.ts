/**
 * TENMON Self-Improvement OS — カード識別子のみ（実行は VPS seal + Python モジュール）。
 * 会話ルートから参照する場合の定数集約用。
 */
export const TENMON_SELF_IMPROVEMENT_OS_V1 = {
  PARENT_CURSOR_CARD: "TENMON_SELF_IMPROVEMENT_OS_PARENT_CURSOR_AUTO_V1",
  PARENT_VPS_CARD: "TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1",
  RETRY_CURSOR_CARD: "TENMON_SELF_IMPROVEMENT_OS_PARENT_RETRY_CURSOR_AUTO_V1",
  INTEGRATION_CURSOR_CARD: "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_CURSOR_AUTO_V1",
  INTEGRATION_VPS_CARD: "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1",
  INTEGRATION_RETRY_CURSOR_CARD: "TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_RETRY_CURSOR_AUTO_V1",
  DISPATCH_REGISTRY_RELPATH: "automation/self_improvement_os_dispatch_v1.json",
} as const;

export type TenmonSelfImprovementOsV1CardKey = keyof typeof TENMON_SELF_IMPROVEMENT_OS_V1;

/**
 * TENMON_MEMORY_CIRCULATION_OS_CURSOR_AUTO_V1:
 * chat surface に還流可能な growth ヒントだけを抽出（内部 artifact 名は露出しない）
 */
export function buildGrowthCirculationHintV1(input: {
  ku: any;
  threadCore?: any;
}): {
  priorImprovementAxis: string | null;
  priorFailureClass: string | null;
  priorAntiRegressionNote: string | null;
  stableSourceAuthority: string | null;
} {
  const ku = input?.ku ?? {};
  const tc = input?.threadCore ?? {};
  const tcs = ku?.thoughtCoreSummary ?? {};
  const priorRule = ku?.priorSelfLearningRuleFeedbackV1 ?? {};
  const priorAxisRaw =
    (Array.isArray(tcs?.priorGrowthAxisHints) && String(tcs.priorGrowthAxisHints[0] ?? "").trim()) ||
    String(priorRule?.ruleHintCodes?.[0] ?? "").trim() ||
    "";
  const priorFailureRaw =
    String(priorRule?.failureClass ?? "").trim() ||
    (Array.isArray(tc?.openLoops) ? String(tc.openLoops[0] ?? "").trim() : "") ||
    "";
  const antiRegRaw = String(priorRule?.antiRegressionNote ?? "").trim();
  const sourceAuthorityRaw =
    (Array.isArray(ku?.lawsUsed) && ku.lawsUsed.length > 0 ? "khs_law_trace" : "") ||
    (String(ku?.scriptureKey ?? "").trim() ? "scripture_canon" : "") ||
    (Array.isArray(ku?.sourceStackSummary?.sourceKinds) && ku.sourceStackSummary.sourceKinds.length > 0
      ? "source_stack_bound"
      : "");
  return {
    priorImprovementAxis: priorAxisRaw ? priorAxisRaw.slice(0, 220) : null,
    priorFailureClass: priorFailureRaw ? priorFailureRaw.slice(0, 160) : null,
    priorAntiRegressionNote: antiRegRaw ? antiRegRaw.slice(0, 220) : null,
    stableSourceAuthority: sourceAuthorityRaw || null,
  };
}
