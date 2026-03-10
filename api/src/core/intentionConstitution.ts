import fs from "node:fs";
import path from "node:path";

const EXPECTED_SCHEMA = "TENMON_INTENTION_CONSTITUTION_V1";

export type UnresolvedHandlingItem = {
  note: string;
  policy: string;
};

export type UnresolvedHandling = {
  xml_fragment_in_source?: UnresolvedHandlingItem;
  kanagi_mapping?: UnresolvedHandlingItem;
  runtime_bind?: UnresolvedHandlingItem;
};

export type KanagiPhaseMapping = {
  _note?: string;
  CENTER?: string[];
  "L-IN"?: string[];
  "R-IN"?: string[];
  "L-OUT"?: string[];
  "R-OUT"?: string[];
};

export type TenmonIntentionConstitutionV1 = {
  schema: string;
  updated_at: string;
  source_maps: string[];
  core_intentions: string[];
  priority_of_learning: string[];
  non_negotiable_preservations: string[];
  unresolved_handling: UnresolvedHandling;
  growth_direction_rules: string[];
  rejection_rules: string[];
  scripture_growth_priority: string[];
  concept_growth_priority: string[];
  response_selection_priority: string[];
  kanagi_phase_mapping: KanagiPhaseMapping;
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_intention_constitution_v1.json");
}

let __cache: TenmonIntentionConstitutionV1 | null = null;

/**
 * Load and validate intention constitution. Returns null on read/parse/schema failure.
 */
export function loadTenmonIntentionConstitution(): TenmonIntentionConstitutionV1 | null {
  if (__cache) return __cache;
  try {
    const p = canonPath();
    const raw = fs.readFileSync(p, "utf-8");
    const json = JSON.parse(raw) as TenmonIntentionConstitutionV1;
    if (json.schema !== EXPECTED_SCHEMA) return null;
    __cache = json;
    return json;
  } catch {
    return null;
  }
}

/**
 * Return priority_of_learning. Empty array if not loaded.
 */
export function resolveLearningPriority(): string[] {
  const canon = loadTenmonIntentionConstitution();
  if (!canon || !Array.isArray(canon.priority_of_learning)) return [];
  return canon.priority_of_learning;
}

/**
 * Return growth_direction_rules. Empty array if not loaded.
 */
export function resolveGrowthDirection(): string[] {
  const canon = loadTenmonIntentionConstitution();
  if (!canon || !Array.isArray(canon.growth_direction_rules)) return [];
  return canon.growth_direction_rules;
}

/**
 * Return unresolved_handling. Empty object if not loaded.
 */
export function resolveUnresolvedPolicy(): UnresolvedHandling {
  const canon = loadTenmonIntentionConstitution();
  if (!canon || typeof canon.unresolved_handling !== "object") return {};
  return canon.unresolved_handling;
}

/**
 * Return response_selection_priority. Empty array if not loaded.
 */
export function resolveResponseSelectionPriority(): string[] {
  const canon = loadTenmonIntentionConstitution();
  if (!canon || !Array.isArray(canon.response_selection_priority)) return [];
  return canon.response_selection_priority;
}

/**
 * Return kanagi_phase_mapping (includes _note). Empty object if not loaded.
 */
export function resolveKanagiPhaseMapping(): KanagiPhaseMapping {
  const canon = loadTenmonIntentionConstitution();
  if (!canon || typeof canon.kanagi_phase_mapping !== "object") return {};
  return canon.kanagi_phase_mapping;
}

/** R8_INTENTION_BIND_THOUGHT_GUIDE_V1: hint object for decisionFrame.ku.intention (wire-only, no route/response change) */
export type IntentionKuHint = {
  schema: string;
  coreIntentionTop: string;
  learningPriorityTop: string;
  responseSelectionTop: string;
  unresolvedRuntimeBind: string;
  kanagiCenterHint: string;
};

/**
 * Return a small hint object for decisionFrame.ku.intention, or null when constitution is not loaded.
 */
export function getIntentionHintForKu(): IntentionKuHint | null {
  const canon = loadTenmonIntentionConstitution();
  if (!canon) return null;
  const core = Array.isArray(canon.core_intentions) ? canon.core_intentions : [];
  const priority = Array.isArray(canon.priority_of_learning) ? canon.priority_of_learning : [];
  const responseSel = Array.isArray(canon.response_selection_priority) ? canon.response_selection_priority : [];
  const unresolved = canon.unresolved_handling && typeof canon.unresolved_handling === "object" ? canon.unresolved_handling : {};
  const runtimeBind = unresolved.runtime_bind;
  const km = canon.kanagi_phase_mapping && typeof canon.kanagi_phase_mapping === "object" ? canon.kanagi_phase_mapping : {};
  const centerArr = Array.isArray(km.CENTER) ? km.CENTER : [];
  return {
    schema: String(canon.schema ?? ""),
    coreIntentionTop: core[0] ?? "",
    learningPriorityTop: priority[0] ?? "",
    responseSelectionTop: responseSel[0] ?? "",
    unresolvedRuntimeBind: (runtimeBind && typeof runtimeBind.policy === "string") ? runtimeBind.policy : "",
    kanagiCenterHint: centerArr[0] ?? "",
  };
}
