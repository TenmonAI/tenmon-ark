/**
 * R9_GROWTH_LEDGER_SCHEMA_V1 / R9_GROWTH_LEDGER_KANAGI_V1
 * kanagi growth ledger の型・pure helper・append-only insert。
 */
import { getDb } from "../db/index.js";
import { shouldUseDanshariCommunication } from "./danshariCommunication.js";
import {
  SELF_LEARNING_RFB_LEDGER_MARKER,
  buildSelfLearningRuleFeedbackV1,
} from "./selfLearningRuleFeedbackV1.js";

export type KanagiGrowthLedgerEntry = {
  inputText: string;
  routeReason?: string | null;
  selfPhase?: string | null;
  intentPhase?: string | null;
  heartSourcePhase?: string | null;
  heartTargetPhase?: string | null;
  heartEntropy?: number | null;
  topicClass?: string | null;
  conceptMode?: string | null;
  conceptAlignment?: string | null;
  scriptureKey?: string | null;
  scriptureMode?: string | null;
  scriptureAlignment?: string | null;
  stabilityScore?: number | null;
  driftRisk?: number | null;
  shouldPersist?: boolean | number | null;
  shouldRecombine?: boolean | number | null;
  unresolvedClass?: string | null;
  nextGrowthAxis?: string | null;
  note?: string | null;
};

const defaultEntry: KanagiGrowthLedgerEntry = {
  inputText: "",
  routeReason: null,
  selfPhase: null,
  intentPhase: null,
  heartSourcePhase: null,
  heartTargetPhase: null,
  heartEntropy: null,
  topicClass: null,
  conceptMode: null,
  conceptAlignment: null,
  scriptureKey: null,
  scriptureMode: null,
  scriptureAlignment: null,
  stabilityScore: null,
  driftRisk: null,
  shouldPersist: false,
  shouldRecombine: false,
  unresolvedClass: null,
  nextGrowthAxis: null,
  note: null,
};

/**
 * 入力オブジェクトを KanagiGrowthLedgerEntry に正規化する。pure。
 */
export function normalizeKanagiGrowthLedgerEntry(
  input: unknown
): KanagiGrowthLedgerEntry {
  if (input == null || typeof input !== "object") {
    return { ...defaultEntry, inputText: String(input ?? "") };
  }
  const o = input as Record<string, unknown>;
  const str = (v: unknown) => (v != null && typeof v === "string" ? v : null);
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const boolOrInt = (v: unknown): 0 | 1 | null => {
    if (v === true || v === 1) return 1;
    if (v === false || v === 0) return 0;
    return null;
  };
  return {
    inputText: str(o.inputText ?? o.input_text) ?? "",
    routeReason: str(o.routeReason ?? o.route_reason) ?? null,
    selfPhase: str(o.selfPhase ?? o.self_phase) ?? null,
    intentPhase: str(o.intentPhase ?? o.intent_phase) ?? null,
    heartSourcePhase: str(o.heartSourcePhase ?? o.heart_source_phase) ?? null,
    heartTargetPhase: str(o.heartTargetPhase ?? o.heart_target_phase) ?? null,
    heartEntropy: num(o.heartEntropy ?? o.heart_entropy) ?? null,
    topicClass: str(o.topicClass ?? o.topic_class) ?? null,
    conceptMode: str(o.conceptMode ?? o.concept_mode) ?? null,
    conceptAlignment: str(o.conceptAlignment ?? o.concept_alignment) ?? null,
    scriptureKey: str(o.scriptureKey ?? o.scripture_key) ?? null,
    scriptureMode: str(o.scriptureMode ?? o.scripture_mode) ?? null,
    scriptureAlignment: str(o.scriptureAlignment ?? o.scripture_alignment) ?? null,
    stabilityScore: num(o.stabilityScore ?? o.stability_score) ?? null,
    driftRisk: num(o.driftRisk ?? o.drift_risk) ?? null,
    shouldPersist: boolOrInt(o.shouldPersist ?? o.should_persist) ?? 0,
    shouldRecombine: boolOrInt(o.shouldRecombine ?? o.should_recombine) ?? 0,
    unresolvedClass: str(o.unresolvedClass ?? o.unresolved_class) ?? null,
    nextGrowthAxis: str(o.nextGrowthAxis ?? o.next_growth_axis) ?? null,
    note: str(o.note) ?? null,
  };
}

function toShouldPersistOrRecombineVal(v: unknown): 0 | 1 {
  if (v === true || v === 1) return 1;
  return 0;
}

/** R9_LEDGER_APPEND_PAYLOAD_SOURCE_FIX_V1: input_text は message/rawMessage 優先、最後の fallback だけ "(no input)" */
function resolveInputText(
  rawMessage: string | undefined,
  ku: Record<string, unknown>
): string {
  const str = (v: unknown) => (v != null && typeof v === "string" ? String(v).trim() : "");
  const a = rawMessage != null && rawMessage !== "" ? rawMessage.trim() : "";
  if (a) return a;
  const b = str(ku.inputText);
  if (b) return b;
  const c = str((ku as any).rawMessage ?? (ku as any).message);
  if (c) return c;
  return "(no input)";
}

/**
 * ku（decisionFrame.ku）と rawMessage から KanagiGrowthLedgerEntry を組み立てる。pure。
 * R9_GROWTH_LEDGER_INPUT_FIX_V1: input_text 必ず埋める。scripture 時は topic_class / concept_* を scripture 整合に。
 */
export function buildKanagiGrowthLedgerEntryFromKu(
  ku: Record<string, unknown>,
  rawMessage?: string
): KanagiGrowthLedgerEntry {
  const ks = ku.kanagiSelf as Record<string, unknown> | undefined;
  const heart = ku.heart as Record<string, unknown> | undefined;
  const mf = ku.meaningFrame as Record<string, unknown> | undefined;
  const str = (v: unknown) => (v != null && typeof v === "string" ? v : null);
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const inputText = resolveInputText(rawMessage, ku);
  const routeReason = str(ku.routeReason) ?? null;
  const scriptureKey =
    str(ku.scriptureKey ?? ks?.scriptureKey ?? mf?.scriptureKey) ?? null;
  const isScripture =
    (scriptureKey != null && scriptureKey !== "") ||
    (typeof routeReason === "string" && routeReason.includes("SCRIPTURE"));
  const baseTopicClass = str(ks?.topicClass ?? mf?.topicClass) ?? null;
  const topicClass =
    isScripture && (!baseTopicClass || baseTopicClass === "general")
      ? "scripture"
      : baseTopicClass;
  const conceptMode =
    isScripture ? "canon" : (str(ks?.conceptMode) ?? null);
  const conceptAlignment =
    isScripture ? "scripture_aligned" : (str(ks?.conceptAlignment) ?? null);
  const driftRiskVal = num(ks?.driftRisk) ?? null;
  // R10_DANSHARI_COMMUNICATION_LOOP_V1: general/support で driftRisk >= 0.5 のときのみ ledger に danshari_communication を残す
  const noteVal =
    shouldUseDanshariCommunication({
      routeReason,
      topicClass,
      driftRisk: driftRiskVal,
      selfPhase: str(ks?.selfPhase) ?? null,
      intentPhase: str(ks?.intentPhase) ?? null,
      shouldPersist: toShouldPersistOrRecombineVal(ks?.shouldPersist) ? 1 : null,
      shouldRecombine: toShouldPersistOrRecombineVal(ks?.shouldRecombine) ? 1 : null,
    }) ? "danshari_communication" : null;

  let unresolvedClass: string | null = null;
  let nextGrowthAxis: string | null = null;
  if (
    toShouldPersistOrRecombineVal(ks?.shouldPersist) ||
    toShouldPersistOrRecombineVal(ks?.shouldRecombine)
  ) {
    try {
      const rfb = buildSelfLearningRuleFeedbackV1(ku);
      unresolvedClass = SELF_LEARNING_RFB_LEDGER_MARKER;
      nextGrowthAxis = JSON.stringify(rfb).slice(0, 12000);
    } catch {
      /* ignore */
    }
  }

  return {
    inputText,
    routeReason,
    selfPhase: str(ks?.selfPhase) ?? null,
    intentPhase: str(ks?.intentPhase) ?? null,
    heartSourcePhase: str(ks?.heartSourcePhase ?? heart?.phase) ?? null,
    heartTargetPhase: str(ks?.heartTargetPhase ?? heart?.arkTargetPhase) ?? null,
    heartEntropy: num(ks?.heartEntropy ?? heart?.entropy) ?? null,
    topicClass,
    conceptMode,
    conceptAlignment,
    scriptureKey,
    scriptureMode: str(ku.scriptureMode ?? ks?.scriptureMode) ?? null,
    scriptureAlignment:
      str(ku.scriptureAlignment ?? ks?.scriptureAlignment) ?? null,
    stabilityScore: num(ks?.stabilityScore) ?? null,
    driftRisk: driftRiskVal,
    shouldPersist: toShouldPersistOrRecombineVal(ks?.shouldPersist),
    shouldRecombine: toShouldPersistOrRecombineVal(ks?.shouldRecombine),
    unresolvedClass,
    nextGrowthAxis,
    note: noteVal,
  };
}

/**
 * 1件を kanagi_growth_ledger に append する。失敗時は log のみで会話を落とさない。
 */
export function insertKanagiGrowthLedgerEntry(
  entry: KanagiGrowthLedgerEntry
): void {
  try {
    const row = toKanagiGrowthLedgerRow(entry);
    const db = getDb("kokuzo");
    const values: (string | number | null)[] = [
      row.input_text,
      row.route_reason,
      row.self_phase,
      row.intent_phase,
      row.heart_source_phase,
      row.heart_target_phase,
      row.heart_entropy,
      row.topic_class,
      row.concept_mode,
      row.concept_alignment,
      row.scripture_key,
      row.scripture_mode,
      row.scripture_alignment,
      row.stability_score,
      row.drift_risk,
      row.should_persist,
      row.should_recombine,
      row.unresolved_class,
      row.next_growth_axis,
      row.note,
    ];
    db.prepare(
      `INSERT INTO kanagi_growth_ledger (
        input_text, route_reason, self_phase, intent_phase,
        heart_source_phase, heart_target_phase, heart_entropy,
        topic_class, concept_mode, concept_alignment,
        scripture_key, scripture_mode, scripture_alignment,
        stability_score, drift_risk, should_persist, should_recombine,
        unresolved_class, next_growth_axis, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(...values);
  } catch (e) {
    try {
      console.error("[kanagi_growth_ledger] insert failed:", (e as Error)?.message ?? e);
    } catch {}
  }
}

/**
 * R9_LEDGER_GATE_WRAPPER_APPEND_UNIFY_V1: payload から 1 回だけ append を試行。__KANAGI_LEDGER_DONE で二重防止。
 * 入力優先: rawMessageOverride / payload.rawMessage / payload.message / decisionFrame.ku.inputText
 */
export function tryAppendKanagiGrowthLedgerFromPayload(
  payload: any,
  rawMessageOverride?: string
): void {
  try {
    if (!payload || typeof payload !== "object") return;
    if ((payload as any).__KANAGI_LEDGER_DONE === true) return;
    const df = payload.decisionFrame;
    if (!df || typeof df !== "object") return;
    const ku = df.ku;
    if (!ku || typeof ku !== "object") return;
    if (!ku.kanagiSelf || typeof ku.kanagiSelf !== "object") return;
    const rawForLedger = String(
      rawMessageOverride ?? (payload as any)?.rawMessage ?? (payload as any)?.message ?? (ku as any)?.inputText ?? ""
    );
    const entry = buildKanagiGrowthLedgerEntryFromKu(ku as Record<string, unknown>, rawForLedger);
    insertKanagiGrowthLedgerEntry(entry);
    (payload as any).__KANAGI_LEDGER_DONE = true;
  } catch {}
}

/** DB 行（snake_case）の値型 */
export type KanagiGrowthLedgerRow = Record<string, string | number | null>;

/**
 * KanagiGrowthLedgerEntry を DB 行（カラム名 snake_case）のオブジェクトに変換する。pure。INSERT は呼ばない。
 */
export function toKanagiGrowthLedgerRow(
  entry: KanagiGrowthLedgerEntry
): KanagiGrowthLedgerRow {
  return {
    input_text: entry.inputText,
    route_reason: entry.routeReason ?? null,
    self_phase: entry.selfPhase ?? null,
    intent_phase: entry.intentPhase ?? null,
    heart_source_phase: entry.heartSourcePhase ?? null,
    heart_target_phase: entry.heartTargetPhase ?? null,
    heart_entropy: entry.heartEntropy ?? null,
    topic_class: entry.topicClass ?? null,
    concept_mode: entry.conceptMode ?? null,
    concept_alignment: entry.conceptAlignment ?? null,
    scripture_key: entry.scriptureKey ?? null,
    scripture_mode: entry.scriptureMode ?? null,
    scripture_alignment: entry.scriptureAlignment ?? null,
    stability_score: entry.stabilityScore ?? null,
    drift_risk: entry.driftRisk ?? null,
    should_persist:
      entry.shouldPersist === true || entry.shouldPersist === 1 ? 1 : 0,
    should_recombine:
      entry.shouldRecombine === true || entry.shouldRecombine === 1 ? 1 : 0,
    unresolved_class: entry.unresolvedClass ?? null,
    next_growth_axis: entry.nextGrowthAxis ?? null,
    note: entry.note ?? null,
  };
}
