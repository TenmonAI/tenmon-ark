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
  return {
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
}
