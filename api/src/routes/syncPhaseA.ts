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

/* ── POST /sync/bootstrap ── */

syncPhaseARouter.post("/sync/bootstrap", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const deviceId = String(req.body?.deviceId ?? "").trim();
  if (!deviceId) return res.status(400).json({ ok: false, error: "DEVICE_ID_REQUIRED" });

  const db = getDb("kokuzo");
  const t = nowIso();

  try {
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
               version = synced_chat_threads.version + 1,
               isDeleted = 0`
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
               version = synced_chat_folders.version + 1,
               isDeleted = 0`
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
               version = synced_sukuyou_rooms.version + 1,
               isDeleted = 0`
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

    // Update device
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
