import type { Server } from "node:http";
import { closeAllDbs } from "../db/index.js";

let shuttingDown = false;

export function registerGracefulShutdown(server: Server): void {
  const handler = (signal: string) => {
    void gracefulShutdown(server, signal);
  };

  process.on("SIGTERM", () => handler("SIGTERM"));
  process.on("SIGINT", () => handler("SIGINT"));
}

export async function gracefulShutdown(server: Server, signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[SHUTDOWN] ${signal} received, shutting down gracefully...`);

  const timeout = setTimeout(() => {
    console.error("[SHUTDOWN] force exit (timeout)");
    process.exit(1);
  }, 10_000);
  timeout.unref();

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  try {
    closeAllDbs();
  } catch (e) {
    console.warn("[SHUTDOWN] close dbs failed", e);
  }

  clearTimeout(timeout);
  console.log("[SHUTDOWN] done");
  process.exit(0);
}


