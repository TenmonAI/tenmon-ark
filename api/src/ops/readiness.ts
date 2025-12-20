import { getHealthReport } from "./health.js";

export type ReadinessReport = {
  ready: boolean;
  timestamp: string;
  reasons: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

export function getReadinessReport(): ReadinessReport {
  const health = getHealthReport();
  const reasons: string[] = [];

  if (health.safeMode.enabled) reasons.push("safe mode enabled");
  for (const [k, v] of Object.entries(health.db)) {
    if (!v.ok) reasons.push(`db not ok: ${k}`);
  }

  return { ready: reasons.length === 0, timestamp: nowIso(), reasons };
}


