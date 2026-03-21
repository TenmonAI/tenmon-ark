/**
 * EVOLUTION_LEDGER_V1 — append-only causal ledger (kokuzo.sqlite / evolution_ledger_v1)
 */
import { randomBytes } from "node:crypto";
import { getDb } from "../db/index.js";

export type EvolutionLedgerStatusV1 = "accepted" | "rejected" | "rollback_pending";

export function appendEvolutionLedgerEventV1(input: {
  sourceCard: string;
  changedLayer: string;
  beforeSummary: Record<string, unknown>;
  afterSummary: Record<string, unknown>;
  affectedRoute: string;
  affectedSourcePack: string;
  affectedDensity: string;
  affectedProse: string;
  regressionRisk: string;
  acceptedBy: string;
  status?: EvolutionLedgerStatusV1;
}): string {
  const db = getDb("kokuzo");
  const eventId = `evo_${Date.now().toString(36)}_${randomBytes(5).toString("hex")}`;
  const status = input.status ?? "accepted";
  db.prepare(
    `INSERT INTO evolution_ledger_v1 (
      eventId, sourceCard, changedLayer, beforeSummary, afterSummary,
      affectedRoute, affectedSourcePack, affectedDensity, affectedProse,
      regressionRisk, acceptedBy, status, createdAt
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))`
  ).run(
    eventId,
    input.sourceCard.slice(0, 200),
    input.changedLayer.slice(0, 200),
    JSON.stringify(input.beforeSummary),
    JSON.stringify(input.afterSummary),
    input.affectedRoute.slice(0, 400),
    input.affectedSourcePack.slice(0, 400),
    input.affectedDensity.slice(0, 200),
    input.affectedProse.slice(0, 2000),
    input.regressionRisk.slice(0, 64),
    input.acceptedBy.slice(0, 128),
    status
  );
  return eventId;
}

/** 1 リクエスト 1 行（payload オブジェクトにフラグ） */
export function tryAppendEvolutionLedgerSnapshotOnceV1(payload: Record<string, unknown>): string | null {
  if ((payload as any).__evolutionLedgerV1Done) return null;
  const df = payload.decisionFrame as any;
  const ku = df?.ku;
  if (!ku || typeof ku !== "object") return null;

  (payload as any).__evolutionLedgerV1Done = true;

  const rp = ku.responsePlan && typeof ku.responsePlan === "object" ? ku.responsePlan : null;
  const dc = rp?.densityContract && typeof rp.densityContract === "object" ? rp.densityContract : null;
  const ss = ku.sourceStackSummary && typeof ku.sourceStackSummary === "object" ? ku.sourceStackSummary : null;
  const sp = String(ku.sourcePack ?? "").slice(0, 200);

  const afterSummary: Record<string, unknown> = {
    routeReason: ku.routeReason ?? null,
    sourceKinds: ss && Array.isArray((ss as any).sourceKinds) ? (ss as any).sourceKinds : null,
    kokuzoBridge: (ku.thoughtCoreSummary as any)?.kokuzoSeedBridge ?? null,
    densityTarget: dc && typeof (dc as any).densityTarget === "string" ? (dc as any).densityTarget : null,
    lawsUsedCount: Array.isArray(ku.lawsUsed) ? ku.lawsUsed.length : 0,
  };

  const prose = String((payload as any).response ?? "").replace(/\s+/g, " ").trim().slice(0, 400);

  const bridged = Boolean((ku.thoughtCoreSummary as any)?.kokuzoSeedBridge);
  const sourceCard = bridged ? "KOKUZO_SEED_LEARNING_BRIDGE_V1" : "EVOLUTION_LEDGER_V1";
  const layer = bridged ? "kokuzo_thought_binder_sourceStack" : "finalize_ku_snapshot";

  return appendEvolutionLedgerEventV1({
    sourceCard,
    changedLayer: layer,
    beforeSummary: {},
    afterSummary,
    affectedRoute: String(ku.routeReason ?? "").slice(0, 400),
    affectedSourcePack: sp,
    affectedDensity: String((dc as any)?.densityTarget ?? "").slice(0, 200),
    affectedProse: prose,
    regressionRisk: bridged ? "low" : "unknown",
    acceptedBy: "runtime_finalize_v1",
    status: "accepted",
  });
}

export function appendEvolutionLedgerRejectOrRollbackV1(input: {
  sourceCard: string;
  changedLayer: string;
  note: string;
  status: Extract<EvolutionLedgerStatusV1, "rejected" | "rollback_pending">;
}): string {
  return appendEvolutionLedgerEventV1({
    sourceCard: input.sourceCard,
    changedLayer: input.changedLayer,
    beforeSummary: { kind: "rollback_or_reject_marker" },
    afterSummary: { note: input.note.slice(0, 500) },
    affectedRoute: "",
    affectedSourcePack: "",
    affectedDensity: "",
    affectedProse: "",
    regressionRisk: "high",
    acceptedBy: "human_or_governor_v1",
    status: input.status,
  });
}
