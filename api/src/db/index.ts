import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { markDbReady, markKokuzoVerified } from "../health/readiness.js";

export type DbKind = "kokuzo" | "audit" | "persona";

const dbs = new Map<DbKind, DatabaseSync>();
const dbPaths = new Map<DbKind, string>();

function nowIso(): string {
  return new Date().toISOString();
}

function sleepSync(ms: number): void {
  // Atomics.wait による同期sleep（Node.jsで利用可能）
  const sab = new SharedArrayBuffer(4);
  const ia = new Int32Array(sab);
  Atomics.wait(ia, 0, 0, ms);
}

function withRetry<T>(fn: () => T, maxRetries = 5): T {
  let attempt = 0;
  // simple exponential backoff
  while (true) {
    try {
      return fn();
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === "SQLITE_BUSY" || code === "SQLITE_LOCKED") {
        attempt += 1;
        if (attempt > maxRetries) throw e;
        const backoff = Math.min(2000, 50 * 2 ** (attempt - 1));
        console.warn(`[DB] busy/locked, retrying... attempt=${attempt} backoff=${backoff}ms`);
        sleepSync(backoff);
        continue;
      }
      throw e;
    }
  }
}

function defaultDbFile(kind: DbKind): string {
  const dir = path.resolve(process.cwd(), "db");
  const name = kind === "kokuzo" ? "kokuzo.sqlite" : kind === "audit" ? "audit.sqlite" : "persona.sqlite";
  return path.join(dir, name);
}

export function getDbPath(kind: DbKind): string {
  const existing = dbPaths.get(kind);
  if (existing) return existing;

  const envKey =
    kind === "kokuzo"
      ? process.env.TENMON_ARK_DB_KOKUZO_PATH
      : kind === "audit"
        ? process.env.TENMON_ARK_DB_AUDIT_PATH
        : process.env.TENMON_ARK_DB_PERSONA_PATH;

  const filePath = envKey ? path.resolve(process.cwd(), envKey) : defaultDbFile(kind);
  dbPaths.set(kind, filePath);
  return filePath;
}

function schemaFilesFor(kind: DbKind): string[] {
  if (kind === "kokuzo") return ["schema.sql", "kokuzo_schema.sql", "training_schema.sql"];
  if (kind === "persona") return ["persona_state.sql"];
  return ["approval_schema.sql", "audit_schema.sql"];
}

function applySchemas(database: DatabaseSync, kind: DbKind): void {
  // dist 実行でも参照できるパス（dist/db/*.sql を読む）
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // dist/db/index.js から見て dist/db/*.sql を読む
  const schemaDir = path.resolve(__dirname, "db");
  
  for (const f of schemaFilesFor(kind)) {
    const full = path.join(schemaDir, f);
    if (!fs.existsSync(full)) {
      console.warn(`[DB] schema file not found: ${full}`);
      continue;
    }
    const sql = fs.readFileSync(full, "utf8");
    withRetry(() => database.exec(sql));
  }
}

export function getDb(kind: DbKind): DatabaseSync {
  const existing = dbs.get(kind);
  if (existing) return existing;

  const filePath = getDbPath(kind);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Migration (best-effort): Phase4 single-file DB -> Phase9 kokuzo DB
  if (kind === "kokuzo") {
    const legacy = path.resolve(process.cwd(), "data", "tenmon-ark.sqlite");
    if (!fs.existsSync(filePath) && fs.existsSync(legacy)) {
      try {
        fs.copyFileSync(legacy, filePath);
      } catch {
        // ignore; start fresh
      }
    }
  }

  const database = new DatabaseSync(filePath);

  withRetry(() => {
    database.exec("PRAGMA journal_mode = WAL;");
    database.exec("PRAGMA synchronous = NORMAL;");
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec("PRAGMA busy_timeout = 5000;");
  });

  applySchemas(database, kind);

  // Debug: kokuzo_pages の存在確認（起動時に必ず存在することを保証）
  if (kind === "kokuzo") {
    try {
      const checkStmt = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kokuzo_pages' LIMIT 1");
      const result = checkStmt.get() as any;
      if (!result || result.name !== "kokuzo_pages") {
        console.error(`[DB] FATAL: kokuzo_pages table missing after schema apply`);
        console.error(`[DB] Available tables:`, database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
        process.exit(1);
      }
      console.log(`[DB] verified kokuzo_pages exists`);
      markKokuzoVerified();
    } catch (e) {
      console.error(`[DB] FATAL: failed to verify kokuzo_pages:`, e);
      process.exit(1);
    }
  }

  dbs.set(kind, database);
  markDbReady(kind);
  console.log(`[DB] ready kind=${kind} path=${filePath} at=${nowIso()}`);
  return database;
}

export function closeAllDbs(): void {
  for (const [kind, database] of dbs.entries()) {
    try {
      database.close();
    } catch (e) {
      console.warn(`[DB] close failed kind=${kind}`, e);
    }
  }
  dbs.clear();
}

export function dbExec(kind: DbKind, sql: string): void {
  const database = getDb(kind);
  withRetry(() => database.exec(sql));
}

export function dbPrepare(kind: DbKind, sql: string) {
  const database = getDb(kind);
  const stmt = database.prepare(sql) as StatementSync;

  // Wrap run/get/all with retry to satisfy "DB ロックエラー → retry"
  return new Proxy(stmt as any, {
    get(target, prop) {
      if (prop === "run" || prop === "get" || prop === "all") {
        return (...args: any[]) => withRetry(() => target[prop](...args));
      }
      return target[prop];
    },
  });
}
