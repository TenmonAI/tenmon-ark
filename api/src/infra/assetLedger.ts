import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { InfraProbeResult } from "./assetProbe.js";

export interface InfraObservationRow {
  id: string;
  asset_key: string;
  observed_at: string;
  status: string;
  summary: string;
  evidence_json: string;
  diff_json: string | null;
  next_action: string | null;
  observer_version: string;
}

function openDb(dbPath: string): DatabaseSync {
  return new DatabaseSync(dbPath);
}

export function getLatestInfraObservation(dbPath: string, assetKey: string): InfraObservationRow | null {
  const db = openDb(dbPath);
  try {
    const row = db.prepare(`
      SELECT id, asset_key, observed_at, status, summary, evidence_json, diff_json, next_action, observer_version
      FROM infra_asset_observation
      WHERE asset_key = ?
      ORDER BY observed_at DESC, id DESC
      LIMIT 1
    `).get(assetKey) as InfraObservationRow | undefined;
    return row ?? null;
  } finally {
    db.close();
  }
}

export function buildInfraDiff(prev: InfraObservationRow | null, next: InfraProbeResult): Record<string, unknown> | null {
  if (!prev) {
    return {
      kind: "first_observation",
      prevStatus: null,
      nextStatus: next.status,
    };
  }

  const changes: Record<string, unknown> = {};
  if (String(prev.status) !== String(next.status)) {
    changes.status = {
      from: prev.status,
      to: next.status,
    };
  }
  if (String(prev.summary) !== String(next.summary)) {
    changes.summary = {
      from: prev.summary,
      to: next.summary,
    };
  }

  return Object.keys(changes).length ? changes : null;
}

export function appendInfraObservation(dbPath: string, probe: InfraProbeResult): string {
  const db = openDb(dbPath);
  try {
    const prev = db.prepare(`
      SELECT id, asset_key, observed_at, status, summary, evidence_json, diff_json, next_action, observer_version
      FROM infra_asset_observation
      WHERE asset_key = ?
      ORDER BY observed_at DESC, id DESC
      LIMIT 1
    `).get(probe.assetKey) as InfraObservationRow | undefined | null;

    const diff = buildInfraDiff(prev ?? null, probe);
    const id = randomUUID();

    db.prepare(`
      INSERT INTO infra_asset_observation
      (id, asset_key, observed_at, status, summary, evidence_json, diff_json, next_action, observer_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      probe.assetKey,
      probe.observedAt,
      probe.status,
      probe.summary,
      JSON.stringify(probe.evidence ?? {}),
      diff ? JSON.stringify(diff) : null,
      probe.nextAction ?? null,
      probe.observerVersion,
    );

    return id;
  } finally {
    db.close();
  }
}

export function appendInfraObservations(dbPath: string, probes: InfraProbeResult[]): { count: number; ids: string[] } {
  const ids: string[] = [];
  for (const probe of probes) {
    ids.push(appendInfraObservation(dbPath, probe));
  }
  return { count: ids.length, ids };
}
