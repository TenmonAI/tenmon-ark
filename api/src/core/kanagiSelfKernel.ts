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

/** R8_CONCEPT_CANON_BIND_SELF_V1: concept canon 軸（任意・後方互換） */
export type ConceptClass =
  | "katakamuna"
  | "kotodama"
  | "soul"
  | "general"
  | "water_fire_law"
  | "kotodama_hisho"
  | "subconcept";

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
  /** R8_CONCEPT_CANON_BIND_SELF_V1: 任意。meaningFrame 等から渡す */
  topicClass?: string;
  conceptKey?: string;
  scriptureKey?: string;
  /** R8_SCRIPTURE_CANON_BIND_SELF_V1: 任意。TENMON_SCRIPTURE_CANON_V1 時に gates から渡す */
  scriptureMode?: string;
  scriptureAlignment?: string;
  scriptureQuery?: string;
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
  /** R8_CONCEPT_CANON_BIND_SELF_V1: 観測用 */
  topicClass?: string;
  conceptMode?: string;
  conceptAlignment?: string;
  /** R8_SCRIPTURE_CANON_BIND_SELF_V1: 観測用。非 scripture route では設定しない */
  scriptureKey?: string;
  scriptureMode?: string;
  scriptureAlignment?: string;
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
function resolveTopicClass(input: {
  topicClass?: string;
  routeReason?: string;
  rawMessage?: string;
}): string {
  const tc = String(input.topicClass ?? "").trim();
  if (tc && /^(katakamuna|kotodama|soul|general|water_fire_law|kotodama_hisho|subconcept)$/.test(tc))
    return tc;
  const rr = String(input.routeReason ?? "");
  const raw = String(input.rawMessage ?? "");
  if (/KATAKAMUNA|カタカムナ/.test(rr) || /カタカムナ/.test(raw)) return "katakamuna";
  if (
    rr.includes("DEF_FASTPATH") ||
    rr.includes("KOTODAMA") ||
    /言霊/.test(raw)
  )
    return "kotodama";
  if (rr.includes("SOUL_")) return "soul";
  if (rr === "TENMON_SUBCONCEPT_CANON_V1" || /ウタヒ|五十音|ア・ヒ/.test(raw)) return "subconcept";
  if (rr === "TENMON_SCRIPTURE_CANON_V1") return "kotodama_hisho";
  return "general";
}

export function computeKanagiSelfKernel(input: SelfKernelInput): SelfKernelOutput {
  const {
    routeReason = "",
    heart,
    intention,
    topicClass: inputTopicClass,
    conceptKey,
    scriptureKey: inputScriptureKey,
    scriptureMode: inputScriptureMode,
    scriptureAlignment: inputScriptureAlignment,
    scriptureQuery: _scriptureQuery,
  } = input;
  const routeHints = resolveRoutePhaseHints();
  const defaultPhase = resolveDefaultIntentPhase() || "CENTER";
  const principles = resolveSelectionPrinciples();
  const responseHints = resolveResponseIntentHints();

  const rr = String(routeReason);
  const isScriptureRoute = rr === "TENMON_SCRIPTURE_CANON_V1";
  const scriptureKey =
    isScriptureRoute && inputScriptureKey && String(inputScriptureKey).trim()
      ? String(inputScriptureKey).trim()
      : undefined;

  const topicClass = resolveTopicClass({
    topicClass: inputTopicClass,
    routeReason: rr,
    rawMessage: input.rawMessage,
  });
  const isConceptCanon =
    topicClass === "katakamuna" ||
    topicClass === "kotodama" ||
    topicClass === "soul" ||
    topicClass === "subconcept" ||
    topicClass === "kotodama_hisho" ||
    topicClass === "water_fire_law";

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

  // judgementAxis: selection_principles + concept 軸 + scripture 軸（非 scripture では concept のみ維持）
  const judgementAxis = Array.isArray(principles) ? [...principles] : [];
  if (isConceptCanon) {
    const conceptLine =
      topicClass === "katakamuna"
        ? "カタカムナ概念軸: 楢崎・宇野・空海・天聞再統合の観測核に沿う。"
        : topicClass === "kotodama" || topicClass === "kotodama_hisho"
          ? "言霊概念軸: 正典・核概念の整合に沿う。"
          : topicClass === "soul"
            ? "魂概念軸: 魂の定義と正典の接続に沿う。"
            : topicClass === "subconcept"
              ? "下位概念軸: ア・ヒ・ウタヒ・五十音一言法則に沿う。"
              : "";
    if (conceptLine && !judgementAxis.includes(conceptLine)) judgementAxis.push(conceptLine);
  }
  // R8_SCRIPTURE_CANON_BIND_SELF_V1: scripture 軸の一文（3種を区別）。非 scripture では追加しない。
  if (isScriptureRoute && scriptureKey) {
    const scriptureLine =
      scriptureKey === "kotodama_hisho"
        ? "正典軸: 言霊秘書・五十音一言法則に沿う。"
        : scriptureKey === "iroha_kotodama_kai"
          ? "正典軸: イロハ言霊解・いろは口伝に沿う。"
          : scriptureKey === "katakamuna_kotodama_kai"
            ? "正典軸: カタカムナ言霊解・稲荷の言霊で読み解くに沿う。"
            : "正典軸: 聖典の意図に沿う。";
    if (!judgementAxis.includes(scriptureLine)) judgementAxis.push(scriptureLine);
  }

  // stabilityScore / driftRisk: heart.entropy と route class と concept 軸で再計算
  let driftRisk: number;
  if (isLlmTop) driftRisk = 0.5 + heartEntropyNum * 0.3;
  else if (isCanonical) driftRisk = 0.05 + heartEntropyNum * 0.1;
  else if (isConceptCanon) driftRisk = 0.08 + heartEntropyNum * 0.12;
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

  // R8_CONCEPT_CANON_BIND_SELF_V1: 観測キー topicClass, conceptMode, conceptAlignment
  const conceptMode = isConceptCanon ? "canon" : "general";
  const conceptAlignment =
    isConceptCanon && (isCanonical || isSupportGeneral)
      ? "canon_aligned"
      : isConceptCanon
        ? "canon"
        : "general";

  // R8_SCRIPTURE_CANON_BIND_SELF_V1: 非 scripture route では設定しない
  const outScriptureKey = scriptureKey;
  const outScriptureMode =
    scriptureKey != null ? (inputScriptureMode && String(inputScriptureMode).trim()) || "canon" : undefined;
  const outScriptureAlignment =
    scriptureKey != null
      ? (inputScriptureAlignment && String(inputScriptureAlignment).trim()) || "scripture_aligned"
      : undefined;

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
    topicClass,
    conceptMode,
    conceptAlignment,
    ...(outScriptureKey != null && {
      scriptureKey: outScriptureKey,
      scriptureMode: outScriptureMode,
      scriptureAlignment: outScriptureAlignment,
    }),
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
    topicClass: "general",
    conceptMode: "general",
    conceptAlignment: "general",
  };
}
