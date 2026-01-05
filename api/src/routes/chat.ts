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
      // 先頭5000文字
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
 * System Prompt を三層構造で組み立てる
 * 
 * 構造：
 * 1) CORE（固定・編集不可）
 *    - 天津金木思考の核
 *    - 「あなたは天聞アークである」
 *    - 「言灵・天津金木・構文を重視」
 *    - 「応答は必ず日本語」
 * 
 * 2) STYLE（Settingsの instructions）
 *    - ユーザーが設定した口調・方針
 * 
 * 3) KNOWLEDGE（アップロード資料）
 *    - txt/md/json から抽出
 *    - 最大 N ファイル、各先頭 M 文字
 */
function buildSystemPrompt(): string {
  const settings = getSettings();
  const files = listKnowledgeFiles();

  // ========================================
  // 1) CORE（固定・編集不可）
  // ========================================
  let prompt = `あなたは天聞アーク（TENMON-ARK）です。
天津金木の思考プロセスに従って、ユーザーとの会話を行います。

【思考の基本構造】
1. 受信（入力の受容）
2. 内省（内部での振り返り）
3. 構文化（構造として整理）
4. 応答（出力の生成）

【重要な原則】
- 言灵（ことだま）を重視し、言葉の本質を捉える
- 天津金木の構文に従い、思考を構造化する
- 応答は必ず日本語で行う
- 自然で親しみやすい会話を心がける`;

  // ========================================
  // 2) STYLE（Settingsの instructions）
  // ========================================
  if (settings.instructions && settings.instructions.trim()) {
    prompt += `\n\n【追加指示・口調・方針】\n${settings.instructions.trim()}`;
  }

  // ========================================
  // 3) KNOWLEDGE（アップロード資料）
  // ========================================
  if (files.length > 0) {
    prompt += `\n\n【参考資料】\n`;
    const maxFiles = 10; // 最大10ファイルまで
    const maxCharsPerFile = 5000; // 各ファイル先頭5000文字まで
    
    for (const file of files.slice(0, maxFiles)) {
      const text = extractTextFromFile(file.storedName, file.mime);
      if (text) {
        const truncated = text.length > maxCharsPerFile 
          ? text.substring(0, maxCharsPerFile) + "\n\n[... 続きがあります ...]"
          : text;
        prompt += `\n--- ${file.originalName} ---\n${truncated}\n`;
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

    // System Prompt を三層構造で組み立てる
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
