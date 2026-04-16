/**
 * SYNC_PHASE_A_V1 — Cross-device chat/folder/sukuyou sync
 *
 * Endpoints:
 *   POST /sync/bootstrap   — 初回同期（全データ取得）
 *   GET  /sync/pull         — 差分取得
 *   POST /sync/push         — 変更送信
 *
 * Auth: cookie-based (tenmon_founder / auth_session)
 * DB:   kokuzo (pwa_schema.sql に同期テーブル追加)
 */
import { Router, type Request, type Response } from "express";
import { getDb } from "../db/index.js";
import { getAuthUserIdForSyncV1 } from "./userDeviceMemorySyncV1.js";

export const syncPhaseARouter = Router();

/* ── helpers ── */

function nowIso(): string {
  return new Date().toISOString();
}

function requireAuth(req: Request, res: Response): string | null {
  const userId = getAuthUserIdForSyncV1(req);
  if (!userId) {
    res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    return null;
  }
  return userId;
}

/* ── heavy payload guard (STEP 4) ── */

const FORBIDDEN_KEYS = new Set([
  "fullText",
  "fullContent",
  "messageHistory",
  "attachment",
  "fileData",
  "imageData",
  "pdfData",
  "exportData",
  "rawReport",
]);

const MAX_PAYLOAD_BYTES = 8 * 1024;   // 8 KB per change payload
const MAX_REQUEST_BYTES = 64 * 1024;  // 64 KB total request body

function rejectHeavyPayload(body: unknown, res: Response): boolean {
  // total request size check
  const bodyStr = JSON.stringify(body ?? {});
  if (bodyStr.length > MAX_REQUEST_BYTES) {
    res.status(413).json({ ok: false, error: "REQUEST_TOO_LARGE", maxBytes: MAX_REQUEST_BYTES });
    return true;
  }

  // scan changes array for forbidden keys and per-payload size
  const changes = (body as any)?.changes;
  if (Array.isArray(changes)) {
    for (const c of changes) {
      const payload = c?.payload;
      if (payload && typeof payload === "object") {
        for (const k of Object.keys(payload)) {
          if (FORBIDDEN_KEYS.has(k)) {
            res.status(400).json({ ok: false, error: "FORBIDDEN_KEY", key: k });
            return true;
          }
        }
        const pStr = JSON.stringify(payload);
        if (pStr.length > MAX_PAYLOAD_BYTES) {
          res.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE", maxBytes: MAX_PAYLOAD_BYTES });
          return true;
        }
      }
    }
  }
  return false;
}

/* ── device limit ── */

const MAX_DEVICES_PER_USER = 2;
const OWNER_EMAIL = "kouyoo4444@gmail.com";

/**
 * Check if the device is allowed. Returns true if OK.
 * - If the device is already registered → always OK (update lastSeen)
 * - If new device and user already has MAX_DEVICES → reject
 * - Owner (kouyoo4444@gmail.com) is exempt from the limit
 */
function checkDeviceLimit(
  db: ReturnType<typeof getDb>,
  userId: string,
  deviceId: string,
  res: Response
): boolean {
  // Check if this device is already registered for this user
  const existing = db.prepare(
    `SELECT deviceId FROM sync_devices WHERE userId = ? AND deviceId = ?`
  ).get(userId, deviceId) as any;
  if (existing) return true; // already registered

  // Check if owner (exempt from limit)
  try {
    const userRow = db.prepare(
      `SELECT email FROM auth_users WHERE userId = ?`
    ).get(userId) as any;
    if (userRow?.email === OWNER_EMAIL) return true;
  } catch { /* auth_users may not exist in this db */ }

  // Count existing devices
  const countRow = db.prepare(
    `SELECT COUNT(*) as cnt FROM sync_devices WHERE userId = ?`
  ).get(userId) as any;
  const currentCount = countRow?.cnt ?? 0;

  if (currentCount >= MAX_DEVICES_PER_USER) {
    res.status(403).json({
      ok: false,
      error: "DEVICE_LIMIT_EXCEEDED",
      message: `デバイス登録は${MAX_DEVICES_PER_USER}台までです。既存のデバイスを解除してから、新しいデバイスでログインしてください。`,
      maxDevices: MAX_DEVICES_PER_USER,
      currentDevices: currentCount,
    });
    return false;
  }
  return true;
}

/* ── POST /sync/bootstrap ── */

syncPhaseARouter.post("/sync/bootstrap", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const deviceId = String(req.body?.deviceId ?? "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "DEVICE_ID_REQUIRED" });

  const db = getDb("kokuzo");
  const t = nowIso();

  try {
    // Device limit check
    if (!checkDeviceLimit(db, userId, deviceId, res)) return;

    // Register device
    db.prepare(
      `INSERT INTO sync_devices (userId, deviceId, lastSeenAt, createdAt)
       VALUES (?,?,?,?)
       ON CONFLICT(userId, deviceId) DO UPDATE SET lastSeenAt = excluded.lastSeenAt`
    ).run(userId, deviceId, t, t);

    // Fetch all non-deleted threads
    const threads = db.prepare(
      `SELECT threadId, title, folderId, pinned, updatedAt, version
       FROM synced_chat_threads WHERE userId = ? AND isDeleted = 0 ORDER BY updatedAt DESC`
    ).all(userId) as any[];

    // Fetch all non-deleted folders
    const folders = db.prepare(
      `SELECT folderId, name, kind, color, sortOrder, isDefault, updatedAt, version
       FROM synced_chat_folders WHERE userId = ? AND isDeleted = 0 ORDER BY sortOrder ASC`
    ).all(userId) as any[];

    // Fetch all non-deleted sukuyou rooms (lightweight — no fullReport)
    const sukuyouRooms = db.prepare(
      `SELECT roomId, threadId, birthDate, honmeiShuku, disasterType, reversalAxis,
              shortOracle, updatedAt, version
       FROM synced_sukuyou_rooms WHERE userId = ? AND isDeleted = 0 ORDER BY updatedAt DESC`
    ).all(userId) as any[];

    // Fetch deleted item IDs (tombstones) so clients can remove stale local copies
    const deletedThreadIds = (db.prepare(
      `SELECT threadId FROM synced_chat_threads WHERE userId = ? AND isDeleted = 1`
    ).all(userId) as any[]).map(r => r.threadId);
    const deletedFolderIds = (db.prepare(
      `SELECT folderId FROM synced_chat_folders WHERE userId = ? AND isDeleted = 1`
    ).all(userId) as any[]).map(r => r.folderId);
    const deletedSukuyouRoomIds = (db.prepare(
      `SELECT roomId FROM synced_sukuyou_rooms WHERE userId = ? AND isDeleted = 1`
    ).all(userId) as any[]).map(r => r.roomId);

    // Log event
    db.prepare(
      `INSERT INTO sync_events (userId, deviceId, eventType, detailJson, createdAt)
       VALUES (?,?,?,?,?)`
    ).run(userId, deviceId, "bootstrap", JSON.stringify({ threads: threads.length, folders: folders.length, sukuyou: sukuyouRooms.length }), t);

    return res.json({
      ok: true,
      version: "SYNC_PHASE_A_V1",
      userId,
      deviceId,
      at: t,
      threads,
      folders,
      sukuyouRooms,
      deletedThreadIds,
      deletedFolderIds,
      deletedSukuyouRoomIds,
    });
  } catch (e: any) {
    console.error("[SYNC_PHASE_A] bootstrap failed", e);
    return res.status(500).json({ ok: false, error: "BOOTSTRAP_FAILED", detail: String(e?.message ?? e) });
  }
});

/* ── GET /sync/pull?deviceId=&since= ── */

syncPhaseARouter.get("/sync/pull", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const deviceId = String(req.query?.deviceId ?? "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "DEVICE_ID_REQUIRED" });

  const since = String(req.query?.since ?? "").trim() || "1970-01-01T00:00:00.000Z";
  const db = getDb("kokuzo");
  const t = nowIso();

  try {
    // Device limit check
    if (!checkDeviceLimit(db, userId, deviceId, res)) return;

    // Update device lastSeen
    db.prepare(
      `INSERT INTO sync_devices (userId, deviceId, lastSeenAt, createdAt)
       VALUES (?,?,?,?)
       ON CONFLICT(userId, deviceId) DO UPDATE SET lastSeenAt = excluded.lastSeenAt`
    ).run(userId, deviceId, t, t);

    // Fetch changes since timestamp (including deleted items for tombstone sync)
    const threads = db.prepare(
      `SELECT threadId, title, folderId, pinned, updatedAt, version, isDeleted
       FROM synced_chat_threads WHERE userId = ? AND updatedAt > ? ORDER BY updatedAt ASC`
    ).all(userId, since) as any[];

    const folders = db.prepare(
      `SELECT folderId, name, kind, color, sortOrder, isDefault, updatedAt, version, isDeleted
       FROM synced_chat_folders WHERE userId = ? AND updatedAt > ? ORDER BY updatedAt ASC`
    ).all(userId, since) as any[];

    const sukuyouRooms = db.prepare(
      `SELECT roomId, threadId, birthDate, honmeiShuku, disasterType, reversalAxis,
              shortOracle, updatedAt, version, isDeleted
       FROM synced_sukuyou_rooms WHERE userId = ? AND updatedAt > ? ORDER BY updatedAt ASC`
    ).all(userId, since) as any[];

    // Log event
    db.prepare(
      `INSERT INTO sync_events (userId, deviceId, eventType, detailJson, createdAt)
       VALUES (?,?,?,?,?)`
    ).run(userId, deviceId, "pull", JSON.stringify({ since, threads: threads.length, folders: folders.length, sukuyou: sukuyouRooms.length }), t);

    return res.json({
      ok: true,
      version: "SYNC_PHASE_A_V1",
      userId,
      deviceId,
      at: t,
      since,
      threads,
      folders,
      sukuyouRooms,
    });
  } catch (e: any) {
    console.error("[SYNC_PHASE_A] pull failed", e);
    return res.status(500).json({ ok: false, error: "PULL_FAILED", detail: String(e?.message ?? e) });
  }
});

/* ── POST /sync/push ── */

type ChangeKind =
  | "chat_thread_upsert"
  | "chat_thread_delete"
  | "chat_folder_upsert"
  | "chat_folder_delete"
  | "sukuyou_room_upsert"
  | "sukuyou_room_delete";

interface SyncChange {
  kind: ChangeKind;
  payload: Record<string, unknown>;
}

syncPhaseARouter.post("/sync/push", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (rejectHeavyPayload(req.body, res)) return;

  const deviceId = String(req.body?.deviceId ?? "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "DEVICE_ID_REQUIRED" });

  const changes = req.body?.changes as SyncChange[] | undefined;
  if (!Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ ok: false, error: "NO_CHANGES" });
  }
  if (changes.length > 200) {
    return res.status(400).json({ ok: false, error: "TOO_MANY_CHANGES", max: 200 });
  }

  const db = getDb("kokuzo");
  const t = nowIso();
  let applied = 0;
  let skipped = 0;

  try {
    for (const c of changes) {
      const kind = c?.kind;
      const p = c?.payload ?? {};

      switch (kind) {
        case "chat_thread_upsert": {
          const threadId = String(p.threadId ?? "").trim();
          if (!threadId) { skipped++; break; }
          // Check if tombstoned — do not resurrect deleted items
          const existingThread = db.prepare(
            `SELECT isDeleted FROM synced_chat_threads WHERE userId = ? AND threadId = ?`
          ).get(userId, threadId) as any;
          if (existingThread?.isDeleted === 1) {
            skipped++;
            break;
          }
          const title = String(p.title ?? "").slice(0, 500);
          const folderId = p.folderId ? String(p.folderId).slice(0, 100) : null;
          const pinned = p.pinned ? 1 : 0;
          db.prepare(
            `INSERT INTO synced_chat_threads (userId, threadId, title, folderId, pinned, updatedAt, version, isDeleted)
             VALUES (?,?,?,?,?,?,1,0)
             ON CONFLICT(userId, threadId) DO UPDATE SET
               title = excluded.title,
               folderId = excluded.folderId,
               pinned = excluded.pinned,
               updatedAt = excluded.updatedAt,
               version = synced_chat_threads.version + 1`
          ).run(userId, threadId, title, folderId, pinned, t);
          applied++;
          break;
        }
        case "chat_thread_delete": {
          const threadId = String(p.threadId ?? "").trim();
          if (!threadId) { skipped++; break; }
          db.prepare(
            `UPDATE synced_chat_threads SET isDeleted = 1, updatedAt = ?, version = version + 1
             WHERE userId = ? AND threadId = ?`
          ).run(t, userId, threadId);
          applied++;
          break;
        }
        case "chat_folder_upsert": {
          const folderId = String(p.folderId ?? "").trim();
          if (!folderId) { skipped++; break; }
          // Check if tombstoned — do not resurrect deleted items
          const existingFolder = db.prepare(
            `SELECT isDeleted FROM synced_chat_folders WHERE userId = ? AND folderId = ?`
          ).get(userId, folderId) as any;
          if (existingFolder?.isDeleted === 1) {
            skipped++;
            break;
          }
          const name = String(p.name ?? "").slice(0, 200);
          const fkind = String(p.kind ?? "user").slice(0, 50);
          const color = p.color ? String(p.color).slice(0, 50) : null;
          const sortOrder = typeof p.sortOrder === "number" ? p.sortOrder : 0;
          const isDefault = p.isDefault ? 1 : 0;
          db.prepare(
            `INSERT INTO synced_chat_folders (userId, folderId, name, kind, color, sortOrder, isDefault, updatedAt, version, isDeleted)
             VALUES (?,?,?,?,?,?,?,?,1,0)
             ON CONFLICT(userId, folderId) DO UPDATE SET
               name = excluded.name,
               kind = excluded.kind,
               color = excluded.color,
               sortOrder = excluded.sortOrder,
               isDefault = excluded.isDefault,
               updatedAt = excluded.updatedAt,
               version = synced_chat_folders.version + 1`
          ).run(userId, folderId, name, fkind, color, sortOrder, isDefault, t);
          applied++;
          break;
        }
        case "chat_folder_delete": {
          const folderId = String(p.folderId ?? "").trim();
          if (!folderId) { skipped++; break; }
          db.prepare(
            `UPDATE synced_chat_folders SET isDeleted = 1, updatedAt = ?, version = version + 1
             WHERE userId = ? AND folderId = ?`
          ).run(t, userId, folderId);
          applied++;
          break;
        }
        case "sukuyou_room_upsert": {
          const roomId = String(p.roomId ?? "").trim();
          if (!roomId) { skipped++; break; }
          // Check if tombstoned — do not resurrect deleted items
          const existingRoom = db.prepare(
            `SELECT isDeleted FROM synced_sukuyou_rooms WHERE userId = ? AND roomId = ?`
          ).get(userId, roomId) as any;
          if (existingRoom?.isDeleted === 1) {
            skipped++;
            break;
          }
          const threadId = p.threadId ? String(p.threadId).slice(0, 100) : null;
          const birthDate = p.birthDate ? String(p.birthDate).slice(0, 20) : null;
          const honmeiShuku = p.honmeiShuku ? String(p.honmeiShuku).slice(0, 50) : null;
          const disasterType = p.disasterType ? String(p.disasterType).slice(0, 100) : null;
          const reversalAxis = p.reversalAxis ? String(p.reversalAxis).slice(0, 200) : null;
          const shortOracle = p.shortOracle ? String(p.shortOracle).slice(0, 2000) : null;
          db.prepare(
            `INSERT INTO synced_sukuyou_rooms (userId, roomId, threadId, birthDate, honmeiShuku, disasterType, reversalAxis, shortOracle, updatedAt, version, isDeleted)
             VALUES (?,?,?,?,?,?,?,?,?,1,0)
             ON CONFLICT(userId, roomId) DO UPDATE SET
               threadId = excluded.threadId,
               birthDate = excluded.birthDate,
               honmeiShuku = excluded.honmeiShuku,
               disasterType = excluded.disasterType,
               reversalAxis = excluded.reversalAxis,
               shortOracle = excluded.shortOracle,
               updatedAt = excluded.updatedAt,
               version = synced_sukuyou_rooms.version + 1`
          ).run(userId, roomId, threadId, birthDate, honmeiShuku, disasterType, reversalAxis, shortOracle, t);
          applied++;
          break;
        }
        case "sukuyou_room_delete": {
          const roomId = String(p.roomId ?? "").trim();
          if (!roomId) { skipped++; break; }
          db.prepare(
            `UPDATE synced_sukuyou_rooms SET isDeleted = 1, updatedAt = ?, version = version + 1
             WHERE userId = ? AND roomId = ?`
          ).run(t, userId, roomId);
          applied++;
          break;
        }
        default:
          skipped++;
      }
    }

    // Device limit check + Update device
    if (!checkDeviceLimit(db, userId, deviceId, res)) return;
    db.prepare(
      `INSERT INTO sync_devices (userId, deviceId, lastSeenAt, createdAt)
       VALUES (?,?,?,?)
       ON CONFLICT(userId, deviceId) DO UPDATE SET lastSeenAt = excluded.lastSeenAt`
    ).run(userId, deviceId, t, t);

    // Log event
    db.prepare(
      `INSERT INTO sync_events (userId, deviceId, eventType, detailJson, createdAt)
       VALUES (?,?,?,?,?)`
    ).run(userId, deviceId, "push", JSON.stringify({ total: changes.length, applied, skipped }), t);

    return res.json({
      ok: true,
      version: "SYNC_PHASE_A_V1",
      userId,
      deviceId,
      at: t,
      applied,
      skipped,
    });
  } catch (e: any) {
    console.error("[SYNC_PHASE_A] push failed", e);
    return res.status(500).json({ ok: false, error: "PUSH_FAILED", detail: String(e?.message ?? e) });
  }
});
