import express from "express";
import cors from "cors";
import auditRouter from "./routes/audit.js";
import chatRouter from "./routes/chat.js";
import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
import { markListenReady } from "./health/readiness.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Debug: 起動情報を記録
const startTime = Date.now();
const pid = process.pid;
const uptime = process.uptime();
console.log(`[SERVER-START] PID=${pid} uptime=${uptime}s startTime=${new Date().toISOString()}`);

app.use(cors());
app.use(express.json());

app.use("/api", auditRouter);
app.use("/api", chatRouter);
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
});
