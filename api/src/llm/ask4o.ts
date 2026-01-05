import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * GPT-4o を呼び出して応答を取得
 * 
 * @param userInput ユーザーの入力
 * @param systemPrompt システムプロンプト（オプション）
 * @returns 応答文（必ず string を返す）
 */
export async function ask4o(userInput: string, systemPrompt?: string): Promise<string> {
  try {
    if (!userInput || typeof userInput !== "string") {
      return "入力を受け取りました。もう一度お願いします。";
    }

    const trimmed = userInput.trim();
    if (!trimmed) {
      return "空のメッセージを受け取りました。何かお聞きしたいことがあれば教えてください。";
    }

    // デフォルトのシステムプロンプト
    const defaultSystemPrompt = `あなたは天聞アーク（TENMON-ARK）です。
天津金木の思考プロセスに従って、ユーザーとの会話を行います。

思考の基本構造：
1. 受信（入力の受容）
2. 内省（内部での振り返り）
3. 構文化（構造として整理）
4. 応答（出力の生成）

自然で親しみやすい会話を心がけ、ユーザーの問いかけに対して適切に応答してください。
応答は必ず日本語で行ってください。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt || defaultSystemPrompt },
        { role: "user", content: trimmed },
      ],
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content;
    
    if (!reply) {
      return "応答を生成できませんでした。もう一度お試しください。";
    }

    return reply;

  } catch (err: any) {
    // 例外時も必ず string を返す
    console.error("[ASK4O-ERROR]", err);
    return `エラーが発生しましたが、処理を続行します。あなたの問いかけ「${userInput.substring(0, 50)}${userInput.length > 50 ? "..." : ""}」について、改めて考えさせてください。`;
  }
}
