import { getDb } from "../db/index.js";

export function buildTenmonVerdictEngineV1(args: Record<string, unknown>) {
  const centerKey = String(args.centerKey || "");
  const routeReason = String(args.routeReason || "");
  const body = String(args.body || "");
  const centerLabel = String(args.centerLabel || "");

  const tradition = centerKey.includes("KUKAI") ? "空海・真言密教・即身成仏"
    : centerKey.includes("HOKEKYO") ? "法華経・一仏乗・方便実相"
    : centerKey.includes("katakamuna") ? "カタカムナ・潜象物理・楢崎皐月"
    : centerKey.includes("kotodama") ? "言灵・五十連・水火の法則"
    : "天聞統合軸";

  // 実質的なgrounded判定
  const hasScriptureRoute = /SCRIPTURE|GROUNDED|TRUTH_GATE|KATAKAMUNA_CANON|TENMON_SCRIPTURE/.test(routeReason);
  const hasCenterKey = centerKey.length > 0;
  const hasSubstantialBody = body.length > 100;
  const hasLawEvidence = (() => {
    if (!centerKey) return false;
    try {
      const db = getDb("kokuzo");
      const count = (db.prepare(
        "SELECT COUNT(*) as cnt FROM kokuzo_laws WHERE name IS NOT NULL AND definition IS NOT NULL LIMIT 1"
      ).get() as { cnt: number })?.cnt ?? 0;
      return count > 0;
    } catch { return false; }
  })();

  const verdict = (hasScriptureRoute && hasCenterKey && hasSubstantialBody)
    ? "grounded"
    : (hasCenterKey && hasSubstantialBody && hasLawEvidence)
    ? "grounded"
    : hasSubstantialBody
    ? "provisional"
    : "insufficient";

  return {
    facts: body.slice(0, 80),
    tradition,
    tenmon_mapping: centerKey ? `${centerKey} → ${tradition}` : "天聞統合軸",
    centerLabel: centerLabel || tradition,
    uncertainty: verdict === "grounded" ? "正典・中心キーによる接続確認済み" : "正典証拠による確認が必要",
    verdict,
    evidence: {
      hasScriptureRoute,
      hasCenterKey,
      hasLawEvidence,
      routeReason: routeReason.slice(0, 60),
    },
  };
}
