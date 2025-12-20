import type { PermissionScope, RiskLevel, ToolAction, ToolAdapter, ToolId, ToolPlan } from "./toolTypes.js";
import { getToolAdapter } from "./index.js";

export type ValidationResult = { ok: true; violations: string[] } | { ok: false; violations: string[] };

const allowedTools: ToolId[] = ["filesystem.read", "http.fetch", "github.read", "calendar.read"];

// Phase 7: execute is sealed, but we still model permissions.
const grantedScopes: PermissionScope[] = ["read:filesystem", "read:http", "read:github", "read:calendar"];

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const score = (r: RiskLevel) => (r === "low" ? 0 : r === "medium" ? 1 : 2);
  return score(a) >= score(b) ? a : b;
}

export function computePlanRequires(actions: ToolAction[]): PermissionScope[] {
  const scopes: PermissionScope[] = [];
  for (const a of actions) {
    const adapter = getToolAdapter(a.tool);
    scopes.push(...adapter.requires);
  }
  return uniq(scopes);
}

export function computePlanRisk(actions: ToolAction[]): RiskLevel {
  let risk: RiskLevel = "low";
  for (const a of actions) {
    const adapter = getToolAdapter(a.tool) as ToolAdapter<any>;
    const v = adapter.validateArgs(a.args);
    if (!v.ok) return "high";
    risk = maxRisk(risk, adapter.riskOf(v.normalizedArgs));
  }
  return risk;
}

export function validateAction(action: ToolAction): ValidationResult {
  const violations: string[] = [];

  if (!allowedTools.includes(action.tool)) {
    return { ok: false, violations: [`tool not allowed: ${action.tool}`] };
  }

  const adapter = getToolAdapter(action.tool) as ToolAdapter<any>;
  const v = adapter.validateArgs(action.args);
  if (!v.ok) violations.push(...v.violations);

  return violations.length === 0 ? { ok: true, violations: [] } : { ok: false, violations };
}

export function validatePlan(plan: ToolPlan): ValidationResult {
  const violations: string[] = [];

  // Default deny: plan must have at least one action in Phase 7
  if (plan.actions.length === 0) {
    violations.push("plan has no actions");
  }

  // tool allowlist + per-tool arg validation
  for (const a of plan.actions) {
    const r = validateAction(a);
    if (!r.ok) violations.push(...r.violations);
  }

  // Permission gate (PlanGate)
  const requires = computePlanRequires(plan.actions);
  for (const scope of requires) {
    if (!grantedScopes.includes(scope)) violations.push(`missing permission: ${scope}`);
  }

  // Risk gate (Phase 8): high is denied by default. medium is allowed but will require approval in execute layer.
  const risk = computePlanRisk(plan.actions);
  if (risk === "high") violations.push(`risk denied (got high)`);

  return violations.length === 0 ? { ok: true, violations: [] } : { ok: false, violations };
}


