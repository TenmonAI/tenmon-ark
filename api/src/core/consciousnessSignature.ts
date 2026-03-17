export function computeConsciousnessSignature(input: {
  heart: any;
  kanagiSelf: any;
  seedKernel: any;
  threadCore: any;
  thoughtCoreSummary: any;
}) {
  const { heart, kanagiSelf, seedKernel, threadCore, thoughtCoreSummary } = input;

  const phase4 =
    kanagiSelf?.selfPhase ||
    heart?.phase ||
    seedKernel?.phase ||
    "CENTER";

  const polarity =
    (kanagiSelf?.driftRisk ?? 0) > 0.4 ? "INVERT_RISK" : "NORMAL";

  let centerMode: string = "none";
  if (threadCore?.centerKey) centerMode = "concept";
  if (thoughtCoreSummary?.modeHint === "scripture") centerMode = "scripture";

  return {
    phase4,
    polarity,
    centerMode,
  };
}

