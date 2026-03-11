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
  heart?: {
    phase?: unknown;
    userPhase?: unknown;
    arkTargetPhase?: unknown;
    entropy?: unknown;
  };
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
  /** R8_HEART_KANAGI_UNIFY_V1: 観測用 */
  heartSourcePhase?: KanagiPhase;
  heartTargetPhase?: KanagiPhase;
  heartEntropy?: number;
  alignment?: string;
};

function numEntropy(v: unknown): number {
  if (typeof v === "number" && v >= 0 && v <= 1) return v;
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return 0.25;
}

/**
 * 決定論的に self kernel を計算する。heart を一次入力とし、intent kernel と整合させる。
 */
export function computeKanagiSelfKernel(input: SelfKernelInput): SelfKernelOutput {
  const { routeReason = "", heart, intention } = input;
  const routeHints = resolveRoutePhaseHints();
  const defaultPhase = resolveDefaultIntentPhase() || "CENTER";
  const principles = resolveSelectionPrinciples();
  const responseHints = resolveResponseIntentHints();

  const rr = String(routeReason);
  const isCanonical =
    rr.includes("VERIFIED") ||
    rr.includes("SCRIPTURE") ||
    rr.includes("SUBCONCEPT") ||
    rr.includes("DEF_FASTPATH") ||
    rr === "KHS_DEF_VERIFIED_HIT" ||
    rr === "TENMON_SCRIPTURE_CANON_V1" ||
    rr === "TENMON_SUBCONCEPT_CANON_V1";
  const isLlmTop =
    rr.includes("LLM_TOP") || rr === "NATURAL_GENERAL_LLM_TOP" || rr === "DEF_LLM_TOP";
  const isSupportGeneral =
    rr.includes("N2_KANAGI") || rr.includes("NATURAL_GENERAL") || rr === "NATURAL_FALLBACK";

  // R8_HEART_KANAGI_UNIFY_V1: heart を一次入力として明示
  const heartPhase = toKanagiPhase(heart?.phase);
  const heartArk = toKanagiPhase(heart?.arkTargetPhase);
  const heartUser = toKanagiPhase(heart?.userPhase);
  const heartEntropyNum = numEntropy(heart?.entropy);

  // intentPhase: heart.phase → heart.arkTargetPhase → CENTER
  const intentPhase: KanagiPhase =
    heartPhase !== "CENTER" ? heartPhase : heartArk !== "CENTER" ? heartArk : "CENTER";

  // selfPhase: verified/scripture/subconcept → L-IN or R-IN; support/general → heart.userPhase + routeReason; fallback CENTER
  let selfPhase: KanagiPhase;
  if (isCanonical) {
    const hint = toKanagiPhase(routeHints[rr]);
    selfPhase = hint !== "CENTER" ? hint : rr.includes("SCRIPTURE") ? "R-IN" : "L-IN";
  } else if (isSupportGeneral) {
    const fromHeart = heartUser !== "CENTER" ? heartUser : toKanagiPhase(routeHints[rr]);
    selfPhase = fromHeart !== "CENTER" ? fromHeart : toKanagiPhase(routeHints[rr] ?? defaultPhase);
  } else {
    selfPhase = toKanagiPhase(routeHints[rr] ?? defaultPhase);
  }
  if (!VALID_PHASES.includes(selfPhase)) selfPhase = "CENTER";

  const judgementAxis = Array.isArray(principles) ? [...principles] : [];

  // stabilityScore / driftRisk: heart.entropy と route class で再計算
  let driftRisk: number;
  if (isLlmTop) driftRisk = 0.5 + heartEntropyNum * 0.3;
  else if (isCanonical) driftRisk = 0.05 + heartEntropyNum * 0.1;
  else driftRisk = 0.2 + heartEntropyNum * 0.3;
  driftRisk = Math.max(0, Math.min(1, driftRisk));
  const stabilityScore = 1 - driftRisk;

  const shouldPersist =
    isCanonical ||
    rr.includes("N2_KANAGI") ||
    rr === "NATURAL_GENERAL_LLM_TOP" ||
    rr.includes("FASTPATH");

  const isDefOrScripture =
    rr.includes("DEF_") || rr.includes("SCRIPTURE") || rr.includes("SUBCONCEPT");
  const shouldRecombine = isSupportGeneral && !isDefOrScripture;

  const centerHint =
    intention?.kanagiCenterHint ??
    (responseHints.CENTER && responseHints.CENTER[0]) ??
    undefined;

  // 観測キー: heartSourcePhase, heartTargetPhase, heartEntropy, alignment
  const heartSourcePhase: KanagiPhase = heartPhase;
  const heartTargetPhase: KanagiPhase = heartArk;
  const heartEntropy: number = heartEntropyNum;
  const alignment =
    selfPhase === intentPhase ? "aligned" : driftRisk >= 0.5 ? "drift" : "neutral";

  return {
    selfPhase,
    intentPhase,
    judgementAxis,
    stabilityScore,
    driftRisk,
    shouldPersist,
    shouldRecombine,
    centerHint,
    heartSourcePhase,
    heartTargetPhase,
    heartEntropy,
    alignment,
  };
}

/** R8_KANAGI_SELF_BIND_KU_V1 / R8_HEART_KANAGI_UNIFY_V1: 失敗時用の安全な戻り値。CENTER 系。shape は SelfKernelOutput に揃える。 */
export function getSafeKanagiSelfOutput(): SelfKernelOutput {
  return {
    selfPhase: "CENTER",
    intentPhase: "CENTER",
    judgementAxis: [],
    stabilityScore: 0.5,
    driftRisk: 0.5,
    shouldPersist: false,
    shouldRecombine: false,
    heartSourcePhase: "CENTER",
    heartTargetPhase: "CENTER",
    heartEntropy: 0.25,
    alignment: "neutral",
  };
}
