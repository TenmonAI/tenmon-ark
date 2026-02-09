import express from "express";
import cors from "cors";
import auditRouter from "./routes/audit.js";
import chatRouter from "./routes/chat.js";
import lawRouter from "./routes/law.js";
import uploadRouter from "./routes/upload.js";
import algRouter from "./routes/alg.js";
import ingestRouter from "./routes/ingest.js";
import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
// import { seedRouter } from "./routes/seed.js"; // TODO: seed.ts が存在しないため一時的にコメントアウト
import { metaRouter } from "./routes/meta.js";
import { markListenReady } from "./health/readiness.js";
import { getDb } from "./db/index.js";

// 例外でプロセスが落ちるのをログ化（Node）
// systemd の Restart=always とセットで動作（プロセス終了後自動再起動）
process.on("unhandledRejection", (e) => {
  console.error("[FATAL] unhandledRejection", e);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("[FATAL] uncaughtException", e);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Debug: 起動情報を記録
const pid = process.pid;
const startTime = Date.now();
const uptime = process.uptime();
console.log(`[SERVER-START] PID=${pid} uptime=${uptime}s startTime=${new Date().toISOString()}`);

// Initialize all databases at startup
console.log(`[DB-INIT] initializing databases at startup pid=${pid} uptime=${uptime}s`);
try {
  getDb("kokuzo");
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

app.use(cors());
app.use(express.json());

app.use("/api", auditRouter);
app.use("/api", chatRouter);
app.use("/api", lawRouter);
app.use("/api", uploadRouter);
app.use("/api", algRouter);
app.use("/api", ingestRouter);
// app.use("/api", seedRouter); // TODO: seed.ts が存在しないため一時的にコメントアウト
app.use("/api/kanagi", kanagiRoutes);
app.use("/api", metaRouter);

// 既存 tenmon
app.use("/api/tenmon", tenmonRoutes);

// health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  const listenTime = Date.now();
  const elapsed = listenTime - startTime;
  console.log(`[SERVER-LISTEN] PID=${pid} port=${PORT} listenTime=${new Date().toISOString()} elapsed=${elapsed}ms`);
  console.log(`API listening on http://0.0.0.0:${PORT}`);
  markListenReady();
  console.log(`[READY] listenReady=true`);

  // メモリ/GC/イベントループ遅延の監視（30秒ごと）
  setInterval(() => {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const externalMB = Math.round(mem.external / 1024 / 1024);
    console.log(`[HEALTH] rss=${rssMB}MB heapUsed=${heapUsedMB}MB heapTotal=${heapTotalMB}MB external=${externalMB}MB`);
  }, 30000);
});
