/**
 * CARD_KNOWLEDGE_BINDER_V1: define / continuity / explicit / future / essence / compare で
 * scriptureCanon / conceptCanon / notionCanon / thoughtGuide / personaConstitution / threadCenter / threadCore / synapseTop を1回で束ねる
 */

import { centerLabelFromKey } from "./threadCore.js";
import { getThoughtGuideSummary } from "./thoughtGuide.js";
import { getNotionCanonForRoute } from "./notionCanon.js";
import { getPersonaConstitutionSummary } from "./personaConstitution.js";
import { resolveGroundingRule } from "./sourceGraph.js";
import { buildScriptureLineageSummary } from "./scriptureLineageEngine.js";
import type { ThreadCore } from "./threadCore.js";

export type KnowledgeBinderInput = {
  routeReason: string;
  message: string;
  threadId: string;
  ku: Record<string, unknown>;
  threadCore: ThreadCore | null;
  threadCenter: { center_type?: string; center_key?: string | null } | null;
};

export type KnowledgeBinderResult = {
  centerKey: string | null;
  centerLabel: string | null;
  routeClass: string;
  sourcePack: string;
  centerPack: { centerKey: string | null; centerLabel: string | null };
  groundedRequired: boolean;
  groundingSelector: {
    groundedPriority: "required" | "preferred" | "optional" | "none";
    groundingMode: "canon" | "thread" | "hybrid" | "none";
    unresolvedPolicy: "ask" | "fallback" | "hold";
  };
  binderSummary: {
    centerKey: string | null;
    centerLabel: string | null;
    routeReason: string;
    routeClass: string;
    sourcePack: string;
    groundedPriority: string;
    groundingMode: string;
    unresolvedPolicy: string;
    hasThreadCenter: boolean;
    hasThreadCore: boolean;
    hasThoughtGuide: boolean;
    hasNotionCanon: boolean;
    hasPersonaConstitution: boolean;
    hasLineage: boolean;
  };
  notionCanon: unknown[];
  thoughtGuideSummary: unknown | null;
  personaConstitutionSummary: unknown | null;
  sourceStackSummary: Record<string, unknown> | null;
  thoughtCoreSummaryPatch: Record<string, unknown>;
  synapseTopPatch: Record<string, unknown>;
  lineageSummary: unknown | null;
};

function inferRouteClass(ku: Record<string, unknown>, routeReason: string): string {
  const rc = ku.routeClass;
  if (rc != null && String(rc).trim() !== "") return String(rc);
  const rr = String(routeReason || "");
  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1") return "define";
  if (rr === "EXPLICIT_CHAR_PREEMPT_V1") return "analysis";
  if (/^R22_/.test(rr)) return rr === "R22_ESSENCE_FOLLOWUP_V1" ? "continuity" : "analysis";
  if (/^SUPPORT_/.test(rr)) return "support";
  if (rr === "TENMON_SCRIPTURE_CANON_V1") return "continuity";
  return "analysis";
}

function inferSourcePack(routeReason: string, centerKey: string | null): string {
  const rr = String(routeReason || "").trim();
  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1" || centerKey === "kotodama") return "seiten";
  if (rr === "TENMON_SCRIPTURE_CANON_V1") return "scripture";
  if (rr === "EXPLICIT_CHAR_PREEMPT_V1") return "explicit";
  if (/^R22_(FUTURE_OUTLOOK|ESSENCE_FOLLOWUP|ESSENCE_ASK|COMPARE_FOLLOWUP|COMPARE_ASK|NEXTSTEP_FOLLOWUP)_V1$/.test(rr)) return "natural_analysis";
  if (rr === "CONTINUITY_ANCHOR_V1") return "natural_analysis";
  if (/^SUPPORT_/.test(rr)) return "support";
  return "general";
}

export function buildKnowledgeBinder(input: KnowledgeBinderInput): KnowledgeBinderResult {
  const { routeReason, message, threadId, ku, threadCore, threadCenter } = input;
  const rr = String(routeReason || "").trim();

  const centerKey: string | null =
    (ku.centerKey != null && String(ku.centerKey).trim() !== "" ? String(ku.centerKey).trim() : null) ??
    (ku.centerMeaning != null && String(ku.centerMeaning).trim() !== "" ? String(ku.centerMeaning).trim() : null) ??
    (ku.threadCenterKey != null && String(ku.threadCenterKey).trim() !== "" ? String(ku.threadCenterKey).trim() : null) ??
    (threadCenter?.center_key != null && String(threadCenter.center_key).trim() !== "" ? String(threadCenter.center_key).trim() : null) ??
    (threadCore?.centerKey != null && String(threadCore.centerKey).trim() !== "" ? String(threadCore.centerKey).trim() : null) ??
    null;

  const centerLabel: string | null =
    (ku.centerLabel != null && String(ku.centerLabel).trim() !== "" ? String(ku.centerLabel).trim() : null) ??
    centerLabelFromKey(centerKey) ??
    (threadCore?.centerLabel != null && String(threadCore.centerLabel).trim() !== "" ? String(threadCore.centerLabel).trim() : null) ??
    null;

  const routeClass = inferRouteClass(ku, routeReason);
  const sourcePack = inferSourcePack(routeReason, centerKey);
  const groundingRule = resolveGroundingRule(rr);
  const centerPack = { centerKey, centerLabel };

  const hasThreadCenter = threadCenter != null && (threadCenter.center_key != null || threadCenter.center_type != null);
  const hasThreadCore = threadCore != null && (threadCore.centerKey != null || threadCore.lastResponseContract != null);

  let notionCanon: unknown[] = [];
  let thoughtGuideSummary: unknown | null = null;
  try {
    notionCanon = getNotionCanonForRoute(rr, String(message || ""));
  } catch {}
  try {
    if (centerKey === "kotodama" || rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1") {
      thoughtGuideSummary = getThoughtGuideSummary("kotodama");
    } else if (rr === "TENMON_SCRIPTURE_CANON_V1") {
      thoughtGuideSummary = getThoughtGuideSummary("scripture");
    } else if (centerKey === "katakamuna") {
      thoughtGuideSummary = getThoughtGuideSummary("katakamuna");
    }
  } catch {}

  let personaConstitutionSummary: unknown | null = null;
  try {
    personaConstitutionSummary = getPersonaConstitutionSummary();
  } catch {}

  const lineageSummary = buildScriptureLineageSummary({
    routeReason: rr,
    centerKey,
    centerLabel,
    scriptureKey: ku.scriptureKey != null ? String(ku.scriptureKey) : null,
  });

  const binderSummary = {
    centerKey,
    centerLabel,
    routeReason: rr,
    routeClass,
    sourcePack,
    groundedPriority: groundingRule.groundedPriority,
    groundingMode: groundingRule.groundingMode,
    unresolvedPolicy: groundingRule.unresolvedPolicy,
    hasThreadCenter,
    hasThreadCore,
    hasThoughtGuide: thoughtGuideSummary != null,
    hasNotionCanon: Array.isArray(notionCanon) && notionCanon.length > 0,
    hasPersonaConstitution: personaConstitutionSummary != null,
    hasLineage: lineageSummary != null,
  };

  const sourceStackSummary: Record<string, unknown> | null = (() => {
    const items: Array<{ kind: string; key: string; label: string; routeReason: string }> = [];
    if (
      centerKey &&
      (
        rr === "DEF_FASTPATH_VERIFIED_V1" ||
        rr === "DEF_FASTPATH_PROPOSED_V1" ||
        rr === "R22_ESSENCE_FOLLOWUP_V1" ||
        rr === "R22_COMPARE_FOLLOWUP_V1" ||
        rr === "R22_NEXTSTEP_FOLLOWUP_V1"
      )
    ) {
      items.push({ kind: "concept", key: centerKey, label: centerLabel || centerKey, routeReason: rr });
    }
    if (items.length === 0) return null;
    return {
      sourceStack: items,
      primaryMeaning: centerLabel || centerKey,
      responseAxis: routeClass === "continuity" ? "continuity" : "concept",
    } as Record<string, unknown>;
  })();

  const thoughtCoreSummaryPatch: Record<string, unknown> = {
    centerKey: centerKey ?? undefined,
    centerMeaning: centerKey ?? undefined,
    routeReason: rr,
    modeHint: routeClass === "define" ? "define" : routeClass === "continuity" ? "continuity" : "analysis",
    continuityHint: centerKey ?? undefined,
    ...(routeClass === "continuity" ? { intentKind: "continuation_summary" } : {}),
  };

  const synapseTopPatch: Record<string, unknown> = {};
  const threadCenterType =
    threadCenter?.center_type != null && String(threadCenter.center_type).trim() !== ""
      ? String(threadCenter.center_type).trim()
      : (rr === "TENMON_SCRIPTURE_CANON_V1" ? "scripture" : (centerKey ? "concept" : ""));

  if (threadCenterType && centerKey) {
    (synapseTopPatch as any).sourceThreadCenter = {
      centerType: threadCenterType,
      centerKey,
      sourceRouteReason: rr,
    };
  }

  if (threadId && centerKey) {
    (synapseTopPatch as any).sourceMemoryHint = `thread:${threadId} centerKey:${centerKey}`;
  }

  (synapseTopPatch as any).sourceRouteReason = rr;
  (synapseTopPatch as any).sourceRouteClass = routeClass;
  if (centerLabel) (synapseTopPatch as any).sourceCenterLabel = centerLabel;
  if (rr === "TENMON_SCRIPTURE_CANON_V1") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:scripture_continuity";
  } else if (routeClass === "define") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:define";
  } else if (routeClass === "continuity") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:continuity";
  } else {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:general";
  }

  return {
    centerKey,
    centerLabel,
    routeClass,
    sourcePack,
    centerPack,
    groundedRequired: groundingRule.groundedPriority === "required",
    groundingSelector: {
      groundedPriority: groundingRule.groundedPriority,
      groundingMode: groundingRule.groundingMode,
      unresolvedPolicy: groundingRule.unresolvedPolicy,
    },
    binderSummary,
    notionCanon,
    thoughtGuideSummary,
    personaConstitutionSummary,
    sourceStackSummary,
    thoughtCoreSummaryPatch,
    synapseTopPatch,
    lineageSummary,
  };
}

/** CARD_KNOWLEDGE_BINDER_V1: binder 結果を ku に欠損補完・patch merge で適用 */
export function applyKnowledgeBinderToKu(ku: Record<string, unknown>, binder: KnowledgeBinderResult): void {
  if (ku == null || typeof ku !== "object") return;

  (ku as any).binderSummary = binder.binderSummary;
  (ku as any).sourcePack = binder.sourcePack;
  (ku as any).centerPack = binder.centerPack;
  (ku as any).groundedRequired = binder.groundedRequired;
  (ku as any).groundingSelector = binder.groundingSelector;
  (ku as any).groundedPriority = binder.groundingSelector.groundedPriority;
  (ku as any).groundingMode = binder.groundingSelector.groundingMode;
  (ku as any).unresolvedPolicy = binder.groundingSelector.unresolvedPolicy;

  if ((ku as any).centerKey == null || String((ku as any).centerKey).trim() === "") {
    (ku as any).centerKey = binder.centerKey;
  }
  if ((ku as any).centerLabel == null || String((ku as any).centerLabel).trim() === "") {
    (ku as any).centerLabel = binder.centerLabel;
  }
  if ((ku as any).routeClass == null || String((ku as any).routeClass).trim() === "") {
    (ku as any).routeClass = binder.routeClass;
  }
  if (!Array.isArray((ku as any).notionCanon) || (ku as any).notionCanon.length === 0) {
    (ku as any).notionCanon = binder.notionCanon;
  }
  if ((ku as any).thoughtGuideSummary == null) {
    (ku as any).thoughtGuideSummary = binder.thoughtGuideSummary;
  }
  if ((ku as any).personaConstitutionSummary == null) {
    (ku as any).personaConstitutionSummary = binder.personaConstitutionSummary;
  }
  if ((ku as any).lineageSummary == null && binder.lineageSummary != null) {
    (ku as any).lineageSummary = binder.lineageSummary;
  }
  if (binder.sourceStackSummary != null && ((ku as any).sourceStackSummary == null || typeof (ku as any).sourceStackSummary !== "object")) {
    (ku as any).sourceStackSummary = binder.sourceStackSummary;
  }

  const tcs = (ku as any).thoughtCoreSummary;
  if (tcs && typeof tcs === "object" && !Array.isArray(tcs)) {
    Object.assign(tcs, binder.thoughtCoreSummaryPatch);
  } else if (Object.keys(binder.thoughtCoreSummaryPatch).length > 0) {
    (ku as any).thoughtCoreSummary = { ...binder.thoughtCoreSummaryPatch };
  }

  const st = (ku as any).synapseTop;
  if (st && typeof st === "object" && !Array.isArray(st)) {
    Object.assign(st, binder.synapseTopPatch);
  } else if (Object.keys(binder.synapseTopPatch).length > 0) {
    (ku as any).synapseTop = { ...binder.synapseTopPatch };
  }
}
