/**
 * TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1
 * いろは（人生理解 mapping）+ 断捨離（生活実装 layer）を bridged counseling に統合。KHS root は不変。
 */

import type { IrohaLifeCounselingKernelBundleV1 } from "./tenmonIrohaLifeCounselingKernelV1.js";
import type { DanshariLifeOrderKernelBundleV1 } from "./tenmonDanshariLifeOrderKernelV1.js";

export type IrohaDanshariCounselingBridgeBundleV1 = {
  card: "TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1";
  humanCounselingBridgeReady: boolean;
  lifeCenterHint: string;
  releaseHint: string;
  roleAcceptanceHint: string;
  orderRepairHint: string;
  nextRepairStep: string;
  /** finalize 用（中心→受容→離す→整える→次の一歩を自然文で接続） */
  combinedSurfaceHint: string;
};

const CARD = "TENMON_IROHA_DANSHARI_COUNSELING_BRIDGE_CURSOR_AUTO_V1" as const;

function counselRoute(routeReason: string): boolean {
  const rr = String(routeReason || "").trim();
  return rr === "KANAGI_CONVERSATION_V1" || rr === "N2_KANAGI_PHASE_TOP";
}

function defaultIrohaHints(): Pick<IrohaLifeCounselingKernelBundleV1, "irohaCenterHint" | "roleAcceptanceHint" | "passageFlowHint"> {
  return {
    irohaCenterHint: "迷いの中心を一文で固定する。",
    roleAcceptanceHint: "いま受け止める現実を一つだけ言語化する。",
    passageFlowHint: "役目の巡りを一段だけ観測する。",
  };
}

function defaultDanshariHints(): Pick<
  DanshariLifeOrderKernelBundleV1,
  "releaseTargetHint" | "priorityRepairHint" | "boundaryResetHint"
> {
  return {
    releaseTargetHint: "手放す候補を一つだけ列挙する。",
    priorityRepairHint: "整える順の先頭を一つだけ実行する。",
    boundaryResetHint: "境界を一か所だけ引き直す。",
  };
}

export function buildIrohaDanshariCounselingBridgeV1(
  _message: string,
  routeReason: string,
  iroha: IrohaLifeCounselingKernelBundleV1 | null,
  danshari: DanshariLifeOrderKernelBundleV1 | null,
): IrohaDanshariCounselingBridgeBundleV1 | null {
  if (!counselRoute(routeReason)) return null;
  if (!iroha && !danshari) return null;

  const defI = defaultIrohaHints();
  const defD = defaultDanshariHints();

  const lifeCenterHint = (iroha?.irohaCenterHint ?? defI.irohaCenterHint).slice(0, 240);
  const roleAcceptanceHint = (iroha?.roleAcceptanceHint ?? defI.roleAcceptanceHint).slice(0, 240);
  const releaseHint = (danshari?.releaseTargetHint ?? defD.releaseTargetHint).slice(0, 240);
  const orderRepairHint = `${danshari?.priorityRepairHint ?? defD.priorityRepairHint} ${danshari?.boundaryResetHint ?? defD.boundaryResetHint}`
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 240);
  const nextRepairStep = (danshari?.priorityRepairHint ?? defD.priorityRepairHint).slice(0, 240);

  const combinedSurfaceHint = `${lifeCenterHint} ${roleAcceptanceHint} ${releaseHint} ${danshari?.priorityRepairHint ?? defD.priorityRepairHint} ${nextRepairStep}`
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 240);

  return {
    card: CARD,
    humanCounselingBridgeReady: true,
    lifeCenterHint,
    releaseHint,
    roleAcceptanceHint,
    orderRepairHint,
    nextRepairStep,
    combinedSurfaceHint,
  };
}
