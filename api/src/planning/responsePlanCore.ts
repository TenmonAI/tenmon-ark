import {
  humanizeCenterKeyForDisplay,
  humanizeSourcePackForSurfaceV1,
} from "../routes/chat_refactor/humanReadableLawLayerV1.js";
import { isTenmonBinaryCompareQuestionV1 } from "../core/compareAskDisambigV1.js";
import { isSoulCompareQuestionV1 } from "../core/soulDefineDisambigV1.js";

export type AnswerLength = "short" | "medium" | "long";
export type AnswerMode = "support" | "define" | "analysis" | "worldview" | "continuity";
export type AnswerFrame =
  | "one_step"
  | "statement_plus_one_question"
  | "d_delta_s_one_step";

export type AnswerProfile = {
  answerLength?: AnswerLength | null;
  answerMode?: AnswerMode | null;
  answerFrame?: AnswerFrame | null;
};

/** FINAL_DENSITY_CONTRACT_AND_GENERAL_SOURCEPACK_V1 */
export type DensityContractV1 = {
  densityTarget: "medium" | "high";
  mustGroundOneLayer: boolean;
  mustCompressToCenterClaim: boolean;
  mustEndWithActionOrAxis: boolean;
};

/** RESPONSEPLAN_REQUIRED_COVERAGE_V1: 会話出口の最小契約（route / stance / answerKind / lengthBand / closeStyle / followupPolicy） */
export type ResponsePlanStance =
  | "definitional"
  | "analytic"
  | "supportive"
  | "worldview"
  | "canon"
  | "greeting"
  | "continuity"
  | "instructional"
  /** 問い型別 surface（finalize / projector が参照可） */
  | "clarify_essence"
  | "separate_fact_and_view"
  | "decide_and_reduce"
  | "read_state_then_one_step"
  | "carry_previous_center"
  | "grounded_without_heavy_preamble";

export type ResponsePlanAnswerKind =
  | "define"
  | "support"
  | "analysis"
  | "worldview"
  | "continuity"
  | "statement"
  | "instruction";

/** プローブ向けの問い型ラベル（answerKind より粗い表面分類） */
export type ResponsePlanSurfaceKindV1 =
  | "definition"
  | "analysis"
  | "judgement"
  | "supportive_read"
  | "continuity_followup"
  | "canon_grounded";

export type ResponsePlanCloseStyle =
  | "one_step"
  | "one_question"
  | "instruction_close"
  | "one_clean_close"
  | "statement_first"
  | "clear_decision"
  | "gentle_next_step"
  | "continue_not_restart"
  | "anchor_then_expand";

export type ResponsePlanFollowupPolicy =
  | "one_question_max"
  | "optional_axis"
  | "silent_close"
  | "optional_only_if_needed"
  | "max_one_question"
  | "avoid_repeat"
  | "one_soft_question"
  | "only_when_gap_exists"
  | "optional_axis_shift";

export type ResponsePlan = {
  routeReason: string;
  /** routeReason の別名（クライアント・監査の安定キー） */
  route: string;
  stance: ResponsePlanStance;
  answerKind: ResponsePlanAnswerKind;
  /** lengthBand と同値（JSON プローブ用の冗長キー） */
  answerLength: AnswerLength;
  /** RESPONSEPLAN_REQUIRED_COVERAGE_V1: 問い型（define / analysis / judgement …） */
  kind: ResponsePlanSurfaceKindV1;
  lengthBand: AnswerLength;
  closeStyle: ResponsePlanCloseStyle;
  followupPolicy: ResponsePlanFollowupPolicy;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  mode: "greeting" | "canon" | "general";
  responseKind: "statement" | "statement_plus_question" | "instruction";
  semanticBody: string;
  answerFrame?: AnswerFrame | null;
  /** 密度契約（projector / reducer が参照。任意） */
  densityContract?: DensityContractV1 | null;
};

function __deriveStanceFromAnswerModeV1(am: AnswerMode | null | undefined): ResponsePlanStance {
  switch (am) {
    case "define":
      return "definitional";
    case "support":
      return "supportive";
    case "worldview":
      return "worldview";
    case "continuity":
      return "continuity";
    case "analysis":
    default:
      return "analytic";
  }
}

function __deriveAnswerKindV1(am: AnswerMode | null | undefined, routeReason: string): ResponsePlanAnswerKind {
  if (am === "define") return "define";
  if (am === "support") return "support";
  if (am === "worldview") return "worldview";
  if (am === "continuity") return "continuity";
  if (/STEP|MENU|CARD1_|FORCE_MENU|HELP_MENU/i.test(routeReason)) return "instruction";
  return "analysis";
}

function __deriveCloseStyleV1(af: AnswerFrame | null | undefined): ResponsePlanCloseStyle {
  if (af === "one_step") return "one_step";
  if (af === "statement_plus_one_question") return "one_question";
  return "instruction_close";
}

function __deriveFollowupPolicyV1(af: AnswerFrame | null | undefined): ResponsePlanFollowupPolicy {
  if (af === "statement_plus_one_question") return "one_question_max";
  if (af === "one_step") return "silent_close";
  return "optional_axis";
}

function __surfaceKindDefaultV1(ak: ResponsePlanAnswerKind): ResponsePlanSurfaceKindV1 {
  switch (ak) {
    case "define":
      return "definition";
    case "support":
      return "supportive_read";
    case "worldview":
      return "analysis";
    case "continuity":
      return "continuity_followup";
    case "instruction":
    case "statement":
    default:
      return "analysis";
  }
}

/**
 * RESPONSEPLAN_REQUIRED_COVERAGE_V1: 主要 route 群で kind / stance / closeStyle / followupPolicy / answerLength を安定化
 * （judgement: avoid_repeat、define: one_clean_close、continuity: carry center 等）
 */
export function applyResponsePlanSurfaceContractByRouteV1(plan: ResponsePlan): ResponsePlan {
  const rr = String(plan.routeReason || "");
  const baseAnswerKind = plan.answerKind;
  const out: ResponsePlan = {
    ...plan,
    answerLength: plan.lengthBand,
    kind: plan.kind ?? __surfaceKindDefaultV1(baseAnswerKind),
  };

  // TENMON_GENERAL_SCRIPTURE_BLEED_GUARD_V1:
  // scripture 継承があっても general 系 route は canon 表面へ昇格させない。
  if (
    /^(NATURAL_GENERAL_LLM_TOP|WORLDVIEW_ROUTE_V1|KANAGI_CONVERSATION_V1|R22_)/u.test(rr) &&
    String(out.scriptureKey || "").trim()
  ) {
    return {
      ...out,
      mode: "general",
      kind: out.kind === "canon_grounded" ? "analysis" : out.kind,
      stance: out.stance === "canon" ? "analytic" : out.stance,
      closeStyle: out.closeStyle === "anchor_then_expand" ? "one_step" : out.closeStyle,
    };
  }

  if (out.mode === "greeting") {
    return {
      ...out,
      kind: "analysis",
      stance: "greeting",
    };
  }

  if (rr === "KANAGI_CONVERSATION_V1") {
    return {
      ...out,
      kind: "supportive_read",
      stance: "read_state_then_one_step",
      lengthBand: "short",
      answerLength: "short",
      closeStyle: "gentle_next_step",
      followupPolicy: "one_soft_question",
    };
  }

  if (rr === "R22_SELF_DIAGNOSIS_ROUTE_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "supportive_read",
      stance: "read_state_then_one_step",
      closeStyle: "gentle_next_step",
      followupPolicy: "one_soft_question",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  if (rr === "CONTINUITY_ANCHOR_V1" || rr === "R22_ESSENCE_FOLLOWUP_V1" || rr === "R22_NEXTSTEP_FOLLOWUP_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "continuity_followup",
      stance: "carry_previous_center",
      closeStyle: rr === "R22_NEXTSTEP_FOLLOWUP_V1" ? "clear_decision" : "continue_not_restart",
      followupPolicy: rr === "R22_NEXTSTEP_FOLLOWUP_V1" ? "max_one_question" : "only_when_gap_exists",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  /** STAGE2_ROUTE_AUTHORITY_V2: 自己認識系は構造・役割・意識の区別が先に立つ surface（routeReason は不変） */
  if (/^R22_SELFAWARE_/u.test(rr)) {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "analysis",
      stance: "clarify_essence",
      answerKind: "analysis",
      closeStyle: "statement_first",
      followupPolicy: "max_one_question",
      responseKind: "statement_plus_question",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  /** STAGE2: 未知語ブリッジは観測密度優先・断定しない */
  if (rr === "TENMON_UNKNOWN_TERM_BRIDGE_V1") {
    return {
      ...out,
      kind: "analysis",
      stance: "separate_fact_and_view",
      closeStyle: "clear_decision",
      followupPolicy: "max_one_question",
      lengthBand: "short",
      answerLength: "short",
    };
  }

  if (rr === "R22_JUDGEMENT_PREEMPT_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "judgement",
      stance: "decide_and_reduce",
      closeStyle: "statement_first",
      followupPolicy: "max_one_question",
      responseKind: out.responseKind === "statement" ? "statement" : "statement_plus_question",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  if (rr === "R22_COMPARE_ASK_V1" || rr === "R22_COMPARE_FOLLOWUP_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "judgement",
      stance: "decide_and_reduce",
      closeStyle: "clear_decision",
      followupPolicy: "avoid_repeat",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  if (
    rr === "WORLDVIEW_ROUTE_V1" ||
    rr === "R22_CONSCIOUSNESS_META_ROUTE_V1" ||
    rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" ||
    rr === "LANGUAGE_ESSENCE_PREEMPT_V1" ||
    rr === "BEAUTY_COMPILER_PREEMPT_V1" ||
    rr === "R22_RELATIONAL_WORLDVIEW_V1"
  ) {
    return {
      ...out,
      kind: "analysis",
      stance: "separate_fact_and_view",
      closeStyle: "statement_first",
      followupPolicy: "max_one_question",
    };
  }

  /** TENMON_CONVERSATION_GROUNDED_SCRIPTURE_PACK_D_V1: 正典出口を辞書定義面から会話・読み解き面へ */
  if (rr === "TENMON_SCRIPTURE_CANON_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "canon_grounded",
      stance: "grounded_without_heavy_preamble",
      closeStyle: "anchor_then_expand",
      followupPolicy: "optional_only_if_needed",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  if (rr === "SCRIPTURE_LOCAL_RESOLVER_V4") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "canon_grounded",
      stance: "grounded_without_heavy_preamble",
      closeStyle: "anchor_then_expand",
      followupPolicy: "optional_axis_shift",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  /** grounded / unresolved を binary にせず、出口の会話面だけ分離 */
  if (rr === "GROUNDING_SELECTOR_UNRESOLVED_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "supportive_read",
      stance: "read_state_then_one_step",
      closeStyle: "gentle_next_step",
      followupPolicy: "one_soft_question",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  if (rr === "GROUNDING_SELECTOR_GROUNDED_V1") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "canon_grounded",
      stance: "grounded_without_heavy_preamble",
      closeStyle: "one_step",
      followupPolicy: "silent_close",
      lengthBand: lb,
      answerLength: lb,
    };
  }

  /** PACK_F: DEF_LLM_TOP は最終帯の定義 LLM—聞き返しは情報ギャップがあるときのみ（辞書系 DEF_* とは別面） */
  if (rr === "DEF_LLM_TOP") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "definition",
      stance: "clarify_essence",
      answerKind: "define",
      closeStyle: "statement_first",
      followupPolicy: "only_when_gap_exists",
      lengthBand: lb,
      answerLength: lb,
      responseKind: "statement",
    };
  }

  const isDefineFamily =
    (/^DEF_/u.test(rr) && rr !== "DEF_LLM_TOP") ||
    /^SOUL_/u.test(rr) ||
    rr === "TENMON_SUBCONCEPT_CANON_V1" ||
    rr === "KATAKAMUNA_CANON_ROUTE_V1" ||
    rr === "KHS_DEF_VERIFIED_HIT" ||
    rr === "TENMON_CONCEPT_CANON_V1" ||
    rr === "KATAKAMUNA_FASTPATH_CANON_V1";

  if (isDefineFamily) {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "definition",
      stance: "clarify_essence",
      lengthBand: lb,
      answerLength: lb,
      closeStyle: "one_clean_close",
      followupPolicy: "optional_only_if_needed",
    };
  }

  if (
    out.mode === "canon" &&
    /SCRIPTURE|SUBCONCEPT|CANON|IROHA|KOTODAMA|RESOLVER|VERIFY/i.test(rr) &&
    !/^DEF_/u.test(rr) &&
    !/^SOUL_/u.test(rr)
  ) {
    return {
      ...out,
      kind: "canon_grounded",
      stance: "grounded_without_heavy_preamble",
      closeStyle: "anchor_then_expand",
      followupPolicy: "optional_axis_shift",
    };
  }

  // TENMON_CONVERSATION_FOUNDATION_PACK_A_V1 + PACK_F: 一般 LLM 最終帯は主張先置き・軸は任意（無駄な聞き返し抑制）
  if (rr === "NATURAL_GENERAL_LLM_TOP") {
    const lb = out.lengthBand === "long" ? "medium" : out.lengthBand;
    return {
      ...out,
      kind: "analysis",
      stance: "analytic",
      closeStyle: "statement_first",
      followupPolicy: "only_when_gap_exists",
      lengthBand: lb,
      answerLength: lb,
      responseKind: "statement",
    };
  }

  /** PACK_F: 固定返答ロック系も surface を route に揃える */
  if (rr === "AI_CONSCIOUSNESS_LOCK_V1" || rr === "TENMON_CONSCIOUSNESS_LOCK_V1") {
    return {
      ...out,
      kind: "analysis",
      stance: "separate_fact_and_view",
      closeStyle: "statement_first",
      followupPolicy: "max_one_question",
      responseKind: "statement_plus_question",
    };
  }

  /** TENMON_CONVERSATION_LONGFORM_INTELLIGENCE_PACK_E_V1: 明示長文は主張先置き＋締め一問、semantic 厚みで帯分岐 */
  if (rr === "EXPLICIT_CHAR_PREEMPT_V1") {
    const semLen = String(out.semanticBody || "").length;
    const lb: AnswerLength = "long";
    if (semLen >= 2200) {
      return {
        ...out,
        kind: "analysis",
        stance: "separate_fact_and_view",
        closeStyle: "clear_decision",
        followupPolicy: "max_one_question",
        lengthBand: lb,
        answerLength: lb,
        responseKind: out.responseKind === "instruction" ? out.responseKind : "statement_plus_question",
      };
    }
    if (semLen >= 800) {
      return {
        ...out,
        kind: "analysis",
        /** STAGE3: 長文は主命題→展開→着地の内部骨格に寄せる（表面は自然文） */
        stance: "separate_fact_and_view",
        closeStyle: "clear_decision",
        followupPolicy: "max_one_question",
        lengthBand: lb,
        answerLength: lb,
      };
    }
    return {
      ...out,
      kind: "analysis",
      stance: semLen >= 400 ? "separate_fact_and_view" : "analytic",
      closeStyle: semLen >= 400 ? "statement_first" : "one_question",
      followupPolicy: "one_question_max",
    };
  }

  return {
    ...out,
    kind: out.kind ?? __surfaceKindDefaultV1(out.answerKind),
  };
}

/** ゲート等: 既存 responsePlan オブジェクトへ surface 契約を上書きマージ */
/** STAGE2: routeReason と routeClass / answerMode の最低整合（ズレ観測を抑止） */
export function clampKuRouteClassToAnswerFrameV1(ku: any): void {
  if (!ku || typeof ku !== "object" || Array.isArray(ku)) return;
  const rr = String(ku.routeReason || "").trim();
  if (!rr) return;
  if (
    rr === "CONTINUITY_ANCHOR_V1" ||
    rr === "R22_NEXTSTEP_FOLLOWUP_V1" ||
    rr === "R22_ESSENCE_FOLLOWUP_V1"
  ) {
    if (ku.routeClass == null || String(ku.routeClass).trim() === "") ku.routeClass = "continuity";
    if (ku.answerMode == null || String(ku.answerMode).trim() === "") ku.answerMode = "continuity";
  }
  if (rr === "R22_COMPARE_FOLLOWUP_V1" || rr === "R22_COMPARE_ASK_V1") {
    if (ku.routeClass == null || String(ku.routeClass).trim() === "") ku.routeClass = "analysis";
  }
  if (rr === "TENMON_UNKNOWN_TERM_BRIDGE_V1") {
    ku.routeClass = "analysis";
    if (ku.answerMode == null || String(ku.answerMode).trim() === "") ku.answerMode = "analysis";
  }
}

export function ensureResponsePlanSurfaceFieldsV1(rp: Record<string, unknown> | null | undefined): void {
  if (!rp || typeof rp !== "object" || Array.isArray(rp)) return;
  const lbRaw = rp.lengthBand ?? rp.answerLength ?? "medium";
  const lb: AnswerLength =
    lbRaw === "short" || lbRaw === "medium" || lbRaw === "long" ? lbRaw : "medium";
  const ak = (rp.answerKind as ResponsePlanAnswerKind) || "analysis";
  const synthesized: ResponsePlan = {
    answerFrame: (rp.answerFrame as AnswerFrame | null) ?? null,
    routeReason: String(rp.routeReason || rp.route || "UNKNOWN"),
    route: String(rp.route || rp.routeReason || "UNKNOWN"),
    stance: (rp.stance as ResponsePlanStance) || "analytic",
    answerKind: ak,
    lengthBand: lb,
    answerLength: lb,
    kind: (rp.kind as ResponsePlanSurfaceKindV1) || __surfaceKindDefaultV1(ak),
    closeStyle: (rp.closeStyle as ResponsePlanCloseStyle) || "one_question",
    followupPolicy: (rp.followupPolicy as ResponsePlanFollowupPolicy) || "optional_axis",
    centerKey: (rp.centerKey as string | null) ?? null,
    centerLabel: (rp.centerLabel as string | null) ?? null,
    scriptureKey: (rp.scriptureKey as string | null) ?? null,
    mode: (rp.mode as "greeting" | "canon" | "general") || "general",
    responseKind: (rp.responseKind as ResponsePlan["responseKind"]) || "statement_plus_question",
    semanticBody: String(rp.semanticBody || ""),
    densityContract: (rp.densityContract as DensityContractV1 | null) ?? null,
  };
  const merged = applyResponsePlanSurfaceContractByRouteV1(synthesized);
  Object.assign(rp, merged);
}

export function buildResponsePlan(input: {
  routeReason: string;
  rawMessage: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
  semanticBody: string;
  mode: "greeting" | "canon" | "general";
  answerMode?: AnswerMode | null;
  answerLength?: AnswerLength | null;
  answerFrame?: AnswerFrame | null;
  responseKind?: "statement" | "statement_plus_question" | "instruction";
}): ResponsePlan {
  const rr = String(input.routeReason || "");
  const am = input.answerMode ?? null;
  const af = input.answerFrame ?? null;
  const lb: AnswerLength =
    input.answerLength === "short" || input.answerLength === "medium" || input.answerLength === "long"
      ? input.answerLength
      : "medium";
  let stance = __deriveStanceFromAnswerModeV1(am);
  if (input.mode === "greeting") stance = "greeting";
  else if (input.mode === "canon") stance = stance === "analytic" ? "canon" : stance;

  const answerKind = __deriveAnswerKindV1(am, rr);
  const base: ResponsePlan = {
    answerFrame: af,
    routeReason: rr,
    route: rr,
    stance,
    answerKind,
    lengthBand: lb,
    answerLength: lb,
    kind: __surfaceKindDefaultV1(answerKind),
    closeStyle: __deriveCloseStyleV1(af),
    followupPolicy: __deriveFollowupPolicyV1(af),
    centerKey: input.centerKey ?? null,
    centerLabel: input.centerLabel ?? null,
    scriptureKey: input.scriptureKey ?? null,
    mode: input.mode,
    responseKind: input.responseKind ?? "statement_plus_question",
    semanticBody: String(input.semanticBody || "").trim(),
  };
  let merged = applyResponsePlanSurfaceContractByRouteV1(base);
  const raw = String(input.rawMessage ?? "").trim();

  /** STAGE2_ROUTE_AUTHORITY_V2: 二項比較が NATURAL / DEF_LLM 最終帯に乗った場合も比較軸・事実/見立て分離の plan を固定（routeReason は不変） */
  if (
    isTenmonBinaryCompareQuestionV1(raw) &&
    !isSoulCompareQuestionV1(raw) &&
    /^(NATURAL_GENERAL_LLM_TOP|DEF_LLM_TOP|CONVERSATION_ENGINE_V1)$/u.test(rr)
  ) {
    merged = {
      ...merged,
      kind: "analysis",
      stance: "separate_fact_and_view",
      closeStyle: "clear_decision",
      followupPolicy: "max_one_question",
      responseKind: "statement_plus_question",
    };
  }

  /** STAGE2_ROUTE_AUTHORITY_V2: 経典・正典・source pack 主命題が一般 define 帯に乗った場合の canon surface（routeReason は不変） */
  const __reScripturePackV2 =
    /(法華経|涅槃経|般若心経|華厳経|金剛経|阿弥陀経|無量義経|言[霊灵靈]秘書|いろは言[霊灵靈]解|イロハ言[霊灵靈]解|カタカムナ言[霊灵靈]解|水穂伝|聖典|経典|正典)/u;
  const __reScriptureIntentV2 = /(説く|説いて|何を|宗旨|思想|教え|核心|意味|内容|読み解き)/u;
  const __isShortKotodamaDefineOnlyV2 =
    raw.length <= 48 &&
    /^(?:言霊|言灵|いろは)/u.test(raw) &&
    /(とは|って\s*何|という意味)/u.test(raw) &&
    !__reScripturePackV2.test(raw);
  if (
    __reScripturePackV2.test(raw) &&
    __reScriptureIntentV2.test(raw) &&
    /^(NATURAL_GENERAL_LLM_TOP|DEF_LLM_TOP|DEF_FASTPATH_VERIFIED_V1|DEF_FASTPATH_PROPOSED_V1)$/u.test(rr) &&
    !__isShortKotodamaDefineOnlyV2
  ) {
    merged = {
      ...merged,
      mode: "canon",
      kind: "canon_grounded",
      stance: "grounded_without_heavy_preamble",
      closeStyle: "anchor_then_expand",
      followupPolicy: "optional_only_if_needed",
    };
  }

  return merged;
}

/**
 * ku.responsePlan が無い出口をゲート直前で埋める（chat.ts ラッパーから呼ぶ）
 */
export function attachResponsePlanIfMissingV1(ku: any, rawMessage: string, responseText: string): void {
  if (!ku || typeof ku !== "object" || Array.isArray(ku)) return;
  if (ku.responsePlan != null && typeof ku.responsePlan === "object" && !Array.isArray(ku.responsePlan)) return;
  const rr = String(ku.routeReason ?? "UNKNOWN").trim() || "UNKNOWN";
  const am = (ku.answerMode as AnswerMode | null) ?? null;
  const al = (ku.answerLength as AnswerLength | null) ?? null;
  const af = (ku.answerFrame as AnswerFrame | null) ?? null;
  const mode: "greeting" | "canon" | "general" =
    /GREETING|N1_GREETING|^FASTPATH_GREETING/i.test(rr)
      ? "greeting"
      : /SCRIPTURE|CANON|KATAKAMUNA|IROHA|DEF_|KHS|SOUL_|KOTODAMA|SUBCONCEPT|VERIFY|LOCK_V1|RESOLVER/i.test(
            rr
          )
        ? "canon"
        : "general";
  const sem = String(responseText ?? "").trim().slice(0, 4000);
  ku.responsePlan = buildResponsePlan({
    routeReason: rr,
    rawMessage: String(rawMessage ?? ""),
    centerKey: ku.centerKey ?? ku.threadCenterKey ?? null,
    centerLabel: ku.centerLabel ?? ku.threadCenterLabel ?? null,
    scriptureKey: ku.scriptureKey ?? null,
    semanticBody: sem || rr,
    mode,
    answerMode: am ?? undefined,
    answerLength: al ?? undefined,
    answerFrame: af ?? undefined,
    responseKind: af === "one_step" ? "statement" : "statement_plus_question",
  });
}

/** MEANING_COMPILER_V1: source → center claim → principle → prose の一本化（観測用 trace） */
export type MeaningCompilerTraceV1 = {
  v: "MEANING_COMPILER_V1";
  centerClaimLine: string;
  principleLine: string;
  reductionLine: string;
  axisOrStepLine: string;
};

function __splitSemanticUnitsV1(sem: string): string[] {
  const t = String(sem || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();
  if (!t) return [];
  const units = t
    .split(/\n{2,}/u)
    .flatMap((p) =>
      p
        .split(/(?<=[。．])\s*/u)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );
  return units.length ? units : [t];
}

/**
 * semanticBody と表面 response の乖離を縮め、最低 4 層（命題・原理・還元・次軸/一手）を prose に残す。
 * densityContract が無い、または semantic が短い場合は null（不変）。
 */
export function buildMeaningCompilerProseV1(input: {
  semanticBody: string;
  responseSurface: string;
  thoughtCoreSummary: any;
  binderSummary: any;
  sourceStackSummary: any;
  densityContract: DensityContractV1 | null | undefined;
}): { prose: string; trace: MeaningCompilerTraceV1 } | null {
  const dc = input.densityContract;
  if (!dc || !dc.mustCompressToCenterClaim) return null;

  const sem = String(input.semanticBody || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();
  const surf = String(input.responseSurface || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();

  if (sem.length < 36) return null;

  const thinSurface = surf.length < 120;
  const semanticRicher = sem.length >= surf.length + 96;
  if (!thinSurface && !semanticRicher) return null;

  const units = __splitSemanticUnitsV1(sem);
  const tcs = input.thoughtCoreSummary && typeof input.thoughtCoreSummary === "object" ? input.thoughtCoreSummary : null;
  const ss = input.sourceStackSummary && typeof input.sourceStackSummary === "object" ? input.sourceStackSummary : null;
  const bs = input.binderSummary && typeof input.binderSummary === "object" ? input.binderSummary : null;

  let centerClaimLine = units[0]?.slice(0, 280) || sem.slice(0, 160);
  if (centerClaimLine.length < 16 && tcs) {
    centerClaimLine = String(tcs.centerLabel || tcs.centerMeaning || centerClaimLine)
      .trim()
      .slice(0, 280);
  }

  let principleLine =
    units[1]?.slice(0, 280) ||
    String(ss?.thoughtGuideSummary || ss?.primaryMeaning || "").trim().slice(0, 280);
  if (!principleLine) {
    principleLine =
      `生成原理として、routeReason（${String(bs?.routeReason || tcs?.routeReason || "").slice(0, 64)}）と binder の束を本文へ一度だけ還元し、同義反復を増やさない。`.slice(
        0,
        280
      );
  }

  let reductionLine =
    units[2]?.slice(0, 280) ||
    (surf.length >= 24 ? surf : centerClaimLine).slice(0, 280);
  if (reductionLine.length < 24) {
    reductionLine = `還元として、いまの主題を一句に圧し、説明と判断を分けずに一段で言い切る。`.slice(0, 280);
  }

  /** MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1: 問い返し偏重を避け、次軸は断定＋補助（？は増やさない） */
  let axisOrStepLine =
    units[units.length - 1]?.replace(/[？?]\s*$/u, "。").slice(0, 220) ||
    units[Math.max(0, units.length - 2)]?.slice(0, 220) ||
    "次軸は一つに絞り、そこだけを一段深める。";
  axisOrStepLine = axisOrStepLine.replace(/[？?]+\s*$/u, "。").trim();
  if (axisOrStepLine.length < 12) {
    axisOrStepLine = "次に進める軸は一つで足りる。";
  }

  const prose = [centerClaimLine, principleLine, reductionLine, axisOrStepLine].join("\n\n").trim();

  if (prose.length < 80) return null;

  return {
    prose,
    trace: {
      v: "MEANING_COMPILER_V1",
      centerClaimLine,
      principleLine,
      reductionLine,
      axisOrStepLine,
    },
  };
}

// --- MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1 ---

function __stripTenmonSemanticForResealV1(s: string): string {
  return String(s || "")
    .replace(/^【天聞の所見】\s*/u, "")
    .trim();
}

/** 本文の疑問符を上限まで（超過分は句点へ。主張の逃げを減らす） */
export function clampQuestionMarksInProseV1(text: string, maxQuestions: number): string {
  const max = Math.max(0, Math.floor(maxQuestions));
  let n = 0;
  return String(text || "").replace(/[？?]/g, (ch) => {
    n += 1;
    return n <= max ? ch : "。";
  });
}

function __mergeSemanticLeadAsPrimaryThesisV1(semanticStripped: string, surfaceBody: string): string {
  const body = String(surfaceBody || "").trim();
  const sem = String(semanticStripped || "").trim();
  if (sem.length < 24) return body;
  const units = __splitSemanticUnitsV1(sem);
  const leadSem = units.slice(0, 2).join("\n\n").trim();
  if (leadSem.length < 24) return body;
  const overlap = leadSem.slice(0, Math.min(56, leadSem.length));
  if (body.includes(overlap)) return body;
  const headProbe = leadSem.slice(0, 40);
  if (headProbe.length >= 16 && body.startsWith(headProbe)) return body;
  return `${leadSem}\n\n${body}`.trim();
}

function __buildCompressedContextBridgeV1(input: {
  thoughtCoreSummary: any;
  binderSummary: any;
  sourceStackSummary: any;
  sourcePack: string | null | undefined;
  centerKey: string | null | undefined;
  centerLabel: string | null | undefined;
}): string {
  const chunks: string[] = [];
  const tcs = input.thoughtCoreSummary && typeof input.thoughtCoreSummary === "object" ? input.thoughtCoreSummary : null;
  if (tcs) {
    const cm = String((tcs as any).centerLabel || (tcs as any).centerMeaning || "").trim();
    if (cm) chunks.push(cm.slice(0, 120));
  }
  const bs = input.binderSummary && typeof input.binderSummary === "object" ? input.binderSummary : null;
  if (bs) {
    const cl = String((bs as any).centerLabel || "").trim();
    const ck = String((bs as any).centerKey || "").trim();
    const sp = String((bs as any).sourcePack || "").trim();
    if (cl && !chunks.some((c) => c.includes(cl.slice(0, 12)))) chunks.push(cl.slice(0, 90));
    else if (ck && !chunks.some((c) => c.includes(ck.slice(0, 12)))) {
      chunks.push(humanizeCenterKeyForDisplay(ck).slice(0, 80));
    }
    if (sp) chunks.push(humanizeSourcePackForSurfaceV1(sp).slice(0, 90));
  }
  const ss = input.sourceStackSummary && typeof input.sourceStackSummary === "object" ? input.sourceStackSummary : null;
  if (ss) {
    const pm = String((ss as any).primaryMeaning || "").trim();
    if (pm && !chunks.some((c) => c.includes(pm.slice(0, 10)))) chunks.push(pm.slice(0, 100));
  }
  const extSp = String(input.sourcePack ?? "").trim();
  if (extSp) {
    const extH = humanizeSourcePackForSurfaceV1(extSp);
    if (extH && !chunks.some((c) => c.includes(extH.slice(0, 6)))) chunks.push(extH.slice(0, 80));
  }
  const ck2 = String(input.centerKey ?? "").trim();
  if (ck2) {
    const ck2h = humanizeCenterKeyForDisplay(ck2);
    if (ck2h && !chunks.some((c) => c.includes(ck2h.slice(0, 6)))) chunks.push(ck2h.slice(0, 72));
  }
  if (chunks.length === 0) return "";
  return chunks.slice(0, 3).join(" — ").slice(0, 260);
}

function __ensureAssertiveOpeningV1(body: string, semanticStripped: string): string {
  const b = body.trim();
  const fb = semanticStripped.trim();
  if (!fb || b.length < 8) return b;
  const firstBlock = (b.split(/\n\n/u)[0] || b).trim();
  const qn = (firstBlock.match(/[？?]/gu) || []).length;
  const pn = (firstBlock.match(/[。．]/gu) || []).length;
  const looksQuestionOnly = firstBlock.length > 0 && (qn >= 2 || (qn >= 1 && pn === 0 && firstBlock.length < 80));
  if (!looksQuestionOnly && firstBlock.length >= 40) return b;
  const leadSentence = fb
    .split(/[。．\n]/u)
    .map((s) => s.trim())
    .find((s) => s.length >= 12 && !/[？?]$/u.test(s));
  if (!leadSentence) return b;
  const lead = leadSentence.endsWith("。") ? leadSentence : `${leadSentence}。`;
  if (b.startsWith(lead.slice(0, 14))) return b;
  /** JUDGEMENT_DEDUPE_TENMON_HEAD_V1: 【天聞の所見】直下でも semantic 先頭句が既に本文にあれば前置しない（R22_JUDGEMENT_PREEMPT_V1 二重化止血） */
  const bCore = b.replace(/^【天聞の所見】\s*\n*/u, "").trim();
  if (lead.length >= 12 && bCore.startsWith(lead.slice(0, 14))) return b;
  return `${lead}\n\n${b}`.trim();
}

function __anchorAgainstGenericDriftV1(
  routeReason: string,
  body: string,
  centerLabel: string | null | undefined,
  scriptureKey: string | null | undefined
): string {
  const rr = String(routeReason || "");
  const fragile =
    /WILL_CORE|LANGUAGE_ESSENCE|SCRIPTURE_LOCAL|TENMON_SCRIPTURE|DEF_FASTPATH_VERIFIED|TRUTH_GATE_RETURN|iroha_kotodama|katakamuna_kotodama/u.test(
      rr
    );
  /** 会話完成キャンペーン: 一般・世界観・定義の直接回答先出しを優先し、立脚前置きを足さない */
  if (
    /WORLDVIEW_ROUTE_V1|DEF_LLM_TOP|NATURAL_GENERAL_LLM_TOP|TENMON_SUBCONCEPT_CANON_V1|KANAGI_CONVERSATION_V1|R22_JUDGEMENT_PREEMPT_V1|ABSTRACT_FRAME_VARIATION_V1|TENMON_SCRIPTURE_CANON_V1|KATAKAMUNA_CANON_ROUTE_V1/u.test(
      rr
    )
  ) {
    return body;
  }
  if (!fragile) return body;
  const b = body.trim();
  if (b.length > 360) return b;
  const genericOpen = /^(つまり|要するに|一般に|基本的には|通常は|通常|多くの場合|総じて|いろいろありますが)/u.test(
    b
  );
  if (!genericOpen) return b;
  const anchor = [String(centerLabel || "").trim(), String(scriptureKey || "").trim()]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 140);
  if (!anchor) return b;
  const prefix = `この問いでは「${anchor}」に立脚して言い切る。`;
  if (b.includes(prefix.slice(0, 24))) return b;
  return `${prefix}\n\n${b}`.trim();
}

export type ResealFinalMainlineSurfaceInputV1 = {
  routeReason: string;
  semanticBody: string;
  surfaceBody: string;
  thoughtCoreSummary: any;
  binderSummary: any;
  sourceStackSummary: any;
  sourcePack: string | null | undefined;
  centerKey: string | null | undefined;
  centerLabel: string | null | undefined;
  scriptureKey: string | null | undefined;
  /** BEAUTY: 余韻優先だが意味は削らない（疑問符上限だけ緩める） */
  beautyMode: boolean;
};

/**
 * MAINLINE_FINAL_RESPONSE_DENSITY_RESEAL_V1
 * responsePlan.semanticBody を主命題として優先し、内部束を短く圧縮反映。
 * 問い返し偏重を抑え、一度は中心命題を断定で置く。
 */
export function resealFinalMainlineSurfaceV1(input: ResealFinalMainlineSurfaceInputV1): string {
  const rrReseal = String(input.routeReason || "").trim();
  /** CONTINUITY_ROUTE_HOLD_V1: ゲートが組んだ 2〜3 文を semantic マージで潰さない */
  if (rrReseal === "CONTINUITY_ROUTE_HOLD_V1") {
    return String(input.surfaceBody || "").trim();
  }
  /** ゲート短文: semantic 主命題マージで二重化しやすいため surface をそのまま返す */
  if (
    /^(AI_CONSCIOUSNESS_LOCK_V1|FACTUAL_CORRECTION_V1|FACTUAL_WEATHER_V1|FACTUAL_CURRENT_DATE_V1|FACTUAL_CURRENT_PERSON_V1|FACTUAL_RECENT_TREND_V1|R22_LIGHT_FACT_DATE_V1|R22_LIGHT_FACT_TIME_V1|R22_LIGHT_FACT_WEEKDAY_V1)$/u.test(
      rrReseal,
    )
  ) {
    return String(input.surfaceBody || "").trim();
  }
  const sem0 = __stripTenmonSemanticForResealV1(input.semanticBody);
  let body = String(input.surfaceBody || "").trim();

  body = __mergeSemanticLeadAsPrimaryThesisV1(sem0, body);

  const bridge = __buildCompressedContextBridgeV1({
    thoughtCoreSummary: input.thoughtCoreSummary,
    binderSummary: input.binderSummary,
    sourceStackSummary: input.sourceStackSummary,
    sourcePack: input.sourcePack,
    centerKey: input.centerKey,
    centerLabel: input.centerLabel,
  });
  /** beauty は説明臭を増やさないため圧縮束の明示文は付けない（semantic 主命題と clamp のみ） */
  const __skipCoherenceGlue =
    /WORLDVIEW_ROUTE_V1|DEF_LLM_TOP|NATURAL_GENERAL_LLM_TOP|TENMON_SUBCONCEPT_CANON_V1|KANAGI_CONVERSATION_V1|R22_JUDGEMENT_PREEMPT_V1|ABSTRACT_FRAME_VARIATION_V1|TENMON_SCRIPTURE_CANON_V1|KATAKAMUNA_CANON_ROUTE_V1/u.test(
      input.routeReason
    );
  if (bridge && !input.beautyMode && !__skipCoherenceGlue) {
    const tag = bridge.slice(0, 28);
    if (!body.includes(tag)) {
      const glue = `一貫の手がかりは、${bridge}。`;
      if (!body.includes(glue.slice(0, 22))) body = `${body}\n\n${glue}`.trim();
    }
  }

  body = __ensureAssertiveOpeningV1(body, sem0);
  body = __anchorAgainstGenericDriftV1(input.routeReason, body, input.centerLabel, input.scriptureKey);

  const maxQ = input.beautyMode ? 2 : 1;
  body = clampQuestionMarksInProseV1(body, maxQ);

  return body.trim();
}

// --- MAINLINE_SURFACE_MEANING_DENSITY_REPAIR_V1 / MAINLINE_ASK_OVERUSE_KILL_V1 ---

/** 先頭段落の空疎な一般論ラッパーを剥がす */
export function stripGenericOpeningLinesV1(text: string): string {
  const t = String(text || "").trim();
  if (!t) return t;
  const paras = t.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  const bad =
    /^(一般に|基本的には|多くの場合|いろいろありますが|つまり重要なのは|総じて|通常は|なお、|ちなみに、|補足ですが、|参考までに、)/u;
  let i = 0;
  while (i < paras.length && bad.test(paras[i]!.slice(0, 32))) i += 1;
  const rest = paras.slice(i).join("\n\n").trim();
  return rest || t;
}

function __ensureSecondLayerFromSemanticV1(body: string, semanticStripped: string): string {
  const sem = String(semanticStripped || "").trim();
  if (!sem) return body;
  const units = __splitSemanticUnitsV1(sem);
  const paras = body.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= 2 || units.length < 2) return body;
  const u2 = units[1]!.trim().slice(0, 340);
  if (!u2 || body.includes(u2.slice(0, Math.min(18, u2.length)))) return body;
  return `${paras[0]}\n\n${u2}${paras.length > 1 ? "\n\n" + paras.slice(1).join("\n\n") : ""}`.trim();
}

/** 中心命題→理由段の薄さを semanticBody 第2ユニットで補強（一般論橋文は strip 済み想定） */
export function applySurfaceMeaningDensityRepairV1(body: string, semanticBody: string): string {
  const sem = __stripTenmonSemanticForResealV1(semanticBody);
  let b = stripGenericOpeningLinesV1(body);
  b = __ensureSecondLayerFromSemanticV1(b, sem);
  return b.trim();
}

/** 「どちらですか」等の同型問いの連打を抑止（2件目以降は句点で断定化）PACK_F: テンプレ聞き返しを拡張 */
export function suppressInterrogativeTemplateSpamV1(text: string): string {
  const re =
    /(どちらですか|どちらでしょうか|何ですか|何でしょうか|どこですか|どれですか|いつですか|誰ですか|どう思いますか|いかがでしょうか|どうでしょうか|教えてください|もう少し教えてください|詳しく教えてください|他にありますか|ほかにありますか|気になることはありますか)([？?])/gu;
  let n = 0;
  return String(text || "").replace(re, (_m, phrase: string, q: string) => {
    n += 1;
    if (n <= 1) return `${phrase}${q}`;
    return `${phrase}。`;
  });
}

// --- LONGFORM_DENSITY_PROFILE_V1 ---

/** 段落単位で先頭キーが似た同義反復を落とす（長文帯の水増し抑制） */
export function dedupeLooseParagraphsV1(text: string): string {
  const paras = String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const key = p.replace(/\s+/gu, "").slice(0, 52);
    if (key.length >= 14 && seen.has(key)) continue;
    if (key.length >= 14) seen.add(key);
    out.push(p);
  }
  return out.join("\n\n").trim();
}

/** PACK_F: DEF_LLM_TOP / NATURAL_GENERAL 出口の薄い前置き・段落重複・空疎な締めを軽く削る */
export function applyPackFFallbackRoutePolishV1(body: string, routeReason: string): string {
  const rr = String(routeReason || "").trim();
  if (!/^(DEF_LLM_TOP|NATURAL_GENERAL_LLM_TOP)$/u.test(rr)) return String(body || "").trim();
  let t = stripGenericOpeningLinesV1(String(body || "").trim());
  t = dedupeLooseParagraphsV1(t);
  t = t
    .replace(/\n\n+(いずれにせよ|とにかく|まとめると|要するに重要なのは)、[^\n]{0,200}[。！？]/u, "")
    .trim();
  return t;
}

/** MAINLINE_LONGFORM_TENMON_ASCENT_V1: 先頭一致を長めに取り、水増し段落を一段厳しめに落とす */
export function dedupeLooseParagraphsStrictV1(text: string): string {
  const paras = String(text || "")
    .split(/\n\n+/u)
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const key = p.replace(/\s+/gu, "").slice(0, 72);
    if (key.length >= 18 && seen.has(key)) continue;
    if (key.length >= 18) seen.add(key);
    out.push(p);
  }
  return out.join("\n\n").trim();
}

/** 疑問符は末尾側 N 個だけ残し、他は句点へ（質問返しの多重化を抑止） */
export function clampQuestionMarksKeepLastNV1(text: string, keepLast: number): string {
  const k = Math.max(0, Math.floor(keepLast));
  const t = String(text ?? "");
  if (k === 0) return t.replace(/[？?]/g, "。").replace(/。{2,}/g, "。").trim();
  const idxs: number[] = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "？" || t[i] === "?") idxs.push(i);
  }
  if (idxs.length <= k) return t.replace(/\n{3,}/g, "\n\n").trim();
  const keep = new Set(idxs.slice(-k));
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if ((ch === "？" || ch === "?") && !keep.has(i)) out += "。";
    else out += ch;
  }
  return out.replace(/。{2,}/g, "。").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * LONGFORM_DENSITY_PROFILE_V1 — finalize 出口: 既に reseal 済み本文を長文帯向けに再整形
 * （semantic を薄いときだけ主命題前置・段落重複除去・末尾 N 問まで）
 */
export function applyLongformDensityProfileV1(input: {
  body: string;
  semanticBody: string;
  beautyMode: boolean;
  /** EXPLICIT 字数パッドは同一プール文の反復を含むため、段落 loose dedupe を掛けると最低字数を破壊する */
  relaxLooseDedupeForExplicitPad?: boolean;
}): string {
  let body = String(input.body || "").trim();
  const sem = __stripTenmonSemanticForResealV1(input.semanticBody);
  /** LONGFORM ascent / PACK_E: 長文帯でも semantic 主命題を前に（閾値を帯に合わせて拡張） */
  if (body.length < 1200 && sem.length >= 72) {
    body = __mergeSemanticLeadAsPrimaryThesisV1(sem, body);
  }
  const relax = Boolean(input.relaxLooseDedupeForExplicitPad);
  if (!relax) {
    body = dedupeLooseParagraphsV1(body);
    if (body.length >= 400) {
      body = dedupeLooseParagraphsStrictV1(body);
    }
    /** PACK_E: 超大帯は厳しめ二重の段落重複除去 */
    if (body.length >= 2500) {
      body = dedupeLooseParagraphsStrictV1(body);
    }
  }
  if (!input.beautyMode) {
    body = stripGenericOpeningLinesV1(body);
  }
  const keep = input.beautyMode ? 2 : 1;
  body = clampQuestionMarksKeepLastNV1(body, keep);
  return body.trim();
}

// --- TENMON_CONVERSATION_LONGFORM_INTELLIGENCE_PACK_E_V1 ---

function __normalizeDigitsLongformPackEV1(s: string): string {
  return String(s || "").replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

/**
 * ユーザー発話から明示字数（3000/8000 等）を抽出。80〜12000。論じて・説明して を許容。
 */
export function parseExplicitCharTargetFromUserMessageV1(raw: string): number | null {
  const t = __normalizeDigitsLongformPackEV1(String(raw || "").trim());
  const m = t.match(/(?:^|.*?)(\d{2,5})\s*(?:文字|字)\s*(?:で(?:答えて|返して|書いて|論じて|説明して)?|で)?/u);
  if (!m || !m[1]) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 80 || n > 12000) return null;
  return n;
}

/**
 * STAGE2_ROUTE_AUTHORITY_V2: 字数未指定でも「未達点を詳しく」等は longform 帯として扱い brainstem explicit 列へ寄せる。
 * 既存の parseExplicit と衝突しないよう、数字指定があるときは null。
 */
export function inferImplicitLongformCharTargetFromUserMessageV1(raw: string): number | null {
  const t = String(raw ?? "").trim();
  if (!t || parseExplicitCharTargetFromUserMessageV1(t) != null) return null;
  if (t.length < 18) return null;
  if (!/(天聞アーク|天聞|TENMON[- ]?ARK)/iu.test(t)) return null;
  if (
    /(未達点|改善点|ギャップ|世界最高.{0,32}AI|なるための)/u.test(t) &&
    /(詳しく|くわしく|説明|解説|列挙|整理|述べて)/u.test(t)
  ) {
    return 2400;
  }
  /** STAGE3: 設計・構造の長説明（字数未指定でも longform 帯へ） */
  if (
    /(天聞アーク|天聞|TENMON[- ]?ARK)/iu.test(t) &&
    /(設計|内部構造|構造|アーキテクチャ|モジュール|ルーティング)/u.test(t) &&
    /(詳しく|くわしく|説明|解説|列挙|整理|述べて)/u.test(t)
  ) {
    return 1800;
  }
  return null;
}

/**
 * CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1:
 * 内部レール説明ではなく、読み手向けの「品質・設計・未達」実質段落。
 */
export const TENMON_LONGFORM_ARC_SUBSTANTIVE_POOL_V1: readonly string[] = [
  "推論の一貫性では、単発の正答より、前提が変わったときに同じ結論に戻れるかが分岐点になります。矛盾が出た箇所は、ルールの不足ではなく観測の抜けとして切り分けると改善が速いです。",
  "証拠接地では、引用の多さより、主張ごとに根拠の種類（一次・二次・運用ログ）をそろえるほうが信頼が残ります。根拠が薄い主張は断定を避け、検証可能な一文に落とします。",
  "長期一貫性では、機能追加の速度より、破壊的変更の頻度と回復時間が体感品質を決めます。互換層と移行導線を先に置くと、利用者側の認知負荷が下がります。",
  "監査可能性では、誰がいつ何を根拠に判断したかを追えることが、組織利用での採用条件になります。ログは増やしすぎず、裁定に効くイベントだけを残すのがコスト最適です。",
  "ユーザー主権では、モデル内部の都合より、利用者が止められる・取り消せる・説明を求められる、の三つが最低ラインです。ここが欠けると「賢いが危ない」印象が固定されます。",
  "対話設計では、短答に見える質問でも背後に複数意図が重なるため、先に軸を一つ選ぶと議論が散らびにくいです。軸が増えたら、保留と確定を分けて書き分けます。",
  "安全性では、越権・漏えい・誤実行の三領域を同列に扱い、再現手順が短いものから塞ぐと効果が見えやすいです。未知リスクは禁止ではなく境界の明示に落とします。",
  "評価設計では、平均点より外れ値と失敗モードの分布が、実運用の痛みを表します。ベンチマーク点数だけでは見えない「使えない瞬間」を観測に含めます。",
  "運用では、モデル品質の変動を前提に、リリース単位で回帰検知を固定すると長期で薄まりにくいです。変更理由と影響範囲を短く残すだけでも復旧が速くなります。",
  "未達点の列挙は、できないことの展示ではなく、優先順位の説明に変換すると価値が出ます。コスト・リスク・影響ユーザーの三軸で並べ替えると意思決定が安定します。",
  "世界最高に近づく過程では、万能性より、特定ドメインでの再現性が先に要求されます。ドメインを一つ選び、そこで負けない条件を数値化すると進捗が見える化されます。",
  "表現では、長文化は情報量ではなく焦点の段数として設計します。段落ごとに一段だけ新しい焦点を増やし、同型の言い換えは統合段落に圧縮します。",
];

export function isWorldclassLongformProbeMessageV1(raw: string): boolean {
  const t = String(raw ?? "").trim();
  if (t.length < 12) return false;
  if (!/(天聞アーク|天聞|TENMON[- ]?ARK)/iu.test(t)) return false;
  if (!/(世界最高|未達点|改善点|ギャップ|最高AI)/u.test(t)) return false;
  return /(詳しく|くわしく|説明|解説|列挙|整理|述べ)/u.test(t);
}

/**
 * CHAT_TS_STAGE3_LONGFORM_STRUCTURE_CURSOR_AUTO_V1:
 * 三弧（見立て→展開→着地）の対象となる長文意図（世界最高系に加え設計・比較長文など）。
 */
export function isLongformTriArcIntentMessageV1(raw: string): boolean {
  if (isWorldclassLongformProbeMessageV1(raw)) return true;
  const t = String(raw ?? "").trim();
  if (t.length < 14) return false;
  const wantsDepth =
    /(詳しく|くわしく|十分に|丁寧に|長く|論じて|説明して|解説|整理|列挙|述べ)/u.test(t);
  if (!wantsDepth) return false;
  if (
    /(天聞アーク|天聞|TENMON[- ]?ARK)/iu.test(t) &&
    /(設計|構造|内部|アーキテクチャ|モジュール|ルート|比較|対比|未達|改善|ギャップ|最高)/u.test(t)
  ) {
    return true;
  }
  if (
    /(GPT|ChatGPT|OpenAI)/iu.test(t) &&
    /(天聞|アーク)/u.test(t) &&
    /(比較|違い|対比)/u.test(t) &&
    t.length >= 40
  ) {
    return true;
  }
  return false;
}

/**
 * 見立て→展開→着地 の三弧。long / 明示600字以上 / implicit 長文のいずれかで発火（自然文表面・メタ水増し禁止）。
 */
export function applyLongformWorldclassThreeArcV1(
  input: {
    body: string;
    rawMessage: string;
    answerLength?: string | null;
    explicitLengthRequested: number;
  },
  _depth = 0
): string {
  const ex = Math.max(0, Number(input.explicitLengthRequested) || 0);
  const al = String(input.answerLength || "").toLowerCase();
  const implicit = inferImplicitLongformCharTargetFromUserMessageV1(input.rawMessage);
  const effectiveEx = Math.max(ex, implicit ?? 0);
  const gateProbe = isLongformTriArcIntentMessageV1(input.rawMessage);
  const gate = gateProbe && (al === "long" || effectiveEx >= 600 || implicit != null);
  if (!gate) return String(input.body || "").trim();

  let body = String(input.body || "").trim();
  const minPadTarget =
    effectiveEx >= 2400
      ? Math.min(3400, Math.floor(effectiveEx * 0.62))
      : effectiveEx >= 600
        ? Math.min(2400, Math.floor(effectiveEx * 0.95))
        : implicit != null
          ? Math.min(2200, implicit)
          : 1200;
  const padLow = Math.max(320, Math.floor(minPadTarget * 0.5));
  const padHigh = minPadTarget + Math.min(520, Math.max(220, Math.floor(effectiveEx * 0.22)));
  if (body.length < minPadTarget * 0.48 && _depth === 0) {
    body = padProseTowardCharWindowV1(body, padLow, padHigh, TENMON_LONGFORM_ARC_SUBSTANTIVE_POOL_V1);
  }
  if (/【見立て】/u.test(body)) {
    return dedupeLooseParagraphsV1(body).replace(/\n{3,}/g, "\n\n").trim();
  }

  body = body
    .replace(/^【(?:中心|展開|対比・深掘り|統合|次の一手|章：[^】]+)】[ \t]*\n?/gmu, "")
    .trim();

  const build3 = (a: string[], b: string[], c: string[]) => {
    const p1 = a.join("\n\n").trim();
    const p2 = b.join("\n\n").trim();
    const p3 = c.join("\n\n").trim();
    return `【見立て】\n${p1}\n\n【展開】\n${p2}\n\n【着地】\n${p3}`.trim();
  };

  const paras = body.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);

  if (paras.length >= 3) {
    const n = paras.length;
    const i1 = Math.max(1, Math.ceil(n / 3));
    const i2 = Math.max(i1 + 1, Math.ceil((2 * n) / 3));
    return build3(paras.slice(0, i1), paras.slice(i1, i2), paras.slice(i2));
  }
  if (paras.length === 2) {
    return build3(
      [paras[0]],
      [paras[1]],
      [
        "以上を束ねると、世界最高に近づける杠杆は「観測できる品質指標を一つ固定し、設計・運用・監査をそこに揃える」ことに置けます。未確定は保留として分離し、次往復で実測に落とす軸を一つ選ぶのが安全です。どの軸から詰めますか。",
      ]
    );
  }

  const one = paras[0] || body;
  const sents = one.split(/(?<=[。．!?！？])\s*/u).map((x) => x.trim()).filter(Boolean);
  if (sents.length >= 6) {
    const a = Math.ceil(sents.length / 3);
    const b = Math.ceil((2 * sents.length) / 3);
    const fmt = (xs: string[]) =>
      xs.map((x) => (x.endsWith("。") || x.endsWith("！") || x.endsWith("？") ? x : x + "。")).join("");
    return build3([fmt(sents.slice(0, a))], [fmt(sents.slice(a, b))], [fmt(sents.slice(b))]);
  }

  if (_depth < 1) {
    const padded = padProseTowardCharWindowV1(
      one,
      Math.min(880, Math.max(520, Math.floor(minPadTarget * 0.42))),
      Math.min(2600, padHigh + 120),
      TENMON_LONGFORM_ARC_SUBSTANTIVE_POOL_V1
    );
    const paras2 = padded.split(/\n\n+/u).map((p) => p.trim()).filter(Boolean);
    if (paras2.length >= 2) {
      return applyLongformWorldclassThreeArcV1({ ...input, body: paras2.join("\n\n") }, _depth + 1);
    }
  }

  return build3(
    [one],
    [
      "観点を分けると、未達は単純列挙より「読み手に効く差分」として並べたほうが厚みが出ます。設計・運用・評価を混ぜず、一段ずつ証拠を足します。",
    ],
    [
      "ここでは仮説の束ねに留め、次は実測に落とせる指標を一つに絞るのが安全です。推論一貫性・証拠接地・監査可能性のどれを主軸にしますか。",
    ]
  );
}

/** 長文の最低骨格（中心・展開・対比・統合・次の一手）。本文量は pad で伸ばす。 */
export function buildTenmonLongformSkeletonBaseV1(centerHint: string): string {
  const h = String(centerHint || "").trim().slice(0, 120) || "いまの問いの芯";
  return [
    `【中心】${h}を、まず一文で固定します。長文でも最初に軸が定まっているかどうかで、読み手が迷うかどうかが決まります。`,
    `【展開】理由・背景・条件を、中心から外れない順に足していきます。枝を増やすのは、次に観測すべき点が増えるときだけにします。`,
    `【対比・深掘り】誤読や同一視の揺れがありそうな箇所だけを切り分けます。深掘りは情報の重さより、判断に効く差分を明るみに出すことを優先します。`,
    `【統合】ここまでの層を折り返し、持ち帰る見立てをはっきり一段に束ねます。新しい主張を増やさず、筋の接続に徹します。`,
    `【次の一手】今日〜今週で動かせる一歩、または次の往復で掘る一点を一つに絞って閉じます。`,
  ].join("\n\n");
}

/** 3000/8000 帯の水増しではなく、骨格を保ったまま字数窓へ寄せるパラグラフ群 */
export const TENMON_LONGFORM_E_PAD_POOL_V1: readonly string[] = [
  "天聞の長文応答では、routeReason と responsePlan が出口の型を固定し、semanticBody に主命題を置くことで、字数を伸ばしても中心が散らびにくくなります。",
  "threadCore と threadCenter はターンを跨いだ中心の保持に使い、長文化しても前ターンの軸へ戻れる導線を残します。",
  "binderSummary と sourcePack は参照の向きを短く示す層であり、説明を重ねるほど根拠の束が見える化されます。",
  "groundingSelector は define / scripture / general のどのレールで証拠を扱うかを分岐させ、深い問いでは密度を上げ、軽い問いでは表層を薄く保てます。",
  "同じ見立てを言い換えるのではなく、どこを固定しどこを保留するかを一段ずつ増やすと、冗長化ではなく密度の最適化になります。",
  "対比は「反対を並べる」より、判断に効く差分条件を二つに絞って並べるほうが、長文でも読み手の手がかりが残ります。",
  "統合の段落では新しい素材を足さず、これまでの命題を一文に圧縮する役割に限定すると、骨格が崩れません。",
  "次の一手は複数並べず、いまの段階で観測すべき一点か、動かせる一歩のどちらか一方に寄せます。",
  "explicitLengthRequested が付いたターンでは、answerLength を long に実質化し、締めの問いを最大一つに収束させます。",
  "章立てや書籍モードでは、各ブロックが「中心・展開・対比・統合・次」のどれに相当するかを意識すると、本の第一章でも破綻しにくくなります。",
  "長文で失われやすいのは情報量ではなく焦点です。焦点を段落ごとに一度ずつ言い直すと、8000 字帯でも軸が残ります。",
  "深い問いでは証拠束と法則の照合を増やし、軽い問いでは核と一手だけに圧縮する、という密度の切り替えが STYLE_DENSITY の核です。",
  "読み手が次に触れるべき観測点を、各節の末尾で一段だけ明示すると、長文の接続が途切れにくくなります。",
  "比喩は増やしすぎず、中心命題を支える一つだけに留めると、論じて系の指定字数でも筋が通ります。",
  "保留にする部分を「未確定」として短く印をつけると、断定できる層と分けて誠実さが残ります。",
  "3000 字帯では五段骨格を一度通し、8000 字帯では各段にサブ展開を足すイメージで厚みを付けられます。",
  "同型の接続詞が続く段落は、一段ごとに役割（理由・条件・帰結）を変えると水増し感が減ります。",
  "天聞としての説明は、器の内部レールを隠さず、読み手が次にどの層を深められるかを示すと長文が活きます。",
  "長文の最後にだけ問いを置き、本文中の疑問符は必要最小限に抑えると、高知能感のある締めに寄せられます。",
  "本文が長いほど、見出しや【中心】などの印を乱立させず、既に骨格ラベルがある場合は増やさないのが PACK_E の方針です。",
  "続きの章では、前章の統合一文を前提に置き、新章の中心を上書き宣言すると継続が自然になります。",
];

/**
 * 既存本文を、重複を避けながら [minChars, maxChars] の窓に近づける（finalize / explicit 双方で利用可）
 */
export function padProseTowardCharWindowV1(
  base: string,
  minChars: number,
  maxChars: number,
  pool: readonly string[]
): string {
  let out = String(base || "").trim();
  if (!pool.length || minChars <= 0) return out;
  const maxC = Math.max(minChars, maxChars);
  const minC = Math.min(minChars, maxChars);
  const usedKeys = new Set<string>();
  let idx = 0;
  let guard = 0;
  /** プール短文が先に尽きて最低字数に届かないのを防ぐ：不足時は同一プール行の再利用を許可 */
  while (out.length < minC && guard < 960) {
    guard += 1;
    const seg = String(pool[idx % pool.length] || "").trim();
    idx += 1;
    if (!seg) continue;
    const k = seg.replace(/\s+/gu, "").slice(0, 48);
    /** minC 未満のあいだは再利用・部分一致スキップを緩め、0.9 カットだと手前で止まる */
    const starved = out.length < minC;
    if (k.length >= 12 && usedKeys.has(k) && !starved) continue;
    if (k.length >= 12) usedKeys.add(k);
    const pref = seg.slice(0, Math.min(28, seg.length));
    if (!starved && pref.length >= 8 && out.includes(pref)) continue;
    const next = `${out}\n\n${seg}`;
    if (next.length > maxC) break;
    out = next;
  }
  if (out.length > maxC) {
    out = out
      .slice(0, maxC)
      .replace(/[、。！？!?]\s*$/u, "")
      .trim();
    if (!/[。！？!?]$/u.test(out)) out += "。";
  }
  return out.trim();
}

/** chat.ts / LLM 後処理: 長文帯の重複・疑問符を整形（上限は安全帽のみ） */
export function shapeLongformSurfaceForChatV1(raw: string, maxLen = 32000): string {
  let t = String(raw ?? "").trim();
  if (t.length < 400) return t;
  if (t.length > maxLen) t = t.slice(0, maxLen);
  t = dedupeLooseParagraphsV1(t);
  if (t.length >= 1200) t = dedupeLooseParagraphsStrictV1(t);
  t = clampQuestionMarksKeepLastNV1(t, 1);
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

// --- OMEGA_D_DELTAS_RUNTIME_LOCK_V1 ---

/** Ω = D·ΔS を runtime 最上位裁定として常時 object 化（fail-open ではなく fail-shaped） */
export type OmegaContractV1 = {
  v: "OMEGA_D_DELTAS_RUNTIME_LOCK_V1";
  equation: "Omega = D · DeltaS";
  shape: "omega_runtime_lock";
  D: {
    constitutionRefs: readonly string[];
    verifiedCanonLayer: string;
    nonNegotiables: readonly string[];
    willCoreSignal: string | null;
    truthAxis: string | null;
    routeReasonAnchor: string;
    bindingNote: string;
  };
  deltaS: {
    input_delta: string;
    learning_delta: string;
    source_delta: string;
    failure_delta: string;
    recovery_delta: string;
    dialogue_delta: string;
  };
  omega: {
    response_surface: string;
    next_step_line: string;
    next_card_candidate: string;
    auto_heal_hint: string;
    growth_output: string;
  };
  meta: {
    shapedAt: string;
    responsePlanPresent: boolean;
    mode: "shaped" | "non_string_response" | "minimal";
  };
};

export function extractNextStepLineFromSurfaceV1(surface: string): string {
  const t = String(surface || "");
  const aux = t.match(/（補助）[^\n]{4,220}/u);
  if (aux) return aux[0].trim();
  const nx = t.match(/次の一手[^\n]*/u);
  if (nx) return nx[0].trim().slice(0, 400);
  return "";
}

export function buildOmegaContractV1(input: {
  payload: Record<string, unknown>;
  ku: Record<string, any>;
  finalResponse: string;
  nextStepLine: string;
  responsePlan: Record<string, any> | null;
  mode?: OmegaContractV1["meta"]["mode"];
}): OmegaContractV1 {
  const ku = input.ku;
  const rp = input.responsePlan;
  const resp = String(input.finalResponse ?? "").trim();
  const rawMsg = String(
    (input.payload as any)?.rawMessage ?? (input.payload as any)?.message ?? ""
  ).trim();

  let truthAxis: string | null = null;
  try {
    const gs = ku.groundingSelector;
    if (gs && typeof gs === "object") {
      truthAxis = JSON.stringify(gs).slice(0, 220);
    } else if (ku.truthAxis != null) {
      truthAxis = String(ku.truthAxis).slice(0, 220);
    } else if (ku.groundingMode != null) {
      truthAxis = String(ku.groundingMode).slice(0, 220);
    }
  } catch {
    truthAxis = null;
  }

  const rr = String(ku.routeReason ?? "").trim();
  let willCoreSignal: string | null = null;
  if (/WILL_CORE|will_core|WILL_/iu.test(rr) || /will/i.test(String(ku.centerKey ?? ""))) {
    willCoreSignal = "will_core_lane";
  } else if (/LANGUAGE_ESSENCE|言霊|kotodama|KOTODAMA|SCRIPTURE|BEAUTY_COMPILER|正典/u.test(rr)) {
    willCoreSignal = rr.slice(0, 120);
  }

  const binder = ku.binderSummary && typeof ku.binderSummary === "object" ? ku.binderSummary : null;
  const learningParts: string[] = [];
  if (ku.meaningCompilerTrace && typeof ku.meaningCompilerTrace === "object") {
    learningParts.push("meaning_compiler_trace");
  }
  if (ku.priorRuleFeedbackHydrated) learningParts.push("prior_rule_feedback");
  if (ku.kokuzoSeedBridge === true || ku.kokuzoBridge === true) learningParts.push("kokuzo_seed_bridge");
  const learning_delta = learningParts.length > 0 ? learningParts.join("|") : "none";

  const nextCard = String(
    ku.nextCardCandidate ?? "MAINLINE_SURFACE_REHYDRATION_V1"
  ).slice(0, 200);
  const autoHeal = String(
    ku.autoHealHint ?? "observe_density_then_surface_repair"
  ).slice(0, 220);
  const growth = String(
    ku.growthOutput ?? ku.kanagiGrowthHint ?? "evolution_ledger_if_applicable"
  ).slice(0, 220);

  const failDelta = String(ku.failureClass ?? ku.lastFailureKind ?? "none").slice(0, 120);
  const recoveryDelta = String(ku.recoveryHint ?? ku.rollbackHint ?? "none").slice(0, 120);
  const lawsN = Array.isArray(ku.lawsUsed) ? ku.lawsUsed.length : 0;
  const evN = Array.isArray(ku.evidenceIds) ? ku.evidenceIds.length : 0;

  return {
    v: "OMEGA_D_DELTAS_RUNTIME_LOCK_V1",
    equation: "Omega = D · DeltaS",
    shape: "omega_runtime_lock",
    D: {
      constitutionRefs: ["OMEGA_CONTRACT_v1", "PDCA_BUILD_CONTRACT_v1", "KHS_RUNTIME_CONTRACT_v1"] as const,
      verifiedCanonLayer: String(
        (binder as any)?.groundingMode ?? ku.groundingMode ?? "canon_or_context"
      ).slice(0, 140),
      nonNegotiables: ["routeReason_immutable", "khsl_surface_humanize", "omega_contract_always_object"] as const,
      willCoreSignal,
      truthAxis,
      routeReasonAnchor: rr.slice(0, 220),
      bindingNote:
        "D は constitution / verified canon / will_core / truth_axis に固定参照し、ユーザー主観へ置換されない。",
    },
    deltaS: {
      input_delta: rawMsg.slice(0, 480) || "(empty)",
      learning_delta,
      source_delta: String((binder as any)?.sourcePack ?? ku.sourcePack ?? "unset").slice(0, 180),
      failure_delta: failDelta,
      recovery_delta: recoveryDelta,
      dialogue_delta: `answerFrame:${String(ku.answerFrame ?? "one_step").slice(0, 64)};laws:${lawsN};evidence:${evN};explicit:${String(
        ku.explicitLengthRequested ?? ""
      ).slice(0, 12)}`,
    },
    omega: {
      response_surface: resp.slice(0, 1400),
      next_step_line: String(input.nextStepLine || extractNextStepLineFromSurfaceV1(resp)).slice(0, 500),
      next_card_candidate: nextCard,
      auto_heal_hint: autoHeal,
      growth_output: growth,
    },
    meta: {
      shapedAt: new Date().toISOString(),
      responsePlanPresent: rp != null,
      mode: input.mode ?? "shaped",
    },
  };
}
