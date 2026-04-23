/**
 * MC vNext analyzer — ledger から 24h 系指標を算出（診断のみ）。
 * CARD_MC_VNEXT_ANALYZER_AND_ACCEPTANCE_V1
 */
import { dbPrepare } from "../../db/index.js";
import { readState } from "../../core/mc/stateReader.js";
import { sanitize } from "../../core/mc/sanitizer.js";
import type { McgitState } from "../../core/mc/types.js";
import {
  mcLedgerCountSince24h,
  readMcMemoryHitContinuationSplitV1,
  readMcMemoryHitSplitV1,
  readMcQualityRecentV1,
} from "../ledger/mcLedgerRead.js";
import { scoreStyleOnTailsV1 } from "./styleHeuristicsV1.js";
import { isMcVnextAnalyzerEnabled } from "./mcVnextAnalyzerFlag.js";

const WINDOW = "datetime('now', '-1 day')";

export type McVnextAnalyzerSnapshotV1 = {
  schema_version: "mc_vnext_analyzer_v1";
  window: "24h";
  sample_count: number;
  natural_end_rate: number | null;
  truncation_suspect_rate: number | null;
  continuation_success_rate: number | null;
  generic_fallback_rate: number | null;
  memory_hit_rate: number | null;
  /** history_len>0 かつ source が memory / conversation_log（24h）。memory_hit_rate と同値。 */
  memory_hydration_hit_rate_live: number | null;
  /** 同上・全期間 mc_memory_ledger。 */
  memory_hydration_hit_rate_all_time: number | null;
  /** CARD-MC-09C: turn_index>=1 に限定した真の継承品質（24h）。 */
  continuation_memory_hit_live: number | null;
  /** CARD-MC-09C: turn_index>=1 に限定した真の継承品質（全期間）。 */
  continuation_memory_hit_all_time: number | null;
  /** CARD-MC-09C: turn_index>=1 の MEMORY_READ サンプル数（24h）。 */
  continuation_sample_count_live: number;
  /** CARD-MC-09C: turn_index>=1 の MEMORY_READ サンプル数（全期間）。 */
  continuation_sample_count_all_time: number;
  /** CARD-MC-09C: Turn 0 の miss_reason='never_persisted' 率（24h、正常性指標）。 */
  turn0_never_persisted_rate_live: number | null;
  /** CARD-MC-09C: Turn 0 の MEMORY_READ サンプル数（24h）。 */
  turn0_sample_count_live: number;
  route_stability_rate: number | null;
  provider_fallback_rate: number | null;
  politeness_consistency_score: number | null;
  readability_score: number | null;
  tenmon_style_fit_score: number | null;
  average_length: number | null;
  avg_response_length: number | null;
  average_sentence_length: number | null;
  heading_excess_rate: number | null;
  style_detail: ReturnType<typeof scoreStyleOnTailsV1>;
  sample_compare: { good: { final_tail: string; id: number | null }; bad: { final_tail: string; id: number | null } };
  git: { head_clean: boolean | null; head_sha_short: string; branch: string };
  persistence: { persist_rows_24h: number; context_memory_rows_24h: number };
  ledger_rows_24h: { route: number; llm: number; memory: number; quality: number };
};

function nullNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function runMcVnextAnalyzerV1(): McVnextAnalyzerSnapshotV1 {
  const emptyStyle = scoreStyleOnTailsV1([]);
  if (!isMcVnextAnalyzerEnabled()) {
    return {
      schema_version: "mc_vnext_analyzer_v1",
      window: "24h",
      sample_count: 0,
      natural_end_rate: null,
      truncation_suspect_rate: null,
      continuation_success_rate: null,
      generic_fallback_rate: null,
      memory_hit_rate: null,
      memory_hydration_hit_rate_live: null,
      memory_hydration_hit_rate_all_time: null,
      continuation_memory_hit_live: null,
      continuation_memory_hit_all_time: null,
      continuation_sample_count_live: 0,
      continuation_sample_count_all_time: 0,
      turn0_never_persisted_rate_live: null,
      turn0_sample_count_live: 0,
      route_stability_rate: null,
      provider_fallback_rate: null,
      politeness_consistency_score: null,
      readability_score: null,
      tenmon_style_fit_score: null,
      average_length: null,
      avg_response_length: null,
      average_sentence_length: null,
      heading_excess_rate: null,
      style_detail: emptyStyle,
      sample_compare: { good: { final_tail: "", id: null }, bad: { final_tail: "", id: null } },
      git: { head_clean: null, head_sha_short: "", branch: "" },
      persistence: { persist_rows_24h: 0, context_memory_rows_24h: 0 },
      ledger_rows_24h: { route: 0, llm: 0, memory: 0, quality: 0 },
    };
  }

  let natural_end_rate: number | null = null;
  let truncation_suspect_rate: number | null = null;
  let avg_len: number | null = null;
  let avg_sentence_len: number | null = null;
  let heading_excess_rate: number | null = null;
  let sample_count = 0;

  try {
    const row = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS n,
        AVG(CASE WHEN natural_end = 1 THEN 1.0 ELSE 0.0 END) AS natural_end_rate,
        AVG(CASE WHEN truncation_suspect = 1 THEN 1.0 ELSE 0.0 END) AS trunc_rate,
        AVG(final_len) AS avg_len,
        AVG(avg_sentence_len) AS avg_sent,
        AVG(CASE WHEN heading_count > 3 THEN 1.0 ELSE 0.0 END) AS heading_excess
      FROM mc_dialogue_quality_ledger WHERE ts >= ${WINDOW}`,
    ).get() as Record<string, unknown>;
    sample_count = Number(row?.n ?? 0);
    if (sample_count > 0) {
      natural_end_rate = nullNum(row.natural_end_rate);
      truncation_suspect_rate = nullNum(row.trunc_rate);
      avg_len = nullNum(row.avg_len);
      avg_sentence_len = nullNum(row.avg_sent);
      heading_excess_rate = nullNum(row.heading_excess);
    }
  } catch {
    /* empty */
  }

  let continuation_success_rate: number | null = null;
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT AVG(CASE WHEN COALESCE(m.max_out, 0) > 0 THEN 1.0 ELSE 0.0 END) AS r, COUNT(*) AS cnt
       FROM (
         SELECT DISTINCT thread_id, turn_index FROM mc_route_ledger
         WHERE ts >= ${WINDOW} AND selector_intent = 'follow_up'
       ) cont
       LEFT JOIN (
         SELECT thread_id, turn_index, MAX(out_len) AS max_out
         FROM mc_llm_execution_ledger WHERE ts >= ${WINDOW}
         GROUP BY thread_id, turn_index
       ) m ON cont.thread_id = m.thread_id AND cont.turn_index = m.turn_index`,
    ).get() as { r: number; cnt: number };
    if (Number(r?.cnt) > 0) continuation_success_rate = nullNum(r.r);
  } catch {
    /* empty */
  }

  let generic_fallback_rate: number | null = null;
  try {
    const r = dbPrepare(
      "kokuzo",
      `SELECT AVG(CASE WHEN fallback_route_flag = 1 THEN 1.0 ELSE 0.0 END) AS r, COUNT(1) AS c
       FROM mc_route_ledger WHERE ts >= ${WINDOW}`,
    ).get() as { r: number; c: number };
    if (Number(r?.c) > 0) generic_fallback_rate = nullNum(r.r);
  } catch {
    /* empty */
  }

  const memSplit = readMcMemoryHitSplitV1();
  const memory_hydration_hit_rate_live = memSplit.combined_hit_live;
  const memory_hydration_hit_rate_all_time = memSplit.combined_hit_all_time;
  /** アラート互換: 24h の hydration ヒット率（旧 analyzer と同じ WINDOW）。 */
  const memory_hit_rate = memory_hydration_hit_rate_live;

  // CARD-MC-09C: turn_index>=1 に限定した真の継承品質と Turn 0 の正常性。
  const memContSplit = readMcMemoryHitContinuationSplitV1();

  let route_stability_rate: number | null = null;
  try {
    const top = dbPrepare(
      "kokuzo",
      `SELECT route_reason, COUNT(1) AS c FROM mc_route_ledger WHERE ts >= ${WINDOW}
       GROUP BY route_reason ORDER BY c DESC LIMIT 1`,
    ).get() as { c: number } | undefined;
    const tot = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS c FROM mc_route_ledger WHERE ts >= ${WINDOW}`,
    ).get() as { c: number };
    if (top && Number(tot?.c) > 0) route_stability_rate = Number(top.c) / Number(tot.c);
  } catch {
    /* empty */
  }

  let provider_fallback_rate: number | null = null;
  try {
    const multi = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS m FROM (
         SELECT thread_id, turn_index FROM mc_llm_execution_ledger
         WHERE ts >= ${WINDOW}
         GROUP BY thread_id, turn_index HAVING COUNT(DISTINCT provider) > 1
       )`,
    ).get() as { m: number };
    const turns = dbPrepare(
      "kokuzo",
      `SELECT COUNT(DISTINCT thread_id || ':' || turn_index) AS t FROM mc_llm_execution_ledger WHERE ts >= ${WINDOW}`,
    ).get() as { t: number };
    if (Number(turns?.t) > 0) provider_fallback_rate = Number(multi?.m ?? 0) / Number(turns.t);
  } catch {
    /* empty */
  }

  const recentQ = readMcQualityRecentV1(50);
  const tails = recentQ.map((q) => String(q.final_tail ?? "")).filter(Boolean);
  const style_detail = scoreStyleOnTailsV1(tails);

  let good = { final_tail: "", id: null as number | null };
  let bad = { final_tail: "", id: null as number | null };
  try {
    const g = dbPrepare(
      "kokuzo",
      `SELECT id, final_tail FROM mc_dialogue_quality_ledger WHERE ts >= ${WINDOW}
       ORDER BY truncation_suspect ASC, final_len DESC LIMIT 1`,
    ).get() as { id: number; final_tail: string } | undefined;
    const b = dbPrepare(
      "kokuzo",
      `SELECT id, final_tail FROM mc_dialogue_quality_ledger WHERE ts >= ${WINDOW}
       ORDER BY truncation_suspect DESC, final_len ASC LIMIT 1`,
    ).get() as { id: number; final_tail: string } | undefined;
    if (g) good = { final_tail: String(g.final_tail || "").slice(0, 200), id: g.id };
    if (b) bad = { final_tail: String(b.final_tail || "").slice(0, 200), id: b.id };
  } catch {
    /* empty */
  }

  let git: McVnextAnalyzerSnapshotV1["git"] = { head_clean: null, head_sha_short: "", branch: "" };
  try {
    const gs = sanitize(readState<McgitState>("git_state"));
    git = {
      head_clean: gs?.dirty === false,
      head_sha_short: String(gs?.head_sha_short ?? ""),
      branch: String(gs?.branch ?? ""),
    };
  } catch {
    /* empty */
  }

  const ledger_rows_24h = {
    route: mcLedgerCountSince24h("mc_route_ledger"),
    llm: mcLedgerCountSince24h("mc_llm_execution_ledger"),
    memory: mcLedgerCountSince24h("mc_memory_ledger"),
    quality: mcLedgerCountSince24h("mc_dialogue_quality_ledger"),
  };

  let persist_rows_24h = 0;
  let context_memory_rows_24h = 0;
  try {
    const p = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS c FROM mc_memory_ledger WHERE ts >= ${WINDOW} AND persisted_success = 1`,
    ).get() as { c: number };
    persist_rows_24h = Number(p?.c ?? 0);
    const ctx = dbPrepare(
      "kokuzo",
      `SELECT COUNT(1) AS c FROM mc_memory_ledger WHERE ts >= ${WINDOW} AND history_len >= 0`,
    ).get() as { c: number };
    context_memory_rows_24h = Number(ctx?.c ?? 0);
  } catch {
    /* empty */
  }

  return {
    schema_version: "mc_vnext_analyzer_v1",
    window: "24h",
    sample_count,
    natural_end_rate,
    truncation_suspect_rate,
    continuation_success_rate,
    generic_fallback_rate,
    memory_hit_rate,
    memory_hydration_hit_rate_live,
    memory_hydration_hit_rate_all_time,
    continuation_memory_hit_live: memContSplit.continuation_memory_hit_live,
    continuation_memory_hit_all_time: memContSplit.continuation_memory_hit_all_time,
    continuation_sample_count_live: memContSplit.continuation_sample_count_live,
    continuation_sample_count_all_time: memContSplit.continuation_sample_count_all_time,
    turn0_never_persisted_rate_live: memContSplit.turn0_never_persisted_rate_live,
    turn0_sample_count_live: memContSplit.turn0_sample_count_live,
    route_stability_rate,
    provider_fallback_rate,
    politeness_consistency_score: style_detail.politeness_consistency_score,
    readability_score: style_detail.readability_score,
    tenmon_style_fit_score: style_detail.tenmon_style_fit_score,
    average_length: avg_len,
    avg_response_length: avg_len,
    average_sentence_length: avg_sentence_len,
    heading_excess_rate,
    style_detail,
    sample_compare: { good, bad },
    git,
    persistence: { persist_rows_24h, context_memory_rows_24h },
    ledger_rows_24h,
  };
}
