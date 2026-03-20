/**
 * USER_DEVICE_MEMORY_SYNC_ENGINE_V1
 * 同一 user_id の複数 device 間で共有正本（persona.sqlite）を同期する最小 API。
 * chat.ts 非依存。kokuzo_schema.sql は触らない。
 */
import { createHash } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";

const FORBIDDEN_PUSH_KEYS = new Set([
  "localOnly",
  "embeddings",
  "tempEmbeddings",
  "tempCache",
  "pendingDrafts",
  "localFileHandles",
  "crossUserImport",
  "userId",
]);

const SLICE_KEYS = ["naming", "persona", "style", "inheritance"] as const;
type SliceKey = (typeof SLICE_KEYS)[number];

function nowIso(): string {
  return new Date().toISOString();
}

function logSync(
  db: ReturnType<typeof getDb>,
  userId: string,
  deviceId: string | null,
  eventType: string,
  payload: unknown
) {
  db.prepare(
    `INSERT INTO user_sync_log (userId, deviceId, eventType, payloadJson, createdAt) VALUES (?,?,?,?,?)`
  ).run(userId, deviceId, eventType, JSON.stringify(payload ?? null), nowIso());
}

function logConflict(
  db: ReturnType<typeof getDb>,
  userId: string,
  deviceId: string | null,
  kind: string,
  detail: unknown
) {
  db.prepare(
    `INSERT INTO user_sync_conflict_log (userId, deviceId, kind, detailJson, createdAt) VALUES (?,?,?,?,?)`
  ).run(userId, deviceId, kind, JSON.stringify(detail ?? null), nowIso());
}

/** 認証済み userId（Founder は "founder"）。未ログインは null */
export function getAuthUserIdForSyncV1(req: Request): string | null {
  try {
    const founder = (req as any).cookies?.tenmon_founder === "1";
    if (founder) return "founder";

    const sessionId = String((req as any).cookies?.auth_session ?? "").trim();
    if (!sessionId) return null;

    const kdb = getDb("kokuzo");
    const sess = kdb
      .prepare(`SELECT userId, expiresAt FROM auth_sessions WHERE sessionId = ? LIMIT 1`)
      .get(sessionId) as { userId?: string; expiresAt?: string } | undefined;
    if (!sess?.userId) return null;
    if (sess.expiresAt && String(sess.expiresAt) < nowIso()) return null;
    return String(sess.userId);
  } catch {
    return null;
  }
}

function hashPayloadJson(payload: unknown): string {
  const s = JSON.stringify(payload ?? null);
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export const userDeviceMemorySyncV1Router = Router();

/** POST /api/memory/user-device-sync/v1/push */
userDeviceMemorySyncV1Router.post("/v1/push", (req: Request, res: Response) => {
  const userId = getAuthUserIdForSyncV1(req);
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const body = req.body as Record<string, unknown>;
  for (const k of Object.keys(body)) {
    if (FORBIDDEN_PUSH_KEYS.has(k)) {
      return res.status(400).json({ ok: false, error: "FORBIDDEN_KEY", key: k });
    }
  }

  const deviceId = String(body?.deviceId ?? "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "DEVICE_ID_REQUIRED" });

  const pdb = getDb("persona");
  const t = nowIso();

  try {
    const alwaysSync = (body?.alwaysSync ?? {}) as Record<string, unknown>;
    for (const sk of SLICE_KEYS) {
      const block = alwaysSync[sk] as { payload?: unknown; updatedAt?: string } | undefined;
      if (!block || typeof block !== "object") continue;
      const incomingAt = String(block.updatedAt ?? "").trim();
      if (!incomingAt) continue;
      const row = pdb
        .prepare(
          `SELECT updatedAt FROM user_shared_profile_slice WHERE userId = ? AND sliceKey = ?`
        )
        .get(userId, sk) as { updatedAt?: string } | undefined;
      const prevAt = row?.updatedAt ? String(row.updatedAt) : "";
      if (!prevAt || incomingAt > prevAt) {
        const payloadJson = JSON.stringify(block.payload ?? {});
        pdb.prepare(
          `INSERT INTO user_shared_profile_slice (userId, sliceKey, payloadJson, updatedAt)
           VALUES (?,?,?,?)
           ON CONFLICT(userId, sliceKey) DO UPDATE SET
             payloadJson = excluded.payloadJson,
             updatedAt = excluded.updatedAt`
        ).run(userId, sk, payloadJson, incomingAt);
      }
    }

    const syncOnCommit = (body?.syncOnCommit ?? {}) as { items?: unknown[] };
    const items = Array.isArray(syncOnCommit.items) ? syncOnCommit.items : [];
    for (const raw of items) {
      const it = raw as Record<string, unknown>;
      const itemId = String(it?.itemId ?? "").trim();
      const kind = String(it?.kind ?? "").trim();
      const committedAt = String(it?.committedAt ?? "").trim();
      if (!itemId || (kind !== "fact" && kind !== "seed") || !committedAt) continue;

      const payload = it?.payload;
      const clientHash = String(it?.contentHash ?? "").trim();
      const computed = hashPayloadJson(payload);
      if (clientHash && clientHash !== computed) {
        logConflict(pdb, userId, deviceId, "hash_mismatch", { itemId, kind, clientHash, computed });
        continue;
      }
      const contentHash = clientHash || computed;

      const existing = pdb
        .prepare(
          `SELECT itemId FROM user_sync_committed_item WHERE userId = ? AND contentHash = ? LIMIT 1`
        )
        .get(userId, contentHash) as { itemId?: string } | undefined;
      if (existing && existing.itemId && existing.itemId !== itemId) {
        logSync(pdb, userId, deviceId, "dedupe_skip", { contentHash, itemId, existingItemId: existing.itemId });
        continue;
      }

      const prev = pdb
        .prepare(
          `SELECT committedAt FROM user_sync_committed_item WHERE userId = ? AND kind = ? AND itemId = ?`
        )
        .get(userId, kind, itemId) as { committedAt?: string } | undefined;
      if (prev?.committedAt && String(prev.committedAt) >= committedAt) {
        logConflict(pdb, userId, deviceId, "commit_stale", { itemId, kind, prev: prev.committedAt, incoming: committedAt });
        continue;
      }

      pdb.prepare(
        `INSERT INTO user_sync_committed_item (userId, itemId, kind, contentHash, payloadJson, committedAt)
         VALUES (?,?,?,?,?,?)
         ON CONFLICT(userId, kind, itemId) DO UPDATE SET
           contentHash = excluded.contentHash,
           payloadJson = excluded.payloadJson,
           committedAt = excluded.committedAt`
      ).run(userId, itemId, kind, contentHash, JSON.stringify(payload ?? null), committedAt);
    }

    pdb.prepare(
      `INSERT INTO user_device_sync_state (userId, deviceId, lastPushAt, updatedAt)
       VALUES (?,?,?,?)
       ON CONFLICT(userId, deviceId) DO UPDATE SET
         lastPushAt = excluded.lastPushAt,
         updatedAt = excluded.updatedAt`
    ).run(userId, deviceId, t, t);

    logSync(pdb, userId, deviceId, "push_ok", { slices: Object.keys(alwaysSync).length, items: items.length });

    return res.json({
      ok: true,
      version: "USER_DEVICE_MEMORY_SYNC_ENGINE_V1",
      userId,
      deviceId,
      at: t,
    });
  } catch (e: any) {
    console.error("[USER_DEVICE_MEMORY_SYNC_V1] push failed", e);
    return res.status(500).json({ ok: false, error: "PUSH_FAILED", detail: String(e?.message ?? e) });
  }
});

/** GET /api/memory/user-device-sync/v1/pull?deviceId= */
userDeviceMemorySyncV1Router.get("/v1/pull", (req: Request, res: Response) => {
  const userId = getAuthUserIdForSyncV1(req);
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });

  const deviceId = String(req.query?.deviceId ?? "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "DEVICE_ID_REQUIRED" });

  const pdb = getDb("persona");
  const t = nowIso();

  try {
    const slices = pdb
      .prepare(`SELECT sliceKey, payloadJson, updatedAt FROM user_shared_profile_slice WHERE userId = ?`)
      .all(userId) as Array<{ sliceKey: string; payloadJson: string; updatedAt: string }>;

    const alwaysSync: Record<string, { payload: unknown; updatedAt: string }> = {};
    for (const r of slices) {
      try {
        alwaysSync[r.sliceKey] = {
          payload: JSON.parse(r.payloadJson || "null"),
          updatedAt: r.updatedAt,
        };
      } catch {
        alwaysSync[r.sliceKey] = { payload: null, updatedAt: r.updatedAt };
      }
    }

    const items = pdb
      .prepare(
        `SELECT itemId, kind, contentHash, payloadJson, committedAt FROM user_sync_committed_item WHERE userId = ? ORDER BY committedAt ASC`
      )
      .all(userId) as Array<{
    itemId: string;
    kind: string;
    contentHash: string;
    payloadJson: string;
    committedAt: string;
  }>;

    const syncOnCommit = {
      items: items.map((r) => ({
        itemId: r.itemId,
        kind: r.kind,
        contentHash: r.contentHash,
        payload: JSON.parse(r.payloadJson || "null"),
        committedAt: r.committedAt,
      })),
    };

    pdb.prepare(
      `INSERT INTO user_device_sync_state (userId, deviceId, lastPullAt, updatedAt)
       VALUES (?,?,?,?)
       ON CONFLICT(userId, deviceId) DO UPDATE SET
         lastPullAt = excluded.lastPullAt,
         updatedAt = excluded.updatedAt`
    ).run(userId, deviceId, t, t);

    logSync(pdb, userId, deviceId, "pull_ok", { sliceCount: slices.length, itemCount: items.length });

    return res.json({
      ok: true,
      version: "USER_DEVICE_MEMORY_SYNC_ENGINE_V1",
      userId,
      deviceId,
      at: t,
      alwaysSync,
      syncOnCommit,
    });
  } catch (e: any) {
    console.error("[USER_DEVICE_MEMORY_SYNC_V1] pull failed", e);
    return res.status(500).json({ ok: false, error: "PULL_FAILED", detail: String(e?.message ?? e) });
  }
});
