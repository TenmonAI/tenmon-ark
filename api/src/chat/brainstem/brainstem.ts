export type BrainstemDecision = {
  routeReason: string | null;
  centerMeaning: string | null;
  centerLabel: string | null;
  scriptureMode: string | null;
  responseProfile: string | null;
  surfaceStyle: string | null;
  closingType: string | null;
  providerPlan: any | null;
  expressionPlan: any | null;
  comfortTuning: any | null;
  thoughtCoreSummary: any | null;
  seedKernel: any | null;
};

function asObj(x: any): any | null {
  return x && typeof x === "object" ? x : null;
}

export function buildBrainstemDecisionFromKu(ku: any): BrainstemDecision {
  const k = asObj(ku) || {};
  const base: BrainstemDecision = {
    routeReason: typeof k.routeReason === "string" ? k.routeReason : null,
    centerMeaning: typeof k.centerMeaning === "string" ? k.centerMeaning : null,
    centerLabel: typeof k.centerLabel === "string" ? k.centerLabel : null,
    scriptureMode: typeof k.scriptureMode === "string" ? k.scriptureMode : null,
    responseProfile: typeof k.responseProfile === "string" ? k.responseProfile : null,
    surfaceStyle: typeof k.surfaceStyle === "string" ? k.surfaceStyle : null,
    closingType: typeof k.closingType === "string" ? k.closingType : null,
    providerPlan: asObj(k.providerPlan),
    expressionPlan: asObj(k.expressionPlan),
    comfortTuning: asObj(k.comfortTuning),
    thoughtCoreSummary: asObj(k.thoughtCoreSummary),
    seedKernel: asObj(k.seedKernel),
  };

  const rr = String(base.routeReason || "");
  const isNaturalGeneral = rr.includes("NATURAL_GENERAL");

  // TENMON_GENERAL_DEFAULTS_V1:
  // NATURAL_GENERAL 系や routeReason 未設定のときも、天聞AIとしての表層スタイルを固定する。
  if (!base.surfaceStyle && (isNaturalGeneral || !rr)) {
    base.surfaceStyle = "plain_clean";
  }
  if (!base.closingType && (isNaturalGeneral || !rr)) {
    base.closingType = "one_question";
  }
  if (!base.responseProfile && (isNaturalGeneral || !rr)) {
    base.responseProfile = "tenmon_general";
  }
  if (!base.centerLabel && base.centerMeaning) {
    base.centerLabel = String(base.centerMeaning);
  }

  return base;
}
