import express from "express";
import cors from "cors";

import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
import chatRouter from "./routes/chat.js";
import auditRouter from "./routes/audit.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

// SLO: /api/audit (minimal, deterministic)
app.get("/api/audit", (_req, res) => {
  return res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ★ 重要：kanagi を /api にマウント
app.use("/api", kanagiRoutes);

// Chat router (POST /api/chat)
app.use("/api", chatRouter);

// Audit router (GET /api/audit)
app.use("/api", auditRouter);

// 既存 tenmon
app.use("/api/tenmon", tenmonRoutes);

// health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
