export type TenmonMultipassPlanV1 = {
  composePass: "scripture_grounded" | "tenmon_grounded" | "natural_tenmon";
  stylePass: "scripture_formal" | "kotodama_structured" | "natural_tenmon";
  densityPass: "standard";
  centerLock: string;
  evidenceRequired: true;
};

export function buildTenmonMultipassAnsweringV1(args: Record<string, unknown>): TenmonMultipassPlanV1 {
  const routeReason = String(args.routeReason || "").toUpperCase();
  const centerKey = String(args.centerKey || "");
  const ck = centerKey.toLowerCase();

  const composePass: TenmonMultipassPlanV1["composePass"] =
    routeReason.includes("SCRIPTURE")
      ? "scripture_grounded"
      : routeReason.includes("TENMON")
      ? "tenmon_grounded"
      : "natural_tenmon";

  const stylePass: TenmonMultipassPlanV1["stylePass"] =
    ck.includes("hokekyo") || ck.includes("kukai")
      ? "scripture_formal"
      : ck.includes("kotodama_hisho")
      ? "kotodama_structured"
      : "natural_tenmon";

  return {
    composePass,
    stylePass,
    densityPass: "standard",
    centerLock: centerKey,
    evidenceRequired: true,
  };
}
