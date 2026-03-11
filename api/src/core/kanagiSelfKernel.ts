/**
 * R8_KANAGI_SELF_KERNEL_V1
 * 純関数コア。intent kernel + intention constitution に基づき selfPhase / intentPhase 等を決定する。
 * LLM 呼び出し・DB アクセス禁止。
 */
import {
  resolveDefaultIntentPhase,
  resolveRoutePhaseHints,
  resolveSelectionPrinciples,
  resolveResponseIntentHints,
} from "./intentKernel.js";

/** 天津金木四相 + CENTER */
export type KanagiPhase = "L-IN" | "R-IN" | "L-OUT" | "R-OUT" | "CENTER";

const VALID_PHASES: KanagiPhase[] = ["CENTER", "L-IN", "R-IN", "L-OUT", "R-OUT"];

function toKanagiPhase(s: unknown): KanagiPhase {
  if (typeof s !== "string") return "CENTER";
  const v = s as KanagiPhase;
  return VALID_PHASES.includes(v) ? v : "CENTER";
}

export type SelfKernelInput = {
  rawMessage: string;
  routeReason?: string;
  heart?: { phase?: unknown; userPhase?: unknown; arkTargetPhase?: unknown };
  intention?: { coreIntentionTop?: string; kanagiCenterHint?: string };
};

export type SelfKernelOutput = {
  selfPhase: KanagiPhase;
  intentPhase: KanagiPhase;
  judgementAxis: string[];
  stabilityScore: number;
  driftRisk: number;
  shouldPersist: boolean;
  shouldRecombine: boolean;
  centerHint?: string;
};

/**
 * 決定論的に self kernel を計算する。heart / intention / routeReason と intent kernel の route_phase_hints を使用。
 */
export function computeKanagiSelfKernel(input: SelfKernelInput): SelfKernelOutput {
  const { routeReason = "", heart, intention } = input;
  const routeHints = resolveRoutePhaseHints();
  const defaultPhase = resolveDefaultIntentPhase() || "CENTER";
  const principles = resolveSelectionPrinciples();
  const responseHints = resolveResponseIntentHints();

  // intentPhase: heart.phase or heart.arkTargetPhase or CENTER
  const intentPhase: KanagiPhase = toKanagiPhase(
    heart?.phase ?? heart?.arkTargetPhase ?? defaultPhase
  );

  // selfPhase: route_phase_hints があればそれ、なければ default。NATURAL_GENERAL は CENTER 寄り
  let selfPhase: KanagiPhase = toKanagiPhase(routeHints[routeReason] ?? defaultPhase);

  // judgementAxis: selection_principles をそのまま利用（先頭2本などに絞ってもよいが最小 diff で全部）
  const judgementAxis = Array.isArray(principles) ? [...principles] : [];

  // driftRisk: LLM_TOP 系は高め、verified / scripture / subconcept は低め
  const rr = String(routeReason);
  const isLlmTop =
    rr.includes("LLM_TOP") || rr === "NATURAL_GENERAL_LLM_TOP" || rr === "DEF_LLM_TOP";
  const isCanonical =
    rr.includes("VERIFIED") ||
    rr.includes("SCRIPTURE") ||
    rr.includes("SUBCONCEPT") ||
    rr.includes("DEF_FASTPATH") ||
    rr === "KHS_DEF_VERIFIED_HIT" ||
    rr === "TENMON_SCRIPTURE_CANON_V1" ||
    rr === "TENMON_SUBCONCEPT_CANON_V1";
  const driftRisk = isLlmTop ? 0.6 : isCanonical ? 0.1 : 0.3;
  const stabilityScore = 1 - driftRisk;

  // shouldPersist: verified / scripture / subconcept / strong general は true
  const shouldPersist =
    isCanonical ||
    rr.includes("N2_KANAGI") ||
    rr === "NATURAL_GENERAL_LLM_TOP" ||
    rr.includes("FASTPATH");

  // shouldRecombine: general のみ true 寄り、def/scripture は false 寄り
  const isGeneral = rr.includes("NATURAL_GENERAL") || rr === "NATURAL_FALLBACK";
  const isDefOrScripture =
    rr.includes("DEF_") || rr.includes("SCRIPTURE") || rr.includes("SUBCONCEPT");
  const shouldRecombine = isGeneral && !isDefOrScripture;

  // centerHint: intention.kanagiCenterHint or response_intent_hints.CENTER[0]
  const centerHint =
    intention?.kanagiCenterHint ??
    (responseHints.CENTER && responseHints.CENTER[0]) ??
    undefined;

  return {
    selfPhase,
    intentPhase,
    judgementAxis,
    stabilityScore,
    driftRisk,
    shouldPersist,
    shouldRecombine,
    centerHint,
  };
}

/** R8_KANAGI_SELF_BIND_KU_V1: 失敗時用の安全な戻り値。CENTER 系。route を壊さない。 */
export function getSafeKanagiSelfOutput(): SelfKernelOutput {
  return {
    selfPhase: "CENTER",
    intentPhase: "CENTER",
    judgementAxis: [],
    stabilityScore: 0.5,
    driftRisk: 0.5,
    shouldPersist: false,
    shouldRecombine: false,
  };
}
