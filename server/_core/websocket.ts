import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });

    // TENMON-NODE 登録ハンドラ
    socket.on("tenmon:node:register", (device) => {
      console.log(`[TENMON-ARK] Node registered:`, device);
      // デバイス情報を保存（将来的にはDBに保存）
      // 現時点ではログのみ
      
      // NTP同期: サーバー時刻を送信
      socket.emit("audio:sync", {
        serverTimestamp: Date.now(),
      });
    });

    // 音響同期リクエスト（NTP同期）
    socket.on("audio:sync:request", () => {
      socket.emit("audio:sync", {
        serverTimestamp: Date.now(),
      });
    });

    // Subscribe to specific channels
    socket.on("subscribe:fractal", () => {
      socket.join("fractal");
      console.log(`[WebSocket] Client ${socket.id} subscribed to fractal channel`);
    });

    socket.on("subscribe:ethics", () => {
      socket.join("ethics");
      console.log(`[WebSocket] Client ${socket.id} subscribed to ethics channel`);
    });

    socket.on("subscribe:soulSync", () => {
      socket.join("soulSync");
      console.log(`[WebSocket] Client ${socket.id} subscribed to soulSync channel`);
    });

    // Unsubscribe from channels
    socket.on("unsubscribe:fractal", () => {
      socket.leave("fractal");
      console.log(`[WebSocket] Client ${socket.id} unsubscribed from fractal channel`);
    });

    socket.on("unsubscribe:ethics", () => {
      socket.leave("ethics");
      console.log(`[WebSocket] Client ${socket.id} unsubscribed from ethics channel`);
    });

    socket.on("unsubscribe:soulSync", () => {
      socket.leave("soulSync");
      console.log(`[WebSocket] Client ${socket.id} unsubscribed from soulSync channel`);
    });

    // TENMON-NODE テスト送信（接続後3秒）
    setTimeout(() => {
      socket.emit("tenmon:command", {
        type: "ping",
      });
      console.log(`[TENMON-ARK] Test command sent to ${socket.id}`);
    }, 3000);
  });

  return io;
}

export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

// Emit Fractal Guardian status update
export function emitFractalUpdate(data: unknown) {
  if (io) {
    io.to("fractal").emit("fractal:update", data);
  }
}

// Emit Ethics Layer update
export function emitEthicsUpdate(data: unknown) {
  if (io) {
    io.to("ethics").emit("ethics:update", data);
  }
}

// Emit Soul Sync update
export function emitSoulSyncUpdate(data: unknown) {
  if (io) {
    io.to("soulSync").emit("soulSync:update", data);
  }
}

// Emit notification to all clients
export function emitNotification(notification: {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  message: string;
  timestamp: number;
}) {
  if (io) {
    io.emit("notification", notification);
  }
}
