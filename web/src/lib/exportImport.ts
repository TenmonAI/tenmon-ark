// web/src/lib/exportImport.ts
// PWA-MEM-01c: snapshot export + overwrite import (no silent corruption)
// V3: 宿曜鑑定結果 + フォルダーを含む完全エクスポート

import {
  dbGetAllThreads,
  listMessagesByThread,
  dbGetAllSeeds,
  dbPutSeeds,
  dbClearAll,
  upsertThread,
  replaceThreadMessages,
  dbGetAllSukuyouResults,
  dbPutAllSukuyouResults,
  dbGetAllChatFolders,
  dbPutAllChatFolders,
  type PersistThread,
  type PersistMessage,
  type PersistSeed,
} from "./db";

/** V2 (legacy) — threads + messages + seeds のみ */
export type ExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  threads: PersistThread[];
  messages: Record<string, PersistMessage[]>;
  seeds: PersistSeed[];
};

/** V3 — V2 + 宿曜鑑定結果 + フォルダー */
export type ExportPayloadV3 = {
  schemaVersion: 3;
  exportedAt: string;
  threads: PersistThread[];
  messages: Record<string, PersistMessage[]>;
  seeds: PersistSeed[];
  sukuyouResults: Record<string, unknown>[];
  chatFolders: Record<string, unknown>[];
};

export type ExportPayload = ExportPayloadV2 | ExportPayloadV3;

export async function exportForDownload(): Promise<ExportPayloadV3> {
  const threads = await dbGetAllThreads();
  const seeds = await dbGetAllSeeds();
  const sukuyouResults = await dbGetAllSukuyouResults();
  const chatFolders = await dbGetAllChatFolders();
  const messages: Record<string, PersistMessage[]> = {};

  for (const t of threads) {
    messages[t.id] = await listMessagesByThread(t.id);
  }

  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    threads,
    messages,
    seeds,
    sukuyouResults,
    chatFolders,
  };
}

/**
 * Overwrite import. Supports schemaVersion 2 (legacy) and 3.
 * V2 imports threads/messages/seeds only.
 * V3 also imports sukuyouResults and chatFolders.
 */
export async function importOverwrite(data: unknown): Promise<void> {
  if (!data || typeof data !== "object") throw new Error("invalid json");
  const payload = data as Partial<ExportPayloadV3>;
  const version = (payload as any).schemaVersion;
  if (version !== 2 && version !== 3) {
    throw new Error(`UNSUPPORTED_SCHEMA_VERSION:${String(version ?? "unknown")}`);
  }

  const threads = Array.isArray(payload.threads) ? (payload.threads as PersistThread[]) : [];
  const messagesMap =
    payload.messages && typeof payload.messages === "object"
      ? (payload.messages as Record<string, PersistMessage[]>)
      : {};
  const seeds = Array.isArray(payload.seeds) ? (payload.seeds as PersistSeed[]) : [];

  // V3 追加フィールド（V2の場合は空配列）
  const sukuyouResults = version >= 3 && Array.isArray(payload.sukuyouResults)
    ? (payload.sukuyouResults as Record<string, unknown>[])
    : [];
  const chatFolders = version >= 3 && Array.isArray(payload.chatFolders)
    ? (payload.chatFolders as Record<string, unknown>[])
    : [];

  // clear first (atomic overwrite — V2: sukuyou_results/chat_folders も含めてクリア)
  await dbClearAll();

  // threads
  for (const t of threads) {
    if (!t || typeof t.id !== "string") continue;
    await upsertThread({ id: t.id, title: t.title, updatedAt: t.updatedAt });
  }

  // messages per thread（overwrite）
  for (const threadId of Object.keys(messagesMap)) {
    const arr = messagesMap[threadId];
    if (!Array.isArray(arr)) continue;

    const msgs: PersistMessage[] = [];
    for (const m of arr) {
      const mm = m as PersistMessage;
      if (!mm || typeof mm.id !== "string") continue;
      if (typeof mm.threadId !== "string") continue;
      if (mm.role !== "user" && mm.role !== "tenmon") continue;
      if (typeof mm.text !== "string") continue;
      msgs.push({
        id: mm.id,
        threadId: mm.threadId,
        role: mm.role,
        text: mm.text,
        createdAt: typeof mm.createdAt === "number" ? mm.createdAt : Date.now(),
      });
    }

    await replaceThreadMessages(threadId, msgs);
  }

  // seeds（overwrite）
  const ss: PersistSeed[] = [];
  for (const s of seeds) {
    const seed = s as PersistSeed;
    if (!seed || typeof seed.id !== "string") continue;
    ss.push(seed);
  }
  await dbPutSeeds(ss);

  // V3: 宿曜鑑定結果
  if (sukuyouResults.length > 0) {
    await dbPutAllSukuyouResults(sukuyouResults);
  }

  // V3: フォルダー
  if (chatFolders.length > 0) {
    await dbPutAllChatFolders(chatFolders);
  }
}

/**
 * TENMON_PWA_FRONTEND_RESIDUE_PURGE_AND_HYGIENE_CURSOR_AUTO_V1:
 * importOverwrite（IDB）後に useChat が読む localStorage ミラーを再構築し、ページ再読込なしで再同期する。
 */
export async function syncIdbToLocalStorageAfterImportV1(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { dbGetAllThreads, listMessagesByThread } = await import("./db.js");
  const { getStorageKeys, writeThreadIdToUrl } = await import("../hooks/useChat");

  const threads = await dbGetAllThreads();
  const keys = getStorageKeys();
  const meta: Record<string, { id: string; title?: string; updatedAt?: number }> = {};

  for (const t of threads) {
    if (!t?.id) continue;
    const msgs = await listMessagesByThread(t.id);
    const chatMsgs = msgs.map((m) => ({
      id: m.id,
      role: (m.role === "tenmon" ? "assistant" : "user") as "user" | "assistant",
      content: m.text,
      at: new Date(typeof m.createdAt === "number" ? m.createdAt : Date.now()).toISOString(),
    }));
    try {
      window.localStorage.setItem(keys.MSGS_KEY_PREFIX + t.id, JSON.stringify(chatMsgs));
    } catch {
      /* ignore */
    }
    meta[t.id] = {
      id: t.id,
      title: t.title,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
    };
  }

  try {
    window.localStorage.setItem(keys.THREADS_META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }

  const sorted = [...threads].filter((t) => t?.id).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const primaryId =
    sorted.length > 0
      ? String(sorted[0].id)
      : `pwa-${Date.now().toString(36)}`;

  try {
    window.localStorage.setItem(keys.THREAD_KEY, primaryId);
  } catch {
    /* ignore */
  }
  writeThreadIdToUrl(primaryId);

  // V3: 宿曜鑑定結果のイベント通知（サイドバー更新用）
  try {
    window.dispatchEvent(new CustomEvent("tenmon:sukuyou-updated"));
    window.dispatchEvent(new CustomEvent("tenmon:folders-updated"));
  } catch {
    /* ignore */
  }

  return primaryId;
}

export function downloadJson(filename: string, obj: any): void {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const obj = JSON.parse(text);
        resolve(obj);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
