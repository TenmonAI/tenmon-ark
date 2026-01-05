import express from "express";
import cors from "cors";

import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
import chatRouter from "./routes/chat.js";
import thinkRouter from "./routes/think.js";
import judgeRouter from "./routes/judge.js";
import healthRouter from "./routes/health.js";
import researchRouter from "./routes/research.js";
import knowledgeRouter from "./routes/knowledge.js";
import settingsRouter from "./routes/settings.js";
import { initDB } from "./db/knowledge.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Knowledge DB を初期化
initDB();

app.use(cors());
app.use(express.json());

// ★ 重要：kanagi を /api にマウント
app.use("/api", kanagiRoutes);

// Chat router (POST /api/chat)
app.use("/api", chatRouter);

// Think router (POST /api/think)
app.use("/api", thinkRouter);

// Judge router (POST /api/judge)
app.use("/api", judgeRouter);

// 既存 tenmon
app.use("/api/tenmon", tenmonRoutes);

// Health router (GET /api/health)
app.use("/api", healthRouter);

// Research router (POST /api/research/upload, /api/research/files, etc.)
app.use("/api/research", researchRouter);

// Knowledge router (POST /api/knowledge/upload, GET /api/knowledge/list, DELETE /api/knowledge/:id)
app.use("/api/knowledge", knowledgeRouter);

// Settings router (GET /api/settings, POST /api/settings)
app.use("/api/settings", settingsRouter);

// health check (ルートパス)
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
