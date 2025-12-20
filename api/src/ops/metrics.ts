import type { ToolId } from "../tools/toolTypes.js";

export type MetricsSnapshot = {
  startedAt: string;
  requestCount: number;
  errorCount: number;
  toolUsage: Record<string, number>;
  approvalUsage: { requestCount: number };
  memoryWrites: number;
};

const startedAt = new Date().toISOString();

let requestCount = 0;
let errorCount = 0;
let memoryWrites = 0;

const toolUsage: Record<string, number> = Object.create(null);
let approvalRequestCount = 0;

function inc(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export function incRequest(): void {
  requestCount += 1;
}

export function incError(): void {
  errorCount += 1;
}

export function incMemoryWrite(): void {
  memoryWrites += 1;
}

export function incToolUsage(tool: ToolId, kind: "plan" | "validate" | "dry-run" | "execute"): void {
  inc(toolUsage, `${kind}:${tool}`);
  inc(toolUsage, `${kind}:all`);
}

export function incApprovalRequest(): void {
  approvalRequestCount += 1;
}

export function snapshotMetrics(): MetricsSnapshot {
  return {
    startedAt,
    requestCount,
    errorCount,
    toolUsage: { ...toolUsage },
    approvalUsage: { requestCount: approvalRequestCount },
    memoryWrites,
  };
}


