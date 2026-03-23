import { Router, type Request, type Response } from "express";
import { getGitSha } from "../version.js";
import { getReadiness } from "../health/readiness.js";
import {
  handleIntelligenceOsMasterAuditV1,
  handleMetaOptimizerProbeV1,
} from "./evolutionAuditProbesV1.js";
import { handleSelfBuildSupervisorLoopV1 } from "./selfBuildSupervisorLoopV1.js";
import { handleAutonomousRuntimeConfidenceAuditV1 } from "./autonomousRuntimeConfidenceAuditV1.js";
import { handleSeedLearningEffectAuditV1 } from "./seedLearningEffectAuditV1.js";
import { handleMetaOptimizerBundleV1 } from "./metaOptimizerBundleV1.js";
import {
  handleCursorActionBrokerV1,
  handleFullAutonomousBuildLoopV1,
  handlePromptToCursorCompilerV1,
} from "./autonomousBuildPhaseV1.js";
import { handleDesktopUiActionBrokerV1 } from "./desktopUiActionBrokerV1.js";
import {
  handleMainlineCompletionFeedbackBindV1,
  handleMainlineCompletionSummaryExtractV1,
} from "./mainlineCompletionForensicRepairV1.js";
import {
  handleMainlineSupremeCompletionAuditLedgerV1,
  handleMainlineSupremeCompletionAuditV1,
  handleMainlineSupremeReauditInfoV1,
} from "./mainlineSupremeCompletionAuditV1.js";


/**
 * B1_CONSTITUTION_HASHES_V2
 * audit-only observability: expose constitution sha256 (first token).
 * No routing/chat behavior changes.
 */
function __readSha256FirstToken(p: string): string | null {
  try {
    const txt = String(fs.readFileSync(p, "utf8") || "").trim();
    const tok = txt.split(/\s+/)[0];
    return tok && tok.length >= 32 ? tok : null;
  } catch {
    return null;
  }
}

// FIX_CONSTITUTION_BIND_V1: constitution 3項目を null にしない（読み出し失敗時は暫定固定文字列）
const __constitutionFallback = "pending";

function __constitutionHashes(): Record<string, string> {
  const base = "/opt/tenmon-ark-data/constitution";
  return {
    OMEGA_CONTRACT_v1: __readSha256FirstToken(base + "/OMEGA_CONTRACT_v1.sha256") ?? __constitutionFallback,
    PDCA_BUILD_CONTRACT_v1: __readSha256FirstToken(base + "/TENMON-ARK_PDCA_BUILD_CONTRACT_v1.sha256") ?? __constitutionFallback,
    KHS_RUNTIME_CONTRACT_v1: __readSha256FirstToken(base + "/TENMON-ARK_KHS_RUNTIME_INTEGRATION_CONTRACT_v1.sha256") ?? __constitutionFallback,
  };
}

const BUILD_FEATURES_KOSHIKI = { ...BUILD_FEATURES, koshikiKernel: true } as const;
import { BUILD_MARK, BUILD_FEATURES } from "../build/buildInfo.js";
import * as fs from "fs"; // B1_CONSTITUTION_HASHES_V2
const router = Router();

/** SELF_EVOLUTION_RUNTIME_MICROPACK_V1: read-only meta optimizer probe */
router.get("/audit/evolution/meta-optimizer-v1", handleMetaOptimizerProbeV1);
/** SELF_EVOLUTION_RUNTIME_MICROPACK_V1: intelligence OS master audit snapshot */
router.get("/audit/evolution/intelligence-os-master-v1", handleIntelligenceOsMasterAuditV1);

/** SELF_BUILD_SUPERVISOR_LOOP_V1: one supervisor cycle (D·ΔS→Ω), read-only */
router.get("/audit/supervisor/self-build-loop-v1", handleSelfBuildSupervisorLoopV1);
router.post("/audit/supervisor/self-build-loop-v1", handleSelfBuildSupervisorLoopV1);

/** AUTONOMOUS_RUNTIME_CONFIDENCE_AUDIT_V1: 3× supervisor + sim paths + confidence (read-only) */
router.get("/audit/autonomous-runtime-confidence-v1", handleAutonomousRuntimeConfidenceAuditV1);

/** SEED_LEARNING_EFFECT_AUDIT_V1: seed/cluster/apply/synapse/training forensic + effect signals */
router.get("/audit/seed-learning-effect-v1", handleSeedLearningEffectAuditV1);

/** META_OPTIMIZER_V1 bundle: nextPriority / suggestedCard / confidence / dispatchMode */
router.get("/audit/meta-optimizer-bundle-v1", handleMetaOptimizerBundleV1);

/** CARD 5 CURSOR_ACTION_BROKER_V1 — schema / states（実行なし） */
router.get("/audit/cursor-action-broker-v1", handleCursorActionBrokerV1);
/** CARD 6 PROMPT_TO_CURSOR_COMPILER_V1 */
router.get("/audit/prompt-to-cursor-compiler-v1", handlePromptToCursorCompilerV1);
/** CARD 7 FULL_AUTONOMOUS_BUILD_LOOP_V1 */
router.get("/audit/full-autonomous-build-loop-v1", handleFullAutonomousBuildLoopV1);

/** DESKTOP_UI_ACTION_BROKER_V1 — desktop UI 権限つき実行器スキーマ（実操作なし） */
router.get("/audit/desktop-ui-action-broker-v1", handleDesktopUiActionBrokerV1);

/** MAINLINE_SUMMARY_EXTRACTOR_AND_SCORER_REPAIR_V1 — POST body = /api/chat 応答 JSON と同等 */
router.post("/audit/mainline-completion-summary-extract-v1", handleMainlineCompletionSummaryExtractV1);

/** MAINLINE_COMPLETION_AUTO_FEEDBACK_BIND_V1 — GET/POST forensicRoot + x-tenmon-local-test:1 */
router.get("/audit/mainline-completion-feedback-bind-v1", handleMainlineCompletionFeedbackBindV1);
router.post("/audit/mainline-completion-feedback-bind-v1", handleMainlineCompletionFeedbackBindV1);

/** MAINLINE_SUPREME_COMPLETION_AUDIT_V1 — manifest / レポート読取（forensicRoot + local-test） */
router.get("/audit/mainline-supreme-completion-audit-v1", handleMainlineSupremeCompletionAuditV1);
/** MAINLINE_SUPREME_REAUDIT_V1 — 再監査マニフェスト */
router.get("/audit/mainline-supreme-reaudit-v1", handleMainlineSupremeReauditInfoV1);
router.post("/audit/mainline-supreme-completion-audit-ledger-v1", handleMainlineSupremeCompletionAuditLedgerV1);

router.get("/audit", (_req: Request, res: Response) => {
  const handlerTime = Date.now();
  const pid = process.pid;
  const uptime = process.uptime();
  const r = getReadiness();
  console.log(`[AUDIT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()} stage=${r.stage}`);
  
  try {
    const gitSha = getGitSha();
    if (!r.ready) {
      // Not ready: 503 Service Unavailable
      return res.status(503).json({
        ok: false,
        timestamp: new Date().toISOString(),
        gitSha,
        pid,
        uptime: Math.floor(uptime),
        readiness: r,
      build: { mark: BUILD_MARK, features: BUILD_FEATURES_KOSHIKI },
        });
    }
    // Ready: 200 OK
    return res.json({
      constitution: { ...__constitutionHashes() },
      ok: true,
      timestamp: new Date().toISOString(),
      gitSha,
      pid,
      uptime: Math.floor(uptime),
      readiness: r,
      build: { mark: BUILD_MARK, features: BUILD_FEATURES_KOSHIKI },
    });
  } catch (error) {
    // gitSha と readiness は取得を試みる（失敗時は空文字/null）
    let gitSha = "";
    let readiness = null;
    try {
      gitSha = getGitSha();
    } catch {
      // gitSha 取得失敗時は空文字のまま
    }
    try {
      readiness = getReadiness();
    } catch {
      // readiness 取得失敗時は null のまま
    }
    res.status(500).json({
      ok: false,
      timestamp: new Date().toISOString(),
      gitSha,
      error: error instanceof Error ? error.message : String(error),
      pid,
      uptime: Math.floor(uptime),
      readiness,
    });
  }
});

/**
 * TENMON_AUDIT_BUILD_ROUTE_RESTORE_V1
 * /api/audit.build の最小契約を返す（read-only）。
 */
router.get("/audit.build", (_req: Request, res: Response) => {
  const now = new Date().toISOString();
  const r = getReadiness();
  let gitSha = "";
  try {
    gitSha = getGitSha();
  } catch {
    gitSha = "";
  }
  return res.json({
    ok: true,
    card: "TENMON_AUDIT_BUILD_ROUTE_RESTORE_V1",
    timestamp: now,
    gitSha,
    readiness: r,
    build: { mark: BUILD_MARK, features: BUILD_FEATURES_KOSHIKI },
    contract: {
      endpoint: "/api/audit.build",
      minimal_fields: ["ok", "timestamp", "gitSha", "readiness", "build"],
      purpose: "minimum build audit contract for stabilization cards",
    },
  });
});
export default router;
