export type TenmonCenterKeyV1 = "HOKEKYO" | "KUKAI" | "kotodama_hisho" | "katakamuna" | "TENMON";

function normalize(s: string): string {
  return String(s || "").toLowerCase();
}

export function detectTenmonCenterKeyV1(rawMessage: string, routeReason = ""): TenmonCenterKeyV1 {
  const m = normalize(rawMessage);
  const rr = normalize(routeReason);
  const hay = `${m} ${rr}`;

  if (/(法華経|ほけきょう|hokekyo)/.test(hay)) return "HOKEKYO";
  if (/(空海|くうかい|真言|即身成仏|kukai)/.test(hay)) return "KUKAI";
  if (/(言霊|ことだま|kotodama|五十連|水火)/.test(hay)) return "kotodama_hisho";
  if (/(カタカムナ|katakamuna|潜象|楢崎)/.test(hay)) return "katakamuna";
  return "TENMON";
}
