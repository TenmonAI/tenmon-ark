/**
 * R10_DANSHARI_COMMUNICATION_LOOP_V1
 * 断捨離を general/support の整流法則として制御する。scripture / verified / subconcept / katakamuna では前に出さない。
 */

export type DanshariCommunicationParams = {
  routeReason?: string | null;
  topicClass?: string | null;
  driftRisk?: number | null;
  selfPhase?: string | null;
  intentPhase?: string | null;
  shouldPersist?: boolean | number | null;
  shouldRecombine?: boolean | number | null;
};

const GENERAL_OR_SUPPORT_RR = [
  "NATURAL_GENERAL_LLM_TOP",
  "N2_KANAGI_PHASE_TOP",
] as const;

const SUPPRESS_RR_PREFIXES = [
  "DEF_FASTPATH",
  "SOUL_FASTPATH",
  "TENMON_SCRIPTURE",
  "TENMON_SUBCONCEPT",
  "KATAKAMUNA",
  "TENMON_CONCEPT",
];

function isSuppressedRoute(routeReason: string): boolean {
  const rr = String(routeReason ?? "").trim();
  return SUPPRESS_RR_PREFIXES.some((p) => rr === p || rr.startsWith(p + "_"));
}

/**
 * general/support かつ driftRisk >= 0.5 のときだけ断捨離的整流を使う。
 * scripture / verified / subconcept / katakamuna では常に false。
 */
export function shouldUseDanshariCommunication(
  params: DanshariCommunicationParams
): boolean {
  const rr = String(params?.routeReason ?? "").trim();
  const topic = String(params?.topicClass ?? "").trim();
  const drift = params?.driftRisk != null ? Number(params.driftRisk) : null;

  if (isSuppressedRoute(rr)) return false;
  if (topic !== "general") return false;
  if (!GENERAL_OR_SUPPORT_RR.some((r) => rr === r)) return false;
  if (drift != null && drift < 0.5) return false;

  return true;
}

/**
 * 制御点用。断捨離ヒント文言を返す（本文変更は responseComposer 側で行うため、ここでは null または識別子のみ）。
 */
export function buildDanshariCommunicationHint(
  params: DanshariCommunicationParams
): string | null {
  return shouldUseDanshariCommunication(params) ? "danshari_communication" : null;
}
