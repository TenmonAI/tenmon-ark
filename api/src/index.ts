import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import type { Server } from "node:http";
import { app } from "./core/server.js";
import chatRouter from "./routes/chat.js";
import tenmonRouter from "./routes/tenmon.js";
import healthRouter from "./routes/health.js";
import memoryRouter from "./routes/memory.js";
import personaRouter from "./routes/persona.js";
import toolRouter from "./routes/tool.js";
import approvalRouter from "./routes/approval.js";
import { incError } from "./ops/metrics.js";
import { observeErrorForSafeMode } from "./ops/safeMode.js";
import { registerGracefulShutdown } from "./ops/shutdown.js";
import { initializeAmbientPersona } from "./tenmon/ambient.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST ?? "127.0.0.1";

// v∞-3: API起動時に一度だけ人格初期化処理を実行
initializeAmbientPersona();

// Routes（API は /api 配下のみ）
app.use("/api", healthRouter);
app.use("/api", chatRouter);
app.use("/api", tenmonRouter); // v∞-2: 外部連携用エンドポイント
app.use("/api", memoryRouter);
app.use("/api", personaRouter);
app.use("/api", toolRouter);
app.use("/api", approvalRouter);

// 404 (JSON only)
app.use((_req: Request, res: Response) => {
  return res.status(404).json({ error: "Not Found" });
});

// Error handler (JSON only)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API ERROR]", err);
  incError();
  observeErrorForSafeMode();
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return res.status(500).json({ error: message });
});

// Listen（index.ts のみ）
const server: Server = app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
});

// サーバーエラーハンドリング
server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("[SERVER ERROR]", err);
  if (err.code === "EADDRINUSE") {
    console.error(`[FATAL] Port ${PORT} is already in use`);
    process.exit(1);
  } else if (err.code === "EACCES") {
    console.error(`[FATAL] Permission denied to bind port ${PORT}`);
    process.exit(1);
  }

  process.exit(1);
});

// 未処理の例外をキャッチ
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// グレースフルシャットダウン
registerGracefulShutdown(server);
