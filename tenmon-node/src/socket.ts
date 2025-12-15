/**
 * WebSocket Connection
 * TENMON-ARK サーバーとの接続（心臓）
 */

import { io, Socket } from "socket.io-client";

/**
 * TENMON-ARK サーバーに接続
 * 
 * @param serverUrl サーバーURL（例: https://tenmon-ark.com または http://localhost:3000）
 * @returns Socket.IO クライアント
 */
export function connectToTenmon(serverUrl: string): Socket {
  const socket = io(serverUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    path: "/api/socket.io", // TENMON-ARK サーバーのWebSocketパス
  });

  socket.on("connect", () => {
    console.log("[TENMON-NODE] ✅ Connected to TENMON-ARK:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[TENMON-NODE] ❌ Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[TENMON-NODE] Connection error:", error.message);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`[TENMON-NODE] 🔄 Reconnected (attempt ${attemptNumber})`);
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`[TENMON-NODE] 🔄 Reconnection attempt ${attemptNumber}...`);
  });

  socket.on("reconnect_failed", () => {
    console.error("[TENMON-NODE] ❌ Reconnection failed");
  });

  return socket;
}

