import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";

export function createServer(): Express {
  const app = express();

  // CORS設定
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    })
  );

  // Body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // リクエストログ
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[API] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });

  // エラーハンドリングミドルウェア
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[API Error] ${err.message}`, err.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "production" ? "An error occurred" : err.message,
    });
  });

  return app;
}

