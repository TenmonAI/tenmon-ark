import { getHealthReport } from "./health.js";
import {
  buildTenmonStabilizationSnapshotV1,
  type TenmonStabilizationSnapshotV1,
} from "../core/tenmonAutobuildWorldclassStabilizationV1.js";

export type ReadinessReport = {
  ready: boolean;
  timestamp: string;
  reasons: string[];
  /** cognition / NAS / autobuild 順序の観測（既存 ready 判定は変更しない） */
  tenmon_stabilization_v1?: TenmonStabilizationSnapshotV1;
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

  let tenmon_stabilization_v1: TenmonStabilizationSnapshotV1 | undefined;
  try {
    tenmon_stabilization_v1 = buildTenmonStabilizationSnapshotV1();
  } catch {
    /* fail-closed: snapshot 失敗時は同梱せず ready は health/db のみ */
  }

  return { ready: reasons.length === 0, timestamp: nowIso(), reasons, tenmon_stabilization_v1 };
}


