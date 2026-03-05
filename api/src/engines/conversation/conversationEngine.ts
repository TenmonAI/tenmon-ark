export type ConversationInput = {
  message: string;
  threadId?: string;
};

export type ConversationResult = {
  text: string;
};

export async function conversationEngine(
  input: ConversationInput
): Promise<ConversationResult> {

  const msg = String(input.message || "").trim();

  // 断捨離会話ベース
  if (!msg) {
    return { text: "いま何を整えましょうか。" };
  }

  // 疲れ系
  if (/疲れ|しんどい|だるい/.test(msg)) {
    return {
      text:
        "少し疲れが溜まっているようですね。\n\nいま重いのは、体でしょうか。それとも気持ちでしょうか。"
    };
  }

  // デフォルト
  return {
    text:
      "いまのお話を少し整理してみましょう。\n\nいちばん近い焦点はどこにありますか。"
  };
}
