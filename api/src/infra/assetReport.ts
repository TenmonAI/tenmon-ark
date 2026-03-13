import { DatabaseSync } from "node:sqlite";

const DB_PATH = "/opt/tenmon-ark-data/audit.sqlite";

type InfraStatus = "healthy" | "broken" | "degraded" | "unverified" | "unknown";

type InfraAssetRow = {
  assetKey: string;
  assetType: string;
  assetGroup: string;
  displayName: string;
  statusPolicy: string;
  probeKind: string;
  probeTarget: string;
  backupPolicy: string;
  sourceOfTruth: string;
  notes: string | null;
  isEnabled: number;
  registryUpdatedAt: string | null;
  latestObservation: {
    id: string;
    observedAt: string;
    status: InfraStatus;
    summary: string;
    evidence: any;
    diff: any;
    nextAction: string | null;
    observerVersion: string;
  } | null;
};

function openDb(): DatabaseSync {
  return new DatabaseSync(DB_PATH);
}

function safeJson(text: string | null | undefined, fallback: any) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

export function getInfraAssets(): InfraAssetRow[] {
  const db = openDb();
  try {
    const rows = db.prepare(`
      SELECT
        r.asset_key, r.asset_type, r.asset_group, r.display_name, r.status_policy,
        r.probe_kind, r.probe_target, r.backup_policy, r.source_of_truth, r.notes,
        r.is_enabled, r.updated_at,
        o.id AS obs_id, o.observed_at, o.status, o.summary, o.evidence_json, o.diff_json, o.next_action, o.observer_version
      FROM infra_asset_registry r
      LEFT JOIN infra_asset_observation o
        ON o.id = (
          SELECT id
          FROM infra_asset_observation o2
          WHERE o2.asset_key = r.asset_key
          ORDER BY o2.observed_at DESC, o2.id DESC
          LIMIT 1
        )
      ORDER BY r.asset_key ASC
    `).all() as any[];

    return rows.map((r) => ({
      assetKey: r.asset_key,
      assetType: r.asset_type,
      assetGroup: r.asset_group,
      displayName: r.display_name,
      statusPolicy: r.status_policy,
      probeKind: r.probe_kind,
      probeTarget: r.probe_target,
      backupPolicy: r.backup_policy,
      sourceOfTruth: r.source_of_truth,
      notes: r.notes ?? null,
      isEnabled: Number(r.is_enabled ?? 1),
      registryUpdatedAt: r.updated_at ?? null,
      latestObservation: r.obs_id ? {
        id: r.obs_id,
        observedAt: r.observed_at,
        status: r.status,
        summary: r.summary,
        evidence: safeJson(r.evidence_json, {}),
        diff: safeJson(r.diff_json, null),
        nextAction: r.next_action ?? null,
        observerVersion: r.observer_version,
      } : null,
    }));
  } finally {
    db.close();
  }
}

export function getInfraAsset(assetKey: string): InfraAssetRow | null {
  return getInfraAssets().find((x) => x.assetKey === assetKey) ?? null;
}

export function getInfraAssetsReport() {
  const db = openDb();
  try {
    const assets = getInfraAssets();

    let healthy = 0;
    let broken = 0;
    let degraded = 0;
    let unverified = 0;
    let unknown = 0;

    const brokenAssets: string[] = [];
    const degradedAssets: string[] = [];
    const unverifiedAssets: string[] = [];

    for (const a of assets) {
      const st = String(a.latestObservation?.status ?? "unknown") as InfraStatus;
      if (st === "healthy") healthy++;
      else if (st === "broken") { broken++; brokenAssets.push(a.assetKey); }
      else if (st === "degraded") { degraded++; degradedAssets.push(a.assetKey); }
      else if (st === "unverified") { unverified++; unverifiedAssets.push(a.assetKey); }
      else unknown++;
    }

    const obs = db.prepare(`
      SELECT asset_key, observed_at, status, summary
      FROM infra_asset_observation
      ORDER BY asset_key ASC, observed_at DESC, id DESC
    `).all() as Array<{ asset_key: string; observed_at: string; status: string; summary: string }>;

    const grouped: Record<string, Array<{ observed_at: string; status: string; summary: string }>> = {};
    for (const o of obs) {
      if (!grouped[o.asset_key]) grouped[o.asset_key] = [];
      grouped[o.asset_key].push({
        observed_at: o.observed_at,
        status: o.status,
        summary: o.summary,
      });
    }

    const recentRecovered: string[] = [];
    for (const [assetKey, rows] of Object.entries(grouped)) {
      if (rows.length < 2) continue;
      const now = rows[0];
      const prev = rows[1];
      if (now.status === "healthy" && (prev.status === "broken" || prev.status === "degraded")) {
        recentRecovered.push(assetKey);
      }
    }

    const nextActions: string[] = [];
    if (brokenAssets.length > 0) {
      for (const k of brokenAssets.slice(0, 5)) nextActions.push(`broken asset を確認: ${k}`);
    }
    if (unverifiedAssets.includes("nas.mount_state")) {
      nextActions.push("NAS mount の実使用有無を確定");
    }
    const secondary = assets.find((x) => x.assetKey === "backup.secondary_vps")?.latestObservation?.status;
    const manifest = assets.find((x) => x.assetKey === "backup.artifact_manifest")?.latestObservation?.status;
    if (secondary === "healthy" && manifest === "healthy") {
      nextActions.push("backup chain retention policy を固定");
    }

    return {
      ok: true,
      summary: { healthy, broken, degraded, unverified, unknown },
      brokenAssets,
      degradedAssets,
      unverifiedAssets,
      recentRecovered,
      nextActions,
      latest: assets.map((a) => ({
        assetKey: a.assetKey,
        status: a.latestObservation?.status ?? "unknown",
        observedAt: a.latestObservation?.observedAt ?? null,
        summary: a.latestObservation?.summary ?? null,
      })),
    };
  } finally {
    db.close();
  }
}
