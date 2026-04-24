/**
 * TENMON_ROOT_ARBITRATION_KERNEL_RESTORE_CURSOR_AUTO_V1
 * split / truthLayerArbitrationV1 / discernment / lineage / speculative guard を
 * 一段の root decision に束ねる（meaningArbitrationKernel の裁定式は変更しない）。
 *
 * TENMON_UNCERTAINTY_AND_CONFIDENCE_SURFACE_LOGIC_V4: rootMode / displayConstraint は不変。
 * ユーザー向け保留句は confidenceDisplayLogic（binder→ku.confidenceDisplayV1）と chat 本線の apply、および gates_impl 出口の冪等付与が表層へ反映。
 */

import type { ThreadCore } from "./threadCore.js";
import { splitInputSemanticsV1, type InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";
import { arbitrateTruthLayerV1, type TruthLayerArbitrationResultV1 } from "./meaningArbitrationKernel.js";
import { discernSourceLayerV1, type SourceLayerDiscernmentV1 } from "./sourceLayerDiscernmentKernel.js";
import {
  judgeLineageAndTransformationV1,
  type LineageTransformationJudgementV1,
} from "./lineageAndTransformationJudgementEngine.js";
import { buildSpeculativeGuardV1, type SpeculativeGuardV1 } from "./misreadExpansionAndSpeculativeGuard.js";

/** カード記述上の discernment bundle（実体は source + lineage） */
export type TenmonDiscernmentJudgementBundleV1 = {
  schema: "TENMON_DISCERNMENT_JUDGEMENT_BUNDLE_V1";
  sourceLayerDiscernmentV1: SourceLayerDiscernmentV1;
  lineageTransformationJudgementV1: LineageTransformationJudgementV1;
};

export type RootTruthArbitrationModeV1 =
  | "canon_centered"
  | "historical_guarded"
  | "symbolic_guarded"
  | "structural_mapping"
  | "general_centered";

export type RootSeparationPolicyV1 =
  | "separate_history_and_mapping"
  | "separate_symbolic_and_fact"
  | "preserve_center_without_leak"
  | "allow_minimal_next_step";

export type RootDisplayConstraintV1 = {
  preserve_center_without_leak: boolean;
  separate_symbolic_and_fact: boolean;
  allow_minimal_next_step: boolean;
};

export type TruthLayerArbitrationKernelResultV1 = {
  schema: "TENMON_ROOT_TRUTH_ARBITRATION_KERNEL_V1";
  rootMode: RootTruthArbitrationModeV1;
  truthPriority: string;
  centerStability: "hold" | "soften" | "rotate";
  separationPolicy: readonly RootSeparationPolicyV1[];
  displayConstraint: RootDisplayConstraintV1;
  reasonSummary: string;
};

export type RootTruthArbitrationKernelInputV1 = {
  inputCognitionSplitV1: InputSemanticSplitResultV1;
  truthLayerArbitrationV1: TruthLayerArbitrationResultV1;
  sourceLayerDiscernmentV1: SourceLayerDiscernmentV1;
  lineageTransformationJudgementV1: LineageTransformationJudgementV1;
  misreadExpansionAndSpeculativeGuardV1: SpeculativeGuardV1;
  /** optional: ku に載っている場合のみ */
  structuralCompatibilityAndRootSeparationV1?: Record<string, unknown> | null;
  threadMeaningMemoryV1?: unknown;
  threadCore?: ThreadCore | null;
};

function uniqPolicies(p: RootSeparationPolicyV1[]): RootSeparationPolicyV1[] {
  const out: RootSeparationPolicyV1[] = [];
  for (const x of p) {
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

/**
 * cognition 補助束から root 向け表示制約を一意化（routeReason は触らない）
 */
export function buildRootTruthArbitrationKernelV1(
  input: RootTruthArbitrationKernelInputV1,
): TruthLayerArbitrationKernelResultV1 {
  const truth = input.truthLayerArbitrationV1;
  const disc = input.sourceLayerDiscernmentV1;
  const lin = input.lineageTransformationJudgementV1;
  const guard = input.misreadExpansionAndSpeculativeGuardV1;
  const split = input.inputCognitionSplitV1;
  const struct = input.structuralCompatibilityAndRootSeparationV1;

  let rootMode: RootTruthArbitrationModeV1 = "general_centered";
  if (disc.sourceMode === "tenmon_reintegration") {
    rootMode = "structural_mapping";
  } else {
    switch (truth.answerMode) {
      case "canon_grounded":
        rootMode = "canon_centered";
        break;
      case "historical_etymology":
        rootMode = "historical_guarded";
        break;
      case "symbolic_mapping":
        rootMode = "symbolic_guarded";
        break;
      case "comparative_reconstruction":
        rootMode = "structural_mapping";
        break;
      default:
        rootMode = "general_centered";
    }
  }

  const truthPriority = String(truth.answerMode || "general_guidance").trim();

  let centerStability: "hold" | "soften" | "rotate" = "hold";
  if (truth.danshari) centerStability = "soften";
  else if (disc.riskFlags.length >= 2) centerStability = "rotate";

  const policies: RootSeparationPolicyV1[] = ["preserve_center_without_leak", "allow_minimal_next_step"];
  if (lin.shouldSeparateLayers) policies.push("separate_history_and_mapping");
  if (truth.answerMode === "symbolic_mapping" || disc.sourceMode === "speculative_analogy") {
    policies.push("separate_symbolic_and_fact");
  }
  if (struct && typeof struct === "object" && Object.keys(struct).length > 0) {
    policies.push("separate_history_and_mapping");
  }
  if (split.symbolicAnalogyHit && disc.sourceMode === "historical_fact") {
    policies.push("separate_symbolic_and_fact");
  }

  const separationPolicy = uniqPolicies(policies);

  const separateSymbolic =
    separationPolicy.includes("separate_symbolic_and_fact") ||
    disc.safeAnswerConstraint === "treat_as_speculative_only";

  const displayConstraint: RootDisplayConstraintV1 = {
    preserve_center_without_leak:
      guard.forbidDefinitiveClaim === true ||
      separationPolicy.includes("preserve_center_without_leak"),
    separate_symbolic_and_fact: separateSymbolic,
    allow_minimal_next_step: truth.depthPolicy !== "hold_shallow_under_danshari",
  };

  const reasonSummary = `root=${rootMode}; truth=${truthPriority}; source=${disc.sourceMode}; layers=${lin.shouldSeparateLayers ? "separate" : "single"}; specRisk=${guard.speculativeRisk}`;

  return {
    schema: "TENMON_ROOT_TRUTH_ARBITRATION_KERNEL_V1",
    rootMode,
    truthPriority,
    centerStability,
    separationPolicy,
    displayConstraint,
    reasonSummary,
  };
}

/**
 * CARD-MC-21: split→truth→discern→lineage→guard→kernel を soul-root から通し、短文化して GEN に載せる。
 */
export function buildTruthLayerArbitrationClauseV1(rawMessage: string, routeReason: string, maxChars: number): string {
  const rm = String(rawMessage ?? "").trim();
  if (!rm) return "";
  const rr = String(routeReason || "NATURAL_GENERAL_LLM_TOP").trim();
  const split = splitInputSemanticsV1(rm);
  const truth = arbitrateTruthLayerV1({
    split,
    knowledge: {
      routeReason: rr,
      rawMessage: rm,
      sourcePack: "soul_root_mc21",
      centerKey: null,
      centerLabel: null,
      evidenceRefs: [],
      notionCanonCount: 0,
      uncertaintyFlagCount: 0,
      groundedRequired: false,
    },
    heartHint: split.heartHint ?? null,
  });
  const disc = discernSourceLayerV1({ split, truthLayerArbitrationV1: truth, rawMessage: rm });
  const lin = judgeLineageAndTransformationV1({ discernment: disc, split, rawMessage: rm });
  const guard = buildSpeculativeGuardV1({
    discernment: disc,
    lineageJudgement: lin,
    rawMessage: rm,
    routeReason: rr,
    centerKey: null,
  });
  const kernel = buildRootTruthArbitrationKernelV1({
    inputCognitionSplitV1: split,
    truthLayerArbitrationV1: truth,
    sourceLayerDiscernmentV1: disc,
    lineageTransformationJudgementV1: lin,
    misreadExpansionAndSpeculativeGuardV1: guard,
    structuralCompatibilityAndRootSeparationV1: null,
    threadMeaningMemoryV1: undefined,
    threadCore: null,
  });
  const lines = [
    "【真理層裁定 kernel（TENMON･観測）】",
    kernel.reasonSummary,
    `rootMode=${kernel.rootMode}; center=${kernel.centerStability}; policies=${kernel.separationPolicy.join(",")}`,
    `display: preserve_center=${kernel.displayConstraint.preserve_center_without_leak} symbolic_vs_fact=${kernel.displayConstraint.separate_symbolic_and_fact} minimal_next=${kernel.displayConstraint.allow_minimal_next_step}`,
  ];
  const cap = Math.max(200, maxChars);
  const out = lines.join("\n");
  return out.length > cap ? `${out.slice(0, cap - 12)}…\n(省略)` : out;
}
