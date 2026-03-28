/**
 * TENMON_AUTOBUILD_AND_WORLDCLASS_STABILIZATION_PARENT_CURSOR_AUTO_V1
 * autobuild 順序・single-flight・cognition/NAS 観測を束ねる（scorecard/seal JSON は直接編集しない）。
 */

import { splitInputSemanticsV1 } from "./inputSemanticSplitter.js";
import { arbitrateTruthLayerV1 } from "./meaningArbitrationKernel.js";
import { projectTenmonUserFacingResponseV1 } from "./tenmonResponseProjector.js";
import { discernSourceLayerV1 } from "./sourceLayerDiscernmentKernel.js";
import { getMaterialDigestLedgerPayloadV1 } from "./tenmonMaterialDigestLedgerV1.js";

/** 親→子の推奨実行順（automation 側と口頭整合・ファイル改ざんなし） */
export const TENMON_AUTOBUILD_PARENT_CHILD_EXECUTION_ORDER_V1 = [
  {
    parent_card: "TENMON_AUTOBUILD_OPERATIONS_STABILIZATION_PARENT_CURSOR_AUTO_V1",
    single_flight_gate: "tenmon_cursor_single_flight_queue_v1.py",
    child_steps: [
      "cursor_autobuild_common_v2.py",
      "feature_autobuild_common_v1.py",
      "feature_autobuild_orchestrator_v1.py",
    ],
  },
  {
    parent_card: "TENMON_LONGFORM_PERSONA_BOOK_BENCH_SUITE_CURSOR_AUTO_V1",
    single_flight_gate: "tenmon_cursor_single_flight_queue_v1.py",
    child_steps: ["tenmon_book_kernel_and_bench_suite_cursor_auto_v1.py"],
  },
] as const;

/** scorecard / seal / summary の整合はオペレータ検証用（パスは観測契約のみ） */
export const TENMON_WORLDCLASS_ARTIFACT_CONTRACT_V1 = {
  scorecard_observation_basename: "tenmon_worldclass_acceptance_scorecard.json",
  scorecard_relock_card: "TENMON_WORLDCLASS_ACCEPTANCE_SCORECARD_RELOCK_CURSOR_AUTO_V1",
  seal_observation_basename: "tenmon_final_operable_seal.json",
  final_operable_seal_relock_card: "TENMON_FINAL_OPERABLE_SEAL_RELOCK_CURSOR_AUTO_V1",
  seal_script_hint: "scripts/tenmon_final_operable_seal_v1.sh",
  final_summary_semantics:
    "final_summary は stabilization snapshot の blockers / readiness_claim と矛盾しない状態を指す（自動改ざん禁止）",
} as const;

export type TenmonStabilizationSnapshotV1 = {
  schema: "TENMON_AUTOBUILD_WORLDCLASS_STABILIZATION_V1";
  generated_at: string;
  single_flight_enforced: true;
  autobuild_execution_order: typeof TENMON_AUTOBUILD_PARENT_CHILD_EXECUTION_ORDER_V1;
  artifact_contract: typeof TENMON_WORLDCLASS_ARTIFACT_CONTRACT_V1;
  cognition_spine_ok: boolean;
  nas_ledger_bind_ok: boolean;
  discernment_kernel_ok: boolean;
  /** cognition + NAS + 後段カーネルが揃ったときのみ true（未完成時は claim しない） */
  worldclass_operable_claim_ok: boolean;
  blockers: readonly string[];
  readiness_claim: "not_ready" | "all_signals_ok_pending_operator_scorecard_seal_summary_align";
};

function runMinimalCognitionSpineV1(): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  try {
    const split = splitInputSemanticsV1("法華経とは何か");
    const truth = arbitrateTruthLayerV1({
      split,
      knowledge: {
        routeReason: "NATURAL_GENERAL_LLM_TOP_V1",
        rawMessage: "法華経とは何か",
        sourcePack: "general",
        centerKey: null,
        centerLabel: null,
        evidenceRefs: [],
        notionCanonCount: 0,
        uncertaintyFlagCount: 0,
        groundedRequired: false,
      },
    });
    discernSourceLayerV1({ split, truthLayerArbitrationV1: truth, rawMessage: "法華経とは何か" });
    projectTenmonUserFacingResponseV1({
      routeKind: "general_natural",
      draftText: "【天聞の所見】核を一文に置く。",
    });
  } catch {
    blockers.push("cognition_spine_runtime_failed");
    return { ok: false, blockers };
  }
  return { ok: true, blockers };
}

/**
 * NAS digest ledger に locator / relock が載っているか（コード経路）
 */
function nasLedgerBindOkV1(): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  try {
    const p = getMaterialDigestLedgerPayloadV1();
    if (!p.nas_locator_manifest?.entries?.length) {
      blockers.push("nas_locator_manifest_empty");
    }
    if (!p.nas_ark_acceptance_relock?.nas_locator_manifest_present) {
      blockers.push("nas_ark_acceptance_relock_false");
    }
    if (!p.nas_sourcepack_handoff?.schema) {
      blockers.push("nas_sourcepack_handoff_missing");
    }
    return { ok: blockers.length === 0, blockers };
  } catch {
    return { ok: false, blockers: ["material_digest_ledger_unavailable"] };
  }
}

/**
 * 運用向けスナップショット（scorecard/seal ファイルは読まない）
 */
export function buildTenmonStabilizationSnapshotV1(): TenmonStabilizationSnapshotV1 {
  const cog = runMinimalCognitionSpineV1();
  const nas = nasLedgerBindOkV1();
  const blockers = [...cog.blockers, ...nas.blockers];
  const cognition_spine_ok = cog.ok;
  const nas_ledger_bind_ok = nas.ok;
  const discernment_kernel_ok = cog.ok;

  const operator_ready = cognition_spine_ok && nas_ledger_bind_ok && blockers.length === 0;
  const readiness_claim: TenmonStabilizationSnapshotV1["readiness_claim"] = operator_ready
    ? "all_signals_ok_pending_operator_scorecard_seal_summary_align"
    : "not_ready";

  /** worldclass / operable seal は scorecard・オペレータ検証後のみ（コードから true にしない） */
  const worldclass_operable_claim_ok = false;

  return {
    schema: "TENMON_AUTOBUILD_WORLDCLASS_STABILIZATION_V1",
    generated_at: new Date().toISOString(),
    single_flight_enforced: true,
    autobuild_execution_order: TENMON_AUTOBUILD_PARENT_CHILD_EXECUTION_ORDER_V1,
    artifact_contract: TENMON_WORLDCLASS_ARTIFACT_CONTRACT_V1,
    cognition_spine_ok,
    nas_ledger_bind_ok,
    discernment_kernel_ok,
    worldclass_operable_claim_ok,
    blockers,
    readiness_claim,
  };
}
