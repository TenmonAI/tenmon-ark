import express from "express";
import cors from "cors";

import kanagiRoutes from "./routes/kanagi.js";
import tenmonRoutes from "./routes/tenmon.js";
import chatRouter from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ★ 重要：kanagi を /api にマウント
app.use("/api", kanagiRoutes);

// Chat router (POST /api/chat)
app.use("/api", chatRouter);

// 既存 tenmon
app.use("/api/tenmon", tenmonRoutes);

// health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});
