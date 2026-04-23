/**
 * Mission Control vNext — feature gate (CARD_MC_VNEXT_FOUNDATION_V1).
 * OFF by default. Set TENMON_MC_VNEXT=1 to expose /api/mc/vnext/* and enable UI.
 */
export function isMcVnextEnabled(): boolean {
  return String(process.env.TENMON_MC_VNEXT ?? "").trim() === "1";
}
