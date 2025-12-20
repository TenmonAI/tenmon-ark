import type { ToolDryRunResult, ToolPlan } from "./toolTypes.js";
import { getToolAdapter } from "./index.js";
import { validatePlan } from "./permissions.js";
import { evaluatePolicy } from "../safety/policyEngine.js";

export async function dryRunPlan(plan: ToolPlan): Promise<{ ok: true; results: ToolDryRunResult[] } | { ok: false; results: ToolDryRunResult[]; violations: string[] }> {
  const v = validatePlan(plan);
  if (!v.ok) return { ok: false, results: [], violations: v.violations };

  const results: ToolDryRunResult[] = [];
  for (const a of plan.actions) {
    const adapter = getToolAdapter(a.tool);
    const va = adapter.validateArgs(a.args);
    if (!va.ok) {
      results.push({ tool: a.tool, output: { ok: false, violations: va.violations } });
      continue;
    }
    const out = await adapter.dryRun(va.normalizedArgs);
    results.push({ tool: a.tool, output: out });
  }

  return { ok: true, results };
}

// Phase 8: execute is guarded elsewhere (Approval + Audit). This function enforces:
// - policy deny
// - tool allowlist via validatePlan()
// - execute only read-only tools (filesystem.read; http.fetch GET only is NOT actually performed here)
export async function executePlan(plan: ToolPlan): Promise<{ ok: true; results: ToolDryRunResult[] } | { ok: false; results: ToolDryRunResult[]; violations: string[] }> {
  const policy = evaluatePolicy(plan);
  if (!policy.ok) return { ok: false, results: [], violations: policy.violations };

  const v = validatePlan(plan);
  if (!v.ok) return { ok: false, results: [], violations: v.violations };

  const results: ToolDryRunResult[] = [];
  for (const a of plan.actions) {
    // Phase8 execute scope is still limited; reuse adapters' dryRun as read-only execution.
    const adapter = getToolAdapter(a.tool);
    const va = adapter.validateArgs(a.args);
    if (!va.ok) {
      results.push({ tool: a.tool, output: { ok: false, violations: va.violations } });
      continue;
    }
    const out = await adapter.dryRun(va.normalizedArgs);
    results.push({ tool: a.tool, output: out });
  }

  return { ok: true, results };
}


