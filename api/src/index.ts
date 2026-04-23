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
import { seedRouter } from "./routes/seed.js";
import { selfImproveRouter } from "./routes/selfImprove.js";
import { councilRouter } from "./routes/council.js";
import { authRouter } from "./routes/auth.js";
import { authLocalRouter } from "./routes/auth_local.js";
import { inviteRouter } from "./routes/invite.js";
import meRouter from "./routes/me.js";
import { registerFounderAuth } from "./routes/auth_founder.js";
import { markListenReady } from "./health/readiness.js";
import { getDb, startWalCheckpointTimer } from "./db/index.js";
import koshikiConsoleRouter from "./routes/koshikiConsole.js";
import { bookForgeRouter } from "./routes/bookForge.js";
import { personaStudioRouter } from "./routes/personaStudio.js";
import { connectorsRouter } from "./routes/connectors.js";
import { feedbackRouter } from "./routes/feedback.js";
import healthRouter from "./routes/health.js";
import { syncPhaseARouter } from "./routes/syncPhaseA.js";
import { writerRouter } from "./routes/writer.js";
import { writerVerifyRouter } from "./routes/writerVerify.js";
import { writerDraftRouter } from "./routes/writerDraft.js";
import guestRouter from "./routes/guest.js";
import mcRouter from "./routes/mc.js";
import mcVnextRouter from "./mc/routes/mcVnextRouter.js";
import { isMcVnextEnabled } from "./mc/mcVnextFlag.js";
import { isMcLedgerWritesEnabled } from "./mc/ledger/mcLedger.js";

// Debug: 未処理例外のハンドリング
const pid = process.pid;
process.on("uncaughtException", (error) => {
  const uptime = process.uptime();
  console.error(`[FATAL] uncaughtException pid=${pid} uptime=${uptime}s:`, error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  const uptime = process.uptime();
  console.error(`[FATAL] unhandledRejection pid=${pid} uptime=${uptime}s:`, reason);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Debug: 起動情報を記録
const startTime = Date.now();
const uptime = process.uptime();
console.log(`[SERVER-START] PID=${pid} uptime=${uptime}s startTime=${new Date().toISOString()}`);

// Initialize all databases at startup
console.log(`[DB-INIT] initializing databases at startup pid=${pid} uptime=${uptime}s`);
try {
  getDb("kokuzo");
  // ENSURE_KOKUZO_LAWS_COLUMNS_V1: add optional columns safely (idempotent)
  try {
    const db = getDb("kokuzo") as any;
    const cols = (db.prepare("PRAGMA table_info('kokuzo_laws')").all() as any[]).map((r: any) => String(r.name));
    const has = (name: string) => cols.includes(name);

    if (!has("name")) db.prepare("ALTER TABLE kokuzo_laws ADD COLUMN name TEXT").run();
    if (!has("definition")) db.prepare("ALTER TABLE kokuzo_laws ADD COLUMN definition TEXT").run();
    if (!has("evidenceIds")) db.prepare("ALTER TABLE kokuzo_laws ADD COLUMN evidenceIds TEXT").run(); // JSON array
  } catch (e) {
    console.error("[DB] ENSURE_KOKUZO_LAWS_COLUMNS_V1 failed:", e);
  }

  try {
    const db = getDb("kokuzo") as any;
    const cols = (db.prepare("PRAGMA table_info('mc_source_map')").all() as any[]).map((r: any) => String(r.name));
    const has = (name: string) => cols.includes(name);
    if (!has("thread_id")) db.prepare("ALTER TABLE mc_source_map ADD COLUMN thread_id TEXT NOT NULL DEFAULT ''").run();
    if (!has("turn_index")) db.prepare("ALTER TABLE mc_source_map ADD COLUMN turn_index INTEGER").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mc_source_map_thread_seen ON mc_source_map(thread_id, last_seen DESC)").run();
  } catch (e) {
    console.error("[DB] ENSURE_MC_SOURCE_MAP_THREAD_COLUMNS_V1 failed:", e);
  }

  try {
    const db = getDb("kokuzo") as any;
    const ensureRequestIdColumn = (table: string) => {
      const cols = (db.prepare(`PRAGMA table_info('${table}')`).all() as any[]).map((r: any) => String(r.name));
      if (!cols.includes("request_id")) {
        db.prepare(`ALTER TABLE ${table} ADD COLUMN request_id TEXT NOT NULL DEFAULT ''`).run();
      }
    };
    ensureRequestIdColumn("mc_route_ledger");
    ensureRequestIdColumn("mc_llm_execution_ledger");
    ensureRequestIdColumn("mc_memory_ledger");
    ensureRequestIdColumn("mc_dialogue_quality_ledger");
    const memoryCols = (db.prepare("PRAGMA table_info('mc_memory_ledger')").all() as any[]).map((r: any) => String(r.name));
    if (!memoryCols.includes("payload_json")) {
      db.prepare("ALTER TABLE mc_memory_ledger ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}'").run();
    }
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mc_route_ledger_request_id ON mc_route_ledger(request_id, ts DESC)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mc_llm_ledger_request_id ON mc_llm_execution_ledger(request_id, ts DESC)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mc_memory_ledger_request_id ON mc_memory_ledger(request_id, ts DESC)").run();
    db.prepare("CREATE INDEX IF NOT EXISTS idx_mc_quality_ledger_request_id ON mc_dialogue_quality_ledger(request_id, ts DESC)").run();
  } catch (e) {
    console.error("[DB] ENSURE_MC_LEDGER_REQUEST_ID_COLUMNS_V1 failed:", e);
  }

  console.log(`[DB-INIT] kokuzo ready pid=${pid} uptime=${uptime}s`);
} catch (e: any) {
  console.error(`[DB-INIT] FATAL: kokuzo init failed pid=${pid} uptime=${uptime}s:`, e);
  process.exit(1);
}

try {
  getDb("audit");
  console.log(`[DB-INIT] audit ready pid=${pid} uptime=${uptime}s`);
} catch (e: any) {
  console.error(`[DB-INIT] FATAL: audit init failed pid=${pid} uptime=${uptime}s:`, e);
  process.exit(1);
}

try {
  getDb("persona");
  console.log(`[DB-INIT] persona ready pid=${pid} uptime=${uptime}s`);
} catch (e: any) {
  console.error(`[DB-INIT] FATAL: persona init failed pid=${pid} uptime=${uptime}s:`, e);
  process.exit(1);
}

// CARD-MC-09A-WAL-INTEGRITY-V1: 10 分ごとに WAL を TRUNCATE チェックポイントし、
// 外部 sqlite3 CLI に依存せず WAL サイズを抑制して mc_*_ledger の書込を常に可視化する。
try {
  startWalCheckpointTimer(10 * 60 * 1000);
} catch (e: any) {
  console.warn(`[DB-WAL-CHECKPOINT] startWalCheckpointTimer failed: ${e?.message ?? String(e)}`);
}

// Guest chat CORS: allow LP domain
const GUEST_CORS = cors({
  origin: [/futomani88\.com$/, /localhost/],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});
app.use("/api/guest", GUEST_CORS);

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api", kamuRouter);
// Founder auth endpoints (additive)
registerFounderAuth(app);

app.use("/api", authRouter);
app.use("/api", authLocalRouter);
app.use("/api", inviteRouter);
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
app.use("/api", bookForgeRouter);
app.use("/api", personaStudioRouter);
app.use("/api", connectorsRouter);
app.use("/api", feedbackRouter);
app.use("/api", healthRouter);
app.use("/api", syncPhaseARouter);
app.use("/api", writerStoreRouter);
app.use("/api", writerCommitRouter);
app.use("/api", readerRouter);
app.use("/api", seedRouter);
app.use("/api", selfImproveRouter);
app.use("/api/kanagi", kanagiRoutes);

// 既存 tenmon
app.use("/api/tenmon", tenmonRoutes);

// 宿曜経 × 天津金木 × 言霊 統合診断 (dynamic import to prevent crash)
try {
  const sukuyouMod = await import("./routes/sukuyou.js");
  app.use("/api/sukuyou", sukuyouMod.default);
  console.log(`[ROUTE] sukuyou registered`);
} catch (e: any) {
  console.log(`[ROUTE] sukuyou failed to load: ${e?.message}`);
}

// health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Mission Control vNext (read-only skeleton; TENMON_MC_VNEXT=1) — register before /api/mc so paths are not swallowed
app.use("/api/mc/vnext", mcVnextRouter);
// Mission Control V2 (read-only dashboard)
app.use("/api/mc", mcRouter);

// Guest chat (LP体験用)
app.use("/api", guestRouter);

app.use(koshikiConsoleRouter);
app.listen(PORT, "0.0.0.0", () => {
  const listenTime = Date.now();
  const elapsed = listenTime - startTime;
  console.log(`[SERVER-LISTEN] PID=${pid} port=${PORT} listenTime=${new Date().toISOString()} elapsed=${elapsed}ms`);
  console.log(`API listening on http://0.0.0.0:${PORT}`);
  markListenReady();
  console.log(`[READY] listenReady=true`);
  if (isMcVnextEnabled() && !isMcLedgerWritesEnabled()) {
    console.warn(
      "[MC_VNEXT] TENMON_MC_VNEXT=1 だが TENMON_MC_VNEXT_LEDGER≠1 — mc_*_ledger は一切書かれません（.env に LEDGER=1 を追加）",
    );
  }
});
