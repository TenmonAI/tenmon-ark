/**
 * Kokuzo — detailPlan / HYBRID 契約の公開面。
 * R1_20A 正規化は `planning/detailPlanContractP20`（ゲート出口）。
 */
export { stampKokuzoDetailPlanContractP20HybridV1 } from "../core/kokuzoDetailPlanStabilityV1.js";
export {
  createEmptyDetailPlanP20V1,
  ensureDetailPlanContractP20OnGatePayloadV1,
  type DetailPlanContractP20V1,
} from "../planning/detailPlanContractP20.js";
