/**
 * TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1
 * OCR→settlement→katakamuna audit→ARK reuse 後段の構造観測（HTTP なし・観測専用）。
 */

import { splitInputSemanticsV1 } from "./inputSemanticSplitter.js";
import { buildKnowledgeBinder, applyKnowledgeBinderToKu } from "./knowledgeBinder.js";
import type { ThreadCore } from "./threadCore.js";
import {
  katakamunaRawTouchesAuditedSecondaryCorpusV1,
  matchKatakamunaSourceAuditEntriesV1,
} from "./katakamunaSourceAuditClassificationV1.js";
import type { SourceLayerDiscernmentV1 } from "./sourceLayerDiscernmentKernel.js";
import type { ArkBookCanonConversationReuseV1 } from "./threadMeaningMemory.js";

export type TenmonBookLearningBenchProbeV1 = {
  id: string;
  category:
    | "katakamuna_lineage"
    | "uno_popularization"
    | "tenmon_reintegration"
    | "root_diff"
    | "mapping_comparative"
    | "psychologization_lineage"
    | "mysticism_lineage"
    | "unresolved_hold"
    | "thread_reentry_hint";
  message: string;
  routeReason: string;
  centerKey: string | null;
};

export const TENMON_BOOK_LEARNING_BENCH_PROBES_V1: readonly TenmonBookLearningBenchProbeV1[] = [
  {
    id: "bench_katakamuna_lineage",
    category: "katakamuna_lineage",
    message: "カタカムナの系譜と楢崎皐月の整理の位置づけを説明してください",
    routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
    centerKey: "katakamuna",
  },
  {
    id: "bench_uno_popularization",
    category: "uno_popularization",
    message: "宇野多美恵以降のカタカムナ普及本は、本流と同じ扱いでよいですか",
    routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
    centerKey: "katakamuna",
  },
  {
    id: "bench_tenmon_reintegration",
    category: "tenmon_reintegration",
    message: "TENMON-ARKでカタカムナを再統合するときの位置づけを一文で",
    routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
    centerKey: "katakamuna",
  },
  {
    id: "bench_root_khs_mizuho_inari",
    category: "root_diff",
    message: "言霊秘書と水穂伝と稲荷古伝のrootとしての差分は何ですか",
    routeReason: "TENMON_SCRIPTURE_CANON_V1",
    centerKey: "kotodama",
  },
  {
    id: "bench_kukai_hokekyo_sanskrit",
    category: "mapping_comparative",
    message: "空海の伝承と法華経とサンスクリット資料は、mappingとcomparativeのどちらに置くべきですか",
    routeReason: "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1",
    centerKey: null,
  },
];

/** TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE: 基底5本に追加する観測プローブ */
export const TENMON_CONVERSATION_UPLIFT_SUPPLEMENT_PROBES_V1: readonly TenmonBookLearningBenchProbeV1[] = [
  {
    id: "uplift_psychologization_kawai",
    category: "psychologization_lineage",
    message:
      "川ヰ亜哉子のカタカムナ読みは心理化層として本流・普及・史実とどう切り分けますか",
    routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
    centerKey: "katakamuna",
  },
  {
    id: "uplift_mysticism_market",
    category: "mysticism_lineage",
    message: "カタカムナを神秘化して売る系の資料は史実・原資料と混線させないでよいですか",
    routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
    centerKey: "katakamuna",
  },
  {
    id: "uplift_unresolved_hold",
    category: "unresolved_hold",
    message:
      "カタカムナについて、宇野多美恵系の普及本と楢崎系本流の未確定論点は断定せず保留で進めますか",
    routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
    centerKey: "katakamuna",
  },
  {
    id: "uplift_thread_reentry_hokekyo",
    category: "thread_reentry_hint",
    message:
      "前回の法華経の十如是とmapping比較の論点・未確定点から再開してください（会座品の整理も含む）",
    routeReason: "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1",
    centerKey: null,
  },
];

function benchThreadCore(p: TenmonBookLearningBenchProbeV1): ThreadCore {
  return {
    threadId: `bench-${p.id}`,
    centerKey: p.centerKey,
    centerLabel: null,
    activeEntities: [],
    openLoops: [],
    commitments: [],
    dialogueContract: null,
    lastResponseContract: { routeReason: p.routeReason, answerMode: "analysis", answerFrame: "one_step", answerLength: "short" },
    updatedAt: new Date().toISOString(),
  };
}

function readArk(ku: Record<string, unknown>): ArkBookCanonConversationReuseV1 | null {
  const a = ku.arkBookCanonConversationReuseV1;
  if (!a || typeof a !== "object") return null;
  if ((a as { schema?: string }).schema !== "TENMON_ARK_BOOK_CANON_CONVERSATION_REUSE_V1") return null;
  return a as ArkBookCanonConversationReuseV1;
}

function readDiscern(ku: Record<string, unknown>): SourceLayerDiscernmentV1 | null {
  const d = ku.sourceLayerDiscernmentV1;
  if (!d || typeof d !== "object") return null;
  if ((d as { schema?: string }).schema !== "TENMON_SOURCE_LAYER_DISCERNMENT_V1") return null;
  return d as SourceLayerDiscernmentV1;
}

export type TenmonBookLearningBenchProbeResultV1 = {
  probe_id: string;
  category: string;
  ok: boolean;
  error: string | null;
  has_ark_reuse: boolean;
  ark_evidence_binder_refs: number;
  has_vps_notion_reflection: boolean;
  discern_source_mode: string | null;
  discern_risk_flags: string[];
  katakamuna_secondary_risk: boolean;
  binder_uncertainty_flags_count: number;
  verdict_uncertainty_lines: number;
  thread_meaning_unresolved_axes: number;
  audit_entries_matched: number;
  ark_uncertainty_flags_count: number;
  primary_book_material_id: string | null;
  ark_thread_reentry_book_id: string | null;
  ark_ledger_rows: number;
};

export function runTenmonBookLearningBenchProbeV1(p: TenmonBookLearningBenchProbeV1): TenmonBookLearningBenchProbeResultV1 {
  const tc = benchThreadCore(p);
  const ku: Record<string, unknown> = {
    routeReason: p.routeReason,
    centerKey: p.centerKey ?? undefined,
    inputSemanticSplitResultV1: splitInputSemanticsV1(p.message),
  };
  try {
    const binder = buildKnowledgeBinder({
      routeReason: p.routeReason,
      message: p.message,
      threadId: tc.threadId,
      ku,
      threadCore: tc,
      threadCenter:
        p.centerKey != null
          ? { center_type: p.centerKey === "katakamuna" ? "scripture" : "concept", center_key: p.centerKey }
          : null,
    });
    applyKnowledgeBinderToKu(ku, binder, {
      threadCore: tc,
      rawMessage: p.message,
      threadId: String(tc.threadId ?? ""),
    });
    const ark = readArk(ku);
    const disc = readDiscern(ku);
    const vs = ku.verdictSections as { uncertainty?: unknown } | undefined;
    const vu = vs?.uncertainty;
    const uncLines =
      typeof vu === "string"
        ? vu
            .split(/\n+/u)
            .map((x) => x.trim())
            .filter(Boolean).length
        : Array.isArray(vu)
          ? (vu as unknown[]).filter((x) => String(x || "").trim()).length
          : 0;
    const tmm = ku.threadMeaningMemoryV1 as { unresolvedAxes?: unknown } | undefined;
    const uaxes = Array.isArray(tmm?.unresolvedAxes) ? (tmm!.unresolvedAxes as unknown[]).length : 0;
    const bunc = Array.isArray(ku.uncertaintyFlags) ? (ku.uncertaintyFlags as unknown[]).length : 0;
    const risks = disc?.riskFlags ?? [];
    const arkUnc = ark?.uncertainty_registry.flags.length ?? 0;
    const brk = ku.bookReadingKernelV1 as { primary_book_material_id?: string | null } | undefined;
    const pb =
      brk?.primary_book_material_id != null && String(brk.primary_book_material_id).trim() !== ""
        ? String(brk.primary_book_material_id).trim()
        : null;
    return {
      probe_id: p.id,
      category: p.category,
      ok: true,
      error: null,
      has_ark_reuse: ark != null,
      ark_evidence_binder_refs: ark?.evidence_binder.ref_slugs.length ?? 0,
      has_vps_notion_reflection: ku.vpsBookAnalysisNotionReflectionV1 != null,
      discern_source_mode: disc?.sourceMode ?? null,
      discern_risk_flags: [...risks],
      katakamuna_secondary_risk: risks.includes("katakamuna_secondary_or_popular_corpus_named"),
      binder_uncertainty_flags_count: bunc,
      verdict_uncertainty_lines: uncLines,
      thread_meaning_unresolved_axes: uaxes,
      audit_entries_matched: matchKatakamunaSourceAuditEntriesV1(p.message).length,
      ark_uncertainty_flags_count: arkUnc,
      primary_book_material_id: pb,
      ark_thread_reentry_book_id: ark?.thread_reentry_memory.book_id ?? null,
      ark_ledger_rows: ark?.book_canon_ledger.length ?? 0,
    };
  } catch (e) {
    return {
      probe_id: p.id,
      category: p.category,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      has_ark_reuse: false,
      ark_evidence_binder_refs: 0,
      has_vps_notion_reflection: false,
      discern_source_mode: null,
      discern_risk_flags: [],
      katakamuna_secondary_risk: false,
      binder_uncertainty_flags_count: 0,
      verdict_uncertainty_lines: 0,
      thread_meaning_unresolved_axes: 0,
      audit_entries_matched: 0,
      ark_uncertainty_flags_count: 0,
      primary_book_material_id: null,
      ark_thread_reentry_book_id: null,
      ark_ledger_rows: 0,
    };
  }
}

export function evaluateTenmonBookLearningBenchAcceptanceV1(
  results: readonly TenmonBookLearningBenchProbeResultV1[],
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (results.some((r) => !r.ok)) reasons.push("probe_threw_or_failed");
  const uno = results.find((r) => r.category === "uno_popularization");
  const unoMsg =
    TENMON_BOOK_LEARNING_BENCH_PROBES_V1.find((x) => x.category === "uno_popularization")?.message ?? "";
  if (uno) {
    if (!katakamunaRawTouchesAuditedSecondaryCorpusV1(unoMsg)) {
      reasons.push("uno_message_should_touch_secondary_corpus_heuristic");
    }
    const unoEntry = matchKatakamunaSourceAuditEntriesV1(unoMsg).find((e) => e.id === "uno_tamie_popular");
    if (!unoEntry || unoEntry.source_class !== "popularized") {
      reasons.push("audit_uno_must_remain_popularized");
    }
    if (!uno.katakamuna_secondary_risk && uno.discern_source_mode !== "lineage_discernment") {
      reasons.push("uno_probe_expect_secondary_risk_or_lineage_discernment");
    }
  }
  const tenmon = results.find((r) => r.category === "tenmon_reintegration");
  if (tenmon && tenmon.discern_source_mode !== "tenmon_reintegration") {
    reasons.push("tenmon_probe_expect_tenmon_reintegration_mode");
  }
  const arkHits = results.filter((r) => r.has_ark_reuse).length;
  if (arkHits < 3) reasons.push(`ark_reuse_observed_${arkHits}_min_3`);
  const arkBinderOk = results.filter((r) => r.has_ark_reuse && r.ark_evidence_binder_refs >= 1).length;
  if (arkBinderOk < 3) reasons.push("evidence_binder_empty_on_some_ark_paths");
  const anyUncertaintySurface = results.some(
    (r) =>
      r.binder_uncertainty_flags_count > 0 ||
      r.verdict_uncertainty_lines > 0 ||
      r.ark_uncertainty_flags_count > 0 ||
      r.thread_meaning_unresolved_axes > 0,
  );
  if (!anyUncertaintySurface) reasons.push("uncertainty_surface_not_observed_across_probes");
  return { pass: reasons.length === 0, reasons };
}

export function getTenmonBookLearningAcceptanceReuseBenchPayloadV1(): {
  schema: "TENMON_BOOK_LEARNING_ACCEPTANCE_REUSE_BENCH_PAYLOAD_V1";
  card: "TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1";
  generated_at: string;
  probes: readonly TenmonBookLearningBenchProbeV1[];
  results: TenmonBookLearningBenchProbeResultV1[];
  acceptance_pass: boolean;
  failure_reasons: string[];
  nextOnPass: string;
  nextOnFail: string;
  observation_only: true;
} {
  const results = TENMON_BOOK_LEARNING_BENCH_PROBES_V1.map((p) => runTenmonBookLearningBenchProbeV1(p));
  const ev = evaluateTenmonBookLearningBenchAcceptanceV1(results);
  return {
    schema: "TENMON_BOOK_LEARNING_ACCEPTANCE_REUSE_BENCH_PAYLOAD_V1",
    card: "TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    probes: TENMON_BOOK_LEARNING_BENCH_PROBES_V1,
    results,
    acceptance_pass: ev.pass,
    failure_reasons: ev.pass ? [] : ev.reasons,
    nextOnPass: "TENMON_BOOK_LEARNING_DEEP_XRAY_AND_QUALITY_FORENSIC_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_RETRY_CURSOR_AUTO_V1",
    observation_only: true,
  };
}
