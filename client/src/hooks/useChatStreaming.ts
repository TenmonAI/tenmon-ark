import { useState, useCallback, useRef } from "react";

/**
 * Server-Sent Events (SSE) based chat streaming hook
 * GPT同等のリアルタイムストリーミング
 */

export type ThinkingPhase = "analyzing" | "thinking" | "responding" | null;

interface UseChatStreamingOptions {
  onComplete?: (response: string, roomId: number) => void;
  onError?: (error: string) => void;
}

export function useChatStreaming(options: UseChatStreamingOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentPhase, setCurrentPhase] = useState<ThinkingPhase>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const sendMessage = useCallback(
    async (params: { roomId?: number; message: string; language?: string }) => {
      // 既存のストリームをクリーンアップ
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setIsStreaming(true);
      setStreamingContent("");
      setCurrentPhase("analyzing");

      try {
        // SSEリクエストを送信
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: params.roomId,
            message: params.message,
            language: params.language || "ja",
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
        const decoder = new TextDecoder();
        let buffer = "";

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

                // Handle phase events
                if (currentEventType === "phase") {
                  setCurrentPhase(parsed.phase as ThinkingPhase);
                  continue;
                }

                // Handle message events
                if (currentEventType === "message") {
                  if (parsed.chunk) {
                    setStreamingContent((prev) => prev + parsed.chunk);
                    setCurrentPhase(null); // フェーズ表示を消す
                  }
                  continue;
                }

                // Handle done events
                if (currentEventType === "done") {
                  setIsStreaming(false);
                  setCurrentPhase(null);
                  if (parsed.roomId !== undefined && parsed.message !== undefined) {
                    options.onComplete?.(parsed.message, parsed.roomId);
                  }
                  continue;
                }

                // Handle error events
                if (currentEventType === "error") {
                  setIsStreaming(false);
                  setCurrentPhase(null);
                  const errorMessage = parsed.error || "Unknown error";
                  options.onError?.(errorMessage);
                  throw new Error(errorMessage);
                }

                // Legacy support (backward compatibility)
                if (parsed.phase) {
                  setCurrentPhase(parsed.phase as ThinkingPhase);
                }

                if (parsed.chunk) {
                  setStreamingContent((prev) => prev + parsed.chunk);
                  setCurrentPhase(null);
                }

                if (parsed.roomId !== undefined && parsed.message !== undefined) {
                  setIsStreaming(false);
                  setCurrentPhase(null);
                  options.onComplete?.(parsed.message, parsed.roomId);
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
        setIsStreaming(false);
        setCurrentPhase(null);
        options.onError?.(
          error instanceof Error ? error.message : "メッセージの送信に失敗しました。"
        );
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    setCurrentPhase(null);
    setStreamingContent("");
  }, []);

  return {
    sendMessage,
    cancel,
    isStreaming,
    streamingContent,
    currentPhase,
  };
}
