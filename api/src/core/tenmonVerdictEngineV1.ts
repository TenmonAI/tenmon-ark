export function buildTenmonVerdictEngineV1(args: Record<string, unknown>) {
  const centerKey = String(args.centerKey || "");
  const body = String(args.body || "");
  const tradition = centerKey.includes("KUKAI") ? "空海・真言密教・即身成仏"
    : centerKey.includes("HOKEKYO") ? "法華経・一仏乗・方便実相"
    : centerKey.includes("katakamuna") ? "カタカムナ・潜象物理・楢崎皐月"
    : centerKey.includes("kotodama") ? "言霊・五十連・水火の法則"
    : "天聞統合軸";
  return {
    facts: body.slice(0, 80),
    tradition,
    tenmon_mapping: centerKey + " → 天聞統合軸",
    uncertainty: "正典証拠による確認が必要",
    verdict: body.length > 100 ? "grounded" : "provisional",
  };
}
