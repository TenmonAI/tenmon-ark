/**
 * TENMON_BOOK_LEARNING_DEEP_XRAY_AND_QUALITY_FORENSIC_CURSOR_AUTO_V1
 * 書籍学習・再利用パイプラインの観測専用スコアリング（既存プローブ束ね）。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTenmonOcrToBookSettlementBindProbePayloadV1 } from "./tenmonBookReadingKernelV1.js";
import { getKatakamunaSourceAuditAutomationPayloadV1 } from "./katakamunaSourceAuditClassificationV1.js";
import { getTenmonArkBookCanonLedgerAutomationPayloadV1 } from "./threadMeaningMemory.js";
import { getTenmonBookLearningAcceptanceReuseBenchPayloadV1 } from "./tenmonBookLearningAcceptanceReuseBenchV1.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTOMATION_DIR = path.resolve(__dirname, "../../automation");

export type TenmonBookLearningLayerScoresV1 = {
  ocr_extraction_readiness: number;
  settlement_quality: number;
  katakamuna_lineage_clarity: number;
  root_mapping_separation: number;
  notion_settlement_reuse: number;
  ark_conversation_reuse: number;
  uncertainty_preservation: number;
  comparative_reading_quality: number;
};

export type TenmonBookLearningProbeFamilyStatusV1 = {
  family:
    | "katakamuna_lineage"
    | "kotodama_root"
    | "kukai_hokekyo_mapping"
    | "sanskrit_comparative"
    | "unresolved_retention";
  signal: "pass" | "partial" | "fail";
  detail: string;
};

export type TenmonBookLearningDeepXrayVerdictV1 = {
  architecture_ready: boolean;
  reuse_ready: boolean;
  conversation_ready: boolean;
  remaining_blockers: string[];
  mean_layer_score: number;
};

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function readOcrAutomationJson(): { acceptance_pass?: boolean; binaries_ok?: boolean } | null {
  const p = path.join(AUTOMATION_DIR, "tenmon_ocr_runtime_wake_and_binary_verify_result_v1.json");
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as { acceptance_pass?: boolean; binaries_ok?: boolean };
  } catch {
    return null;
  }
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** 残差は最大 3 件（超過は圧縮メッセージ 1 本にまとめる） */
export function summarizeBlockersV1(reasons: string[], maxItems = 3): string[] {
  const u = [...new Set(reasons.map((s) => String(s).trim()).filter(Boolean))];
  if (u.length <= maxItems) return u;
  const head = u.slice(0, maxItems - 1);
  const rest = u.length - (maxItems - 1);
  head.push(`ほか ${rest} 件の観測残差あり（詳細は sources.failure_reasons 参照）`);
  return head;
}

export function computeTenmonBookLearningLayerScoresV1(): {
  scores: TenmonBookLearningLayerScoresV1;
  sources: {
    ocr_automation_json_present: boolean;
    settlement_probe: ReturnType<typeof getTenmonOcrToBookSettlementBindProbePayloadV1>;
    katakamuna_probe: ReturnType<typeof getKatakamunaSourceAuditAutomationPayloadV1>;
    ark_probe: ReturnType<typeof getTenmonArkBookCanonLedgerAutomationPayloadV1>;
    bench_probe: ReturnType<typeof getTenmonBookLearningAcceptanceReuseBenchPayloadV1>;
  };
} {
  const ocrFile = readOcrAutomationJson();
  const settlement = getTenmonOcrToBookSettlementBindProbePayloadV1();
  const kata = getKatakamunaSourceAuditAutomationPayloadV1();
  const ark = getTenmonArkBookCanonLedgerAutomationPayloadV1();
  const bench = getTenmonBookLearningAcceptanceReuseBenchPayloadV1();

  const ocr_extraction_readiness = clamp01(
    ocrFile?.acceptance_pass === true ? 1 : ocrFile ? 0.35 : 0.55,
  );
  const settlement_quality = clamp01(settlement.acceptance_pass ? 1 : 0.42);
  const katakamuna_lineage_clarity = clamp01(kata.acceptance_pass ? 1 : 0.44);
  const ark_conversation_reuse = clamp01(ark.acceptance_pass ? 1 : 0.44);

  const benchResults = bench.results;
  const discernModes = new Set(benchResults.map((r) => r.discern_source_mode).filter(Boolean));
  const separationSignal =
    discernModes.has("lineage_discernment") ||
    discernModes.has("tenmon_reintegration") ||
    discernModes.has("structural_mapping");
  const root_mapping_separation = clamp01(
    bench.acceptance_pass ? (separationSignal ? 0.95 : 0.72) : 0.38,
  );

  const notion_settlement_reuse = clamp01(
    settlement.acceptance_pass && ark.acceptance_pass ? 0.96 : settlement.acceptance_pass ? 0.62 : 0.4,
  );

  const uncHits = benchResults.filter(
    (r) =>
      r.binder_uncertainty_flags_count > 0 ||
      r.verdict_uncertainty_lines > 0 ||
      r.ark_uncertainty_flags_count > 0 ||
      r.thread_meaning_unresolved_axes > 0,
  ).length;
  const uncertainty_preservation = clamp01(
    bench.acceptance_pass ? (uncHits >= 1 ? 0.92 : 0.55) : 0.35,
  );

  const cmpProbe = benchResults.find((r) => r.category === "mapping_comparative");
  const comparative_reading_quality = clamp01(
    cmpProbe?.has_ark_reuse ? 0.9 : cmpProbe ? 0.48 : 0.45,
  );

  const scores: TenmonBookLearningLayerScoresV1 = {
    ocr_extraction_readiness,
    settlement_quality,
    katakamuna_lineage_clarity,
    root_mapping_separation,
    notion_settlement_reuse,
    ark_conversation_reuse,
    uncertainty_preservation,
    comparative_reading_quality,
  };

  return {
    scores,
    sources: {
      ocr_automation_json_present: ocrFile != null,
      settlement_probe: settlement,
      katakamuna_probe: kata,
      ark_probe: ark,
      bench_probe: bench,
    },
  };
}

export function buildTenmonBookLearningProbeFamiliesV1(
  bench: ReturnType<typeof getTenmonBookLearningAcceptanceReuseBenchPayloadV1>,
): TenmonBookLearningProbeFamilyStatusV1[] {
  const rs = bench.results;
  const byCat = (c: string) => rs.find((x) => x.category === c);
  const sig = (r: (typeof rs)[0] | undefined): "pass" | "partial" | "fail" => {
    if (!r || !r.ok) return "fail";
    if (r.has_ark_reuse && (r.discern_source_mode || r.thread_meaning_unresolved_axes > 0)) return "pass";
    if (r.has_ark_reuse || r.discern_source_mode) return "partial";
    return "fail";
  };
  return [
    {
      family: "katakamuna_lineage",
      signal: sig(byCat("katakamuna_lineage")),
      detail: "bench_katakamuna_lineage + audit 束",
    },
    {
      family: "kotodama_root",
      signal: sig(byCat("root_diff")),
      detail: "言霊秘書・水穂・稲荷 root 差分プローブ",
    },
    {
      family: "kukai_hokekyo_mapping",
      signal: sig(byCat("mapping_comparative")),
      detail: "空海・法華・サンスクリット配置問い",
    },
    {
      family: "sanskrit_comparative",
      signal: sig(byCat("mapping_comparative")),
      detail: "comparative 軸は mapping プローブと同系",
    },
    {
      family: "unresolved_retention",
      signal: rs.some((r) => r.thread_meaning_unresolved_axes > 0 || r.ark_uncertainty_flags_count > 0)
        ? "pass"
        : "partial",
      detail: "threadMeaning / ARK uncertainty 保持",
    },
  ];
}

export function buildTenmonBookLearningDeepXrayVerdictV1(
  scores: TenmonBookLearningLayerScoresV1,
  benchPass: boolean,
  arkPass: boolean,
  failureReasons: string[],
): TenmonBookLearningDeepXrayVerdictV1 {
  const m = mean(Object.values(scores));
  const architecture_ready = m >= 0.68 && scores.katakamuna_lineage_clarity >= 0.5 && scores.settlement_quality >= 0.5;
  const reuse_ready = arkPass && scores.notion_settlement_reuse >= 0.55 && scores.ark_conversation_reuse >= 0.85;
  const conversation_ready = benchPass && scores.uncertainty_preservation >= 0.5;
  const remaining_blockers = summarizeBlockersV1(failureReasons, 3);
  return {
    architecture_ready,
    reuse_ready,
    conversation_ready,
    remaining_blockers,
    mean_layer_score: Math.round(m * 1000) / 1000,
  };
}

export function getTenmonBookLearningDeepXrayQualityForensicPayloadV1(): {
  schema: "TENMON_BOOK_LEARNING_DEEP_XRAY_QUALITY_FORENSIC_PAYLOAD_V1";
  card: "TENMON_BOOK_LEARNING_DEEP_XRAY_AND_QUALITY_FORENSIC_CURSOR_AUTO_V1";
  generated_at: string;
  layer_scores: TenmonBookLearningLayerScoresV1;
  probe_families: TenmonBookLearningProbeFamilyStatusV1[];
  verdict: TenmonBookLearningDeepXrayVerdictV1;
  acceptance_pass: boolean;
  failure_reasons: string[];
  nextOnPass: string;
  nextOnFail: string;
  observation_only: true;
  sources_summary: {
    ocr_json_present: boolean;
    settlement_accept: boolean;
    katakamuna_accept: boolean;
    ark_accept: boolean;
    bench_accept: boolean;
  };
} {
  const { scores, sources } = computeTenmonBookLearningLayerScoresV1();
  const probe_families = buildTenmonBookLearningProbeFamiliesV1(sources.bench_probe);

  const fr: string[] = [];
  if (!sources.settlement_probe.acceptance_pass) fr.push("settlement_probe_not_pass");
  if (!sources.katakamuna_probe.acceptance_pass) fr.push("katakamuna_audit_not_pass");
  if (!sources.ark_probe.acceptance_pass) fr.push("ark_ledger_probe_not_pass");
  if (!sources.bench_probe.acceptance_pass) fr.push("reuse_bench_not_pass");

  const verdict = buildTenmonBookLearningDeepXrayVerdictV1(
    scores,
    sources.bench_probe.acceptance_pass,
    sources.ark_probe.acceptance_pass,
    fr,
  );

  const blockerCapOk = verdict.remaining_blockers.length <= 3;
  /** fail-closed: 下流ベンチ・ARK・層平均が閾値未満なら FAIL（OCR JSON 欠落は中立スコアのみで不合格理由に含めない） */
  const forensic_accept =
    blockerCapOk &&
    sources.bench_probe.acceptance_pass &&
    sources.ark_probe.acceptance_pass &&
    verdict.mean_layer_score >= 0.58;

  return {
    schema: "TENMON_BOOK_LEARNING_DEEP_XRAY_QUALITY_FORENSIC_PAYLOAD_V1",
    card: "TENMON_BOOK_LEARNING_DEEP_XRAY_AND_QUALITY_FORENSIC_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    layer_scores: scores,
    probe_families,
    verdict,
    acceptance_pass: forensic_accept,
    failure_reasons: forensic_accept ? [] : summarizeBlockersV1([...fr, ...(!blockerCapOk ? ["blocker_summary_cap_broken"] : [])], 3),
    nextOnPass: "TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_BOOK_LEARNING_DEEP_XRAY_AND_QUALITY_FORENSIC_RETRY_CURSOR_AUTO_V1",
    observation_only: true,
    sources_summary: {
      ocr_json_present: sources.ocr_automation_json_present,
      settlement_accept: sources.settlement_probe.acceptance_pass,
      katakamuna_accept: sources.katakamuna_probe.acceptance_pass,
      ark_accept: sources.ark_probe.acceptance_pass,
      bench_accept: sources.bench_probe.acceptance_pass,
    },
  };
}
