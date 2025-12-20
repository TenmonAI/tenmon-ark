// PHASE A: 会話解放フラグ

/**
 * PHASE A: 会話解放フラグ
 * 
 * true: 会話として完結させる（短い相槌や補足を許可、質問への自然な返答）
 * false: 簡潔・最小応答に戻る（互換維持）
 * 
 * デフォルトは ON（会話可能）
 * 将来 OFF にできるが、いまは ON 固定
 */
export const CONVERSATION_ENABLED = true;

/**
 * PHASE A: 会話解放フラグを取得
 */
export function isConversationEnabled(): boolean {
  return CONVERSATION_ENABLED;
}

