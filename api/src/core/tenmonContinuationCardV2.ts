import { dbPrepare, getDb, getDbPath } from "../db/index.js";
import { buildTenmonSealDecisionV1, type TenmonOperableSealChecks, type TenmonSealDecisionV1 } from "./tenmonSealDecisionV1.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type PromotionDecision = "pass" | "hold" | "reject";
type ContradictionStatus = "clean" | "flagged" | "unknown";

export type PromotionGateResultV2 = {
  decision: PromotionDecision;
  reason_codes: string[];
  contradiction_status: ContradictionStatus;
  canonical_center: string;
  reuse_score: number;
  acceptance_score: number;
};

export type KokuzoLawLite = {
  id?: number;
  name?: string | null;
  definition?: string | null;
  evidenceIds?: string[];
  doc?: string;
  pdfPage?: number | null;
};

export type TrainingLogInput = {
  threadId: string;
  message: string;
  response: string;
  centerKey: string | null;
  verdict?: string | null;
  decision: PromotionDecision;
  reasonCodes: string[];
};

const CENTER_MAP: Record<string, string> = {
  KUKAI: "空海・真言密教・即身成仏",
  HOKEKYO: "法華経・一仏乗・方便実相",
  katakamuna: "カタカムナ・潜象物理・楢崎皐月",
  kotodama_hisho: "言灵・五十連・水火の法則",
};

const centerMemoryCache = new Map<string, string>();

const KEYWORDS: Record<string, string[]> = {
  KUKAI: ["空海", "真言", "密教", "即身成仏", "大日"],
  HOKEKYO: ["法華経", "一仏乗", "方便", "実相", "妙法"],
  katakamuna: ["カタカムナ", "潜象", "楢崎", "ウタヒ", "アマウツシ"],
  kotodama_hisho: ["言灵", "言霊", "五十連", "水火", "イキ"],
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function inferCenterKey(message: string): string | null {
  const t = String(message || "").toLowerCase();
  for (const [key, words] of Object.entries(KEYWORDS)) {
    for (const w of words) {
      if (t.includes(String(w).toLowerCase())) return key;
    }
  }
  return null;
}

function getCanonicalCenter(centerKey: string | null): string {
  if (!centerKey) return "天聞統合軸";
  return CENTER_MAP[centerKey] ?? "天聞統合軸";
}

function normalizedEvidenceIds(law: KokuzoLawLite): string[] {
  return Array.isArray(law.evidenceIds) ? law.evidenceIds.filter((x) => typeof x === "string" && x.length > 0) : [];
}

function estimateContradictionRisk(definition: string): number {
  const t = String(definition || "");
  if (!t.trim()) return 1;
  const flagged = /(矛盾|誤謬|未検証|否定|反証|不整合)/.test(t);
  if (flagged) return 0.6;
  const caution = /(仮説|推定|可能性|暫定)/.test(t);
  if (caution) return 0.3;
  return 0;
}

function getCenterMemoryTexts(): string[] {
  let dbRows: string[] = [];
  try {
    const rows = dbPrepare(
      "kokuzo",
      "SELECT content FROM session_memory WHERE role = 'assistant' ORDER BY id DESC LIMIT 1200"
    ).all() as Array<{ content?: string }>;
    dbRows = rows.map((x) => String(x?.content || "")).filter(Boolean);
  } catch {
    dbRows = [];
  }

  const dbPath = getDbPath("kokuzo.sqlite");
  if (centerMemoryCache.has(dbPath)) {
    const cached = centerMemoryCache.get(dbPath) || "";
    if (cached.length > 0) {
      return [cached, ...dbRows];
    }
  }

  let sourceText = "";
  const candidates = [
    join(process.cwd(), "kokuzo", "kokuzo_pages.text"),
    join(process.cwd(), "..", "kokuzo", "kokuzo_pages.text"),
  ];
  for (const p of candidates) {
    try {
      sourceText = readFileSync(p, "utf8");
      if (sourceText) break;
    } catch {
      // keep trying next path
    }
  }
  centerMemoryCache.set(dbPath, sourceText);
  return sourceText ? [sourceText, ...dbRows] : dbRows;
}

function computeReuseScore(centerKey: string | null): number {
  if (!centerKey) return 0;
  const words = KEYWORDS[centerKey] || [];
  if (words.length === 0) return 0;
  const texts = getCenterMemoryTexts();
  let hits = 0;
  for (const t of texts) {
    const low = String(t || "").toLowerCase();
    if (words.some((w) => low.includes(String(w).toLowerCase()))) hits += 1;
  }
  return clamp01(hits / 100);
}

export function evaluatePromotionGateV2(input: {
  centerKey: string | null;
  law: KokuzoLawLite;
}): PromotionGateResultV2 {
  const centerKey = input.centerKey;
  const canonical_center = getCanonicalCenter(centerKey);
  const evidence_refs = normalizedEvidenceIds(input.law);
  const contradictionRisk = estimateContradictionRisk(String(input.law.definition || ""));
  const contradiction_status: ContradictionStatus =
    contradictionRisk >= 0.6 ? "flagged" : contradictionRisk > 0 ? "unknown" : "clean";
  const reuse_score = computeReuseScore(centerKey);
  const acceptance_score = evidence_refs.length > 0 ? clamp01((1 - contradictionRisk) * 0.8 + 0.2) : 0;

  const reason_codes: string[] = [];
  if (evidence_refs.length === 0) reason_codes.push("missing_evidence_refs");
  if (!centerKey) reason_codes.push("center_key_unknown");
  if (reuse_score < 0.05) reason_codes.push("reuse_low");
  if (contradiction_status === "flagged") reason_codes.push("contradiction_flagged");

  let decision: PromotionDecision = "pass";
  if (evidence_refs.length === 0 || contradiction_status === "flagged") decision = "reject";
  else if (acceptance_score < 0.5 || reuse_score < 0.05) decision = "hold";
  else decision = "pass";

  if (reason_codes.length === 0) reason_codes.push("promotion_ok");

  return {
    decision,
    reason_codes,
    contradiction_status,
    canonical_center,
    reuse_score,
    acceptance_score,
  };
}

export function getPromotionLawBundle(input: {
  threadId: string;
  message: string;
  laws: KokuzoLawLite[];
}): {
  centerKey: string | null;
  promotionGate: PromotionGateResultV2;
  promotedLaws: Array<KokuzoLawLite & { promotionGate: PromotionGateResultV2 }>;
  promotionTrace: Array<KokuzoLawLite & { promotionGate: PromotionGateResultV2 }>;
} {
  const centerKey = inferCenterKey(input.message);
  const laws = (Array.isArray(input.laws) ? input.laws : []).slice(0, 3);
  const trace = laws.map((law) => ({
    ...law,
    promotionGate: evaluatePromotionGateV2({ centerKey, law }),
  }));
  const promotedLaws = trace.filter((x) => x.promotionGate.decision === "pass");
  const promotionGate =
    trace[0]?.promotionGate ??
    evaluatePromotionGateV2({
      centerKey,
      law: { definition: "", evidenceIds: [] },
    });

  return {
    centerKey,
    promotionGate,
    promotedLaws,
    promotionTrace: trace,
  };
}

export function buildThreadCenter(input: {
  threadId: string;
  message: string;
  previousCenterKey: string | null;
}): {
  center_key: string | null;
  source: "inferred" | "carried_over" | "missing";
  essential_goal: string | null;
  success_criteria_json: unknown;
  constraints_json: unknown;
  clarification_focus: string | null;
  centerShift: boolean;
} {
  const inferred = inferCenterKey(input.message);
  const center_key = inferred || input.previousCenterKey || null;
  const source: "inferred" | "carried_over" | "missing" = inferred
    ? "inferred"
    : input.previousCenterKey
      ? "carried_over"
      : "missing";
  const centerShift = !!(inferred && input.previousCenterKey && inferred !== input.previousCenterKey);
  const canonical = getCanonicalCenter(center_key);
  const essential_goal = center_key ? `${canonical}に沿って回答の軸を維持する` : null;

  return {
    center_key,
    source,
    essential_goal,
    success_criteria_json: center_key ? { axis_locked: true, grounded: true } : null,
    constraints_json: { no_surface_leak: true, keep_single_center: true },
    clarification_focus: center_key ? `center=${center_key}` : null,
    centerShift,
  };
}

function ensureTrainingTables(): void {
  getDb("kokuzo");
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function summarize(s: string, max = 120): string {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

export function appendLearningReturn(input: TrainingLogInput): void {
  ensureTrainingTables();
  const chars = String(input.response || "").length;
  if (chars <= 100) return;
  const verdict = String(input.verdict || "grounded").toLowerCase();
  if (verdict !== "grounded") return;

  const id = newId("trl");
  const now = new Date().toISOString();
  dbPrepare(
    "kokuzo",
    "INSERT INTO tenmon_training_log (id, createdAt, question_summary, response_summary, centerKey, verdict, chars) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    now,
    summarize(input.message, 140),
    summarize(input.response, 240),
    input.centerKey,
    verdict,
    chars
  );

  const evId = newId("evl");
  dbPrepare(
    "kokuzo",
    "INSERT INTO evolution_ledger_v1 (id, createdAt, changedLayer, decision, centerKey, reason_codes) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    evId,
    now,
    "promotion",
    input.decision,
    input.centerKey,
    JSON.stringify(input.reasonCodes || [])
  );
}

function countTableRows(table: string): number {
  try {
    const row = dbPrepare("kokuzo", `SELECT COUNT(*) AS cnt FROM ${table}`).get() as any;
    return Number(row?.cnt || 0);
  } catch {
    return 0;
  }
}

function readAutonomyRunning(): boolean {
  const candidates = [
    join(process.cwd(), "automation", "multi_ai_autonomy_runtime_state.json"),
    join(process.cwd(), "api", "automation", "multi_ai_autonomy_runtime_state.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf8");
      const parsed = JSON.parse(raw) as { status?: string };
      return String(parsed.status || "").toUpperCase() === "RUNNING";
    } catch {
      // keep trying next path
    }
  }
  return false;
}

export function buildOperableSealV2(): TenmonSealDecisionV1 {
  const checks: TenmonOperableSealChecks = {
    source_registry_ok: countTableRows("source_registry") > 0 || countTableRows("kokuzo_files") > 0,
    memory_units_ok:
      countTableRows("memory_units") > 0 ||
      countTableRows("session_memory") > 0 ||
      countTableRows("conversation_log") > 0,
    memory_projection_ok: countTableRows("memory_projection_logs") > 0 || countTableRows("conversation_log") > 0,
    persona_binding_ok: countTableRows("persona_knowledge_bindings") > 0 || countTableRows("training_rules") > 0,
    thread_persona_ok: countTableRows("thread_persona_links") > 0 || countTableRows("session_memory") > 0,
    autonomy_running: readAutonomyRunning(),
  };
  return buildTenmonSealDecisionV1(checks);
}

function parseRequestedLength(message: string): number {
  const m = String(message || "").match(/(\d{3,5})\s*字/);
  if (!m) return 0;
  return Number(m[1] || 0) || 0;
}

export type LongformTraceV2 = {
  requestedLength: number;
  minimumFloor: number;
  actualLength: number;
  arcCount: number;
  structurePassed: boolean;
};

export function buildLongformTraceV2(input: { message: string; response: string }): LongformTraceV2 | null {
  const requestedLength = parseRequestedLength(input.message);
  if (requestedLength < 700) return null;

  const actualLength = String(input.response || "").length;
  const minimumFloor = requestedLength >= 3000 ? 2100 : Math.max(700, Math.floor(requestedLength * 0.7));

  const arcs = String(input.response || "")
    .split(/\n{2,}/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const arcCount = Math.max(1, Math.min(12, arcs.length));

  return {
    requestedLength,
    minimumFloor,
    actualLength,
    arcCount,
    structurePassed: actualLength >= minimumFloor,
  };
}

export function ensureCoreTablesForContinuation(): void {
  ensureTrainingTables();
}
