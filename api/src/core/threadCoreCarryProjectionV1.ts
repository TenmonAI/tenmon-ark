/**
 * THREADCORE_REQUIRED_COVERAGE_V1: 出口 JSON 用の threadCore 投影（永続層は threadCoreStore の既存 shape のみ）
 * ku.threadCore に centerKey / carry フィールドを載せ、continuity / support / judgement 等の観測・クライアント契約を安定させる。
 */

import type { ThreadCore, ThreadCoreCarryModeV1, ThreadCoreTurnKindV1 } from "./threadCore.js";
import { resolveThreadCenterRecoveryV1 } from "./threadCenterRecoveryV1.js";

export type { ThreadCoreTurnKindV1, ThreadCoreCarryModeV1 } from "./threadCore.js";

function __preview(s: string, max: number): string {
  const t = String(s ?? "").replace(/\s+/gu, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + "…";
}

function __previousAnchorFromCore(tc: ThreadCore): string | null {
  const lbl = tc.centerLabel != null && String(tc.centerLabel).trim() ? String(tc.centerLabel).trim() : null;
  const ck = tc.centerKey != null && String(tc.centerKey).trim() ? String(tc.centerKey).trim() : null;
  if (lbl && ck) return `${lbl}（${ck}）`;
  if (lbl) return lbl;
  if (ck) return ck;
  const dc = tc.dialogueContract;
  if (dc?.centerLabel != null && String(dc.centerLabel).trim()) return String(dc.centerLabel).trim();
  if (dc?.centerKey != null && String(dc.centerKey).trim()) return String(dc.centerKey).trim();
  if (Array.isArray(tc.openLoops) && tc.openLoops.length > 0 && String(tc.openLoops[0]).trim()) {
    return String(tc.openLoops[0]).trim().slice(0, 200);
  }
  return null;
}

function __nextFocusFromResponse(responseText: string, tc: ThreadCore): string | null {
  const nb = tc.dialogueContract?.next_best_move != null ? String(tc.dialogueContract.next_best_move).trim() : "";
  if (nb) return nb.slice(0, 320);
  const t = String(responseText ?? "").trim();
  const q = Math.max(t.lastIndexOf("？"), t.lastIndexOf("?"));
  if (q >= 0) {
    const slice = t.slice(Math.max(0, q - 120), q + 1).trim();
    if (slice.length > 8) return slice.slice(0, 320);
  }
  return __preview(t.replace(/^【天聞の所見】\s*/u, ""), 160) || null;
}

function __currentCenterPackA(ku: any, tc: ThreadCore, currentDelta: string): string | null {
  const kl =
    ku && typeof ku === "object" && !Array.isArray(ku) && ku.centerLabel != null
      ? String(ku.centerLabel).trim()
      : "";
  const kk =
    ku && typeof ku === "object" && !Array.isArray(ku) && ku.centerKey != null
      ? String(ku.centerKey).trim()
      : "";
  if (kl && kk) return `${kl}（${kk}）`.slice(0, 240);
  if (kl) return kl.slice(0, 240);
  if (kk) return kk.slice(0, 240);
  const tcl = tc.centerLabel != null ? String(tc.centerLabel).trim() : "";
  const tck = tc.centerKey != null ? String(tc.centerKey).trim() : "";
  if (tcl && tck) return `${tcl}（${tck}）`.slice(0, 240);
  if (tcl) return tcl.slice(0, 240);
  if (tck) return tck.slice(0, 240);
  const d = String(currentDelta ?? "").trim();
  return d ? d.slice(0, 240) : null;
}

function __continuityTypePackA(
  rr: string,
  turnKind: ThreadCoreTurnKindV1 | null | undefined,
  carry: ThreadCoreCarryModeV1 | null | undefined
): string {
  const r = String(rr || "").trim();
  const tk = turnKind ?? "analysis";
  const cm = carry ?? "keep";
  if (r === "WORLDVIEW_ROUTE_V1" || /WORLDVIEW|CONSCIOUSNESS_META|RELATIONAL_WORLDVIEW/i.test(r)) {
    return "worldview_open";
  }
  if (r === "CONTINUITY_ROUTE_HOLD_V1") return "thread_carry";
  if (r === "EXPLICIT_CHAR_PREEMPT_V1") return "explicit_carry";
  if (r === "NATURAL_GENERAL_LLM_TOP") return "general_dialogue";
  if (r === "DEF_LLM_TOP" || r === "DEF_FASTPATH_PROPOSED_V1") return "define_expand";
  if (/^DEF_FASTPATH_VERIFIED|^SOUL_|TENMON_SUBCONCEPT_CANON_V1|TENMON_SCRIPTURE_CANON_V1/i.test(r)) {
    return "define_carry";
  }
  if (tk === "continuity") return "thread_carry";
  if (tk === "support") return "support_carry";
  if (tk === "selfdiag") return "selfdiag_carry";
  if (tk === "judgement") return "judgement_carry";
  return `${tk}_${cm}`.slice(0, 64);
}

function __continuitySummaryPackA(rawMessage: string, responseText: string): string {
  const u = __preview(rawMessage, 120);
  const r = __preview(String(responseText ?? "").replace(/^【天聞の所見】\s*/u, ""), 120);
  if (u && r) return `${u} → ${r}`.slice(0, 280);
  return (u || r || "").slice(0, 280);
}

function __extractSentenceHeadV1(text: string): string | null {
  const t = String(text ?? "").replace(/^【天聞の所見】\s*/u, "").trim();
  if (!t) return null;
  const p = Math.max(0, t.search(/[。！？!?]/u));
  const head = (p > 0 ? t.slice(0, p + 1) : t.slice(0, 80)).trim();
  return head ? head.slice(0, 240) : null;
}

/** カード指定の主要 route で carry メタを付与 */
function __routeCarrySpec(
  rr: string
): { turnKind: ThreadCoreTurnKindV1; carryMode: ThreadCoreCarryModeV1 } | null {
  const r = String(rr || "").trim();
  if (!r) return null;

  if (
    r === "CONTINUITY_ANCHOR_V1" ||
    r === "CONTINUITY_ROUTE_HOLD_V1" ||
    r === "R22_NEXTSTEP_FOLLOWUP_V1" ||
    r === "R22_ESSENCE_FOLLOWUP_V1" ||
    r === "R22_COMPARE_FOLLOWUP_V1" ||
    r === "R22_COMPARE_ASK_V1"
  ) {
    return {
      turnKind: "continuity",
      carryMode: r === "R22_COMPARE_ASK_V1" || r === "R22_COMPARE_FOLLOWUP_V1" ? "compare" : "keep",
    };
  }

  /** TENMON_CHAT_CONTINUITY_ROUTE_HOLD_V1: 明示字数応答も次ターン継続の芯として扱う */
  if (r === "EXPLICIT_CHAR_PREEMPT_V1") {
    return { turnKind: "continuity", carryMode: "keep" };
  }

  if (r === "KANAGI_CONVERSATION_V1") {
    return { turnKind: "support", carryMode: "soothe" };
  }

  if (
    r === "R22_SELF_DIAGNOSIS_ROUTE_V1" ||
    r === "R22_CONSCIOUSNESS_META_ROUTE_V1" ||
    r === "SYSTEM_DIAGNOSIS_PREEMPT_V1"
  ) {
    return { turnKind: "selfdiag", carryMode: "deepen" };
  }

  if (r === "R22_JUDGEMENT_PREEMPT_V1" || r === "R10_SELF_REFLECTION_ROUTE_V4_SAFE") {
    return { turnKind: "judgement", carryMode: "decide" };
  }

  if (
    r === "TENMON_SCRIPTURE_CANON_V1" ||
    r === "TENMON_SUBCONCEPT_CANON_V1" ||
    r === "SOUL_FASTPATH_VERIFIED_V1" ||
    r === "SOUL_DEF_SURFACE_V1" ||
    r === "DEF_FASTPATH_VERIFIED_V1" ||
    r === "DEF_FASTPATH_PROPOSED_V1"
  ) {
    return { turnKind: "define", carryMode: "keep" };
  }

  if (r === "DEF_LLM_TOP") {
    return { turnKind: "define", carryMode: "deepen" };
  }

  if (r === "NATURAL_GENERAL_LLM_TOP") {
    return { turnKind: "analysis", carryMode: "deepen" };
  }

  if (r === "WORLDVIEW_ROUTE_V1") {
    return { turnKind: "analysis", carryMode: "deepen" };
  }

  if (r === "TENMON_UNKNOWN_TERM_BRIDGE_V1") {
    return { turnKind: "analysis", carryMode: "redirect" };
  }

  return null;
}

/**
 * ゲート出口用: payload.threadCore をベースに ku.threadCore へコピー＋ carry 拡張
 */
export function buildThreadCoreKuProjectionV1(input: {
  base: ThreadCore;
  rawMessage: string;
  responseText: string;
  ku: any;
}): ThreadCore {
  const tc = input.base;
  const ku = input.ku;
  const rr = ku && typeof ku === "object" && !Array.isArray(ku) ? String(ku.routeReason ?? "").trim() : "";
  const spec = __routeCarrySpec(rr) ?? { turnKind: "analysis", carryMode: "keep" as ThreadCoreCarryModeV1 };

  const scriptureKey =
    ku && typeof ku === "object" && ku.scriptureKey != null ? String(ku.scriptureKey).trim().slice(0, 240) : null;

  let previousAnchor = __previousAnchorFromCore(tc);
  if (scriptureKey && (rr === "TENMON_SCRIPTURE_CANON_V1" || rr === "TENMON_SUBCONCEPT_CANON_V1")) {
    const head = previousAnchor ? `${previousAnchor} / ` : "";
    previousAnchor = `${head}scriptureKey:${scriptureKey}`.slice(0, 400);
  }

  const currentDelta = __preview(input.rawMessage, 200);
  const nextFocus = __nextFocusFromResponse(input.responseText, tc);

  const out: ThreadCore = {
    ...tc,
    openLoops: Array.isArray(tc.openLoops) ? [...tc.openLoops] : [],
    commitments: Array.isArray(tc.commitments) ? [...tc.commitments] : [],
    activeEntities: Array.isArray(tc.activeEntities) ? [...tc.activeEntities] : [],
  };

  out.turnKind = spec.turnKind;
  out.carryMode = spec.carryMode;
  out.previousAnchor = previousAnchor;
  out.currentDelta = currentDelta;
  out.nextFocus = nextFocus;
  const cc = String(ku?.centerClaim ?? "").trim();
  const pe = String(ku?.priorAnswerEssence ?? "").trim();
  const sem = String(ku?.thoughtCoreSummary?.centerMeaning ?? "").trim();
  const head = __extractSentenceHeadV1(input.responseText);
  out.centerClaim = cc || out.centerClaim || sem || null;
  out.priorAnswerEssence = pe || out.priorAnswerEssence || head || null;
  out.semanticNucleus = out.centerClaim || out.priorAnswerEssence || out.previousAnchor || null;

  // TENMON_CONVERSATION_FOUNDATION_PACK_A_V1: ku.threadCore 観測の最低要素
  out.priorCenter = out.previousAnchor ?? null;
  out.currentCenter = __currentCenterPackA(ku, tc, currentDelta);
  out.turnRole = out.turnKind ?? null;
  out.continuityType = __continuityTypePackA(rr, out.turnKind, out.carryMode);
  out.continuitySummary = __continuitySummaryPackA(input.rawMessage, input.responseText);
  const openLoop = Array.isArray(out.openLoops) && out.openLoops.length > 0 ? String(out.openLoops[0] ?? "").trim() : "";
  const unresolvedPoint = String((ku as any)?.unresolvedPoint ?? "").trim() || openLoop || "";
  const sourceAuthority =
    (Array.isArray((ku as any)?.lawsUsed) && (ku as any).lawsUsed.length > 0 ? "khs_law_trace" : "") ||
    (String((ku as any)?.scriptureKey ?? "").trim() ? "scripture_canon" : "") ||
    (Array.isArray((ku as any)?.sourceStackSummary?.sourceKinds) && (ku as any).sourceStackSummary.sourceKinds.length > 0
      ? "source_stack_bound"
      : "") ||
    null;
  out.semanticNucleusObject = {
    centerKey: out.centerKey ?? null,
    centerLabel: out.centerLabel ?? null,
    centerClaim: out.centerClaim ?? null,
    openLoop: openLoop || null,
    unresolvedPoint: unresolvedPoint || null,
    nextFocus: out.nextFocus ?? null,
    responseIntent: String((ku as any)?.answerMode ?? out.turnKind ?? "analysis"),
    sourceAuthority: sourceAuthority ?? null,
  };
  out.memoryCirculationMapV1 = {
    turn: {
      input: __preview(input.rawMessage, 180),
      center: out.currentCenter ?? null,
      unresolvedPoint: unresolvedPoint || null,
    },
    thread: {
      centerKey: out.centerKey ?? null,
      centerClaim: out.centerClaim ?? null,
      currentDelta: out.currentDelta ?? null,
      nextFocus: out.nextFocus ?? null,
    },
    session: {
      continuityType: out.continuityType ?? null,
      continuitySummary: out.continuitySummary ?? null,
    },
    persistentCanon: {
      scriptureKey: String((ku as any)?.scriptureKey ?? "").trim() || null,
      lawsUsedCount: Array.isArray((ku as any)?.lawsUsed) ? (ku as any).lawsUsed.length : 0,
      sourceKinds: Array.isArray((ku as any)?.sourceStackSummary?.sourceKinds)
        ? (ku as any).sourceStackSummary.sourceKinds.slice(0, 4)
        : [],
    },
    growth: {
      priorGrowthAxisHint:
        Array.isArray((ku as any)?.thoughtCoreSummary?.priorGrowthAxisHints) &&
        String((ku as any).thoughtCoreSummary.priorGrowthAxisHints[0] ?? "").trim()
          ? String((ku as any).thoughtCoreSummary.priorGrowthAxisHints[0]).slice(0, 220)
          : null,
      priorFeedback:
        String((ku as any)?.priorSelfLearningRuleFeedbackV1?.routeReason ?? "").trim() || null,
    },
  };

  const recovery = resolveThreadCenterRecoveryV1({
    rawMessage: input.rawMessage,
    routeReason: rr,
    centerKey: out.centerKey,
    centerLabel: out.centerLabel,
    scriptureKey: String((ku as any)?.scriptureKey ?? "").trim() || null,
    previous: tc,
    thoughtCoreSummary:
      ku && typeof ku === "object" && !Array.isArray(ku) && ku.thoughtCoreSummary && typeof ku.thoughtCoreSummary === "object"
        ? (ku.thoughtCoreSummary as Record<string, unknown>)
        : null,
  });
  out.threadCenter = recovery.threadCenter;
  out.centerKey = recovery.centerKey;
  out.centerMeaning = recovery.centerMeaning;
  out.currentQuestionRole = recovery.currentQuestionRole;
  out.unresolvedAxis = recovery.unresolvedAxis;
  out.priorVerdict = recovery.priorVerdict;
  out.scriptureCenter = recovery.scriptureCenter;
  out.userIntentThread = recovery.userIntentThread;
  out.threadCenterRecoveryHint = recovery.threadCenterRecoveryHint;
  if ((ku as any)?.userLexiconMemoryV1 && typeof (ku as any).userLexiconMemoryV1 === "object") {
    out.userLexiconMemoryV1 = (ku as any).userLexiconMemoryV1 as ThreadCore["userLexiconMemoryV1"];
  }

  return out;
}
