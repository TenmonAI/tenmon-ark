import express from "express";
import cors from "cors";
import auditRouter from "./routes/audit.js";
import chatRouter from "./routes/chat.js";
import lawRouter from "./routes/law.js";
import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
import { markListenReady } from "./health/readiness.js";
import { getDb } from "./db/index.js";

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
app.use("/api/kanagi", kanagiRoutes);

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
});
