/**
 * TENMON_KOKUZO — P20 / HYBRID detailPlan 契約の観測用スタンプ（挙動は変えずデバッグのみ）。
 * 重い正規化は後続カードで段階導入する。
 */
export function stampKokuzoDetailPlanContractP20HybridV1(payload: unknown): void {
  try {
    const p = payload as Record<string, unknown> | null | undefined;
    const df = p?.decisionFrame as Record<string, unknown> | undefined;
    const mode = df?.mode;
    const dp = df?.detailPlan as Record<string, unknown> | undefined;
    if (mode !== "HYBRID" || !dp || typeof dp !== "object" || Array.isArray(dp)) return;
    const dbg = dp.debug;
    const nextDebug =
      dbg && typeof dbg === "object" && !Array.isArray(dbg) ? { ...dbg } : {};
    (nextDebug as Record<string, unknown>).detailPlanContract = "P20_HYBRID_V1";
    (nextDebug as Record<string, unknown>).stampedAt = "kokuzoDetailPlanStabilityV1";
    dp.debug = nextDebug;
  } catch {
    /* 契約スタンプは best-effort */
  }
}
