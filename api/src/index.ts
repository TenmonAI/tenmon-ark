import express from "express";
import cookieParser from "cookie-parser";
import { seedPackRouter } from "./routes/seedPack.js";
import { kamuRouter } from "./routes/kamu.js";
import { pwaRouter } from "./routes/pwa.js";
import cors from "cors";
import auditRouter from "./routes/audit.js";
import chatRouter from "./routes/chat.js";
import lawRouter from "./routes/law.js";
import uploadRouter from "./routes/upload.js";
import algRouter from "./routes/alg.js";
import ingestRouter from "./routes/ingest.js";
import kokuzoRouter from "./routes/kokuzo.js";
import trainingRouter from "./routes/training.js";
import trainRouter from "./routes/train.js";
import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
import memoryRouter from "./routes/memory.js";
import { readerRouter } from "./routes/reader.js";
import { writerStoreRouter } from "./routes/writerStore.js";
import { writerCommitRouter } from "./routes/writerCommit.js";
import { writerRouter } from "./routes/writer.js";
import { writerVerifyRouter } from "./routes/writerVerify.js";
import { writerDraftRouter } from "./routes/writerDraft.js";
import { seedRouter } from "./routes/seed.js";
import { selfImproveRouter } from "./routes/selfImprove.js";
import { councilRouter } from "./routes/council.js";
import { authRouter } from "./routes/auth.js";
import { authLocalRouter } from "./routes/auth_local.js";
import { meRouter } from "./routes/me.js";
import { registerFounderAuth } from "./routes/auth_founder.js";
import { markListenReady } from "./health/readiness.js";
import { initConsciousnessOS } from "./core/consciousnessOS.js";
import { getDb } from "./db/index.js";
import koshikiConsoleRouter from "./routes/koshikiConsole.js";
import guestRouter from "./routes/guest.js";
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from "fs";

// ── Startup diagnostics ──
const pid = process.pid;
const startTime = Date.now();
const startISO = new Date().toISOString();

// Write startup log to file for post-deploy verification
const logPath = "/tmp/tenmon-ark-startup.log";
function logStartup(msg: string) {
  const line = `[${new Date().toISOString()}] PID=${pid} ${msg}\n`;
  try { appendFileSync(logPath, line); } catch {}
  console.log(msg);
}

logStartup(`[SERVER-START] PID=${pid} CWD=${process.cwd()} startTime=${startISO}`);

// ── Exception handlers (log but try to survive) ──
process.on("uncaughtException", (error) => {
  logStartup(`[FATAL] uncaughtException: ${error.message}\n${error.stack}`);
  // Don't exit immediately - give time for the log to be written
  setTimeout(() => process.exit(1), 100);
});

process.on("unhandledRejection", (reason: any) => {
  logStartup(`[FATAL] unhandledRejection: ${reason?.message || reason}`);
  setTimeout(() => process.exit(1), 100);
});

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// ── Database initialization (ALL non-fatal) ──
logStartup(`[DB-INIT] initializing databases...`);

const dbStatus: Record<string, string> = {};

for (const dbName of ["kokuzo", "audit", "persona", "consciousness"] as const) {
  try {
    getDb(dbName);
    if (dbName === "kokuzo") {
      // ENSURE_KOKUZO_LAWS_COLUMNS_V1
      try {
        const db = getDb("kokuzo") as any;
        const cols = (db.prepare("PRAGMA table_info('kokuzo_laws')").all() as any[]).map((r: any) => String(r.name));
        const has = (name: string) => cols.includes(name);
        if (!has("name")) db.prepare("ALTER TABLE kokuzo_laws ADD COLUMN name TEXT").run();
        if (!has("definition")) db.prepare("ALTER TABLE kokuzo_laws ADD COLUMN definition TEXT").run();
        if (!has("evidenceIds")) db.prepare("ALTER TABLE kokuzo_laws ADD COLUMN evidenceIds TEXT").run();
      } catch (e: any) {
        logStartup(`[DB] ENSURE_KOKUZO_LAWS_COLUMNS_V1 failed: ${e.message}`);
      }
    }
    if (dbName === "consciousness") {
      try { initConsciousnessOS(); } catch (e: any) {
        logStartup(`[DB] initConsciousnessOS failed: ${e.message}`);
      }
    }
    dbStatus[dbName] = "ok";
    logStartup(`[DB-INIT] ${dbName} ready`);
  } catch (e: any) {
    dbStatus[dbName] = `error: ${e.message}`;
    logStartup(`[DB-INIT] WARNING: ${dbName} init failed: ${e.message}`);
    // Continue - don't exit! The server should start even if some DBs fail.
  }
}

// ── Middleware ──

// CORS: ゲストチャット用に futomani88.com を明示的に許可
// 他のルートは cors() で全許可（既存動作を維持）
app.use((req, res, next) => {
  if (req.path.startsWith("/api/guest/")) {
    res.header("Access-Control-Allow-Origin", "https://futomani88.com");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
  }
  next();
});
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// ── Version endpoint (FIRST, before all routes) ──
app.get("/api/version", (_req, res) => {
  res.json({
    version: "2.2.0-sukuyou-consciousness",
    timestamp: new Date().toISOString(),
    pid,
    cwd: process.cwd(),
    dbStatus,
    uptime: process.uptime(),
  });
});

// ── Health endpoint ──
app.get("/health", (_, res) => {
  res.json({ status: "ok", pid, uptime: process.uptime(), dbStatus });
});

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", pid, uptime: process.uptime(), dbStatus });
});

// ── Routes ──
app.use("/api", kamuRouter);
registerFounderAuth(app);
app.use("/api", authRouter);
app.use("/api", authLocalRouter);
app.use("/api", meRouter);
app.use("/api", auditRouter);
app.use("/api", chatRouter);
app.use("/api", lawRouter);
app.use("/api", uploadRouter);
app.use("/api", algRouter);
app.use("/api", ingestRouter);
app.use("/api", kokuzoRouter);
app.use("/api", trainingRouter);
app.use("/api", trainRouter);
app.use("/api", memoryRouter);
app.use("/api", councilRouter);
app.use("/api", writerRouter);
app.use("/api", pwaRouter);
app.use("/api", seedPackRouter);
app.use("/api", writerVerifyRouter);
app.use("/api", writerDraftRouter);
app.use("/api", writerStoreRouter);
app.use("/api", writerCommitRouter);
app.use("/api", readerRouter);
app.use("/api", seedRouter);
app.use("/api", selfImproveRouter);
app.use("/api", guestRouter);
app.use("/api/kanagi", kanagiRoutes);
app.use("/api/tenmon", tenmonRoutes);

// 宿曜経 × 天津金木 × 言霊 統合診断 (dynamic import to prevent crash)
try {
  const sukuyouMod = await import("./routes/sukuyou.js");
  app.use("/api/sukuyou", sukuyouMod.default);
  logStartup(`[ROUTE] sukuyou registered`);
} catch (e: any) {
  logStartup(`[ROUTE] sukuyou failed to load: ${e.message}`);
}

app.use(koshikiConsoleRouter);

// ── Start listening ──
app.listen(PORT, "0.0.0.0", () => {
  const elapsed = Date.now() - startTime;
  logStartup(`[SERVER-LISTEN] port=${PORT} elapsed=${elapsed}ms`);
  logStartup(`[READY] All routes registered, server is ready`);
  markListenReady();
});
