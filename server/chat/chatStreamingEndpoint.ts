import { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { generateChatStreamingV3 } from "./chatStreamingV3Engine";
import * as chatDb from "./chatDb";
import { generateChatTitle } from "./chatAI";
import { analyzeEthics } from "../reiEthicFilterEngine";

/**
 * Server-Sent Events (SSE) endpoint for streaming chat responses
 * GPT同等のリアルタイムストリーミング
 * 
 * 再接続ロジックと中断防止処理を実装
 */
export async function handleChatStreaming(req: Request, res: Response) {
  let isStreamingActive = true;
  let fullResponse = "";
  let lastChunkTime = Date.now();
  const HEARTBEAT_INTERVAL = 30000; // 30秒ごとにハートビート
  const CHUNK_TIMEOUT = 60000; // 60秒間チャンクが来ない場合はタイムアウト
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let chunkTimeout: NodeJS.Timeout | null = null;

  // クライアント切断検出
  req.on('close', () => {
    isStreamingActive = false;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (chunkTimeout) {
      clearTimeout(chunkTimeout);
    }
    console.log("[ChatStreaming] Client disconnected");
  });

  // クライアントエラー検出
  req.on('error', (error) => {
    isStreamingActive = false;
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (chunkTimeout) {
      clearTimeout(chunkTimeout);
    }
    console.error("[ChatStreaming] Client error:", error);
  });

  try {
    // 1. 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 2. リクエストパラメータ取得
    const { roomId: roomIdStr, message, language = "ja", reconnectToken, projectId, memorySummary } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    let roomId = roomIdStr ? parseInt(roomIdStr, 10) : null;

    // 3. チャットルーム作成または検証
    if (!roomId) {
      const title = await generateChatTitle(message, language);
      
      // projectId が未指定の場合は自動分類
      let finalProjectId = projectId;
      if (!finalProjectId) {
        const { autoClassifyProject } = await import("../project/autoClassifier");
        const { getRecentChatMessages } = await import("../chat/chatDb");
        
        // 会話履歴を取得（直近5件）
        const conversationHistory: string[] = [];
        // roomId がない場合は履歴なし
        
        const classification = await autoClassifyProject({
          text: message,
          files: [],
          conversationHistory,
          userId: user.id,
          conversationId: undefined,
          roomId: undefined,
        });
        
        finalProjectId = classification.projectId;
        
        // 分類結果を保存（GAP-E）
        const { isTemporaryProject } = await import("../project/reclassificationManager");
        const isTemporary = isTemporaryProject(classification.confidence) ? 1 : 0;
        
        roomId = await chatDb.createChatRoom({
          userId: user.id,
          title,
          projectId: finalProjectId || null,
          projectLocked: "auto", // 自動分類
          classificationConfidence: Math.round(classification.confidence * 100), // 0-100 に変換
          classificationLastUpdated: new Date(),
          isTemporaryProject: isTemporary,
        });
      } else {
        roomId = await chatDb.createChatRoom({
          userId: user.id,
          title,
          projectId: finalProjectId || null,
          projectLocked: "auto", // 自動分類
        });
      }
    } else {
      const room = await chatDb.getChatRoom(roomId);
      if (!room || room.userId !== user.id) {
        res.status(403).json({ error: "Room not found or access denied" });
        return;
      }
    }

    // 4. 倫理フィルタ適用
    const ethicAnalysis = analyzeEthics(message);
    const messageToSave =
      ethicAnalysis.needsNeutralization && ethicAnalysis.neutralizedText
        ? ethicAnalysis.neutralizedText
        : message;

    // 5. ユーザーメッセージ保存
    await chatDb.addChatMessage({
      roomId,
      role: "user",
      content: messageToSave,
    });

    // 6. SSEヘッダー設定
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no"); // Nginxバッファリング無効化

    // 7. 再接続トークンを送信（クライアントが再接続可能に）
    const reconnectTokenValue = reconnectToken || `reconnect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.write(`event: reconnect\ndata: ${JSON.stringify({ token: reconnectTokenValue, roomId })}\n\n`);

    // 8. ハートビート送信（接続維持）
    heartbeatInterval = setInterval(() => {
      if (isStreamingActive && !res.closed) {
        try {
          res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
        } catch (error) {
          console.error("[ChatStreaming] Heartbeat error:", error);
          isStreamingActive = false;
        }
      }
    }, HEARTBEAT_INTERVAL);

    // 9. 会話履歴取得
    const messages = await chatDb.getRecentChatMessages(roomId, 20);

    // 10. チャンクタイムアウトリセット関数
    const resetChunkTimeout = () => {
      if (chunkTimeout) {
        clearTimeout(chunkTimeout);
      }
      chunkTimeout = setTimeout(() => {
        if (isStreamingActive && !res.closed) {
          console.warn("[ChatStreaming] Chunk timeout detected, sending reconnect event");
          res.write(`event: reconnect\ndata: ${JSON.stringify({ token: reconnectTokenValue, roomId, reason: "timeout" })}\n\n`);
          // タイムアウト時は接続を維持（クライアントが再接続可能）
        }
      }, CHUNK_TIMEOUT);
    };

    resetChunkTimeout();

    // 11. Generate streaming response with GPT-grade quality
    // memorySummary を engine に渡す（保存・加工は禁止）
    const memorySummaryArray = Array.isArray(memorySummary) ? memorySummary : [];
    for await (const event of generateChatStreamingV3({
      userId: user.id,
      roomId,
      messages,
      language,
      memorySummary: memorySummaryArray,
    })) {
      // クライアント切断チェック
      if (!isStreamingActive || res.closed) {
        console.log("[ChatStreaming] Stream cancelled (client disconnected)");
        break;
      }

      if (event.type === "phase") {
        res.write(`event: phase\ndata: ${JSON.stringify(event.data)}\n\n`);
        resetChunkTimeout();
      } else if (event.type === "message") {
        fullResponse += event.data.chunk;
        lastChunkTime = Date.now();
        res.write(`event: message\ndata: ${JSON.stringify(event.data)}\n\n`);
        resetChunkTimeout();
      } else if (event.type === "done") {
        // 12. AI応答保存
        await chatDb.addChatMessage({
          roomId,
          role: "assistant",
          content: fullResponse,
        });

        // 13. 完了通知
        res.write(`event: done\ndata: ${JSON.stringify({ roomId, message: fullResponse, reconnectToken: reconnectTokenValue, ...event.data })}\n\n`);
        
        // クリーンアップ
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        if (chunkTimeout) {
          clearTimeout(chunkTimeout);
        }
        
        res.end();
        return;
      } else if (event.type === "error") {
        res.write(`event: error\ndata: ${JSON.stringify({ ...event.data, reconnectToken: reconnectTokenValue })}\n\n`);
        
        // エラー時も再接続トークンを送信（クライアントが再接続可能に）
        res.write(`event: reconnect\ndata: ${JSON.stringify({ token: reconnectTokenValue, roomId, reason: "error" })}\n\n`);
        
        // クリーンアップ
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        if (chunkTimeout) {
          clearTimeout(chunkTimeout);
        }
        
        res.end();
        return;
      }
    }

    // ストリームが正常に完了した場合のクリーンアップ
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (chunkTimeout) {
      clearTimeout(chunkTimeout);
    }

  } catch (error) {
    console.error("[ChatStreaming] Error:", error);
    
    // クリーンアップ
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (chunkTimeout) {
      clearTimeout(chunkTimeout);
    }

    if (!res.closed) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`
      );
      res.end();
    }
  }
}
