import "dotenv/config";
import { createServer } from "./core/server";
import healthRouter from "./routes/health";
import chatRouter from "./routes/chat";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

const app = createServer();

// ルーティング
// Express で /api プレフィックスを処理
// nginx は /api/* を http://127.0.0.1:3000 にプロキシする
app.use("/api", healthRouter);
app.use("/api", chatRouter);

// 404 ハンドラー
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// サーバー起動
app.listen(Number(PORT), HOST, () => {
  console.log(`[TENMON-ARK API] Server running on http://${HOST}:${PORT}/`);
  console.log(`[TENMON-ARK API] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[TENMON-ARK API] Health check: http://${HOST}:${PORT}/api/health`);
});

// グレースフルシャットダウン
process.on("SIGTERM", () => {
  console.log("[TENMON-ARK API] SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[TENMON-ARK API] SIGINT received, shutting down gracefully...");
  process.exit(0);
});

