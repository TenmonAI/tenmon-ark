import { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { generateChatStreamingV3 } from "./chatStreamingV3Engine";
import * as chatDb from "./chatDb";
import { generateChatTitle } from "./chatAI";
import { analyzeEthics } from "../reiEthicFilterEngine";

/**
 * Server-Sent Events (SSE) endpoint for streaming chat responses
 * GPT同等のリアルタイムストリーミング
 */
export async function handleChatStreaming(req: Request, res: Response) {
  try {
    // 1. 認証チェック
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 2. リクエストパラメータ取得
    const { roomId: roomIdStr, message, language = "ja" } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    let roomId = roomIdStr ? parseInt(roomIdStr, 10) : null;

    // 3. チャットルーム作成または検証
    if (!roomId) {
      const title = await generateChatTitle(message, language);
      roomId = await chatDb.createChatRoom({
        userId: user.id,
        title,
      });
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

    // 7. 会話履歴取得
    const messages = await chatDb.getRecentChatMessages(roomId, 20);

    // 8. Generate streaming response with GPT-grade quality
    let fullResponse = "";
    for await (const event of generateChatStreamingV3({
      userId: user.id,
      roomId,
      messages,
      language,
    })) {
      if (event.type === "phase") {
        res.write(`event: phase\ndata: ${JSON.stringify(event.data)}\n\n`);
      } else if (event.type === "message") {
        fullResponse += event.data.chunk;
        res.write(`event: message\ndata: ${JSON.stringify(event.data)}\n\n`);
      } else if (event.type === "done") {
        // 10. AI応答保存
        await chatDb.addChatMessage({
          roomId,
          role: "assistant",
          content: fullResponse,
        });
        
        // 11. 完了通知
        res.write(`event: done\ndata: ${JSON.stringify({ roomId, message: fullResponse, ...event.data })}\n\n`);
        res.end();
        return;
      } else if (event.type === "error") {
        res.write(`event: error\ndata: ${JSON.stringify(event.data)}\n\n`);
        res.end();
        return;
      }
    }
  } catch (error) {
    console.error("[ChatStreaming] Error:", error);
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: "Internal server error" })}\n\n`
    );
    res.end();
  }
}
