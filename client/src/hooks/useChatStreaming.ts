import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Server-Sent Events (SSE) based chat streaming hook
 * GPT同等のリアルタイムストリーミング
 * 
 * 再接続ロジックと中断防止処理を実装
 */

export type ThinkingPhase = "analyzing" | "thinking" | "responding" | null;

interface UseChatStreamingOptions {
  onComplete?: (response: string, roomId: number) => void;
  onError?: (error: string) => void;
  onReconnect?: (token: string, roomId: number) => void;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

interface ReconnectState {
  token: string | null;
  roomId: number | null;
  attempts: number;
}

export function useChatStreaming(options: UseChatStreamingOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentPhase, setCurrentPhase] = useState<ThinkingPhase>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const reconnectStateRef = useRef<ReconnectState>({
    token: null,
    roomId: null,
    attempts: 0,
  });
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = options.maxReconnectAttempts || 3;
  const reconnectDelay = options.reconnectDelay || 2000; // 2秒

  // ハートビートタイムアウトリセット
  const resetHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    // 30秒間ハートビートが来ない場合は再接続を試みる
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn("[ChatStreaming] Heartbeat timeout, attempting reconnect");
      if (reconnectStateRef.current.token && reconnectStateRef.current.roomId !== null) {
        attemptReconnect();
      }
    }, 30000);
  }, []);

  // チャンクタイムアウトリセット
  const resetChunkTimeout = useCallback(() => {
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
    }
    // 60秒間チャンクが来ない場合は再接続を試みる
    chunkTimeoutRef.current = setTimeout(() => {
      console.warn("[ChatStreaming] Chunk timeout, attempting reconnect");
      if (reconnectStateRef.current.token && reconnectStateRef.current.roomId !== null) {
        attemptReconnect();
      }
    }, 60000);
  }, []);

  // 再接続を試みる
  const attemptReconnect = useCallback(async () => {
    const state = reconnectStateRef.current;
    if (state.attempts >= maxReconnectAttempts) {
      console.error("[ChatStreaming] Max reconnect attempts reached");
      setIsStreaming(false);
      setCurrentPhase(null);
      options.onError?.("接続が切断されました。最大再接続試行回数に達しました。");
      return;
    }

    state.attempts++;
    console.log(`[ChatStreaming] Attempting reconnect (${state.attempts}/${maxReconnectAttempts})`);

    // 再接続前に少し待機
    await new Promise((resolve) => setTimeout(resolve, reconnectDelay));

    // 再接続トークンを使用して再接続
    if (state.token && state.roomId !== null) {
      options.onReconnect?.(state.token, state.roomId);
    }
  }, [maxReconnectAttempts, reconnectDelay, options]);

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const sendMessage = useCallback(
    async (params: { roomId?: number; message: string; language?: string; persona?: string; reconnectToken?: string; projectId?: number | null; memorySummary?: any[] }) => {
      // 既存のストリームをクリーンアップ
      cleanup();

      setIsStreaming(true);
      setStreamingContent("");
      setCurrentPhase("analyzing");

      // 再接続状態をリセット
      reconnectStateRef.current = {
        token: params.reconnectToken || null,
        roomId: params.roomId || null,
        attempts: 0,
      };

      try {
        // SSEリクエストを送信（記憶の要約を抽象データとして送信）
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: params.roomId,
            message: params.message,
            language: params.language || "ja",
            persona: params.persona,
            reconnectToken: params.reconnectToken,
            projectId: params.projectId,
            memorySummary: params.memorySummary || [], // 抽象データのみ（原文なし）
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        // ReadableStreamを読み取る
        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        // タイムアウトをリセット
        resetHeartbeatTimeout();
        resetChunkTimeout();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEventType = "";
          for (const line of lines) {
            if (!line.trim() || line.startsWith(":")) continue;

            if (line.startsWith("event:")) {
              currentEventType = line.slice(6).trim();
              continue;
            }

            if (line.startsWith("data:")) {
              const data = line.slice(5).trim();

              try {
                const parsed = JSON.parse(data);

                // Handle reconnect events
                if (currentEventType === "reconnect") {
                  reconnectStateRef.current.token = parsed.token || reconnectStateRef.current.token;
                  reconnectStateRef.current.roomId = parsed.roomId !== undefined ? parsed.roomId : reconnectStateRef.current.roomId;
                  options.onReconnect?.(parsed.token, parsed.roomId);
                  continue;
                }

                // Handle heartbeat events
                if (currentEventType === "heartbeat") {
                  resetHeartbeatTimeout();
                  continue;
                }

                // Handle phase events
                if (currentEventType === "phase") {
                  setCurrentPhase(parsed.phase as ThinkingPhase);
                  resetChunkTimeout();
                  continue;
                }

                // Handle message events
                if (currentEventType === "message") {
                  if (parsed.chunk) {
                    setStreamingContent((prev) => prev + parsed.chunk);
                    setCurrentPhase(null); // フェーズ表示を消す
                    resetChunkTimeout();
                  }
                  continue;
                }

                // Handle done events
                if (currentEventType === "done") {
                  cleanup();
                  setIsStreaming(false);
                  setCurrentPhase(null);
                  if (parsed.roomId !== undefined && parsed.message !== undefined) {
                    options.onComplete?.(parsed.message, parsed.roomId);
                  }
                  return;
                }

                // Handle error events
                if (currentEventType === "error") {
                  cleanup();
                  setIsStreaming(false);
                  setCurrentPhase(null);
                  const errorMessage = parsed.error || "Unknown error";
                  
                  // エラー時に再接続トークンがあれば再接続を試みる
                  if (parsed.reconnectToken && reconnectStateRef.current.attempts < maxReconnectAttempts) {
                    reconnectStateRef.current.token = parsed.reconnectToken;
                    attemptReconnect();
                  } else {
                    options.onError?.(errorMessage);
                  }
                  return;
                }

                // Legacy support (backward compatibility)
                if (parsed.phase) {
                  setCurrentPhase(parsed.phase as ThinkingPhase);
                  resetChunkTimeout();
                }

                if (parsed.chunk) {
                  setStreamingContent((prev) => prev + parsed.chunk);
                  setCurrentPhase(null);
                  resetChunkTimeout();
                }

                if (parsed.roomId !== undefined && parsed.message !== undefined) {
                  cleanup();
                  setIsStreaming(false);
                  setCurrentPhase(null);
                  options.onComplete?.(parsed.message, parsed.roomId);
                  return;
                }

                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (parseError) {
                console.error("[ChatStreaming] Parse error:", parseError);
              }
            }
          }
        }
      } catch (error) {
        console.error("[ChatStreaming] Error:", error);
        cleanup();
        setIsStreaming(false);
        setCurrentPhase(null);
        
        // 再接続を試みる
        if (reconnectStateRef.current.token && reconnectStateRef.current.attempts < maxReconnectAttempts) {
          attemptReconnect();
        } else {
          options.onError?.(
            error instanceof Error ? error.message : "メッセージの送信に失敗しました。"
          );
        }
      }
    },
    [options, maxReconnectAttempts, resetHeartbeatTimeout, resetChunkTimeout, cleanup, attemptReconnect]
  );

  const cancel = useCallback(() => {
    cleanup();
    setIsStreaming(false);
    setCurrentPhase(null);
    setStreamingContent("");
    reconnectStateRef.current = {
      token: null,
      roomId: null,
      attempts: 0,
    };
  }, [cleanup]);

  return {
    sendMessage,
    cancel,
    isStreaming,
    streamingContent,
    currentPhase,
    reconnectToken: reconnectStateRef.current.token,
  };
}
