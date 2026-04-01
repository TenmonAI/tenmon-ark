export type TenmonVerdictV1 = {
  facts: string;
  tradition: string;
  tenmon_mapping: string;
  uncertainty: string;
  verdict: "grounded" | "provisional";
};

function resolveTradition(centerKey: string): string {
  const k = String(centerKey || "").toLowerCase();
  if (k.includes("kukai")) return "空海・真言密教・即身成仏";
  if (k.includes("hokekyo")) return "法華経・一仏乗・方便実相";
  if (k.includes("katakamuna")) return "カタカムナ・潜象物理・楢崎皐月";
  if (k.includes("kotodama_hisho")) return "言霊・五十連・水火の法則";
  return "天聞統合軸";
}

export function buildTenmonVerdictEngineV1(args: Record<string, unknown>): TenmonVerdictV1 {
  const routeReason = String(args.routeReason || "");
  const centerKey = String(args.centerKey || "");
  const body = String(args.body || "");
  void routeReason;

  return {
    facts: body.slice(0, 80),
    tradition: resolveTradition(centerKey),
    tenmon_mapping: `${centerKey || "default"} → 天聞統合軸`,
    uncertainty: "正典証拠による確認が必要",
    verdict: body.length > 100 ? "grounded" : "provisional",
  };
}
