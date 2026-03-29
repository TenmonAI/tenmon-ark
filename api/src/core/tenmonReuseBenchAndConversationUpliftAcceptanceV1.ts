/**
 * TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1
 * 書籍継承→会話再利用のアップリフトを観測専用で fail-closed 判定（HTTP なし）。
 */

import {
  getKatakamunaSourceAuditBundleV1,
  matchKatakamunaSourceAuditEntriesV1,
  validateKatakamunaSourceAuditAcceptanceV1,
} from "./katakamunaSourceAuditClassificationV1.js";
import {
  evaluateTenmonBookLearningBenchAcceptanceV1,
  runTenmonBookLearningBenchProbeV1,
  TENMON_BOOK_LEARNING_BENCH_PROBES_V1,
  TENMON_CONVERSATION_UPLIFT_SUPPLEMENT_PROBES_V1,
  type TenmonBookLearningBenchProbeResultV1,
} from "./tenmonBookLearningAcceptanceReuseBenchV1.js";
import { ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1 } from "./threadMeaningMemory.js";

const EXPECTED_LEDGER_ROWS = ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1.length;
const BASE_COUNT = TENMON_BOOK_LEARNING_BENCH_PROBES_V1.length;

export type TenmonConversationUpliftFinalChecksV1 = {
  /** judge 束＋VPS 反射が「読み直し単体」ではなく再利用経路に乗っている */
  reuse_path_with_vps_min5: boolean;
  /** 複数 material_id で台帳束が刺さる（継承が単書に閉じない） */
  distinct_primary_book_ids_gte3: boolean;
  /** ARK があるプローブは台帳行数・evidence_binder が満たされる */
  ark_inheritance_shape_ok: boolean;
  /** compare / define系: mapping_comparative + katakamuna define + root scripture */
  route_families_for_reinject_ok: boolean;
  /** 監査束が本流〜天聞再統合まで欠落なし（系譜5分類＋unknown の整合） */
  katakamuna_audit_bundle_accepted: boolean;
};

function evaluateUpliftSupplementAndFinalChecksV1(
  results: readonly TenmonBookLearningBenchProbeResultV1[],
): { pass: boolean; reasons: string[]; final_checks: TenmonConversationUpliftFinalChecksV1 } {
  const reasons: string[] = [];
  const psychProbe = results.find((r) => r.probe_id === "uplift_psychologization_kawai");
  const mystProbe = results.find((r) => r.probe_id === "uplift_mysticism_market");
  const holdProbe = results.find((r) => r.probe_id === "uplift_unresolved_hold");
  const reentryProbe = results.find((r) => r.probe_id === "uplift_thread_reentry_hokekyo");

  const psychMsg =
    TENMON_CONVERSATION_UPLIFT_SUPPLEMENT_PROBES_V1.find((p) => p.id === "uplift_psychologization_kawai")?.message ??
    "";
  const mystMsg =
    TENMON_CONVERSATION_UPLIFT_SUPPLEMENT_PROBES_V1.find((p) => p.id === "uplift_mysticism_market")?.message ?? "";

  if (!psychProbe?.ok) reasons.push("uplift_psych_probe_not_ok");
  else {
    const hits = matchKatakamunaSourceAuditEntriesV1(psychMsg);
    if (!hits.some((e) => e.source_class === "psychologized")) {
      reasons.push("uplift_psych_audit_psychologized_not_matched");
    }
    if (!psychProbe.has_ark_reuse || psychProbe.ark_evidence_binder_refs < 1) {
      reasons.push("uplift_psych_missing_ark_or_evidence_binder");
    }
  }

  if (!mystProbe?.ok) reasons.push("uplift_myst_probe_not_ok");
  else {
    const hits = matchKatakamunaSourceAuditEntriesV1(mystMsg);
    if (!hits.some((e) => e.source_class === "mystified")) {
      reasons.push("uplift_myst_audit_mystified_not_matched");
    }
    if (!mystProbe.has_ark_reuse) reasons.push("uplift_myst_missing_ark_reuse");
  }

  if (!holdProbe?.ok) reasons.push("uplift_unresolved_probe_not_ok");
  else {
    const unc =
      holdProbe.binder_uncertainty_flags_count > 0 ||
      holdProbe.verdict_uncertainty_lines > 0 ||
      holdProbe.ark_uncertainty_flags_count > 0 ||
      holdProbe.thread_meaning_unresolved_axes > 0;
    if (!unc) reasons.push("uplift_unresolved_hold_missing_uncertainty_surface");
  }

  if (!reentryProbe?.ok) reasons.push("uplift_thread_reentry_probe_not_ok");
  else {
    if (!reentryProbe.has_ark_reuse) reasons.push("uplift_thread_reentry_missing_ark");
    if (reentryProbe.ark_thread_reentry_book_id !== "hokekyo") {
      reasons.push("uplift_thread_reentry_book_id_not_hokekyo");
    }
    if (reentryProbe.ark_ledger_rows !== EXPECTED_LEDGER_ROWS) {
      reasons.push(`uplift_thread_reentry_ledger_rows_${reentryProbe.ark_ledger_rows}_expected_${EXPECTED_LEDGER_ROWS}`);
    }
  }

  const reuseVps = results.filter((r) => r.has_ark_reuse && r.has_vps_notion_reflection).length;
  const reuse_path_with_vps_min5 = reuseVps >= 5;
  if (!reuse_path_with_vps_min5) {
    reasons.push(`reuse_path_vps_count_${reuseVps}_min_5`);
  }

  const distinctBooks = new Set(
    results.map((r) => r.primary_book_material_id).filter((x): x is string => x != null && x !== ""),
  );
  const distinct_primary_book_ids_gte3 = distinctBooks.size >= 3;
  if (!distinct_primary_book_ids_gte3) {
    reasons.push(`distinct_primary_book_ids_${distinctBooks.size}_min_3`);
  }

  const ark_inheritance_shape_ok = results.every(
    (r) =>
      !r.has_ark_reuse ||
      (r.ark_ledger_rows === EXPECTED_LEDGER_ROWS && r.ark_evidence_binder_refs >= 1),
  );
  if (!ark_inheritance_shape_ok) reasons.push("ark_inheritance_ledger_or_binder_shape_fail");

  const byId = new Map(results.map((r) => [r.probe_id, r]));
  const mapping = byId.get("bench_kukai_hokekyo_sanskrit");
  const root = byId.get("bench_root_khs_mizuho_inari");
  const defineKata = byId.get("bench_katakamuna_lineage");
  const route_families_for_reinject_ok = Boolean(
    mapping?.has_ark_reuse &&
      root?.has_ark_reuse &&
      defineKata?.has_ark_reuse &&
      mapping?.discern_source_mode != null &&
      root?.discern_source_mode != null,
  );
  if (!route_families_for_reinject_ok) reasons.push("route_families_reinject_not_observed");

  const bundle = getKatakamunaSourceAuditBundleV1();
  const auditV = validateKatakamunaSourceAuditAcceptanceV1(bundle.entries);
  const katakamuna_audit_bundle_accepted = auditV.pass;
  if (!auditV.pass) reasons.push(...auditV.reasons.map((x) => `katakamuna_audit:${x}`));

  return {
    pass: reasons.length === 0,
    reasons,
    final_checks: {
      reuse_path_with_vps_min5,
      distinct_primary_book_ids_gte3,
      ark_inheritance_shape_ok,
      route_families_for_reinject_ok,
      katakamuna_audit_bundle_accepted,
    },
  };
}

export function getTenmonReuseBenchAndConversationUpliftAcceptancePayloadV1(): {
  schema: "TENMON_REUSE_BENCH_CONVERSATION_UPLIFT_ACCEPTANCE_PAYLOAD_V1";
  card: "TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1";
  generated_at: string;
  probes: typeof TENMON_BOOK_LEARNING_BENCH_PROBES_V1;
  supplement_probes: typeof TENMON_CONVERSATION_UPLIFT_SUPPLEMENT_PROBES_V1;
  results: TenmonBookLearningBenchProbeResultV1[];
  base_bench_acceptance_pass: boolean;
  base_bench_failure_reasons: string[];
  uplift_supplement_pass: boolean;
  uplift_failure_reasons: string[];
  final_checks: TenmonConversationUpliftFinalChecksV1;
  acceptance_pass: boolean;
  failure_reasons: string[];
  nextOnPass: string;
  nextOnFail: string;
  observation_only: true;
} {
  const supplement_probes = TENMON_CONVERSATION_UPLIFT_SUPPLEMENT_PROBES_V1;
  const probes = TENMON_BOOK_LEARNING_BENCH_PROBES_V1;
  const all = [...probes, ...supplement_probes];
  const results = all.map((p) => runTenmonBookLearningBenchProbeV1(p));
  const baseResults = results.slice(0, BASE_COUNT);
  const baseEv = evaluateTenmonBookLearningBenchAcceptanceV1(baseResults);
  const up = evaluateUpliftSupplementAndFinalChecksV1(results);

  const failure_reasons: string[] = [];
  if (!baseEv.pass) failure_reasons.push(...baseEv.reasons);
  if (!up.pass) failure_reasons.push(...up.reasons);

  return {
    schema: "TENMON_REUSE_BENCH_CONVERSATION_UPLIFT_ACCEPTANCE_PAYLOAD_V1",
    card: "TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    probes,
    supplement_probes,
    results,
    base_bench_acceptance_pass: baseEv.pass,
    base_bench_failure_reasons: baseEv.pass ? [] : baseEv.reasons,
    uplift_supplement_pass: up.pass,
    uplift_failure_reasons: up.pass ? [] : up.reasons,
    final_checks: up.final_checks,
    acceptance_pass: baseEv.pass && up.pass,
    failure_reasons,
    nextOnPass: "TENMON_BOOK_LEARNING_MAINLINE_SEAL_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_REUSE_BENCH_AND_CONVERSATION_UPLIFT_ACCEPTANCE_RETRY_CURSOR_AUTO_V1",
    observation_only: true,
  };
}
