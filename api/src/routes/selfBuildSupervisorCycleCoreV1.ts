/**
 * SELF_BUILD_SUPERVISOR_LOOP_V1 — shared cycle core (read-only) for HTTP handler + confidence audit.
 */
import * as fs from "fs";
import * as path from "path";
import { getDb } from "../db/index.js";
import { getReadiness } from "../health/readiness.js";
import { getGitSha } from "../version.js";
import { BUILD_MARK, BUILD_FEATURES } from "../build/buildInfo.js";
import { SELF_LEARNING_RFB_LEDGER_MARKER } from "../core/selfLearningRuleFeedbackV1.js";

export const SUPERVISOR_LOOP_V = "SELF_BUILD_SUPERVISOR_LOOP_V1";
/** After supervisor PASS, run confidence audit before seed learning deep-dive. */
export const NEXT_CARD_AFTER_SUPERVISOR = "AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1";

export type SimulateOutcomeV1 = "rollback" | "quarantine" | null;

export type SupervisorCycleInputV1 = {
  method: string;
  cycleNote?: string;
  simulate: SimulateOutcomeV1;
};

function readSha256FirstToken(p: string): string | null {
  try {
    const txt = String(fs.readFileSync(p, "utf8") || "").trim();
    const tok = txt.split(/\s+/)[0];
    return tok && tok.length >= 32 ? tok : null;
  } catch {
    return null;
  }
}

export function buildDObjectV1(): {
  nonNegotiables: string[];
  verifiedCanon: Record<string, string>;
  acceptanceHooks: string[];
  rollbackRef: string;
  quarantineRef: string;
} {
  const base = "/opt/tenmon-ark-data/constitution";
  const fallback = "pending";
  const verifiedCanon = {
    OMEGA_CONTRACT_v1: readSha256FirstToken(`${base}/OMEGA_CONTRACT_v1.sha256`) ?? fallback,
    PDCA_BUILD_CONTRACT_v1: readSha256FirstToken(`${base}/TENMON-ARK_PDCA_BUILD_CONTRACT_v1.sha256`) ?? fallback,
    KHS_RUNTIME_CONTRACT_v1: readSha256FirstToken(`${base}/TENMON-ARK_KHS_RUNTIME_INTEGRATION_CONTRACT_v1.sha256`) ?? fallback,
  };
  return {
    nonNegotiables: [
      "no-touch: kokuzo schema mainline",
      "will/meaning/beauty core unchanged by self-build automation",
      "seal only on acceptance PASS",
    ],
    verifiedCanon,
    acceptanceHooks: ["build", "health", "bundle_micro_scripts", "audit_probes"],
    rollbackRef: "SELF_BUILD_RESTORE_POLICY_V1",
    quarantineRef: "SELF_BUILD_CONSTITUTION_AND_POLICY_V1#quarantine",
  };
}

export function constitutionPending(D: ReturnType<typeof buildDObjectV1>): boolean {
  return Object.values(D.verifiedCanon).some((v) => v === "pending");
}

function countOr0(db: ReturnType<typeof getDb>, sql: string): number {
  try {
    const r = db.prepare(sql).get() as { c?: number } | undefined;
    return Number(r?.c ?? 0);
  } catch {
    return -1;
  }
}

export type SupervisorCycleBodyV1 = {
  ok: true;
  v: string;
  cycleId: string;
  timestamp: string;
  D: ReturnType<typeof buildDObjectV1>;
  deltaS: {
    streams: Record<string, unknown>;
  };
  omega: {
    kind: "advance_next_card" | "rollback" | "quarantine" | "one_step_patch_plan";
    riskTier: "low" | "high";
    reviewRequired: boolean;
    nextCard: string;
    nextCardDispatch: "allowed" | "hold_review" | "blocked_quarantine";
    patchPlan: { kind: string; steps: string[]; risk: "low" | "high" };
    sealReject: boolean;
    oneStep: string | null;
  };
  phases: {
    observe: { completedAt: string; summary: string };
    decide: {
      completedAt: string;
      omegaFormula: string;
      Dscore: number;
      deltaMag: number;
      omegaScalar: number;
      omegaKind: string;
      riskTier: string;
    };
    dispatch: { completedAt: string; plan: string[]; reviewRequired: boolean };
    acceptance: {
      completedAt: string;
      status: "pass" | "fail";
      gates: { build: string; health: boolean; supervisorCycle: boolean };
    };
  };
  evidenceBundlePath: string | null;
};

export function runSelfBuildSupervisorCycleV1(input: SupervisorCycleInputV1): SupervisorCycleBodyV1 | { ok: false; error: string; cycleId: string; timestamp: string; v: string } {
  const cycleId = `sbsl_${Date.now().toString(36)}_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
  const ts = new Date().toISOString();
  try {
    const D = buildDObjectV1();
    const readiness = getReadiness();
    let gitSha = "";
    try {
      gitSha = getGitSha();
    } catch {
      gitSha = "";
    }

    const db = getDb("kokuzo");
    const kanagiN = countOr0(db, `SELECT COUNT(*) AS c FROM kanagi_growth_ledger`);
    let rfbN = 0;
    try {
      const rfbR = db
        .prepare(`SELECT COUNT(*) AS c FROM kanagi_growth_ledger WHERE unresolved_class = ?`)
        .get(SELF_LEARNING_RFB_LEDGER_MARKER) as { c?: number } | undefined;
      rfbN = Number(rfbR?.c ?? 0);
    } catch {
      rfbN = -1;
    }
    const applyN = countOr0(db, `SELECT COUNT(*) AS c FROM khs_apply_log`);
    const seedClN = countOr0(db, `SELECT COUNT(*) AS c FROM khs_seed_clusters`);
    const densityN = countOr0(db, `SELECT COUNT(*) AS c FROM conversation_density_ledger_runtime_v1`);

    const inputNote = (input.cycleNote ?? "").slice(0, 500);
    const simulate = input.simulate;

    const deltaS = {
      streams: {
        input: { cycleNote: inputNote || null, method: input.method },
        runtime: {
          pid: process.pid,
          uptimeSec: Math.floor(process.uptime()),
          readinessStage: readiness.stage,
          listenReady: readiness.listenReady,
        },
        learning: { kanagiGrowthLedgerRows: kanagiN, selfLearningRfbRows: rfbN },
        sourceMaterial: { khsApplyLogRows: applyN, khsSeedClusterRows: seedClN },
        buildHealthProbe: {
          gitSha,
          buildMark: BUILD_MARK,
          featuresKeys: Object.keys(BUILD_FEATURES).slice(0, 24),
        },
        acceptanceProbe: { serviceReady: readiness.ready },
        contractAnchor: { constitutionPending: constitutionPending(D), keys: Object.keys(D.verifiedCanon) },
        conversationMetrics: { densityLedgerRows: densityN },
      },
    };

    const Dscore = constitutionPending(D) || !readiness.ready ? 0 : 1;
    const deltaMag = Math.min(
      1,
      (Math.max(0, kanagiN) + Math.max(0, applyN) + Math.max(0, densityN) + Math.max(0, seedClN)) / 10000
    );
    const omegaScalar = Dscore * (0.2 + 0.8 * deltaMag);

    let omegaKind: SupervisorCycleBodyV1["omega"]["kind"];
    let riskTier: "low" | "high";
    let reviewRequired: boolean;
    let nextCardDispatch: SupervisorCycleBodyV1["omega"]["nextCardDispatch"];
    let acceptanceStatus: "pass" | "fail";
    const patchPlan: SupervisorCycleBodyV1["omega"]["patchPlan"] = {
      kind: "no_op",
      steps: [],
      risk: "low",
    };

    if (simulate === "rollback") {
      omegaKind = "rollback";
      riskTier = "high";
      reviewRequired = true;
      nextCardDispatch = "blocked_quarantine";
      acceptanceStatus = "fail";
      patchPlan.kind = "rollback_forensic";
      patchPlan.steps = ["SELF_BUILD_RESTORE_POLICY_V1: restore known-good HEAD", "forensic: git diff + failed acceptance one-liner"];
      patchPlan.risk = "high";
    } else if (simulate === "quarantine") {
      omegaKind = "quarantine";
      riskTier = "high";
      reviewRequired = true;
      nextCardDispatch = "blocked_quarantine";
      acceptanceStatus = "fail";
      patchPlan.kind = "quarantine_hold";
      patchPlan.steps = ["isolate_staging_branch", "no_auto_seal_until_review"];
      patchPlan.risk = "high";
    } else if (!readiness.ready) {
      omegaKind = "quarantine";
      riskTier = "high";
      reviewRequired = true;
      nextCardDispatch = "blocked_quarantine";
      acceptanceStatus = "fail";
      patchPlan.kind = "service_not_ready";
      patchPlan.steps = [`wait_stage:${readiness.stage}`, "health/gate PASS まで dispatch 禁止"];
      patchPlan.risk = "high";
    } else if (constitutionPending(D)) {
      omegaKind = "one_step_patch_plan";
      riskTier = "high";
      reviewRequired = true;
      nextCardDispatch = "hold_review";
      acceptanceStatus = "fail";
      patchPlan.kind = "constitution_anchor";
      patchPlan.steps = ["/opt/tenmon-ark-data/constitution/*.sha256 を実ファイルで満たす"];
      patchPlan.risk = "high";
    } else {
      omegaKind = "advance_next_card";
      riskTier = "low";
      reviewRequired = false;
      nextCardDispatch = "allowed";
      acceptanceStatus = "pass";
      patchPlan.kind = "forward_autonomous_audit";
      patchPlan.steps = ["run_AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1_when_ready"];
      patchPlan.risk = "low";
    }

    const phases: SupervisorCycleBodyV1["phases"] = {
      observe: {
        completedAt: ts,
        summary: "D loaded; ΔS 8 streams sampled (read-only)",
      },
      decide: {
        completedAt: ts,
        omegaFormula: "Ω = D·ΔS (scalar interpret: Dscore * deltaMag)",
        Dscore,
        deltaMag,
        omegaScalar,
        omegaKind,
        riskTier,
      },
      dispatch: {
        completedAt: ts,
        plan: [patchPlan.kind, `nextCard=${NEXT_CARD_AFTER_SUPERVISOR}`, `dispatch=${nextCardDispatch}`],
        reviewRequired,
      },
      acceptance: {
        completedAt: ts,
        status: acceptanceStatus,
        gates: { build: "external", health: readiness.ready, supervisorCycle: true },
      },
    };

    return {
      ok: true,
      v: SUPERVISOR_LOOP_V,
      cycleId,
      timestamp: ts,
      D,
      deltaS,
      omega: {
        kind: omegaKind,
        riskTier,
        reviewRequired,
        nextCard: NEXT_CARD_AFTER_SUPERVISOR,
        nextCardDispatch,
        patchPlan,
        sealReject: false,
        oneStep: patchPlan.steps[0] ?? null,
      },
      phases,
      evidenceBundlePath: null,
    };
  } catch (e: any) {
    return {
      ok: false,
      v: SUPERVISOR_LOOP_V,
      cycleId,
      timestamp: ts,
      error: String(e?.message ?? e),
    };
  }
}

/** Heuristic: dist/index.js newer than approximate process boot → likely forgot restart after build. */
export function staleDistAfterBuildHeuristicV1(): {
  suspected: boolean;
  distMtimeMs: number | null;
  approxBootMs: number;
  distPath: string;
} {
  const distPath = path.join(process.cwd(), "dist", "index.js");
  const approxBootMs = Date.now() - process.uptime() * 1000;
  let distMtimeMs: number | null = null;
  let suspected = false;
  try {
    distMtimeMs = fs.statSync(distPath).mtimeMs;
    suspected = distMtimeMs > approxBootMs + 3000;
  } catch {
    distMtimeMs = null;
  }
  return { suspected, distMtimeMs, approxBootMs, distPath };
}

/** Read-only: runtime micropack scripts exist (docs-pass → runtime-pass 束の足がかり). */
export function runtimeBundleScriptPresenceV1(): Record<string, boolean> {
  const root = process.cwd();
  const p = (rel: string) => fs.existsSync(path.join(root, rel));
  return {
    selfEvolutionRuntimeMicropack: p("scripts/self_evolution_runtime_micropack_v1.sh"),
    memoryPersonaRuntimeMicropack: p("scripts/memory_persona_runtime_micropack_v1.sh"),
    externalSourceKokuzoRuntimeMicropack: p("scripts/external_source_kokuzo_runtime_micropack_v1.sh"),
    selfBuildSupervisorLoop: p("scripts/self_build_supervisor_loop_v1.sh"),
  };
}
