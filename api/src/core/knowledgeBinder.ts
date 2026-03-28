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
import { getBookContinuation } from "./bookContinuationMemory.js";
import type { ThreadCore } from "./threadCore.js";
import { KHS_ROOT_FRACTAL_CONSTITUTION_V1, resolveRouteFamilyKhsRootHintV1 } from "./khsRootFractalConstitutionV1.js";
import { resolveTruthReasoningAndMixedQuestionV1 } from "./tenmonTruthReasoningAndMixedQuestionV1.js";
import { resolveKojikiAndMappingLayerV1 } from "./tenmonKojikiAndMappingLayerV1.js";
import { resolveKhsFractalRootAndLawKernelV1 } from "./tenmonKhsFractalRootAndLawKernelV1.js";
import { getMaterialDigestLedgerPayloadV1 } from "./tenmonMaterialDigestLedgerV1.js";
import { getSelfLearningAutostudyBundleV1 } from "./tenmonSelfLearningStudyLoopV1.js";
import { resolveDanshariLifeOrderKernelV1 } from "./tenmonDanshariLifeOrderKernelV1.js";
import { resolveIrohaLifeCounselingKernelV1 } from "./tenmonIrohaLifeCounselingKernelV1.js";
import { buildIrohaDanshariCounselingBridgeV1 } from "./tenmonIrohaDanshariCounselingBridgeV1.js";
import {
  buildTenmonMultipassAnsweringV1,
  mergeKuLawTraceWithBinderV1,
  type TenmonMultipassAnsweringV1,
} from "./tenmonMultipassAnsweringV1.js";
import {
  buildPersonaDriftGuardV1,
  resolveTenmonPersonaConstitutionRuntimeV1,
} from "./tenmonPersonaConstitutionRuntimeV1.js";
import { buildTenmonVerdictEngineV1 } from "./tenmonVerdictEngineV1.js";
import { resolveTenmonBookReadingKernelV1 } from "./tenmonBookReadingKernelV1.js";
import { buildTenmonBookReadingToDeepreadBridgeV1 } from "./tenmonBookReadingToDeepreadBridgeV1.js";
import { updateUserLexiconMemoryV1 } from "./userLexiconMemoryV1.js";
import { arbitrateTruthLayerV1, type TruthLayerArbitrationResultV1 } from "./meaningArbitrationKernel.js";
import type { InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";
import { advanceThreadMeaningMemoryForRequestV1 } from "./threadMeaningMemory.js";
import { discernSourceLayerV1, type SourceLayerDiscernmentV1 } from "./sourceLayerDiscernmentKernel.js";
import { judgeLineageAndTransformationV1, type LineageTransformationJudgementV1 } from "./lineageAndTransformationJudgementEngine.js";
import { buildSpeculativeGuardV1, type SpeculativeGuardV1 } from "./misreadExpansionAndSpeculativeGuard.js";
import {
  buildRootTruthArbitrationKernelV1,
  type TruthLayerArbitrationKernelResultV1,
} from "./truthLayerArbitrationKernel.js";

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
    hasBookContinuation: boolean;
  };
  notionCanon: unknown[];
  thoughtGuideSummary: unknown | null;
  personaConstitutionSummary: unknown | null;
  sourceStackSummary: Record<string, unknown> | null;
  thoughtCoreSummaryPatch: Record<string, unknown>;
  synapseTopPatch: Record<string, unknown>;
  lineageSummary: unknown | null;
  bookContinuation: unknown | null;
  multipassAnsweringV1: TenmonMultipassAnsweringV1;
  evidenceRefs: string[];
  uncertaintyFlags: string[];
  /** routeReason は変更せず、補助裁定（truth layer）のみ */
  truthLayerArbitrationV1: TruthLayerArbitrationResultV1 | null;
  /** 後段判断 OS（補助・routeReason 不変） */
  sourceLayerDiscernmentV1: SourceLayerDiscernmentV1 | null;
  lineageTransformationJudgementV1: LineageTransformationJudgementV1 | null;
  speculativeGuardV1: SpeculativeGuardV1 | null;
  /** root 束（split+truth+discernment+guard 揃い時のみ） */
  truthLayerArbitrationKernelV1: TruthLayerArbitrationKernelResultV1 | null;
};

/** TENMON_THREAD_MEANING_MEMORY: binder 直後に threadCore を渡したときのみ更新 */
export type ApplyKnowledgeBinderThreadMeaningOptsV1 = {
  threadCore?: ThreadCore | null;
  rawMessage?: string;
};

function inferRouteClass(ku: Record<string, unknown>, routeReason: string): string {
  const rc = ku.routeClass;
  if (rc != null && String(rc).trim() !== "") return String(rc);
  const rr = String(routeReason || "");
  if (rr === "TRUTH_GATE_RETURN_V2") return "analysis";
  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1") return "define";
  if (rr === "KATAKAMUNA_CANON_ROUTE_V1") return "define";
  if (rr === "EXPLICIT_CHAR_PREEMPT_V1") return "analysis";
  if (/^R22_/.test(rr)) return rr === "R22_ESSENCE_FOLLOWUP_V1" ? "continuity" : "analysis";
  if (/^SUPPORT_/.test(rr)) return "support";
  if (rr === "TENMON_SCRIPTURE_CANON_V1") return "continuity";
  return "analysis";
}

function inferSourcePack(routeReason: string, centerKey: string | null): string {
  const rr = String(routeReason || "").trim();
  if (rr === "WILL_CORE_PREEMPT_V1" || centerKey === "will_core") return "will_core";
  if (rr === "TRUTH_GATE_RETURN_V2") return "scripture";
  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1" || centerKey === "kotodama") return "seiten";
  if (rr === "KATAKAMUNA_CANON_ROUTE_V1" || centerKey === "katakamuna") return "scripture";
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

  let bookContinuation: unknown | null = null;
  try {
    bookContinuation = getBookContinuation(String(threadId || ""));
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
    hasBookContinuation: !!(bookContinuation && typeof bookContinuation === "object"),
  };

  const sourceStackSummary: Record<string, unknown> | null = (() => {
    const items: Array<{ kind: string; key: string; label: string; routeReason: string }> = [];
    if (
      centerKey &&
      (
        rr === "DEF_FASTPATH_VERIFIED_V1" ||
        rr === "DEF_FASTPATH_PROPOSED_V1" ||
        rr === "TRUTH_GATE_RETURN_V2" ||
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

  const khsRf = resolveRouteFamilyKhsRootHintV1(rr);
  const khsRootLawKernel = resolveKhsFractalRootAndLawKernelV1(String(message || ""), rr);
  const fractalRootBundle = khsRootLawKernel.fractalRootAxis;
  const fractalLawKernel = khsRootLawKernel.fractalLawKernel;
  const kojikiAndMapping = resolveKojikiAndMappingLayerV1(String(message || ""), rr);
  const mythPh = kojikiAndMapping.mythogenesisPhase;
  const mapLayer = kojikiAndMapping.mappingLayer;
  const truthReasoningMixed = resolveTruthReasoningAndMixedQuestionV1(String(message || ""), rr);
  const truthStructureVerdict = truthReasoningMixed.truthStructureVerdict;
  const digestLedgerPayload = getMaterialDigestLedgerPayloadV1();
  const selfLearningAutostudyV1 = getSelfLearningAutostudyBundleV1(String(message || ""));
  const danshariLifeOrderKernelV1 = resolveDanshariLifeOrderKernelV1(String(message || ""), rr);
  const irohaLifeCounselingKernelV1 = resolveIrohaLifeCounselingKernelV1(String(message || ""), rr);
  const irohaDanshariCounselingBridgeV1 = buildIrohaDanshariCounselingBridgeV1(
    String(message || ""),
    rr,
    irohaLifeCounselingKernelV1,
    danshariLifeOrderKernelV1,
  );

  const fractalLawAxisStr = (() => {
    const fl = fractalLawKernel?.fractalLawAxis as
      | string
      | { primary?: string; secondary?: string[]; axes?: string[] }
      | undefined
      | null;
    if (typeof fl === "string") return fl.trim();
    if (fl && typeof fl === "object") {
      const p = String(fl.primary ?? "").trim();
      const s0 = Array.isArray(fl.secondary) ? String(fl.secondary[0] ?? "").trim() : "";
      const a0 = Array.isArray(fl.axes) ? String(fl.axes[0] ?? "").trim() : "";
      return [p, s0, a0].filter(Boolean).join("/");
    }
    return "";
  })();

  const __lineage = lineageSummary && typeof lineageSummary === "object" ? (lineageSummary as Record<string, unknown>) : null;
  const personaRuntime = resolveTenmonPersonaConstitutionRuntimeV1();
  const personaDriftGuard = buildPersonaDriftGuardV1(String(message || ""), personaRuntime);
  const multipassAnsweringV1 = buildTenmonMultipassAnsweringV1({
    routeReason: rr,
    message: String(message || ""),
    centerKey,
    centerLabel,
    routeClass,
    sourcePack,
    groundingUnresolvedPolicy: groundingRule.unresolvedPolicy,
    groundedPriority: groundingRule.groundedPriority,
    khsRouteFamilyRef: khsRf.khsRootRef,
    truthStructureVerdict: truthStructureVerdict
      ? {
          centerClaimHint: (truthStructureVerdict as { centerClaimHint?: string | null }).centerClaimHint ?? null,
          repairAxis: (truthStructureVerdict as { repairAxis?: string | null }).repairAxis ?? null,
          nextAxis: (truthStructureVerdict as { nextAxis?: string | null }).nextAxis ?? null,
        }
      : null,
    truthReasoningMixedPresent: truthReasoningMixed != null && typeof truthReasoningMixed === "object",
    lineageKey: __lineage && typeof __lineage.lineageKey === "string" ? String(__lineage.lineageKey) : null,
    lineageFamily: __lineage && typeof __lineage.family === "string" ? String(__lineage.family) : null,
    digestLedgerCard: digestLedgerPayload.card,
    digestUndigestedCount: digestLedgerPayload.undigested.length,
    materialDigestLedgerRef: {
      card: digestLedgerPayload.card,
      digest_states_visible: digestLedgerPayload.digest_states_visible,
      circulating_ids: digestLedgerPayload.circulating.map((e) => e.id),
      undigested_ids: digestLedgerPayload.undigested.map((e) => e.id),
      nas_canonical_root: digestLedgerPayload.nas_locator_manifest.canonical_root,
      nas_locator_schema: digestLedgerPayload.nas_locator_manifest.schema,
      nas_locator_entry_count: digestLedgerPayload.nas_locator_manifest.entries.length,
      nas_sourcepack_handoff_schema: digestLedgerPayload.nas_sourcepack_handoff.schema,
    },
    sourceStackSummary,
    fractalLawAxisSummary: fractalLawAxisStr,
    fractalTensionPresent: Boolean(fractalLawKernel?.fractalTension),
  });
  const evidenceRefs = multipassAnsweringV1.evidence_pass.evidenceRefs;
  const uncertaintyFlags = Array.from(
    new Set([
      ...multipassAnsweringV1.uncertaintyFlags,
      ...(personaDriftGuard.forbiddenDriftDetected ? ["persona_forbidden_drift_detected"] : []),
    ]),
  );
  const verdictEngineV1 = buildTenmonVerdictEngineV1({
    routeReason: rr,
    centerLabel,
    sourcePack,
    evidenceRefs,
    uncertaintyFlags,
    lawTrace: multipassAnsweringV1.evidence_pass.lawTraceBinder,
    preferredTerm: personaDriftGuard.preferredTerm,
    personaRuntime,
  });
  const bookReadingKernelV1 = resolveTenmonBookReadingKernelV1(String(message || ""));
  const bookToDeepreadBridgeV1 = buildTenmonBookReadingToDeepreadBridgeV1(bookReadingKernelV1);
  const userLexiconMemoryV1 = updateUserLexiconMemoryV1({
    prev:
      threadCore && typeof threadCore === "object"
        ? ((threadCore as { userLexiconMemoryV1?: unknown }).userLexiconMemoryV1 as any)
        : null,
    userMessage: String(message || ""),
    assistantSurface: null,
  });

  const thoughtCoreSummaryPatch: Record<string, unknown> = {
    centerKey: centerKey ?? undefined,
    centerMeaning: centerKey ?? undefined,
    routeReason: rr,
    modeHint: routeClass === "define" ? "define" : routeClass === "continuity" ? "continuity" : "analysis",
    continuityHint: centerKey ?? undefined,
    khsRootConstitutionCard: KHS_ROOT_FRACTAL_CONSTITUTION_V1.card,
    khsRootAxes: [...KHS_ROOT_FRACTAL_CONSTITUTION_V1.rootAxes],
    khsRouteFamilyHint: khsRf.khsRootRef,
    fractalLawAxis: fractalLawKernel.fractalLawAxis,
    fractalTension: fractalLawKernel.fractalTension,
    fractalRepairHint: fractalLawKernel.fractalRepairHint,
    fractalRootAxis: fractalRootBundle,
    rootConstitutionSource: fractalRootBundle.rootConstitutionSource,
    rootCenterClaim: fractalRootBundle.rootCenterClaim,
    khsFractalRootAndLawKernel: khsRootLawKernel,
    kojikiAndMappingLayer: kojikiAndMapping,
    ...(mythPh
      ? {
          mythogenesisPhase: mythPh,
          mythogenesisCenterClaim: mythPh.mythogenesisCenterClaim,
          mythogenesisProjectionHint: mythPh.mythogenesisProjectionHint,
        }
      : {}),
    ...(mapLayer ? { mappingLayer: mapLayer } : {}),
    truthReasoningAndMixedQuestion: truthReasoningMixed,
    materialDigestLedgerRef: {
      card: digestLedgerPayload.card,
      digest_states_visible: digestLedgerPayload.digest_states_visible,
      promotion_ready: digestLedgerPayload.promotion_ready,
      digest_conditions_count: digestLedgerPayload.digest_conditions.length,
      undigested_ids: digestLedgerPayload.undigested.map((e) => e.id),
      circulating_ids: digestLedgerPayload.circulating.map((e) => e.id),
      promotion_candidate_ids: digestLedgerPayload.promotion_candidates.map((e) => e.id),
      mixed_question_restored_ids: digestLedgerPayload.mixed_question_restored.map((e) => e.id),
      nas_canonical_root: digestLedgerPayload.nas_locator_manifest.canonical_root,
      nas_locator_schema: digestLedgerPayload.nas_locator_manifest.schema,
      nas_locator_entry_count: digestLedgerPayload.nas_locator_manifest.entries.length,
      nas_sourcepack_handoff_schema: digestLedgerPayload.nas_sourcepack_handoff.schema,
      nas_ark_acceptance_relock_schema: digestLedgerPayload.nas_ark_acceptance_relock.schema,
    },
    ...(truthStructureVerdict ? { truthStructureVerdict } : {}),
    ...(truthStructureVerdict
      ? {
          truthStructureCenterClaimHint: truthStructureVerdict.centerClaimHint,
          truthStructureNextAxisHint: truthStructureVerdict.nextAxisHint,
          truthStructureRepairAxis: truthStructureVerdict.repairAxis,
          truthStructureNextAxis: truthStructureVerdict.nextAxis,
        }
      : {}),
    ...(routeClass === "continuity" ? { intentKind: "continuation_summary" } : {}),
    selfLearningAutostudyV1,
    ...(danshariLifeOrderKernelV1 ? { danshariLifeOrderKernelV1 } : {}),
    ...(irohaLifeCounselingKernelV1 ? { irohaLifeCounselingKernelV1 } : {}),
    ...(irohaDanshariCounselingBridgeV1 ? { irohaDanshariCounselingBridgeV1 } : {}),
    personaConstitutionRuntimeV1: personaRuntime,
    personaDriftGuardV1: personaDriftGuard,
    verdictEngineV1,
    bookReadingKernelV1,
    bookToDeepreadBridgeV1,
    userLexiconMemoryV1,
    verdictSections: {
      facts: verdictEngineV1.facts,
      tradition: verdictEngineV1.tradition,
      tenmon_mapping: verdictEngineV1.tenmon_mapping,
      uncertainty: verdictEngineV1.uncertainty,
      verdict: verdictEngineV1.verdict,
    },
    multipassAnsweringV1,
    routeEvidenceTraceV1: {
      routeReason: rr,
      centerLabel,
      sourcePack,
      evidenceRefCount: evidenceRefs.length,
      uncertaintyFlagCount: uncertaintyFlags.length,
    },
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
  if (rr === "TRUTH_GATE_RETURN_V2") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:truth_gate";
  } else if (rr === "TENMON_SCRIPTURE_CANON_V1") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:scripture_continuity";
  } else if (routeClass === "define") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:define";
  } else if (routeClass === "continuity") {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:continuity";
  } else {
    (synapseTopPatch as any).sourceLedgerHint = "ledger:general";
  }

  let truthLayerArbitrationV1: TruthLayerArbitrationResultV1 | null = null;
  let sourceLayerDiscernmentV1: SourceLayerDiscernmentV1 | null = null;
  let lineageTransformationJudgementV1: LineageTransformationJudgementV1 | null = null;
  let speculativeGuardV1: SpeculativeGuardV1 | null = null;
  let truthLayerArbitrationKernelV1: TruthLayerArbitrationKernelResultV1 | null = null;
  const structCompat =
    ku.structuralCompatibilityAndRootSeparationV1 != null &&
    typeof ku.structuralCompatibilityAndRootSeparationV1 === "object" &&
    !Array.isArray(ku.structuralCompatibilityAndRootSeparationV1)
      ? (ku.structuralCompatibilityAndRootSeparationV1 as Record<string, unknown>)
      : null;
  const splitKu = ku.inputSemanticSplitResultV1;
  if (
    splitKu &&
    typeof splitKu === "object" &&
    !Array.isArray(splitKu) &&
    (splitKu as { schema?: string }).schema === "TENMON_INPUT_SEMANTIC_SPLIT_V1"
  ) {
    const splitTyped = splitKu as InputSemanticSplitResultV1;
    truthLayerArbitrationV1 = arbitrateTruthLayerV1({
      split: splitTyped,
      knowledge: {
        routeReason: rr,
        rawMessage: message,
        sourcePack,
        centerKey,
        centerLabel,
        evidenceRefs,
        notionCanonCount: Array.isArray(notionCanon) ? notionCanon.length : 0,
        uncertaintyFlagCount: uncertaintyFlags.length,
        groundedRequired: groundingRule.groundedPriority === "required",
      },
      heartHint: splitTyped.heartHint,
    });
    try {
      sourceLayerDiscernmentV1 = discernSourceLayerV1({
        split: splitTyped,
        truthLayerArbitrationV1,
        rawMessage: message,
      });
      lineageTransformationJudgementV1 = judgeLineageAndTransformationV1({
        discernment: sourceLayerDiscernmentV1,
        split: splitTyped,
        rawMessage: message,
      });
      speculativeGuardV1 = buildSpeculativeGuardV1({
        discernment: sourceLayerDiscernmentV1,
        lineageJudgement: lineageTransformationJudgementV1,
        rawMessage: message,
      });
      if (truthLayerArbitrationV1 && sourceLayerDiscernmentV1 && lineageTransformationJudgementV1 && speculativeGuardV1) {
        try {
          truthLayerArbitrationKernelV1 = buildRootTruthArbitrationKernelV1({
            inputCognitionSplitV1: splitTyped,
            truthLayerArbitrationV1,
            sourceLayerDiscernmentV1,
            lineageTransformationJudgementV1,
            misreadExpansionAndSpeculativeGuardV1: speculativeGuardV1,
            structuralCompatibilityAndRootSeparationV1: structCompat,
            threadMeaningMemoryV1: (ku as { threadMeaningMemoryV1?: unknown }).threadMeaningMemoryV1,
            threadCore,
          });
        } catch {
          truthLayerArbitrationKernelV1 = null;
        }
      }
    } catch {
      sourceLayerDiscernmentV1 = null;
      lineageTransformationJudgementV1 = null;
      speculativeGuardV1 = null;
      truthLayerArbitrationKernelV1 = null;
    }
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
    bookContinuation,
    multipassAnsweringV1,
    evidenceRefs,
    uncertaintyFlags,
    truthLayerArbitrationV1,
    sourceLayerDiscernmentV1,
    lineageTransformationJudgementV1,
    speculativeGuardV1,
    truthLayerArbitrationKernelV1,
  };
}

/** CARD_KNOWLEDGE_BINDER_V1: binder 結果を ku に欠損補完・patch merge で適用 */
export function applyKnowledgeBinderToKu(
  ku: Record<string, unknown>,
  binder: KnowledgeBinderResult,
  threadMeaningOpts?: ApplyKnowledgeBinderThreadMeaningOptsV1 | null,
): void {
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
  if ((ku as any).bookContinuation == null && binder.bookContinuation != null) {
    (ku as any).bookContinuation = binder.bookContinuation;
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

  const patch = binder.thoughtCoreSummaryPatch as Record<string, unknown>;
  if (patch.fractalRootAxis != null) {
    (ku as any).fractalRootAxis = patch.fractalRootAxis;
  }
  if (patch.rootConstitutionSource != null) {
    (ku as any).rootConstitutionSource = patch.rootConstitutionSource;
  }
  if (patch.rootCenterClaim != null) {
    (ku as any).rootCenterClaim = patch.rootCenterClaim;
  }
  if (patch.fractalLawAxis != null) {
    (ku as any).fractalLawAxis = patch.fractalLawAxis;
  }
  if (patch.fractalTension !== undefined) {
    (ku as any).fractalTension = patch.fractalTension;
  }
  if (patch.fractalRepairHint !== undefined) {
    (ku as any).fractalRepairHint = patch.fractalRepairHint;
  }
  if (patch.mythogenesisPhase != null) {
    (ku as any).mythogenesisPhase = patch.mythogenesisPhase;
  }
  if (patch.mythogenesisCenterClaim != null) {
    (ku as any).mythogenesisCenterClaim = patch.mythogenesisCenterClaim;
  }
  if (patch.mythogenesisProjectionHint != null) {
    (ku as any).mythogenesisProjectionHint = patch.mythogenesisProjectionHint;
  }
  if (patch.mappingLayer != null) {
    (ku as any).mappingLayer = patch.mappingLayer;
  }
  if (patch.khsFractalRootAndLawKernel != null) {
    (ku as any).khsFractalRootAndLawKernel = patch.khsFractalRootAndLawKernel;
  }
  if (patch.kojikiAndMappingLayer != null) {
    (ku as any).kojikiAndMappingLayer = patch.kojikiAndMappingLayer;
  }
  if (patch.truthReasoningAndMixedQuestion != null) {
    (ku as any).truthReasoningAndMixedQuestion = patch.truthReasoningAndMixedQuestion;
  }
  if (patch.materialDigestLedgerRef != null) {
    (ku as any).materialDigestLedgerRef = patch.materialDigestLedgerRef;
  }
  if (patch.truthStructureVerdict != null) {
    (ku as any).truthStructureVerdict = patch.truthStructureVerdict;
  }
  if (patch.truthStructureCenterClaimHint != null) {
    (ku as any).truthStructureCenterClaimHint = patch.truthStructureCenterClaimHint;
  }
  if (patch.truthStructureNextAxisHint != null) {
    (ku as any).truthStructureNextAxisHint = patch.truthStructureNextAxisHint;
  }
  if (patch.truthStructureRepairAxis != null) {
    (ku as any).truthStructureRepairAxis = patch.truthStructureRepairAxis;
  }
  if (patch.truthStructureNextAxis != null) {
    (ku as any).truthStructureNextAxis = patch.truthStructureNextAxis;
  }
  if (patch.selfLearningAutostudyV1 != null) {
    (ku as any).selfLearningAutostudyV1 = patch.selfLearningAutostudyV1;
  }
  if (patch.danshariLifeOrderKernelV1 != null) {
    (ku as any).danshariLifeOrderKernelV1 = patch.danshariLifeOrderKernelV1;
  }
  if (patch.irohaLifeCounselingKernelV1 != null) {
    (ku as any).irohaLifeCounselingKernelV1 = patch.irohaLifeCounselingKernelV1;
  }
  if (patch.irohaDanshariCounselingBridgeV1 != null) {
    (ku as any).irohaDanshariCounselingBridgeV1 = patch.irohaDanshariCounselingBridgeV1;
  }
  if (patch.multipassAnsweringV1 != null) {
    (ku as any).multipassAnsweringV1 = patch.multipassAnsweringV1;
  }
  if (patch.routeEvidenceTraceV1 != null) {
    (ku as any).routeEvidenceTraceV1 = patch.routeEvidenceTraceV1;
  }
  if (patch.personaConstitutionRuntimeV1 != null) {
    (ku as any).personaConstitutionRuntimeV1 = patch.personaConstitutionRuntimeV1;
  }
  if (patch.personaDriftGuardV1 != null) {
    (ku as any).personaDriftGuardV1 = patch.personaDriftGuardV1;
  }
  if (patch.verdictEngineV1 != null) {
    (ku as any).verdictEngineV1 = patch.verdictEngineV1;
  }
  if (patch.verdictSections != null) {
    (ku as any).verdictSections = patch.verdictSections;
  }
  if (patch.bookReadingKernelV1 != null) {
    (ku as any).bookReadingKernelV1 = patch.bookReadingKernelV1;
  }
  if (patch.bookToDeepreadBridgeV1 != null) {
    (ku as any).bookToDeepreadBridgeV1 = patch.bookToDeepreadBridgeV1;
  }
  if (patch.userLexiconMemoryV1 != null) {
    (ku as any).userLexiconMemoryV1 = patch.userLexiconMemoryV1;
  }

  (ku as any).evidenceRefs = binder.evidenceRefs;
  (ku as any).uncertaintyFlags = binder.uncertaintyFlags;
  if (binder.truthLayerArbitrationV1 != null) {
    (ku as any).truthLayerArbitrationV1 = binder.truthLayerArbitrationV1;
  }
  if (binder.sourceLayerDiscernmentV1 != null) {
    (ku as any).sourceLayerDiscernmentV1 = binder.sourceLayerDiscernmentV1;
  }
  if (binder.lineageTransformationJudgementV1 != null) {
    (ku as any).lineageTransformationJudgementV1 = binder.lineageTransformationJudgementV1;
  }
  if (binder.speculativeGuardV1 != null) {
    (ku as any).speculativeGuardV1 = binder.speculativeGuardV1;
  }
  if (binder.truthLayerArbitrationKernelV1 != null) {
    (ku as any).truthLayerArbitrationKernelV1 = binder.truthLayerArbitrationKernelV1;
  }
  try {
    const ltBinder = binder.multipassAnsweringV1?.evidence_pass?.lawTraceBinder;
    if (Array.isArray(ltBinder) && ltBinder.length > 0) {
      (ku as any).lawTrace = mergeKuLawTraceWithBinderV1((ku as any).lawTrace, ltBinder);
    }
  } catch {}

  const st = (ku as any).synapseTop;
  if (st && typeof st === "object" && !Array.isArray(st)) {
    Object.assign(st, binder.synapseTopPatch);
  } else if (Object.keys(binder.synapseTopPatch).length > 0) {
    (ku as any).synapseTop = { ...binder.synapseTopPatch };
  }

  if (threadMeaningOpts?.threadCore != null) {
    const raw = String(threadMeaningOpts.rawMessage ?? "").trim();
    if (raw) {
      try {
        advanceThreadMeaningMemoryForRequestV1({
          ku,
          threadCore: threadMeaningOpts.threadCore,
          rawMessage: raw,
        });
      } catch {
        /* fail-closed */
      }
    }
  }
}
