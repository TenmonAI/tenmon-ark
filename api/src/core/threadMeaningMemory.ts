/**
 * TENMON_THREAD_MEANING_MEMORY_CURSOR_AUTO_V1
 * TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1
 * 裁定 coreTruth をスレッド単位の意味中心として runtime 保持（表層には出さない）
 */

import type { TruthLayerArbitrationResultV1 } from "./meaningArbitrationKernel.js";
import type { InputSemanticSplitResultV1 } from "./inputSemanticSplitter.js";
import type { TenmonVpsBookAnalysisNotionReflectionPayloadV1 } from "./notionCanon.js";
import { buildVpsBookAnalysisNotionReflectionPayloadV1 } from "./notionCanon.js";
import { BOOK_LEDGER_SETTLEMENT_CATALOG_V1 } from "./tenmonBookReadingKernelV1.js";

/** カタカムナ系譜を最優先し、KHS・水穂・稲荷・空海・法華・サンスクリット束へ拡張 */
export const ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1 = [
  "katakamuna_kotodama_kai",
  "kotodama_hisho_khs",
  "mizuho_den",
  "inari_koden",
  "kukai_lineage",
  "hokekyo",
  "siddham_sandoku",
] as const;

const LEDGER_LABEL = new Map(BOOK_LEDGER_SETTLEMENT_CATALOG_V1.map((e) => [e.material_id, e.label]));

export type ArkBookCanonLedgerRowV1 = {
  book_id: string;
  priority_rank: number;
  analytical_scope_label: string;
};

/** Notion 生テキストは載せず、judge / settlement 済みスロットのみ */
export type ArkBookCanonConversationReuseV1 = {
  schema: "TENMON_ARK_BOOK_CANON_CONVERSATION_REUSE_V1";
  card: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1";
  book_canon_ledger: ArkBookCanonLedgerRowV1[];
  evidence_binder: { ref_slugs: string[]; note: string };
  lawgraph_candidate_store: { candidates: string[]; book_id: string | null };
  terminology_memory: { entries: Array<{ term: string; book_id: string }> };
  thread_reentry_memory: { summary_lines: string[]; book_id: string | null; hash_echo: string | null };
  uncertainty_registry: { flags: string[]; open_issues: string[] };
  reuse_for_routes: {
    analyzed_scope: string[];
    book_axis_by_id: Record<string, string>;
    definition_delta: string[];
    comparison_digest: string[];
    open_points: string[];
    provisional_verdict: string;
  };
  route_echo: { routeReason: string; routeClass: string };
  not_raw_notion: true;
  judge_layer_only: true;
};

export type BuildArkBookCanonReuseInputV1 = {
  vps: TenmonVpsBookAnalysisNotionReflectionPayloadV1;
  routeReason: string;
  routeClass: string;
  opposition_pairs: readonly { left: string; right: string }[];
};

export function buildArkBookCanonConversationReuseV1FromJudgeV1(
  input: BuildArkBookCanonReuseInputV1,
): ArkBookCanonConversationReuseV1 {
  const vps = input.vps;
  const bid = String(vps.book_id || "").trim();
  const book_canon_ledger: ArkBookCanonLedgerRowV1[] = ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1.map((id, i) => ({
    book_id: id,
    priority_rank: i + 1,
    analytical_scope_label: LEDGER_LABEL.get(id) ?? id,
  }));
  let ref_slugs = [
    ...vps.center_terms.map((t) => `ct:${String(t).slice(0, 64)}`),
    ...vps.tradition_evidence.map((t) => `tr:${String(t).slice(0, 64)}`),
  ].slice(0, 48);
  if (ref_slugs.length === 0 && bid) {
    ref_slugs = [`book:${bid.slice(0, 64)}`];
  }
  const lawCandidates = [
    ...vps.tradition_evidence,
    ...vps.tenmon_mapping,
    vps.provisional_verdict ? `pv:${vps.provisional_verdict.slice(0, 160)}` : "",
  ]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 24);
  const terminology_memory = {
    entries: vps.center_terms.map((term) => ({ term: String(term).slice(0, 120), book_id: bid })).slice(0, 32),
  };
  const summary_lines = String(vps.conversation_reuse_summary || "")
    .split(/\s*\/\s*/u)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
  const openFromPairs = input.opposition_pairs
    .map((p) => `opp:${String(p.left).slice(0, 48)}↔${String(p.right).slice(0, 48)}`)
    .slice(0, 12);
  const reuse_for_routes = {
    analyzed_scope: [bid, ...vps.repeated_terms.map(String), "judge_bound_only"].filter(Boolean).slice(0, 16),
    book_axis_by_id: {
      [bid]: vps.center_terms.length ? vps.center_terms.join("・").slice(0, 400) : bid,
    },
    definition_delta: openFromPairs,
    comparison_digest: [...vps.tenmon_mapping.map(String)].slice(0, 24),
    open_points: [...vps.uncertainty.map(String), ...openFromPairs].slice(0, 24),
    provisional_verdict: String(vps.provisional_verdict || "").trim(),
  };
  return {
    schema: "TENMON_ARK_BOOK_CANON_CONVERSATION_REUSE_V1",
    card: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1",
    book_canon_ledger,
    evidence_binder: {
      ref_slugs,
      note: "Notion 原文は載せない。ref_slugs は judge 済み束からの参照子。",
    },
    lawgraph_candidate_store: { candidates: lawCandidates, book_id: bid || null },
    terminology_memory,
    thread_reentry_memory: {
      summary_lines: summary_lines.length ? summary_lines : [vps.conversation_reuse_summary.slice(0, 400)],
      book_id: bid || null,
      hash_echo: vps.hash || null,
    },
    uncertainty_registry: {
      flags: [...vps.uncertainty.map(String)].slice(0, 32),
      open_issues: reuse_for_routes.open_points.slice(0, 16),
    },
    reuse_for_routes,
    route_echo: { routeReason: String(input.routeReason || "").trim(), routeClass: String(input.routeClass || "").trim() },
    not_raw_notion: true,
    judge_layer_only: true,
  };
}

/** fail-closed: judge 束の形（自動化・Notion 生返却禁止の確認） */
export function validateArkBookCanonConversationReuseShapeV1(
  r: ArkBookCanonConversationReuseV1,
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (r.schema !== "TENMON_ARK_BOOK_CANON_CONVERSATION_REUSE_V1") reasons.push("bad_schema");
  if (r.not_raw_notion !== true) reasons.push("not_raw_notion_must_be_true");
  if (r.judge_layer_only !== true) reasons.push("judge_layer_only_must_be_true");
  if (r.book_canon_ledger.length !== ARK_BOOK_CANON_PRIORITY_BOOK_IDS_V1.length) {
    reasons.push("book_canon_ledger_length_mismatch");
  }
  if (r.book_canon_ledger[0]?.book_id !== "katakamuna_kotodama_kai") {
    reasons.push("priority1_must_be_katakamuna_kotodama_kai");
  }
  const slotChecks: [keyof ArkBookCanonConversationReuseV1, string][] = [
    ["evidence_binder", "evidence_binder"],
    ["lawgraph_candidate_store", "lawgraph_candidate_store"],
    ["terminology_memory", "terminology_memory"],
    ["thread_reentry_memory", "thread_reentry_memory"],
    ["uncertainty_registry", "uncertainty_registry"],
    ["reuse_for_routes", "reuse_for_routes"],
  ];
  for (const [key, label] of slotChecks) {
    const v = r[key];
    if (v == null || typeof v !== "object") reasons.push(`missing_slot:${label}`);
  }
  if (!Array.isArray(r.uncertainty_registry.flags)) reasons.push("uncertainty_flags_not_array");
  if (!Array.isArray(r.uncertainty_registry.open_issues)) reasons.push("open_issues_not_array");
  return { pass: reasons.length === 0, reasons };
}

export function getTenmonArkBookCanonLedgerAutomationPayloadV1(): {
  schema: "TENMON_ARK_BOOK_CANON_LEDGER_AUTOMATION_PAYLOAD_V1";
  card: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1";
  generated_at: string;
  automation_bundle: ReturnType<typeof buildArkBookCanonConversationReuseAutomationBundleV1>;
  acceptance_pass: boolean;
  failure_reasons: string[];
  route_carry_note: string;
  observation_only: true;
} {
  const automation_bundle = buildArkBookCanonConversationReuseAutomationBundleV1();
  const v = validateArkBookCanonConversationReuseShapeV1(automation_bundle.example_reuse);
  return {
    schema: "TENMON_ARK_BOOK_CANON_LEDGER_AUTOMATION_PAYLOAD_V1",
    card: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1",
    generated_at: new Date().toISOString(),
    automation_bundle,
    acceptance_pass: v.pass,
    failure_reasons: v.pass ? [] : v.reasons,
    route_carry_note:
      "compare/define/historical(FACTUAL_*)/mapping/世界観/概念 canon で threadMeaningMemory が ark 束を unresolvedAxes に合流（uncertainty 消去禁止）。",
    observation_only: true,
  };
}

export function buildArkBookCanonConversationReuseAutomationBundleV1(): {
  schema: "TENMON_ARK_BOOK_CANON_REUSE_AUTOMATION_BUNDLE_V1";
  card: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1";
  example_reuse: ArkBookCanonConversationReuseV1;
  nextOnPass: string;
  nextOnFail: string;
} {
  const vps = buildVpsBookAnalysisNotionReflectionPayloadV1({
    book_id: "katakamuna_kotodama_kai",
    source_class: "mapping",
    center_terms: ["カタカムナ", "写像"],
    repeated_terms: ["カタカムナ"],
    opposition_pairs: [{ left: "普及本流", right: "天聞再統合" }],
    tradition_evidence: ["trad_ref:1"],
    tenmon_mapping: ["mapping_lane_only"],
    uncertainty: ["lineage_uncertain"],
    provisional_verdict: "暫定: 比較カード束へ投影後に確定",
    nas_locator: {
      materialId: "katakamuna_kotodama_kai",
      locator_ref: "nas+path:/volume1/tenmon_ark/materials/practice/katakamuna_kotodama_kai",
      nas_relative_path: "materials/practice/katakamuna_kotodama_kai",
      canonical_root: "/volume1/tenmon_ark",
    },
  });
  return {
    schema: "TENMON_ARK_BOOK_CANON_REUSE_AUTOMATION_BUNDLE_V1",
    card: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_CURSOR_AUTO_V1",
    example_reuse: buildArkBookCanonConversationReuseV1FromJudgeV1({
      vps,
      routeReason: "KATAKAMUNA_CANON_ROUTE_V1",
      routeClass: "analysis",
      opposition_pairs: [{ left: "普及本流", right: "天聞再統合" }],
    }),
    nextOnPass: "TENMON_BOOK_LEARNING_ACCEPTANCE_AND_REUSE_BENCH_CURSOR_AUTO_V1",
    nextOnFail: "TENMON_ARK_BOOK_CANON_LEDGER_AND_CONVERSATION_REUSE_RETRY_CURSOR_AUTO_V1",
  };
}

function isArkBookCanonReuseV1(x: unknown): x is ArkBookCanonConversationReuseV1 {
  return (
    !!x &&
    typeof x === "object" &&
    !Array.isArray(x) &&
    (x as ArkBookCanonConversationReuseV1).schema === "TENMON_ARK_BOOK_CANON_CONVERSATION_REUSE_V1"
  );
}

/** スレッド意味中心（既存 ThreadCore 型名と衝突させない strict 契約） */
export type ThreadMeaningMemoryCoreV1 = {
  schema: "TENMON_THREAD_MEANING_MEMORY_V1";
  priorCenter: string | null;
  currentCenter: string | null;
  /** 直近ターンの centerKey（話題飛躍判定用・表層非表示） */
  lastCenterKey: string | null;
  delta: string | null;
  nextStepBias: string | null;
  acceptedConcepts: readonly string[];
  unresolvedAxes: readonly string[];
  detach: boolean;
};

export function emptyThreadMeaningMemoryCoreV1(): ThreadMeaningMemoryCoreV1 {
  return {
    schema: "TENMON_THREAD_MEANING_MEMORY_V1",
    priorCenter: null,
    currentCenter: null,
    lastCenterKey: null,
    delta: null,
    nextStepBias: null,
    acceptedConcepts: [],
    unresolvedAxes: [],
    detach: false,
  };
}

/** general / continuity / scripture follow-up など（特殊系 DEF/EXPLICIT/SYSTEM_DIAG は除外） */
export function threadMeaningMemoryRouteAllowedV1(routeReason: string): boolean {
  const rr = String(routeReason || "").trim();
  if (rr === "NATURAL_GENERAL_LLM_TOP" || rr === "NATURAL_GENERAL_LLM_TOP_V1") return true;
  if (rr === "SCRIPTURE_LOCAL_RESOLVER_V4") return true;
  if (rr === "GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1") return true;
  if (rr === "K1_TRACE_EMPTY_GATED_V1") return true;
  if (rr === "TENMON_SCRIPTURE_CANON_V1") return true;
  if (rr === "TENMON_SUBCONCEPT_CANON_V1") return true;
  if (rr.startsWith("CONTINUITY_")) return true;
  if (/^R22_(ESSENCE|NEXTSTEP|COMPARE)_FOLLOWUP_V1$/.test(rr)) return true;
  if (rr === "KATAKAMUNA_CANON_ROUTE_V1" || rr === "KATAKAMUNA_DETAIL_FASTPATH_V1") return true;
  if (rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1") return true;
  if (rr === "TRUTH_GATE_RETURN_V2") return true;
  if (rr === "TENMON_CONCEPT_CANON_V1") return true;
  if (rr === "WORLDVIEW_ROUTE_V1") return true;
  if (rr === "R22_COMPARE_ASK_V1") return true;
  if (/^FACTUAL_/u.test(rr)) return true;
  return false;
}

const RE_CONNECT_SURFACE = /続き|前の|さっき|先ほど|直前|その返答|同じ話|引き続き|継続|流れで|その流れ|要点を/u;

function readSplit(ku: Record<string, unknown>): InputSemanticSplitResultV1 | null {
  const s = ku.inputSemanticSplitResultV1;
  if (!s || typeof s !== "object" || Array.isArray(s)) return null;
  if ((s as { schema?: string }).schema !== "TENMON_INPUT_SEMANTIC_SPLIT_V1") return null;
  return s as InputSemanticSplitResultV1;
}

function readTruth(ku: Record<string, unknown>): TruthLayerArbitrationResultV1 | null {
  const t = ku.truthLayerArbitrationV1;
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  if ((t as { schema?: string }).schema !== "TENMON_TRUTH_LAYER_ARBITRATION_V1") return null;
  return t as TruthLayerArbitrationResultV1;
}

function tokenOverlap(message: string, anchor: string): number {
  const msg = message.slice(0, 280);
  const parts = anchor.split(/[\s、。．]+/u).filter((x) => x.length >= 2);
  let n = 0;
  for (const p of parts.slice(0, 8)) {
    if (msg.includes(p)) n++;
  }
  if (parts.length === 0 && anchor.length >= 2) {
    const head = anchor.slice(0, Math.min(12, anchor.length));
    return msg.includes(head) ? 1 : 0;
  }
  return n;
}

function detectDetach(args: {
  rawMessage: string;
  prior: ThreadMeaningMemoryCoreV1;
  newCenterLabel: string | null;
  newCenterKey: string | null;
  connectIntent: boolean;
}): boolean {
  if (args.connectIntent) return false;
  const prev = args.prior.currentCenter?.trim() || args.prior.priorCenter?.trim();
  if (!prev) return false;
  const pk = args.prior.lastCenterKey?.trim() || null;
  const nk = args.newCenterKey?.trim() || null;
  if (nk && pk && nk !== pk) return true;
  const msg = args.rawMessage.trim();
  if (tokenOverlap(msg, prev) > 0) return false;
  return msg.length > 8;
}

const MAX_CONCEPTS = 16;

function mergeConcepts(
  detach: boolean,
  prev: readonly string[],
  label: string | null,
  arbitration: TruthLayerArbitrationResultV1 | null,
): string[] {
  const add =
    label?.trim() ||
    (arbitration?.answerMode === "canon_grounded" ? arbitration.coreTruth.slice(0, 48).trim() : "");
  if (detach) {
    return add ? [add] : [];
  }
  const out = [...prev.map((x) => String(x).trim()).filter(Boolean)];
  if (add && !out.includes(add)) out.unshift(add);
  return out.slice(0, MAX_CONCEPTS);
}

export type ThreadMeaningMemoryCarryTargetV1 = {
  centerKey?: string | null;
  centerLabel?: string | null;
  threadMeaningMemoryV1?: ThreadMeaningMemoryCoreV1 | null;
};

/**
 * binder 適用後: ku + threadCore に threadMeaningMemoryV1 を載せる（内部観測のみ）
 */
export function advanceThreadMeaningMemoryForRequestV1(args: {
  ku: Record<string, unknown>;
  threadCore: ThreadMeaningMemoryCarryTargetV1;
  rawMessage: string;
}): void {
  const { ku, threadCore } = args;
  const rawMessage = String(args.rawMessage || "").trim();
  const rr = String(ku.routeReason ?? "").trim();
  if (!threadMeaningMemoryRouteAllowedV1(rr)) return;

  const prior = threadCore.threadMeaningMemoryV1 ?? emptyThreadMeaningMemoryCoreV1();
  const split = readSplit(ku);
  const arbitration = readTruth(ku);
  const centerKey = ku.centerKey != null ? String(ku.centerKey).trim() || null : null;
  const centerLabel = ku.centerLabel != null ? String(ku.centerLabel).trim() || null : null;

  const connectIntent =
    RE_CONNECT_SURFACE.test(rawMessage) || (split != null && split.intentClass === "connect");

  const currentCenter =
    centerLabel ||
    centerKey ||
    (arbitration ? arbitration.coreTruth.slice(0, 120).trim() || null : null);

  const detach = detectDetach({
    rawMessage,
    prior,
    newCenterLabel: centerLabel,
    newCenterKey: centerKey,
    connectIntent,
  });

  const priorCenter = detach ? null : prior.currentCenter;
  const delta = detach
    ? "detached_fresh_topic"
    : prior.currentCenter && currentCenter && prior.currentCenter === currentCenter
      ? "same_center_continuation"
      : prior.currentCenter
        ? "center_shift"
        : "initial_center";

  const nextStepBias = arbitration
    ? `lane:${arbitration.answerMode}${arbitration.danshari ? "|danshari" : ""}`
    : centerKey
      ? `centerKey:${centerKey}`
      : "open";

  let unresolvedAxes = arbitration
    ? [...arbitration.forbidFlags, ...arbitration.droppedCandidates].slice(0, 8)
    : [];

  const arkRaw = (ku as Record<string, unknown>).arkBookCanonConversationReuseV1;
  let nextStepBiasArk = nextStepBias;
  if (isArkBookCanonReuseV1(arkRaw)) {
    const ark = arkRaw;
    const inject = [
      ...ark.uncertainty_registry.flags.map((f) => `ark|unc|${String(f).slice(0, 80)}`),
      ...ark.uncertainty_registry.open_issues.slice(0, 6).map((x) => `ark|issue|${String(x).slice(0, 100)}`),
      ...ark.reuse_for_routes.open_points.slice(0, 6).map((x) => `ark|open|${String(x).slice(0, 100)}`),
    ];
    if (ark.reuse_for_routes.provisional_verdict.trim()) {
      inject.push(`ark|pv|${ark.reuse_for_routes.provisional_verdict.slice(0, 140)}`);
    }
    unresolvedAxes = [...new Set([...unresolvedAxes, ...inject])].slice(0, 24);
    if (ark.thread_reentry_memory.book_id) {
      nextStepBiasArk = `${nextStepBias}|ark_book:${ark.thread_reentry_memory.book_id}`;
    }
  }

  const acceptedConcepts = mergeConcepts(detach, prior.acceptedConcepts, centerLabel, arbitration);

  const next: ThreadMeaningMemoryCoreV1 = {
    schema: "TENMON_THREAD_MEANING_MEMORY_V1",
    priorCenter,
    currentCenter,
    lastCenterKey: centerKey,
    delta,
    nextStepBias: nextStepBiasArk,
    acceptedConcepts,
    unresolvedAxes,
    detach,
  };

  (ku as Record<string, unknown>).threadMeaningMemoryV1 = next;
  threadCore.threadMeaningMemoryV1 = next;
}

/** center_reason JSON からの復元（厳密 schema のみ） */
export function parseThreadMeaningMemoryV1FromJson(raw: unknown): ThreadMeaningMemoryCoreV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (String(o.schema || "") !== "TENMON_THREAD_MEANING_MEMORY_V1") return null;
  const acceptedConcepts = Array.isArray(o.acceptedConcepts)
    ? (o.acceptedConcepts as unknown[]).map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const unresolvedAxes = Array.isArray(o.unresolvedAxes)
    ? (o.unresolvedAxes as unknown[]).map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  return {
    schema: "TENMON_THREAD_MEANING_MEMORY_V1",
    priorCenter: o.priorCenter != null ? String(o.priorCenter).trim() || null : null,
    currentCenter: o.currentCenter != null ? String(o.currentCenter).trim() || null : null,
    lastCenterKey: o.lastCenterKey != null ? String(o.lastCenterKey).trim() || null : null,
    delta: o.delta != null ? String(o.delta).trim() || null : null,
    nextStepBias: o.nextStepBias != null ? String(o.nextStepBias).trim() || null : null,
    acceptedConcepts: acceptedConcepts.slice(0, MAX_CONCEPTS),
    unresolvedAxes: unresolvedAxes.slice(0, 24),
    detach: o.detach === true,
  };
}

/** saveThreadCore 用に JSON へ載せるプレーンオブジェクト */
export function serializeThreadMeaningMemoryV1ForStore(m: ThreadMeaningMemoryCoreV1): Record<string, unknown> {
  return {
    schema: m.schema,
    priorCenter: m.priorCenter,
    currentCenter: m.currentCenter,
    lastCenterKey: m.lastCenterKey,
    delta: m.delta,
    nextStepBias: m.nextStepBias,
    acceptedConcepts: [...m.acceptedConcepts],
    unresolvedAxes: [...m.unresolvedAxes],
    detach: m.detach,
  };
}
