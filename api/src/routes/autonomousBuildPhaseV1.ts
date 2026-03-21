/**
 * CARDS 5–7: CURSOR_ACTION_BROKER_V1 / PROMPT_TO_CURSOR_COMPILER_V1 / FULL_AUTONOMOUS_BUILD_LOOP_V1
 * Read-only audit endpoints — 実 Cursor 実行はしない（schema / compiled prompt / loop 状態の提示のみ）。
 */
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";
import { getReadiness } from "../health/readiness.js";
import { staleDistAfterBuildHeuristicV1 } from "./selfBuildSupervisorCycleCoreV1.js";

const BROKER_V = "CURSOR_ACTION_BROKER_V1";
const COMPILER_V = "PROMPT_TO_CURSOR_COMPILER_V1";
const LOOP_V = "FULL_AUTONOMOUS_BUILD_LOOP_V1";

/** GET /api/audit/cursor-action-broker-v1 */
export function handleCursorActionBrokerV1(_req: Request, res: Response): void {
  res.json({
    ok: true,
    v: BROKER_V,
    timestamp: new Date().toISOString(),
    schemaVersion: 1,
    brokerInput: {
      oneOf: ["DecisionPlanV1", "ExecutionDispatchV1"],
      description: "SELF_BUILD_OBSERVE_AND_TASK_SCHEMA_V1 系に整合する計画または dispatch",
    },
    brokerOutput: {
      CursorActionDispatchV1: {
        promptText: "string",
        targetFiles: "string[]",
        allowedActions: "string[]",
        blockedActions: "string[]",
        requiresHumanApproval: "boolean",
        reviewReason: "string | null",
        resultCapturePath: "string",
        state: "CursorBrokerState",
      },
    },
    states: [
      "cursor_idle",
      "cursor_prompt_ready",
      "cursor_patch_running",
      "cursor_waiting_run",
      "cursor_waiting_review",
      "cursor_result_reading",
      "cursor_done",
      "cursor_failed",
    ],
    rules: {
      noHighRiskAutoRun: true,
      noTouchBlockedAtBroker: true,
      cardContractPreserved: true,
      sealNotDecidedHere: true,
      evidenceCaptureRequired: true,
    },
    exampleDispatch: {
      state: "cursor_prompt_ready",
      promptText: "[CARD] MIN_DIFF_PATCH …",
      targetFiles: ["api/src/routes/example.ts"],
      allowedActions: ["read_file", "apply_patch"],
      blockedActions: ["kokuzo_schema_direct_edit", "dist_edit", "production_db_restore"],
      requiresHumanApproval: false,
      reviewReason: null,
      resultCapturePath: "/tmp/cursor_evidence_bundle/…",
    },
    nextCard: "PROMPT_TO_CURSOR_COMPILER_V1",
  });
}

function compilePromptForCard(card: string): Record<string, unknown> {
  const baseNoTouch = [
    "api/src/db/kokuzo_schema.sql（本番主幹・カード承認なし禁止）",
    "dist/ 直編集禁止",
    "cross-user memory 混線禁止",
  ];
  const checklist = [
    "build PASS",
    "health PASS",
    "acceptance PASS 以外 seal 禁止",
    "docs/runtime 混在禁止",
  ];
  const rollback = "git restore / SELF_BUILD_RESTORE_POLICY_V1 に従い問題コミットのみ revert";
  const longPrompt = [
    `カード: ${card}`,
    "契約: Ω=D·ΔS、no-touch / quarantine / reviewRequired を厳守。",
    "作業: 最小 diff、1 変更=1 検証、証跡 evidenceBundlePath を残す。",
    "完了: build && health && 対象 acceptance。",
  ].join("\n");

  return {
    compiledPrompt: longPrompt,
    taskSummary: `${card} を MIN_DIFF_PATCH で実装し、監査可能な証跡を残す`,
    targetFiles: ["api/src/routes/…", "api/docs/constitution/…"],
    riskLabel: card.includes("AUTONOMOUS") || card.includes("FULL") ? "high" : "low",
    noTouch: baseNoTouch,
    acceptanceChecklist: checklist,
    rollbackHint: rollback,
    evidencePath: "${EVIDENCE_ROOT}/envelope.json",
    nextStepHint: "broker へ渡し、requiresHumanApproval を risk に応じて true に",
    reviewRequired: card.includes("FULL") || card.includes("schema"),
    autoCandidateEligible: !card.includes("FULL"),
  };
}

/** GET /api/audit/prompt-to-cursor-compiler-v1?card=… */
export function handlePromptToCursorCompilerV1(req: Request, res: Response): void {
  const card = String(req.query.card ?? "CURSOR_ACTION_BROKER_V1").slice(0, 120);
  const compiled = compilePromptForCard(card);
  res.json({
    ok: true,
    v: COMPILER_V,
    timestamp: new Date().toISOString(),
    cardRequested: card,
    ...compiled,
    nextCard: "FULL_AUTONOMOUS_BUILD_LOOP_V1",
  });
}

/** GET /api/audit/full-autonomous-build-loop-v1 */
export function handleFullAutonomousBuildLoopV1(_req: Request, res: Response): void {
  const ts = new Date().toISOString();
  const readiness = getReadiness();
  const stale = staleDistAfterBuildHeuristicV1();
  let ledgerN = -1;
  let synN = 0;
  try {
    const db = getDb("kokuzo");
    ledgerN = Number(
      (db.prepare(`SELECT COUNT(*) AS c FROM evolution_ledger_v1`).get() as { c?: number } | undefined)?.c ?? -1
    );
    synN = Number(
      (db.prepare(`SELECT COUNT(*) AS c FROM synapse_log`).get() as { c?: number } | undefined)?.c ?? 0
    );
  } catch {
    ledgerN = -1;
  }

  const loopPhases = [
    "observe",
    "decide",
    "compile_prompt",
    "dispatch",
    "execute",
    "acceptance",
    "rollback_or_quarantine",
    "learn",
    "next_card",
  ] as const;

  const autonomousBuildReach = Math.min(
    1,
    (readiness.ready ? 0.35 : 0) +
      (!stale.suspected ? 0.25 : 0) +
      (ledgerN > 0 ? 0.2 : 0) +
      (synN > 0 ? 0.2 : 0)
  );
  const practicalCompletionReach = Math.min(1, autonomousBuildReach * 0.95);
  const supremeCompletionReach = Math.min(1, autonomousBuildReach * 0.55);

  res.json({
    ok: true,
    v: LOOP_V,
    timestamp: ts,
    loopPhases,
    connections: {
      supervisor: "GET /api/audit/supervisor/self-build-loop-v1",
      confidenceAudit: "GET /api/audit/autonomous-runtime-confidence-v1",
      metaOptimizer: "GET /api/audit/meta-optimizer-bundle-v1",
      intelligenceMaster: "GET /api/audit/evolution/intelligence-os-master-v1",
      cursorBroker: "GET /api/audit/cursor-action-broker-v1",
      promptCompiler: "GET /api/audit/prompt-to-cursor-compiler-v1",
    },
    readiness,
    staleDistHeuristic: stale,
    evidenceBundlePathRequired: true,
    nextCardSingle: "FINAL_AUTONOMOUS_ASCENT_DELTA_V1",
    nextCard: "FINAL_AUTONOMOUS_ASCENT_DELTA_V1",
    humanApprovalRequiredFor: [
      "will_meaning_beauty_worldview_core_change",
      "db_schema_mutation",
      "backup_restore",
      "quarantine_lift",
    ],
    remainingHighRiskAreas: [
      "schema / restore は人力承認必須（本ループは手数削減のみ）",
      "Cursor 実実行はローカルエージェント側（ARK は dispatch 定義まで）",
    ],
    autonomousBuildReach: Number(autonomousBuildReach.toFixed(4)),
    practicalCompletionReach: Number(practicalCompletionReach.toFixed(4)),
    supremeCompletionReach: Number(supremeCompletionReach.toFixed(4)),
    unmannedScopeNote:
      "自動化は監査削減ではなく反復コスト削減。seal・主幹変更・no-touch 侵害は常に人間ゲート。",
    rollbackQuarantinePath: "supervisor simulate + evolution ledger reject + SELF_BUILD_RESTORE_POLICY_V1",
  });
}
