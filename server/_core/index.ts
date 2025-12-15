import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleStripeWebhook } from "../webhook";
import { serveStatic, setupVite } from "./vite";
import { startScheduler } from "../jobs/scheduler";
import { initializeWebSocket } from "./websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // トレードシステムを初期化（STEP 1: MT5 → TENMON-ARK データ接続）
  try {
    const { initializeTradeSystem } = await import("../trade/tradeSystemInitializer");
    await initializeTradeSystem();
  } catch (error) {
    console.warn("[SERVER] Trade system initialization failed (optional):", error);
  }
  const app = express();
  const server = createServer(app);
  
  // Stripe webhook MUST be registered BEFORE express.json() to preserve raw body
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );
  
  // CORS middleware
  const { corsMiddleware, generalRateLimit, chatStreamingRateLimit, atlasChatRateLimit, whisperRateLimit, semanticSearchRateLimit, deviceClusterRateLimit, authMiddleware } = await import("./security");
  app.use(corsMiddleware);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // PUBLIC ENDPOINTS: 認証不要のエンドポイントを先に登録
  // Stripe webhook は認証不要（Stripeの署名検証で保護）
  // OAuth callback は認証不要（OAuthフローで保護）
  
  // 認証ミドルウェアを /api/* に適用
  // 注意: 個別のルーターで認証チェックを実装している場合は重複チェックになるが、
  // セキュリティのため明示的に認証を強制する
  app.use("/api", async (req, res, next) => {
    // PUBLIC ENDPOINT チェック: 特定のパスは認証不要
    const publicPaths = [
      "/api/stripe/webhook", // Stripe webhook（署名検証で保護）
      "/api/oauth/callback", // OAuth callback（OAuthフローで保護）
      "/api/docs", // API Docs（公開情報）
      "/api/docs/markdown", // API Docs Markdown（公開情報）
    ];

    if (publicPaths.some(path => req.path.startsWith(path))) {
      // PUBLIC ENDPOINT: 認証不要
      (req as any).isPublicEndpoint = true;
    }

    // 認証ミドルウェアを適用
    return authMiddleware(req, res, next);
  });

  // Rate Limit Middleware を各APIに適用
  // 一般API用のRate Limit（デフォルト）
  app.use("/api", generalRateLimit);
  
  // 特定のAPI用のRate Limit（より厳しい制限）
  app.use("/api/chat/stream", chatStreamingRateLimit);
  app.use("/api/stt", whisperRateLimit);
  app.use("/api/concierge", semanticSearchRateLimit);
  app.use("/api/deviceCluster-v3", deviceClusterRateLimit);
  
  // SSE endpoint for streaming chat responses (with rate limit)
  const { handleChatStreaming } = await import("../chat/chatStreamingEndpoint");
  app.post("/api/chat/stream", chatStreamingRateLimit, handleChatStreaming);
  // STT Whisper endpoint
  const whisperRouter = await import("../api/stt/whisper");
  app.use("/api/stt", whisperRouter.default);
  // Concierge Semantic Search endpoint
  const semanticSearchRouter = await import("../api/concierge/semantic-search");
  app.use("/api/concierge", semanticSearchRouter.default);
  // Concierge Auto-Learn endpoint
  const autoLearnRouter = await import("../api/concierge/auto-learn");
  app.use("/api/concierge", autoLearnRouter.default);
  // Concierge Multi-Learn endpoint
  const multiLearnRouter = await import("../api/concierge/multi-learn");
  app.use("/api/concierge", multiLearnRouter.default);
  // API Docs endpoint
  const apiDocsRouter = await import("../api/docs");
  app.use("/api", apiDocsRouter.default);
  // Feedback endpoint
  const feedbackRouter = await import("../api/feedback");
  app.use("/api", feedbackRouter.default);
  // Self-Review endpoint
  const selfReviewRouter = await import("../api/self-review");
  app.use("/api/self-review", selfReviewRouter.default);
  // Self-Evolution endpoint
  const selfEvolutionRouter = await import("../api/self-evolution");
  app.use("/api/self-evolution", selfEvolutionRouter.default);
  // Test API endpoint
  const testRouter = await import("../api/tests");
  app.use("/api/tests", testRouter.default);
  // DeviceCluster v3 API endpoints
  const deviceClusterRegistryRouter = await import("../deviceCluster-v3/registry/registryRouter");
  app.use("/api/deviceCluster-v3/registry", deviceClusterRegistryRouter.default);
  const deviceClusterDiscoveryRouter = await import("../deviceCluster-v3/discovery/discoveryRouter");
  app.use("/api/deviceCluster-v3/discovery", deviceClusterDiscoveryRouter.default);
  const deviceClusterCursorRouter = await import("../deviceCluster-v3/cursor/cursorRouter");
  app.use("/api/deviceCluster-v3/cursor", deviceClusterCursorRouter.default);
  const deviceClusterTeleportRouter = await import("../deviceCluster-v3/teleport/teleportRouter");
  app.use("/api/deviceCluster-v3/teleport", deviceClusterTeleportRouter.default);
  const deviceClusterSyncRouter = await import("../deviceCluster-v3/sync/syncRouter");
  app.use("/api/deviceCluster-v3/sync", deviceClusterSyncRouter.default);
  // DeviceCluster v3 FastLane API endpoints
  const deviceClusterFastLaneRouter = await import("../deviceCluster-v3/fastlane/arkQuicServer");
  app.use("/api/deviceCluster-v3/fastlane", deviceClusterFastLaneRouter.default);
  const deviceClusterChunkRouter = await import("../deviceCluster-v3/fastlane/chunkRouter");
  app.use("/api/deviceCluster-v3/fastlane", deviceClusterChunkRouter.default);
  // MegaScheduler Auto-Start API endpoints
  const {
    getAutoStartStatus,
    enableAutoStartEndpoint,
    disableAutoStartEndpoint,
    enableAutoStart,
    runAutoStart,
  } = await import("../api/scheduler/autoStart");
  app.get("/api/scheduler/autostart/status", getAutoStartStatus);
  app.post("/api/scheduler/autostart/enable", enableAutoStartEndpoint);
  app.post("/api/scheduler/autostart/disable", disableAutoStartEndpoint);
  // Widget API endpoint
  const widgetApiRouter = await import("../widget/widget-api");
  app.use("/api/widget", widgetApiRouter.default);
  // KOKUZO API endpoints
  const kokuzoUploadRouter = await import("../api/kokuzo/upload/route");
  app.use("/api/kokuzo/upload", kokuzoUploadRouter.default);
  const kokuzoSearchRouter = await import("../api/kokuzo/search/route");
  app.use("/api/kokuzo/search", kokuzoSearchRouter.default);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize WebSocket
  initializeWebSocket(server);
  console.log("[WebSocket] Socket.IO initialized");

  // Initialize Offline System
  try {
    const { initializeOfflineSystem } = await import("../kokuzo/offline/integration");
    await initializeOfflineSystem();
    console.log("[KOKUZO][OFFLINE] Offline system initialized");
  } catch (error) {
    console.error("[KOKUZO][OFFLINE] Failed to initialize offline system:", error);
  }

  // Prometheus Metrics Endpoint
  app.get("/api/metrics", async (req, res) => {
    try {
      const { generatePrometheusMetrics } = await import("../kokuzo/offline/prometheusMetrics");
      const metrics = generatePrometheusMetrics();
      res.setHeader("Content-Type", "text/plain; version=0.0.4");
      res.send(metrics);
    } catch (error) {
      console.error("[Metrics] Failed to generate Prometheus metrics:", error);
      res.status(500).send("# Error generating metrics\n");
    }
  });

  // Start Snapshot Cron
  try {
    const { startSnapshotCron } = await import("../kokuzo/offline/snapshotCron");
    startSnapshotCron();
    console.log("[Snapshot Cron] Started");
  } catch (error) {
    console.error("[Snapshot Cron] Failed to start:", error);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Start job scheduler
    startScheduler();
    
    // MegaScheduler Auto-Start: サーバー起動時に自動で NEXT() を実行
    try {
      const { enableAutoStart, runAutoStart } = await import("../api/scheduler/autoStart");
      enableAutoStart();
      console.log("[MegaScheduler] Auto-Start enabled, triggering NEXT()...");
      // サーバー起動完了後、少し待ってから実行（他の初期化が完了するまで）
      setTimeout(async () => {
        try {
          await runAutoStart();
        } catch (error) {
          console.error("[MegaScheduler] Auto-Start failed:", error);
        }
      }, 2000); // 2秒待機
    } catch (error) {
      console.error("[MegaScheduler] Failed to initialize Auto-Start:", error);
    }
  });
}

startServer().catch(console.error);
