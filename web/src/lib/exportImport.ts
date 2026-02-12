// web/src/lib/exportImport.ts
// PWA-MEM-01b-EXPORT-IMPORT-V2: export/import are separated from db.ts (overwrite only)

import { upsertThread, replaceThreadMessages, listMessagesByThread, dbGetAllSeeds, dbPutSeeds } from "./db";

export type ExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  threads?: PersistThread[];
  messages: Record<string, PersistMessage[]>;
  seeds: PersistSeed[];
};

export async function exportForDownload(): Promise<ExportPayloadV2> {
  const seeds = await dbGetAllSeeds();
  const messages: Record<string, PersistMessage[]> = {};
  for (const t of threads) {
    messages[t.id] = await dbGetMessages(t.id);
  }
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    
    messages,
    seeds,
  };
}

/**
 * Overwrite import only. schemaVersion must be 2.
 * This is intentionally strict to avoid silent corruption.
 */
export async function importOverwrite(data: unknown): Promise<void> {
  if (!data || typeof data !== "object") throw new Error("invalid json");
  const payload = data as Partial<ExportPayloadV2>;
  if (payload.schemaVersion !== 2) {
    throw new Error(`UNSUPPORTED_SCHEMA_VERSION:${String(payload.schemaVersion ?? "unknown")}`);
  }

  const threads = Array.isArray(payload.threads) ? payload.threads : [];
  const messagesMap = payload.messages && typeof payload.messages === "object" ? payload.messages : {};
  const seeds = Array.isArray(payload.seeds) ? payload.seeds : [];

  // overwrite strategy: clear+put via existing db APIs
  // threads
  for (const t of threads) {
    if (!t || typeof t.id !== "string") continue;
    await dbPutThread({ id: t.id, title: t.title, updatedAt: t.updatedAt });
  }

  // messages per thread
  for (const threadId of Object.keys(messagesMap as Record<string, any>)) {
    const arr = (messagesMap as any)[threadId];
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
    await dbPutMessages(threadId, msgs);
  }

  // seeds
  const ss: PersistSeed[] = [];
  for (const s of seeds) {
    const seed = s as PersistSeed;
    if (!seed || typeof seed.id !== "string") continue;
    ss.push(seed);
  }
  await dbPutSeeds(ss);
}
