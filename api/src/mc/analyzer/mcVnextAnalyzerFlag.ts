/** CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1 — analyzer / acceptance 集計の ON/OFF */
export function isMcVnextAnalyzerEnabled(): boolean {
  return String(process.env.TENMON_MC_VNEXT_ANALYZER ?? "").trim() === "1";
}
