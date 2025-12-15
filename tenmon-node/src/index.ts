/**
 * TENMON-NODE
 * 天聞アークの端末側プロセス
 * 
 * 目的：
 * - 端末側に常駐する Node.js プロセス
 * - TENMON-ARK サーバーと WebSocket 接続
 * - 命令を受信して端末で反応する（console出力）
 */

import { connectToTenmon } from "./socket.js";
import { getDeviceInfo, type DeviceInfo } from "./device.js";
import { executeCommand } from "./executor.js";

// TENMON-ARK サーバーURL
// 環境変数から取得、なければデフォルト
const TENMON_SERVER = process.env.TENMON_SERVER_URL || "http://localhost:3000";

// デバイス情報を取得
const device: DeviceInfo = getDeviceInfo();
console.log("[TENMON-NODE] 🚀 Booting...");
console.log("[TENMON-NODE] Device ID:", device.deviceId);
console.log("[TENMON-NODE] Hostname:", device.hostname);
console.log("[TENMON-NODE] Platform:", device.platform);
console.log("[TENMON-NODE] Arch:", device.arch);
console.log("[TENMON-NODE] Server URL:", TENMON_SERVER);

// WebSocket接続
const socket = connectToTenmon(TENMON_SERVER);

// 命令受信ハンドラ
socket.on("tenmon:command", (cmd) => {
  executeCommand(cmd);
});

// 起動通知（接続確立後）
socket.on("connect", () => {
  console.log("[TENMON-NODE] 📤 Registering device...");
  socket.emit("tenmon:node:register", device);
});

// エラーハンドリング
process.on("SIGINT", () => {
  console.log("\n[TENMON-NODE] 👋 Shutting down...");
  socket.disconnect();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[TENMON-NODE] 👋 Shutting down...");
  socket.disconnect();
  process.exit(0);
});

// 未処理エラー
process.on("uncaughtException", (error) => {
  console.error("[TENMON-NODE] ❌ Uncaught exception:", error);
  socket.disconnect();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[TENMON-NODE] ❌ Unhandled rejection:", reason);
  socket.disconnect();
  process.exit(1);
});

