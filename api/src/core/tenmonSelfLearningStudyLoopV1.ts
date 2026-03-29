/**
 * TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY — planner→digest→昇格→comparative→bridge→ledger（fail-closed）。
 */

import { MATERIAL_DIGEST_LEDGER_CATALOG_V1 } from "./tenmonMaterialDigestLedgerV1.js";
import { evaluateDigestPromotionV1 } from "./tenmonMaterialDigestPromotionV1.js";
import { buildDefaultStudyQueueV1 } from "./tenmonMaterialStudyPlannerV1.js";
import {
  buildTenmonNasAutostudyHandoffV1,
  buildTenmonNasLocatorManifestV1,
  type TenmonNasAutostudyHandoffV1,
  type TenmonNasLocatorManifestV1,
} from "./tenmonNasArchiveBridgeV1.js";
import { resolveKhsGengoLawKernelV1 } from "./tenmonKhsGengoLawKernelV1.js";
import { resolveSanskritComparativeKernelV1 } from "./tenmonSanskritComparativeKernelV1.js";
import { buildComparativeMappingV1 } from "./tenmonComparativeMappingV1.js";
import type { ArkBookCanonConversationReuseV1 } from "./threadMeaningMemory.js";
import { projectFractalPhysicsV1 } from "./tenmonFractalPhysicsProjectionV1.js";
import { resolveLawPromotionGateV1 } from "./tenmonLawPromotionGateV1.js";
import { buildLearningConversationBridgeV1 } from "./tenmonLearningConversationBridgeV1.js";
import { buildStudyLedgerEntriesV1 } from "./tenmonStudyLedgerV1.js";

const CARD = "TENMON_SELF_LEARNING_KHS_SANSKRIT_FRACTAL_AUTOSTUDY_CURSOR_AUTO_V1" as const;

export type StudyLoopVerdictV1 = {
  ok: boolean;
  card: typeof CARD;
  loop_index: number;
  material_id: string;
  digest_ready: boolean;
  promotion_ready: boolean;
  observe: boolean;
  notes: string;
};

export type SelfLearningAutostudyBundleV1 = {
  card: typeof CARD;
  study_planner_ready: true;
  study_loop_ready: true;
  khs_gengo_law_kernel_ready: true;
  sanskrit_comparative_ready: true;
  comparative_mapping_ready: true;
  material_digest_promotion_ready: true;
  law_promotion_gate_ready: true;
  fractal_physics_projection_ready: true;
  learning_conversation_bridge_ready: boolean;
  study_ledger_ready: boolean;
  nas_locator_manifest: TenmonNasLocatorManifestV1;
  nas_autostudy_handoff: TenmonNasAutostudyHandoffV1;
  gengoLawKernel: ReturnType<typeof resolveKhsGengoLawKernelV1>;
  sanskritComparative: ReturnType<typeof resolveSanskritComparativeKernelV1>;
  comparativeMapping: ReturnType<typeof buildComparativeMappingV1>;
  digestPromotions: ReturnType<typeof evaluateDigestPromotionV1>[];
  lawPromotionGate: ReturnType<typeof resolveLawPromotionGateV1>;
  fractalPhysics: ReturnType<typeof projectFractalPhysicsV1>;
  learningBridge: ReturnType<typeof buildLearningConversationBridgeV1>;
  studyLedger: ReturnType<typeof buildStudyLedgerEntriesV1>;
  studyLoopStep: StudyLoopStepBundleV1;
};

export type StudyLoopStepBundleV1 = {
  studyLoopState: "idle" | "digest_tick" | "ledger_sync";
  currentMaterial: {
    materialId: string;
    studyPriority: number;
    studyReason: string;
    nasLocatorRef?: string | null;
    nasRelativePath?: string | null;
  };
  digestReady: boolean;
  promotionReady: boolean;
  nextStudyTarget: { materialId: string; studyPriority: number } | null;
  loopVerdict: StudyLoopVerdictV1;
};

/** 1 loop = queue 上の 1 件に対する観測・digest メタ更新（本文投入なし） */
export function runSelfLearningStudyLoopStepV1(loopIndex: number = 0): StudyLoopStepBundleV1 {
  const queue = [...buildDefaultStudyQueueV1()].sort((a, b) => a.studyPriority - b.studyPriority);
  const n = queue.length;
  const idx = n === 0 ? 0 : Math.abs(Math.floor(loopIndex)) % n;
  const target = queue[idx]!;
  const entry = MATERIAL_DIGEST_LEDGER_CATALOG_V1.find((e) => e.id === target.materialId);
  const prom = entry ? evaluateDigestPromotionV1(entry) : null;
  const digestReady =
    prom != null &&
    (prom.extendedState === "digested" ||
      prom.extendedState === "circulating" ||
      prom.extendedState === "promoted_law" ||
      prom.extendedState === "promoted_alg" ||
      prom.extendedState === "promoted_acceptance");
  const promotionReady =
    prom != null &&
    (prom.extendedState === "promoted_law" ||
      prom.extendedState === "promoted_alg" ||
      prom.extendedState === "promoted_acceptance");
  const next = n > 0 ? queue[(idx + 1) % n]! : null;
  const loopVerdict: StudyLoopVerdictV1 = {
    ok: true,
    card: CARD,
    loop_index: idx,
    material_id: target.materialId,
    digest_ready: digestReady,
    promotion_ready: promotionReady,
    observe: !promotionReady && digestReady,
    notes: "fail-closed: 本文の自動投入なし。ledger / digest メタのみ。",
  };
  return {
    studyLoopState: "digest_tick",
    currentMaterial: {
      materialId: target.materialId,
      studyPriority: target.studyPriority,
      studyReason: target.studyReason,
      nasLocatorRef: target.nasLocatorRef ?? null,
      nasRelativePath: target.nasRelativePath ?? null,
    },
    digestReady,
    promotionReady,
    nextStudyTarget: next ? { materialId: next.materialId, studyPriority: next.studyPriority } : null,
    loopVerdict,
  };
}

export function getSelfLearningAutostudyBundleV1(
  message: string,
  opts?: { arkBookCanonConversationReuseV1?: ArkBookCanonConversationReuseV1 | null },
): SelfLearningAutostudyBundleV1 {
  const msg = String(message || "");
  const ark = opts?.arkBookCanonConversationReuseV1 ?? null;
  const gengoLawKernel = resolveKhsGengoLawKernelV1(msg);
  const sanskritComparative = resolveSanskritComparativeKernelV1(msg, {
    uncertainty_registry_flags: ark?.uncertainty_registry.flags ?? null,
  });
  const comparativeMapping = buildComparativeMappingV1({ bookCanonReuse: ark });
  const digestPromotions = MATERIAL_DIGEST_LEDGER_CATALOG_V1.map((e) => evaluateDigestPromotionV1(e));
  const lawPromotionGate = resolveLawPromotionGateV1(digestPromotions);
  const fractalPhysics = projectFractalPhysicsV1(msg);
  const learningBridge = buildLearningConversationBridgeV1(
    gengoLawKernel,
    sanskritComparative,
    comparativeMapping,
    fractalPhysics,
    lawPromotionGate,
  );
  const studyLedger = buildStudyLedgerEntriesV1();
  const studyLoopStep = runSelfLearningStudyLoopStepV1(0);
  const nas_locator_manifest = buildTenmonNasLocatorManifestV1(
    MATERIAL_DIGEST_LEDGER_CATALOG_V1.map((e) => ({ id: e.id, category: e.category })),
  );
  const nas_autostudy_handoff = buildTenmonNasAutostudyHandoffV1();

  return {
    card: CARD,
    study_planner_ready: true,
    study_loop_ready: true,
    khs_gengo_law_kernel_ready: true,
    sanskrit_comparative_ready: true,
    comparative_mapping_ready: true,
    material_digest_promotion_ready: true,
    law_promotion_gate_ready: true,
    fractal_physics_projection_ready: true,
    learning_conversation_bridge_ready: learningBridge.learningBridgeReady,
    study_ledger_ready: studyLedger.length >= 1,
    nas_locator_manifest,
    nas_autostudy_handoff,
    gengoLawKernel,
    sanskritComparative,
    comparativeMapping,
    digestPromotions,
    lawPromotionGate,
    fractalPhysics,
    learningBridge,
    studyLedger,
    studyLoopStep,
  };
}
