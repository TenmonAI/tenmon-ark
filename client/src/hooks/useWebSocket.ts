import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebSocketOptions {
  channel?: "fractal" | "ethics" | "soulSync";
  onUpdate?: (data: unknown) => void;
  onNotification?: (notification: {
    id: string;
    type: "warning" | "error" | "info" | "success";
    title: string;
    message: string;
    timestamp: number;
  }) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { channel, onUpdate, onNotification } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO client
    const socket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected to server");
      setIsConnected(true);

      // Subscribe to channel if specified
      if (channel) {
        socket.emit(`subscribe:${channel}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected from server");
      setIsConnected(false);
    });

    // Listen for channel-specific updates
    if (channel && onUpdate) {
      socket.on(`${channel}:update`, (data: unknown) => {
        onUpdate(data);
      });
    }

    // Listen for notifications
    if (onNotification) {
      socket.on("notification", onNotification);
    }

    // Cleanup on unmount
    return () => {
      if (channel) {
        socket.emit(`unsubscribe:${channel}`);
      }
      socket.disconnect();
    };
  }, [channel, onUpdate, onNotification]);

  return {
    isConnected,
    socket: socketRef.current,
  };
}
