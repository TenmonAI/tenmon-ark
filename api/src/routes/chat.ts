import { Router, type IRouter, type Request, type Response } from "express";
import { kanagiThink } from "../kanagi/kanagiThink.js";
import { getSettings } from "../db/knowledge.js";
import { listKnowledgeFiles } from "../db/knowledge.js";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

// ストレージディレクトリ
const STORAGE_DIR = path.resolve(process.cwd(), "storage", "knowledge");

/**
 * Knowledge ファイルからテキストを抽出（最小実装：txt/md/json のみ）
 */
function extractTextFromFile(storedName: string, mime: string): string {
  const filePath = path.join(STORAGE_DIR, storedName);
  
  if (!fs.existsSync(filePath)) {
    return "";
  }

  try {
    // txt/md/json のみ対応（UTF-8テキストとして読み込む）
    if (mime.includes("text") || mime.includes("json") || storedName.endsWith(".txt") || storedName.endsWith(".md") || storedName.endsWith(".json")) {
      const content = fs.readFileSync(filePath, "utf-8");
      // 先頭5000文字 + 要約（雑でOK）
      if (content.length > 5000) {
        return content.substring(0, 5000) + "\n\n[... 続きがあります ...]";
      }
      return content;
    }
  } catch (err: any) {
    console.error("[KNOWLEDGE-EXTRACT-ERROR]", err);
    return "";
  }

  return "";
}

/**
 * System Prompt を組み立てる
 */
function buildSystemPrompt(): string {
  const settings = getSettings();
  const files = listKnowledgeFiles();

  // 固定：天津金木 System Prompt
  let prompt = `あなたは天聞アーク（TENMON-ARK）です。
天津金木の思考プロセスに従って、ユーザーとの会話を行います。

思考の基本構造：
1. 受信（入力の受容）
2. 内省（内部での振り返り）
3. 構文化（構造として整理）
4. 応答（出力の生成）

自然で親しみやすい会話を心がけ、ユーザーの問いかけに対して適切に応答してください。
応答は必ず日本語で行ってください。`;

  // 追加：settings.instructions
  if (settings.instructions && settings.instructions.trim()) {
    prompt += `\n\n【追加指示】\n${settings.instructions.trim()}`;
  }

  // 追加：knowledge テキスト
  if (files.length > 0) {
    prompt += `\n\n【参考資料】\n`;
    for (const file of files.slice(0, 10)) { // 最大10ファイルまで
      const text = extractTextFromFile(file.storedName, file.mime);
      if (text) {
        prompt += `\n--- ${file.originalName} ---\n${text}\n`;
      }
    }
  }

  return prompt;
}

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const mode = req.query.mode || req.body.mode;
    const message = req.body.message || "";

    if (!message || typeof message !== "string") {
      return res.json({
        reply: "メッセージが必要です。何かお聞きしたいことがあれば教えてください。",
      });
    }

    // System Prompt を組み立てる
    const systemPrompt = buildSystemPrompt();

    // THINK モードの場合：天津金木思考ロジックを使用（systemPromptを渡す）
    if (mode === "think" || mode === "THINK" || !mode) {
      const reply = await kanagiThink(message, systemPrompt);
      return res.json({ reply });
    }

    // JUDGE モード（後回し）：仮の判断文を返す
    if (mode === "judge" || mode === "JUDGE") {
      return res.json({
        reply: `【JUDGE】「${message}」を評価します（JUDGEモードは今後実装予定です）`,
      });
    }

    // その他のモード：THINK として処理
    const reply = await kanagiThink(message, systemPrompt);
    return res.json({ reply });

  } catch (err: any) {
    // エラー時も必ず reply を返す（UIが沈黙しないようにする）
    console.error("[CHAT-ERROR]", err);
    const message = req.body.message || "";
    return res.json({
      reply: `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${String(message).substring(0, 50)}${String(message).length > 50 ? "..." : ""}」について、改めて考えさせてください。`,
    });
  }
});

export default router;
