import fs from "node:fs";
import path from "node:path";

import { KHS_ROOT_FRACTAL_CONSTITUTION_V1 } from "./khsRootFractalConstitutionV1.js";

const EXPECTED_SCHEMA = "TENMON_INTENT_KERNEL_V1";

/** 天津金木四相。CENTER / L-IN / R-IN / L-OUT / R-OUT を許容する。 */
export type IntentPhase = "CENTER" | "L-IN" | "R-IN" | "L-OUT" | "R-OUT";

export type ResponseIntentHints = {
  CENTER: string[];
  "L-IN": string[];
  "R-IN": string[];
  "L-OUT": string[];
  "R-OUT": string[];
};

export type TenmonIntentKernelV1 = {
  schema: string;
  updated_at: string;
  source_constitutions: string[];
  default_phase: string;
  route_phase_hints: Record<string, string>;
  selection_principles: string[];
  hold_rules: string[];
  unresolved_rules: string[];
  phase_transition_rules: string[];
  response_intent_hints: ResponseIntentHints;
};

function canonPath(): string {
  return path.resolve(process.cwd(), "../canon/tenmon_intent_kernel_v1.json");
}

let __cache: TenmonIntentKernelV1 | null = null;

/**
 * Load and validate intent kernel JSON. Returns null on read/parse/schema failure.
 */
export function loadTenmonIntentKernel(): TenmonIntentKernelV1 | null {
  if (__cache) return __cache;
  try {
    const p = canonPath();
    const raw = fs.readFileSync(p, "utf-8");
    const json = JSON.parse(raw) as TenmonIntentKernelV1;
    if (json.schema !== EXPECTED_SCHEMA) return null;
    __cache = json;
    return json;
  } catch {
    return null;
  }
}

/**
 * Return default_phase. Empty string if not loaded.
 */
export function resolveDefaultIntentPhase(): string {
  const kernel = loadTenmonIntentKernel();
  if (!kernel || typeof kernel.default_phase !== "string") return "";
  return kernel.default_phase;
}

/**
 * Return route_phase_hints. Empty object if not loaded.
 */
export function resolveRoutePhaseHints(): Record<string, string> {
  const kernel = loadTenmonIntentKernel();
  if (!kernel || typeof kernel.route_phase_hints !== "object") return {};
  return kernel.route_phase_hints;
}

/**
 * Return selection_principles. Empty array if not loaded.
 */
export function resolveSelectionPrinciples(): string[] {
  const kernel = loadTenmonIntentKernel();
  if (!kernel || !Array.isArray(kernel.selection_principles)) return [];
  return kernel.selection_principles;
}

/**
 * Return unresolved_rules. Empty array if not loaded.
 */
export function resolveUnresolvedRules(): string[] {
  const kernel = loadTenmonIntentKernel();
  if (!kernel || !Array.isArray(kernel.unresolved_rules)) return [];
  return kernel.unresolved_rules;
}

/**
 * Return response_intent_hints. Empty per-phase arrays if not loaded.
 */
/**
 * source_constitutions を読み、KHS root を先頭に固定（重複は除去）。
 */
export function resolveSourceConstitutionsWithKhsRootFirst(): string[] {
  const kernel = loadTenmonIntentKernel();
  const raw = kernel && Array.isArray(kernel.source_constitutions) ? kernel.source_constitutions : [];
  const khs = KHS_ROOT_FRACTAL_CONSTITUTION_V1.card;
  const rest = raw.filter((x) => String(x) !== khs);
  return [khs, ...rest.map((x) => String(x))];
}

export function resolveResponseIntentHints(): ResponseIntentHints {
  const empty: ResponseIntentHints = {
    CENTER: [],
    "L-IN": [],
    "R-IN": [],
    "L-OUT": [],
    "R-OUT": [],
  };
  const kernel = loadTenmonIntentKernel();
  if (!kernel || typeof kernel.response_intent_hints !== "object") return empty;
  const h = kernel.response_intent_hints;
  return {
    CENTER: Array.isArray(h.CENTER) ? h.CENTER : [],
    "L-IN": Array.isArray(h["L-IN"]) ? h["L-IN"] : [],
    "R-IN": Array.isArray(h["R-IN"]) ? h["R-IN"] : [],
    "L-OUT": Array.isArray(h["L-OUT"]) ? h["L-OUT"] : [],
    "R-OUT": Array.isArray(h["R-OUT"]) ? h["R-OUT"] : [],
  };
}
