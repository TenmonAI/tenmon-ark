/**
 * TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1
 * OCR→settlement→監査→ARK→reuse bench→deep xray→uplift までの mainline を観測専用で seal（fail-closed）。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTenmonBookLearningDeepXrayQualityForensicPayloadV1 } from "./tenmonBookLearningDeepXrayQualityForensicV1.js";
import { getTenmonOcrToBookSettlementBindProbePayloadV1 } from "./tenmonBookReadingKernelV1.js";
import { getTenmonReuseBenchAndConversationUpliftAcceptancePayloadV1 } from "./tenmonReuseBenchAndConversationUpliftAcceptanceV1.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTOMATION_DIR = path.resolve(__dirname, "../../automation");

function readOcrRuntimeResultV1(): { acceptance_pass?: boolean; binaries_ok?: boolean } | null {
  const p = path.join(AUTOMATION_DIR, "tenmon_ocr_runtime_wake_and_binary_verify_result_v1.json");
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as { acceptance_pass?: boolean; binaries_ok?: boolean };
  } catch {
    return null;
  }
}

export type TenmonBookLearningMainlineSealGatesV1 = {
  ocr_json_present: boolean;
  ocr_runtime_acceptance_pass: boolean;
  settlement_unit_schema_ok: boolean;
  settlement_probe_pass: boolean;
  katakamuna_source_audit_pass: boolean;
  ark_ledger_automation_pass: boolean;
  reuse_bench_pass: boolean;
  /** Ledger / evidence_binder / thread_reentry / uncertainty は reuse bench＋uplift で観測 */
  reuse_bench_ark_and_uncertainty_observed: boolean;
  /** 宇野普及・天聞再統合・secondary risk 等（reuse_bench_pass と同値・観測ラベル） */
  katakamuna_lineage_mix_suppressed: boolean;
  deep_xray_forensic_pass: boolean;
  reuse_uplift_acceptance_pass: boolean;
};

export function getTenmonBookLearningMainlineSealPayloadV1(): {
  schema: "TENMON_BOOK_LEARNING_MAINLINE_SEAL_PAYLOAD_V1";
  card: "TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1";
  generated_at: string;
  gates: TenmonBookLearningMainlineSealGatesV1;
  acceptance_pass: boolean;
  failure_reasons: string[];
  nextOnPass: string;
  nextOnFail: string;
  observation_only: true;
  deep_xray_summary: {
    acceptance_pass: boolean;
    mean_layer_score: number;
    verdict_architecture_ready: boolean;
    verdict_reuse_ready: boolean;
    verdict_conversation_ready: boolean;
  };
  uplift_summary: {
    acceptance_pass: boolean;
    base_bench_acceptance_pass: boolean;
    final_checks: Record<string, boolean>;
  };
} {
  const ocr = readOcrRuntimeResultV1();
  const settlement = getTenmonOcrToBookSettlementBindProbePayloadV1();
  const deep = getTenmonBookLearningDeepXrayQualityForensicPayloadV1();
  const uplift = getTenmonReuseBenchAndConversationUpliftAcceptancePayloadV1();

  const settlement_unit_schema_ok =
    settlement.example_unit != null &&
    (settlement.example_unit as { schema?: string }).schema === "TENMON_OCR_BOOK_SETTLEMENT_UNIT_V1";

  const ss = deep.sources_summary;
  const reuse_bench_ark_and_uncertainty_observed =
    ss.bench_accept &&
    uplift.final_checks.reuse_path_with_vps_min5 &&
    uplift.final_checks.ark_inheritance_shape_ok;

  const katakamuna_lineage_mix_suppressed = ss.bench_accept;

  const gates: TenmonBookLearningMainlineSealGatesV1 = {
    ocr_json_present: ocr != null,
    ocr_runtime_acceptance_pass: ocr?.acceptance_pass === true,
    settlement_unit_schema_ok,
    settlement_probe_pass: ss.settlement_accept,
    katakamuna_source_audit_pass: ss.katakamuna_accept,
    ark_ledger_automation_pass: ss.ark_accept,
    reuse_bench_pass: ss.bench_accept,
    reuse_bench_ark_and_uncertainty_observed,
    katakamuna_lineage_mix_suppressed,
    deep_xray_forensic_pass: deep.acceptance_pass,
    reuse_uplift_acceptance_pass: uplift.acceptance_pass,
  };

  const failure_reasons: string[] = [];
  if (!gates.ocr_json_present) failure_reasons.push("ocr_runtime_result_json_missing");
  if (!gates.ocr_runtime_acceptance_pass) failure_reasons.push("ocr_runtime_acceptance_not_pass");
  if (!gates.settlement_unit_schema_ok) failure_reasons.push("settlement_unit_schema_not_present");
  if (!gates.settlement_probe_pass) failure_reasons.push("settlement_probe_not_pass");
  if (!gates.katakamuna_source_audit_pass) failure_reasons.push("katakamuna_source_class_audit_not_pass");
  if (!gates.ark_ledger_automation_pass) failure_reasons.push("ark_book_canon_ledger_automation_not_pass");
  if (!gates.reuse_bench_pass) failure_reasons.push("reuse_bench_not_pass");
  if (!gates.reuse_bench_ark_and_uncertainty_observed) {
    failure_reasons.push("reuse_bench_ark_uncertainty_uplift_shape_not_observed");
  }
  if (!gates.deep_xray_forensic_pass) failure_reasons.push("deep_xray_quality_forensic_not_pass");
  if (!gates.reuse_uplift_acceptance_pass) failure_reasons.push("reuse_uplift_acceptance_not_pass");

  const acceptance_pass = failure_reasons.length === 0;

  return {
    schema: "TENMON_BOOK_LEARNING_MAINLINE_SEAL_PAYLOAD_V1",
    card: "TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    gates,
    acceptance_pass,
    failure_reasons: acceptance_pass ? [] : failure_reasons,
    nextOnPass: "TENMON_ARTIFACT_AND_WORKTREE_HYGIENE_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_BOOK_LEARNING_MAINLINE_SEAL_RETRY_CURSOR_AUTO_V1",
    observation_only: true,
    deep_xray_summary: {
      acceptance_pass: deep.acceptance_pass,
      mean_layer_score: deep.verdict.mean_layer_score,
      verdict_architecture_ready: deep.verdict.architecture_ready,
      verdict_reuse_ready: deep.verdict.reuse_ready,
      verdict_conversation_ready: deep.verdict.conversation_ready,
    },
    uplift_summary: {
      acceptance_pass: uplift.acceptance_pass,
      base_bench_acceptance_pass: uplift.base_bench_acceptance_pass,
      final_checks: { ...uplift.final_checks },
    },
  };
}
