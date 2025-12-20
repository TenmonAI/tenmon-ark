import { randomUUID } from "node:crypto";
import type { ToolPlan, ToolPlanContext, ToolPlanRequest, ToolPlanResponse, ToolAction } from "./toolTypes.js";
import { computePlanRequires, computePlanRisk } from "./permissions.js";

const plans = new Map<string, ToolPlan>();

function nowIso(): string {
  return new Date().toISOString();
}

function extractPath(intent: string): string | null {
  const m = intent.match(/(?:path|ファイル|ディレクトリ|folder|file)\s*[:：]?\s*([^\s]+)/i);
  return m?.[1] ?? null;
}

function extractUrl(intent: string): string | null {
  const m = intent.match(/https?:\/\/[^\s]+/i);
  return m?.[0] ?? null;
}

function isToolIntent(intent: string): boolean {
  return (
    intent.includes("一覧") ||
    intent.toLowerCase().includes("list") ||
    intent.includes("読んで") ||
    intent.includes("表示") ||
    intent.toLowerCase().includes("read") ||
    intent.toLowerCase().includes("http") ||
    Boolean(extractUrl(intent)) ||
    intent.includes("github") ||
    intent.includes("GitHub") ||
    intent.includes("カレンダー") ||
    intent.includes("予定")
  );
}

function buildActions(intent: string): ToolAction[] {
  const lower = intent.toLowerCase();
  const actions: ToolAction[] = [];

  const url = extractUrl(intent);
  if (url) {
    actions.push({ tool: "http.fetch", args: { url } });
    return actions;
  }

  if (intent.includes("カレンダー") || intent.includes("予定")) {
    actions.push({ tool: "calendar.read", args: { range: "this_week" } });
    return actions;
  }

  if (lower.includes("github")) {
    actions.push({ tool: "github.read", args: {} });
    return actions;
  }

  const p = extractPath(intent) ?? ".";
  const wantsRead = intent.includes("読んで") || lower.includes("read") || lower.includes("cat");
  if (wantsRead) {
    actions.push({ tool: "filesystem.read", args: { op: "read", path: p, maxBytes: 65536 } });
    return actions;
  }

  actions.push({ tool: "filesystem.read", args: { op: "list", path: p, limit: 200 } });
  return actions;
}

export function createPlan(req: ToolPlanRequest): ToolPlanResponse {
  const planId = randomUUID();
  const actions = isToolIntent(req.intent) ? buildActions(req.intent) : [];
  const requires = computePlanRequires(actions);
  const risk = computePlanRisk(actions);

  const plan: ToolPlan = {
    planId,
    intent: req.intent,
    createdAt: nowIso(),
    actions,
    risk,
    requires,
    context: req.context,
  };

  plans.set(planId, plan);

  return {
    planId,
    actions,
    risk,
    requires,
  };
}

export function getPlan(planId: string): ToolPlan | null {
  return plans.get(planId) ?? null;
}

// chat 統合用: 操作系なら plan を作る（Executeはしない）
export function maybeCreatePlanFromChat(params: { intent: string; context: ToolPlanContext }): ToolPlanResponse | null {
  if (!isToolIntent(params.intent)) return null;
  return createPlan({ intent: params.intent, context: params.context });
}


