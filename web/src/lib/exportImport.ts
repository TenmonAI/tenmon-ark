// web/src/lib/exportImport.ts
// PWA-MEM-01c: snapshot export + overwrite import (no silent corruption)

import {
  dbGetAllThreads,
  listMessagesByThread,
  dbGetAllSeeds,
  dbPutSeeds,
  dbClearAll,
  upsertThread,
  replaceThreadMessages,
  type PersistThread,
  type PersistMessage,
  type PersistSeed,
} from "./db";

export type ExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  threads: PersistThread[];
  messages: Record<string, PersistMessage[]>;
  seeds: PersistSeed[];
};

export async function exportForDownload(): Promise<ExportPayloadV2> {
  const threads = await dbGetAllThreads();
  const seeds = await dbGetAllSeeds();
  const messages: Record<string, PersistMessage[]> = {};

  for (const t of threads) {
    messages[t.id] = await listMessagesByThread(t.id);
  }

  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    threads,
    messages,
    seeds,
  };
}

/**
 * Overwrite import only. schemaVersion must be 2.
 * NOTE: atomic overwrite uses dbClearAll (already present in db.ts)
 */
export async function importOverwrite(data: unknown): Promise<void> {
  if (!data || typeof data !== "object") throw new Error("invalid json");
  const payload = data as Partial<ExportPayloadV2>;
  if (payload.schemaVersion !== 2) {
    throw new Error(`UNSUPPORTED_SCHEMA_VERSION:${String(payload.schemaVersion ?? "unknown")}`);
  }

  const threads = Array.isArray(payload.threads) ? (payload.threads as PersistThread[]) : [];
  const messagesMap =
    payload.messages && typeof payload.messages === "object"
      ? (payload.messages as Record<string, PersistMessage[]>)
      : {};
  const seeds = Array.isArray(payload.seeds) ? (payload.seeds as PersistSeed[]) : [];

  // clear first (atomic overwrite)
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
