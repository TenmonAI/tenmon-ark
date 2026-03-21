/**
 * AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1
 * Multi-cycle supervisor confidence + bundle fingerprints + stale-dist heuristic.
 * Read-only; never mutates schema / canon / will-meaning-beauty.
 */
import type { Request, Response } from "express";
import {
  runSelfBuildSupervisorCycleV1,
  staleDistAfterBuildHeuristicV1,
  runtimeBundleScriptPresenceV1,
  NEXT_CARD_AFTER_SUPERVISOR,
  type SupervisorCycleBodyV1,
} from "./selfBuildSupervisorCycleCoreV1.js";

const V = "AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1";
const NEXT_CARD_FORWARD = "SEED_LEARNING_EFFECT_AUDIT_V1";

function summarizeCycle(c: SupervisorCycleBodyV1) {
  return {
    cycleId: c.cycleId,
    omegaKind: c.omega.kind,
    riskTier: c.omega.riskTier,
    reviewRequired: c.omega.reviewRequired,
    nextCard: c.omega.nextCard,
    nextCardDispatch: c.omega.nextCardDispatch,
    acceptanceStatus: c.phases.acceptance.status,
    gitSha: (c.deltaS.streams.buildHealthProbe as any)?.gitSha ?? null,
    uptimeSec: (c.deltaS.streams.runtime as any)?.uptimeSec ?? null,
  };
}

/** GET /api/audit/autonomous-runtime-confidence-v1 */
export function handleAutonomousRuntimeConfidenceAuditV1(_req: Request, res: Response): void {
  const ts = new Date().toISOString();
  try {
    const natural: SupervisorCycleBodyV1[] = [];
    for (let i = 0; i < 3; i++) {
      const r = runSelfBuildSupervisorCycleV1({ method: "GET", simulate: null });
      if (!r.ok) {
        res.status(500).json({ ok: false, v: V, timestamp: ts, error: r.error, cycleId: r.cycleId });
        return;
      }
      natural.push(r);
    }

    const rb = runSelfBuildSupervisorCycleV1({ method: "POST", simulate: "rollback" });
    if (!rb.ok) {
      res.status(500).json({ ok: false, v: V, timestamp: ts, error: rb.error, cycleId: rb.cycleId });
      return;
    }
    const simRollback = rb;
    const qb = runSelfBuildSupervisorCycleV1({ method: "POST", simulate: "quarantine" });
    if (!qb.ok) {
      res.status(500).json({ ok: false, v: V, timestamp: ts, error: qb.error, cycleId: qb.cycleId });
      return;
    }
    const simQuarantine = qb;

    const first = natural[0]!;
    const nextCards = natural.map((c) => c.omega.nextCard);
    const nextCardSingleton = nextCards.every((n) => n === first.omega.nextCard) && nextCards.length === 3;
    const omegaStable = natural.every(
      (c) => c.omega.kind === first.omega.kind && c.omega.riskTier === first.omega.riskTier
    );
    const gitShas = natural.map((c) => String((c.deltaS.streams.buildHealthProbe as any)?.gitSha ?? ""));
    const gitStable = gitShas[0] === gitShas[1] && gitShas[1] === gitShas[2];
    const uptimes = natural.map((c) => Number((c.deltaS.streams.runtime as any)?.uptimeSec ?? -1));
    const uptimeMonotonic = uptimes[1] >= uptimes[0] && uptimes[2] >= uptimes[1];

    const rollbackOk =
      simRollback.omega.kind === "rollback" &&
      simRollback.phases.acceptance.status === "fail" &&
      simRollback.omega.riskTier === "high" &&
      simRollback.omega.nextCardDispatch === "blocked_quarantine";
    const quarantineOk =
      simQuarantine.omega.kind === "quarantine" &&
      simQuarantine.phases.acceptance.status === "fail" &&
      simQuarantine.omega.riskTier === "high";

    const lowPathOk =
      first.omega.kind === "advance_next_card"
        ? first.omega.riskTier === "low" && first.omega.reviewRequired === false
        : true;

    const stale = staleDistAfterBuildHeuristicV1();
    const bundles = runtimeBundleScriptPresenceV1();
    const bundleIntegrityScore =
      Object.values(bundles).filter(Boolean).length / Math.max(1, Object.keys(bundles).length);

    const supervisorStability =
      (omegaStable ? 0.35 : 0) +
      (nextCardSingleton ? 0.25 : 0) +
      (gitStable ? 0.15 : 0) +
      (uptimeMonotonic ? 0.15 : 0) +
      (rollbackOk && quarantineOk ? 0.1 : 0);

    const riskRoutingIntegrity = rollbackOk && quarantineOk && (first.omega.kind !== "advance_next_card" || lowPathOk) ? 1 : 0.5;

    let aggregateConfidence = supervisorStability * 0.55 + riskRoutingIntegrity * 0.25 + bundleIntegrityScore * 0.2;
    if (stale.suspected) aggregateConfidence *= 0.45;

    const noAutoEscalation = aggregateConfidence < 0.82 || stale.suspected || first.phases.acceptance.status !== "pass";
    const reviewPreserved =
      (first.omega.kind === "advance_next_card" && first.omega.reviewRequired === false) ||
      first.omega.kind !== "advance_next_card";

    let recommendation: "proceed_low_risk" | "review_required" | "no_seal_restart_or_constitution";
    if (stale.suspected) recommendation = "no_seal_restart_or_constitution";
    else if (first.phases.acceptance.status !== "pass" || aggregateConfidence < 0.75) recommendation = "review_required";
    else if (aggregateConfidence < 0.88) recommendation = "review_required";
    else recommendation = "proceed_low_risk";

    const body = {
      ok: true,
      v: V,
      timestamp: ts,
      confidence: {
        supervisorStability,
        nextCardSingletonContract: nextCardSingleton ? 1 : 0,
        riskRoutingIntegrity,
        bundleIntegrityScore,
        aggregateConfidence,
        staleDistPenaltyApplied: stale.suspected,
      },
      manifest: {
        supervisorNaturalCycles: natural.map(summarizeCycle),
        simulatedPaths: {
          rollback: summarizeCycle(simRollback),
          quarantine: summarizeCycle(simQuarantine),
        },
        bundleScriptPresence: bundles,
        staleDistHeuristic: stale,
        expectedNextCardFromSupervisor: NEXT_CARD_AFTER_SUPERVISOR,
      },
      gates: {
        noAutoEscalation,
        reviewPreserved,
        sealBlockedOnLowConfidence: aggregateConfidence < 0.75,
        bundlesNonAuthoritative: true,
      },
      nextCard: NEXT_CARD_FORWARD,
      policyNotes: [
        "監査のみ: will/meaning/beauty・schema 主幹は変更しない",
        "confidence が低い場合は自動昇格しない（noAutoEscalation）",
        "reviewRequired を simulate で無効化しない",
      ],
    };

    res.json(body);
  } catch (e: any) {
    res.status(500).json({ ok: false, v: V, timestamp: ts, error: String(e?.message ?? e) });
  }
}
