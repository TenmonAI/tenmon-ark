export type RiskLevel = "low" | "medium" | "high";

export type ToolId =
  | "filesystem.read"
  | "http.fetch"
  | "github.read"
  | "calendar.read";

export type PermissionScope =
  | "read:filesystem"
  | "read:http"
  | "read:github"
  | "read:calendar";

export type ToolAction = {
  tool: ToolId;
  args: unknown;
};

export type ToolPlanContext = {
  sessionId: string;
  persona: string;
};

export type ToolPlan = {
  planId: string;
  intent: string;
  createdAt: string;
  actions: ToolAction[];
  risk: RiskLevel;
  requires: PermissionScope[];
  context: ToolPlanContext;
};

export type ToolPlanRequest = {
  intent: string;
  context: ToolPlanContext;
};

export type ToolPlanResponse = {
  planId: string;
  actions: ToolAction[];
  risk: RiskLevel;
  requires: PermissionScope[];
};

export type ToolValidateRequest = { planId: string };

export type ToolValidateResponse = { ok: true; violations: string[] } | { ok: false; violations: string[] };

export type ToolDryRunRequest = { planId: string };

export type ToolDryRunResult = {
  tool: ToolId;
  output: unknown;
};

export type ToolDryRunResponse =
  | { ok: true; results: ToolDryRunResult[]; note: "dry-run only (no side effects)" }
  | { ok: false; results: ToolDryRunResult[]; note: "dry-run only (no side effects)"; violations: string[] };

export type ToolExecuteRequest = { planId: string; approvalToken: string };

export type ToolExecuteResponse =
  | { ok: true; results: ToolDryRunResult[]; auditId: string }
  | { ok: false; results: ToolDryRunResult[]; auditId: string; violations: string[] };

export type ToolAdapterValidation<TArgs> =
  | { ok: true; normalizedArgs: TArgs }
  | { ok: false; violations: string[] };

export type ToolAdapter<TArgs> = {
  id: ToolId;
  requires: PermissionScope[];
  riskOf(args: TArgs): RiskLevel;
  validateArgs(args: unknown): ToolAdapterValidation<TArgs>;
  dryRun(args: TArgs): Promise<unknown>;
};


